#!/usr/bin/env node

/**
 * 澳门统计暨普查局（DSEC）入境旅客爬虫
 *
 * 数据来源：https://www.dsec.gov.mo/ts/#!/step2/KeyIndicator/zh-MO/243
 * API：https://www.dsec.gov.mo/TimeSeriesApi/App/KeyIndicatorv3/1/zh-MO/243
 * 配置：scripts/crawler/framework/crawler_config.js → macauTourism
 * 数据写入：stock/macau_gaming/monthly_visitor_arrivals.json
 *
 * 用法：
 *   node scripts/crawler/macau_gaming/macau_tourism_crawler.js              # 默认 2024-2026
 *   node scripts/crawler/macau_gaming/macau_tourism_crawler.js 2024 2025   # 指定年份
 */

'use strict'

const fs = require('fs')
const path = require('path')
const axios = require('axios')

const config = require('../framework/crawler_config.js').macauTourism

const STOCK_ROOT = path.join(__dirname, '../../../stock')
const MONTH_NAMES = config.monthNames

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 带重试的 HTTP GET，返回 JSON
 * @param {string} url
 * @returns {Promise<object>}
 */
async function fetchJson(url) {
  const max = config.maxRetries || 3
  let lastErr
  for (let i = 0; i < max; i++) {
    try {
      console.log(`  请求 (${i + 1}/${max}): ${url}`)
      const res = await axios.get(url, {
        timeout: config.timeout || 30000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'application/json',
          'Accept-Language': 'zh-CN,zh;q=0.9,zh-TW;q=0.8',
          Referer: 'https://www.dsec.gov.mo/ts/',
        },
      })
      return res.data
    } catch (err) {
      lastErr = err
      console.warn(`  请求失败: ${err.message}`)
      if (i < max - 1) await sleep((config.delayBetweenRequests || 2000) * (i + 1))
    }
  }
  throw lastErr
}

/**
 * 解析 ReferencePeriod，如 "2024年1月" → { year: 2024, monthIndex: 1 }
 * @param {string} ref
 * @returns {{ year: number, monthIndex: number } | null}
 */
function parseReferencePeriod(ref) {
  const m = ref.match(/(\d{4})年(\d{1,2})月/)
  if (!m) return null
  return { year: Number(m[1]), monthIndex: Number(m[2]) }
}

/**
 * 格式化同比字符串
 * @param {number|null} cur
 * @param {number|null} prev
 * @returns {string|null}
 */
