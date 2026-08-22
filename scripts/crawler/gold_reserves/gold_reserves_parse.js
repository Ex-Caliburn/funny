#!/usr/bin/env node

/**
 * 解析 stock/gold_reserves/raw_gold_reserves.json（由 gold_reserves_crawler.js 产出）
 * 计算 各国季度黄金储备 的 环比(QoQ) 与 同比(YoY)
 * 输出 stock/gold_reserves/gold_reserves_data.json 供 gold_reserves_chart.html 使用
 *
 * 口径说明：
 *   - WGC 该数据集仅提供 季频 / 年频，没有月度数据。
 *   - 因此"环比"实为 季环比(Quarter-over-Quarter)；"同比"为 同年同季对比。
 *   - 抓取窗口含 2024 作为同比基期；用户重点分析区间为 2025 至今。
 */

const fs = require('fs')
const path = require('path')

const DOWNLOAD_DIR = path.join(__dirname, '../../../stock/gold_reserves')
const OUTPUT_FILE = path.join(DOWNLOAD_DIR, 'gold_reserves_data.json')

function yq(dateStr) {
  const [y, m] = dateStr.split('-').map(Number)
  return { year: y, q: Math.ceil(m / 3) }
}
function quarterLabel(dateStr) {
  const { year, q } = yq(dateStr)
  return `${year}Q${q}`
}

/**
 * 计算单个国家序列的 环比/同比，并补充汇总字段
 */
function buildCountry(c, focusStart, topN) {
  const series = c.series.map((s) => ({
    date: s.date,
    label: quarterLabel(s.date),
    t: s.t,
    usd: s.usd,
  }))

  const byYQ = {}
  series.forEach((s) => {
    const { year, q } = yq(s.date)
    byYQ[`${year}-${q}`] = s
  })

  // 按日期排序后计算 环比(上一季) / 同比(去年同季) / 绝对增量(上一季→本季)
  series.forEach((s, i) => {
    const { year, q } = yq(s.date)
    const prev = i > 0 ? series[i - 1] : null
    // 环比：序列中上一季
    s.qoq = prev && prev.t && prev.t !== 0 ? +(((s.t - prev.t) / prev.t) * 100).toFixed(2) : null
    // 绝对增量（吨）：上一季 → 本季
    s.dt = prev && prev.t != null ? +(s.t - prev.t).toFixed(2) : null
    // 同比：去年同季
    const yoyPt = byYQ[`${year - 1}-${q}`]
    if (yoyPt && yoyPt.t && yoyPt.t !== 0) {
      s.yoy = +(((s.t - yoyPt.t) / yoyPt.t) * 100).toFixed(2)
    } else {
      s.yoy = null
    }
  })

  const latest = series.at(-1)
  const prev = series.length > 1 ? series[series.length - 2] : null

  // 按自然年归集，计算每一年的净增持
  //   - 含 ≥2 季：当年最后一季 - 当年第一季（年内净增持）
  //   - 最新年且仅有 1 季（如 2026 仅 Q1）：用 YTD = 该季 - 上一年最后一季（当年至今净增持）
  //   - 其余单季年：无年内对比，记 null
  const byYear = {}
  series.forEach((s) => {
    const y = yq(s.date).year
    if (!byYear[y]) byYear[y] = []
    byYear[y].push(s)
  })
  const yearsSorted = Object.keys(byYear).map(Number).sort((a, b) => a - b)
  const maxYear = yearsSorted.at(-1)
  const netAddByYear = {}
  yearsSorted.forEach((y) => {
    const arr = byYear[y]
    if (arr.length >= 2) {
      netAddByYear[y] = +(arr.at(-1).t - arr[0].t).toFixed(2)
    } else if (y === maxYear && arr.length === 1) {
      const prevYearLast = byYear[y - 1] && byYear[y - 1].at(-1)
      netAddByYear[y] = prevYearLast ? +(arr[0].t - prevYearLast.t).toFixed(2) : null
    } else {
      netAddByYear[y] = null
    }
  })
  let featuredYear = yearsSorted.filter((y) => byYear[y].length >= 2).at(-1)
  if (featuredYear == null) featuredYear = maxYear
  const featuredNetAdd = netAddByYear[featuredYear]

  // 最新季度持有增量（绝对吨数，= 上一季到最新季的变化）
  let latestQoQdelta = null
  if (latest && prev && latest.t != null && prev.t != null) {
    latestQoQdelta = +(latest.t - prev.t).toFixed(2)
  }

  return {
    iso3: c.iso3,
    name: c.name,
    series,
    latest: latest
      ? { date: latest.date, label: latest.label, t: latest.t, qoq: latest.qoq, yoy: latest.yoy }
      : null,
    // 兼容旧字段
    netAdd2025: netAddByYear[2025] != null ? netAddByYear[2025] : null,
    netAddByYear,
    featuredYear,
    featuredNetAdd,
    latestQoQdelta,
  }
}

