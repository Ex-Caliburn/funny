#!/usr/bin/env node

/**
 * 澳门统计暨普查局（DSEC）旅客人均消费爬虫
 *
 * 数据来源：https://www.dsec.gov.mo/ts/#!/step2/KeyIndicator/zh-MO/191
 * API：https://www.dsec.gov.mo/TimeSeriesApi/App/KeyIndicatorv3/1/zh-MO/191
 * 配置：scripts/crawler/framework/crawler_config.js → macauSpending
 * 数据写入：stock/macau_gaming/quarterly_visitor_spending.json
 *
 * 用法：
 *   node scripts/crawler/macau_gaming/macau_spending_crawler.js              # 默认 2024-2026
 *   node scripts/crawler/macau_gaming/macau_spending_crawler.js 2024 2025   # 指定年份
 */

'use strict'

const fs = require('fs')
const path = require('path')
const axios = require('axios')

const config = require('../framework/crawler_config.js').macauSpending

const STOCK_ROOT = path.join(__dirname, '../../../stock')
const QUARTER_NAMES = config.quarterNames

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
 * 解析 ReferencePeriod，如 "2024年第1季" → { year, quarterIndex }
 * @param {string} ref
 * @returns {{ year: number, quarterIndex: number } | null}
 */
function parseReferencePeriod(ref) {
  const m = ref.match(/(\d{4})年第(\d)季/)
  if (!m) return null
  return { year: Number(m[1]), quarterIndex: Number(m[2]) }
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
 * 解析 KeyIndicator API 响应
 * @param {object} payload
 * @param {number[]} targetYears
 * @returns {Array<{ year: number, quarterIndex: number, value: number }>}
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
      quarterIndex: parsed.quarterIndex,
      value: Math.round(item.IndicatorValue),
    })
  }
  return rows
}

/**
 * 写入季度 JSON（复用 months 字段结构，便于图表共用）
 * @param {string} filePath
 * @param {Array} rows
 * @param {number[]} targetYears
 * @returns {number}
 */
function mergeAndWrite(filePath, rows, targetYears) {
  let existing = {
    title: '旅客人均消费',
    unit: '澳门元',
    periodType: 'quarterly',
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

  for (let i = 0; i < 4; i++) {
    if (!existing.months[i]) {
      existing.months[i] = { month: QUARTER_NAMES[i], monthIndex: i + 1, years: {} }
    }
    if (!existing.months[i].years) existing.months[i].years = {}
  }

  const byYear = {}
  for (const y of targetYears) byYear[y] = new Array(4).fill(null)
  // 也保留前一年数据用于同比
  for (const row of rows) {
    if (!byYear[row.year]) byYear[row.year] = new Array(4).fill(null)
    byYear[row.year][row.quarterIndex - 1] = row.value
  }

  // 从已有文件补全历史年份（用于同比）
  for (const q of existing.months) {
    for (const [y, d] of Object.entries(q.years || {})) {
      const year = Number(y)
      if (!byYear[year]) byYear[year] = new Array(4).fill(null)
      if (byYear[year][q.monthIndex - 1] == null && d.monthly != null) {
        byYear[year][q.monthIndex - 1] = d.monthly
      }
    }
  }

  let updatedCount = 0
  for (let qi = 0; qi < 4; qi++) {
    const quarterObj = existing.months[qi]
    for (const year of targetYears) {
      const quarterly = byYear[year]?.[qi]
      if (quarterly == null) continue

      // 累计 = 截至该季度的年均（各季均值）
      let cumulative = 0
      let count = 0
      for (let j = 0; j <= qi; j++) {
        if (byYear[year][j] != null) {
          cumulative += byYear[year][j]
          count++
        }
      }
      cumulative = count > 0 ? Math.round(cumulative / count) : null

      const prevYear = year - 1
      const prevQuarterly = byYear[prevYear]?.[qi] ?? null

      let prevCumulative = null
      if (byYear[prevYear]) {
        let sum = 0
        let cnt = 0
        for (let j = 0; j <= qi; j++) {
          if (byYear[prevYear][j] != null) {
            sum += byYear[prevYear][j]
            cnt++
          }
        }
        prevCumulative = cnt > 0 ? Math.round(sum / cnt) : null
      }

      const entry = { monthly: quarterly, cumulative }
      const monthlyYoy = formatYoy(quarterly, prevQuarterly)
      const cumulativeYoy = formatYoy(cumulative, prevCumulative)
      if (monthlyYoy) entry.monthlyYoy = monthlyYoy
      if (cumulativeYoy) entry.cumulativeYoy = cumulativeYoy

      quarterObj.years[String(year)] = entry
      updatedCount++
    }
  }

  existing.title = '旅客人均消费'
  existing.unit = '澳门元'
  existing.periodType = 'quarterly'
  existing.source = config.sourceUrl
  existing.indicatorId = config.keyIndicatorId
  existing.updatedAt = new Date().toISOString()

  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), 'utf-8')
  return updatedCount
}

async function crawl(targetYears) {
  const url = config.apiUrl.replace('{keyIndicatorId}', config.keyIndicatorId)
  console.log(`\n爬取旅客人均消费数据（指标 ${config.keyIndicatorId}）...`)
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
    .forEach((y) => console.log(`  ${y} 年：${byYear[y]} 个季度有数据`))

  rows
    .sort((a, b) => a.year - b.year || a.quarterIndex - b.quarterIndex)
    .forEach((r) => {
      console.log(`    ${r.year}年第${r.quarterIndex}季: ${r.value.toLocaleString()} 澳门元`)
    })

  const outFile = path.join(STOCK_ROOT, config.dataDir, config.dataFile)
  const updated = mergeAndWrite(outFile, rows, targetYears)
  console.log(`  已更新 ${updated} 条记录 → ${path.relative(STOCK_ROOT, outFile)}`)
  return updated
}

async function main() {
  console.log('========================================')
  console.log('  澳门 DSEC 旅客人均消费爬虫')
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