function formatYoy(cur, prev) {
  if (cur == null || prev == null || prev === 0) return null
  const pct = ((cur - prev) / prev) * 100
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct.toFixed(1)}%`
}

/**
 * 解析 KeyIndicator API 响应，按目标年份过滤
 * @param {object} payload
 * @param {number[]} targetYears
 * @returns {Array<{ year: number, monthIndex: number, value: number }>}
 */
function parseKeyIndicator(payload, targetYears) {
  const yearSet = new Set(targetYears)
  const values = payload?.Value?.indicatorValues?.[0]?.dsecIndicatorData
  if (!Array.isArray(values)) return []

  const rows = []
  for (const item of values) {
    const parsed = parseReferencePeriod(item.ReferencePeriod)
    if (!parsed || !yearSet.has(parsed.year)) continue
    if (item.IndicatorValue == null) continue
    rows.push({
      year: parsed.year,
      monthIndex: parsed.monthIndex,
      value: Math.round(item.IndicatorValue),
    })
  }
  return rows
}

/**
 * 将月度记录合并写入 JSON（结构与博彩收入一致）
 * @param {string} filePath
 * @param {Array} rows
 * @param {number[]} targetYears
 * @returns {number}
 */
function mergeAndWrite(filePath, rows, targetYears) {
  let existing = {
    title: '澳门入境旅客',
    unit: '人次',
    source: config.sourceUrl,
    months: [],
  }
  if (fs.existsSync(filePath)) {
    try {
      existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    } catch {
      // 文件损坏，重建
    }
  }

  if (!Array.isArray(existing.months)) existing.months = []

  for (let i = 0; i < 12; i++) {
    if (!existing.months[i]) {
      existing.months[i] = { month: MONTH_NAMES[i], monthIndex: i + 1, years: {} }
    }
    if (!existing.months[i].years) existing.months[i].years = {}
  }

  // 按年份分组，用于计算累计与同比
  const byYear = {}
  for (const y of targetYears) byYear[y] = new Array(12).fill(null)
  for (const row of rows) {
    byYear[row.year][row.monthIndex - 1] = row.value
  }

  let updatedCount = 0
  for (let mi = 0; mi < 12; mi++) {
    const monthObj = existing.months[mi]
    for (const year of targetYears) {
      const monthly = byYear[year][mi]
      if (monthly == null) continue

      let cumulative = 0
      for (let j = 0; j <= mi; j++) {
        if (byYear[year][j] != null) cumulative += byYear[year][j]
      }

      const prevYear = year - 1
      const prevMonthly = byYear[prevYear]?.[mi] ?? null
      let prevCumulative = null
      if (byYear[prevYear]) {
        let sum = 0
        let hasAny = false
        for (let j = 0; j <= mi; j++) {
          if (byYear[prevYear][j] != null) {
            sum += byYear[prevYear][j]
            hasAny = true
          }
        }
        prevCumulative = hasAny ? sum : null
      }

      const entry = { monthly, cumulative }
      const monthlyYoy = formatYoy(monthly, prevMonthly)
      const cumulativeYoy = formatYoy(cumulative, prevCumulative)
      if (monthlyYoy) entry.monthlyYoy = monthlyYoy
      if (cumulativeYoy) entry.cumulativeYoy = cumulativeYoy

      monthObj.years[String(year)] = entry
      updatedCount++
    }
  }

  existing.title = '澳门入境旅客'
  existing.unit = '人次'
  existing.source = config.sourceUrl
  existing.indicatorId = config.keyIndicatorId
  existing.updatedAt = new Date().toISOString()

  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), 'utf-8')
  return updatedCount
}

async function crawl(targetYears) {
  const url = config.apiUrl.replace('{keyIndicatorId}', config.keyIndicatorId)
  console.log(`\n爬取入境旅客数据（指标 ${config.keyIndicatorId}）...`)
  console.log(`目标年份: ${targetYears.join(', ')}`)

  const payload = await fetchJson(url)
  const rows = parseKeyIndicator(payload, targetYears)

  if (rows.length === 0) {
    console.warn('  未解析到目标年份数据')
    return 0
  }

  const byYear = {}
  for (const row of rows) {
    if (!byYear[row.year]) byYear[row.year] = 0
    byYear[row.year]++
  }
  Object.keys(byYear)
    .sort()
    .forEach((y) => console.log(`  ${y} 年：${byYear[y]} 个月有数据`))

  rows
    .sort((a, b) => a.year - b.year || a.monthIndex - b.monthIndex)
    .forEach((r) => {
      console.log(`    ${r.year}年${r.monthIndex}月: ${r.value.toLocaleString()} 人次`)
    })

  const outFile = path.join(STOCK_ROOT, config.dataDir, config.dataFile)
  const updated = mergeAndWrite(outFile, rows, targetYears)
  console.log(`  已更新 ${updated} 条记录 → ${path.relative(STOCK_ROOT, outFile)}`)
  return updated
}

async function main() {
  console.log('========================================')
  console.log('  澳门 DSEC 入境旅客爬虫')
  console.log('========================================')

  const args = process.argv.slice(2).map(Number).filter((n) => n > 2000 && n < 2100)
  const years =
    args.length > 0
      ? args
      : config.defaultYears || [new Date().getFullYear() - 2, new Date().getFullYear() - 1, new Date().getFullYear()]

  const updated = await crawl(years)

  console.log('\n========================================')
  console.log(`完成。共更新 ${updated} 条记录。`)
  console.log('========================================')
}

main().catch((err) => {
  console.error('爬取失败:', err.message)
  process.exit(1)
})