/**
 * @param {object} [options]
 * @param {object} [options.parsed]  - 爬虫已解析结构 {dates, countries}
 * @param {object} [options.config]  - CONFIG
 * @param {string} [options.outputFile]
 * @returns {{outputFile:string, countryCount:number}}
 */
function parseAll(options = {}) {
  const outputFile = options.outputFile || OUTPUT_FILE
  const config = options.config || {}
  const focusStart = config.focusStart || '2025-01-01'
  const yoyBaseStart = config.yoyBaseStart || '2024-01-01'
  const topN = config.topN || 15

  let parsed = options.parsed
  if (!parsed) {
    const rawFile = path.join(DOWNLOAD_DIR, 'raw_gold_reserves.json')
    if (!fs.existsSync(rawFile)) throw new Error('未找到 raw_gold_reserves.json，请先运行爬虫')
    const raw = JSON.parse(fs.readFileSync(rawFile, 'utf-8'))
    const crawler = require('./gold_reserves_crawler')
    const countryList = raw.__countryList || []
    parsed = new crawler().parseResponse(raw, countryList)
  }

  const dates = parsed.dates
  const quarters = dates.map((d) => {
    const { year, q } = yq(d)
    return { date: d, label: quarterLabel(d), year, q }
  })

  const countries = parsed.countries
    .filter((c) => c.series.length > 0)
    .map((c) => buildCountry(c, focusStart, topN))
    .sort((a, b) => (b.latest?.t || 0) - (a.latest?.t || 0))

  const topByLatest = countries.slice(0, topN).map((c) => c.iso3)
  const focusQuarters = quarters.filter((q) => q.date >= focusStart)

  // 最新季度全球央行净增持（所有国家最新季环比增量之和）
  const latestLabel = quarters.at(-1)?.label
  const deltas = countries.map((c) => c.latestQoQdelta).filter((x) => x != null)
  const latestQuarterNetAdd = +(deltas.reduce((s, x) => s + x, 0)).toFixed(2)
  const latestBuyers = deltas.filter((x) => x > 0).length
  const latestSellers = deltas.filter((x) => x < 0).length
  const topLatestBuyer = countries
    .slice()
    .sort((a, b) => (b.latestQoQdelta || 0) - (a.latestQoQdelta || 0))[0]

  const result = {
    generatedAt: new Date().toISOString(),
    source: 'World Gold Council — Gold Hub (china.gold.org/goldhub/data/gold-reserves-by-country)',
    api: 'https://fsapi-china.gold.org/api/cbd/v11/charts/getPage',
    periodicity: 'quarterly',
    note: 'WGC 该数据集仅提供季频/年频，无月度；"环比"=季环比(QoQ)，"同比"=去年同季对比。窗口含 2024 作为同比基期，重点区间为 2025 至今。',
    yoyBaseStart,
    focusStart,
    endDate: quarters.at(-1)?.date,
    quarters,
    focusQuarters,
    topN,
    topByLatest,
    latestQuarter: {
      label: latestLabel,
      netAdd: latestQuarterNetAdd,
      buyers: latestBuyers,
      sellers: latestSellers,
      topBuyerName: topLatestBuyer?.name,
      topBuyerDelta: topLatestBuyer?.latestQoQdelta,
    },
    countries,
  }

  fs.writeFileSync(outputFile, JSON.stringify(result, null, 2), 'utf-8')
  console.log(
    `  输出 JSON: ${outputFile}\n  国家数: ${countries.length}，季度: ${quarters
      .map((q) => q.label)
      .join(', ')}`
  )
  return { outputFile, countryCount: countries.length }
}

if (require.main === module) {
  try {
    parseAll()
  } catch (err) {
    console.error(err.message)
    process.exit(1)
  }
}

module.exports = { parseAll, quarterLabel, yq }
