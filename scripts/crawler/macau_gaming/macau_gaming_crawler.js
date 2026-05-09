#!/usr/bin/env node

/**
 * 澳门博彩监察协调局（DICJ）每月幸运博彩毛收入爬虫
 *
 * 数据来源：https://www.dicj.gov.mo/web/cn/information/DadosEstat_mensal/{year}/report_cn.xml
 * 配置：scripts/crawler/framework/crawler_config.js → macauGaming
 * 数据写入：stock/macau_gaming/monthly_gross_revenue.json
 *
 * 用法：
 *   node scripts/crawler/macau_gaming/macau_gaming_crawler.js          # 爬取当前年份
 *   node scripts/crawler/macau_gaming/macau_gaming_crawler.js 2025     # 指定年份
 *   node scripts/crawler/macau_gaming/macau_gaming_crawler.js 2024 2026 # 爬取多个年份
 */

'use strict'

const fs = require('fs')
const path = require('path')
const axios = require('axios')
const cheerio = require('cheerio')

const config = require('../framework/crawler_config.js').macauGaming

const STOCK_ROOT = path.join(__dirname, '../../../stock')

// 月份繁体→简体映射（用于 key 统一）
const MONTH_NAMES = config.monthNames
const MONTH_MAP = {}
MONTH_NAMES.forEach((name, i) => { MONTH_MAP[name] = i + 1 })
// 兼容繁体"份"后缀
const normalizeMonth = (raw) => raw.replace('份', '').replace('一月', '一月')

// XML 数据 URL 模板（页面通过 XSLT 渲染此 XML）
const XML_URL_TPL = 'https://www.dicj.gov.mo/web/cn/information/DadosEstat_mensal/{year}/report_cn.xml'

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 带重试的 HTTP GET，返回文本内容
 * @param {string} url
 * @returns {Promise<string>}
 */
async function fetchText(url) {
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
          Accept: 'application/xml,text/xml,*/*;q=0.8',
          'Accept-Language': 'zh-TW,zh;q=0.9,zh-CN;q=0.8',
          Referer: 'https://www.dicj.gov.mo/',
        },
      })
      return typeof res.data === 'string' ? res.data : JSON.stringify(res.data)
    } catch (err) {
      lastErr = err
      console.warn(`  请求失败: ${err.message}`)
      if (i < max - 1) await sleep((config.delayBetweenRequests || 2000) * (i + 1))
    }
  }
  throw lastErr
}

/**
 * 解析 DICJ report_cn.xml
 *
 * XML 结构：
 *   <STATISTICS>
 *     <REPORT>
 *       <TITLE>2026年及2025年每月幸運博彩毛收入</TITLE>
 *       <HEADER>
 *         <SUB><COLUMN>2026年</COLUMN><COLUMN>2025年</COLUMN><COLUMN>變動率</COLUMN></SUB>
 *         ...
 *       </HEADER>
 *       <DATA>
 *         <RECORD>
 *           <DATA css="formheading">一月份</DATA>  <!-- 月份名 -->
 *           <DATA>22,633</DATA>    <!-- 月收入 curYear -->
 *           <DATA>18,254</DATA>    <!-- 月收入 prevYear -->
 *           <DATA>24.0%</DATA>     <!-- 月变动率 -->
 *           <DATA>22,633</DATA>    <!-- 累计 curYear -->
 *           <DATA>18,254</DATA>    <!-- 累计 prevYear -->
 *           <DATA>24.0%</DATA>     <!-- 累计变动率 -->
 *         </RECORD>
 *       </DATA>
 *     </REPORT>
 *   </STATISTICS>
 *
 * @param {string} xml
 * @param {number} year 请求年份（用于回退）
 * @returns {{ curYear: number, prevYear: number, rows: Array }}
 */
function parseXml(xml, year) {
  const $ = cheerio.load(xml, { xmlMode: true })

  // 从标题提取年份，如"2026年及2025年每月幸運博彩毛收入"
  let curYear = year
  let prevYear = year - 1
  const title = $('TITLE').first().text()
  const yearMatches = [...title.matchAll(/(\d{4})年/g)].map((m) => Number(m[1]))
  if (yearMatches.length >= 2) {
    curYear = Math.max(...yearMatches)
    prevYear = Math.min(...yearMatches)
  }

  const rows = []
  $('RECORD').each((_, record) => {
    const cells = $(record).find('DATA').toArray().map((el) => $(el).text().trim())
    if (cells.length < 7) return

    const monthRaw = normalizeMonth(cells[0])
    const monthIndex = MONTH_MAP[monthRaw]
    if (!monthIndex) return

    const parseNum = (s) => {
      const n = parseFloat(s.replace(/,/g, ''))
      return isNaN(n) ? null : n
    }
    const parseRate = (s) => {
      if (s === '-' || s === '') return null
      // 标准化：补全正负号
      if (/^\d/.test(s)) return '+' + s
      return s
    }

    rows.push({
      month: monthRaw,
      monthIndex,
      curYear,
      prevYear,
      monthlyCur: parseNum(cells[1]),
      monthlyPrev: parseNum(cells[2]),
      monthlyYoy: parseRate(cells[3]),
      cumCur: parseNum(cells[4]),
      cumPrev: parseNum(cells[5]),
      cumYoy: parseRate(cells[6]),
    })
  })

  return { curYear, prevYear, rows }
}

/**
 * 将解析结果合并写入 JSON 文件
 * @param {string} filePath
 * @param {{ curYear: number, prevYear: number, rows: Array }} parsed
 * @returns {number} 更新的记录数
 */
function mergeAndWrite(filePath, parsed) {
  const { curYear, prevYear, rows } = parsed

  let existing = {
    title: '澳门每月幸运博彩毛收入',
    unit: '百万澳门元',
    note: '1港元 = 1.03澳门元',
    source: 'https://www.dicj.gov.mo/web/cn/information/DadosEstat_mensal/',
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

  // 确保 months 数组包含完整 12 个月
  for (let i = 0; i < 12; i++) {
    if (!existing.months[i]) {
      existing.months[i] = { month: MONTH_NAMES[i], monthIndex: i + 1, years: {} }
    }
    if (!existing.months[i].years) existing.months[i].years = {}
  }

  let updatedCount = 0
  for (const row of rows) {
    const idx = row.monthIndex - 1
    const monthObj = existing.months[idx]

    // 有实际数值才写入（跳过 "-" 的月份）
    if (row.monthlyCur !== null) {
      const entry = { monthly: row.monthlyCur, cumulative: row.cumCur }
      if (row.monthlyYoy) entry.monthlyYoy = row.monthlyYoy
      if (row.cumYoy) entry.cumulativeYoy = row.cumYoy
      monthObj.years[String(curYear)] = entry
      updatedCount++
    }

    // 补全前一年基准数据（如果尚未存在）
    if (row.monthlyPrev !== null && !monthObj.years[String(prevYear)]) {
      monthObj.years[String(prevYear)] = {
        monthly: row.monthlyPrev,
        cumulative: row.cumPrev,
      }
    }
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), 'utf-8')
  return updatedCount
}

async function crawlYear(year) {
  const url = XML_URL_TPL.replace('{year}', year)
  console.log(`\n爬取 ${year} 年数据...`)

  const xml = await fetchText(url)
  const parsed = parseXml(xml, year)

  if (parsed.rows.length === 0) {
    console.warn(`  ${year} 年：未解析到数据`)
    return 0
  }

  const hasData = parsed.rows.filter((r) => r.monthlyCur !== null)
  console.log(`  解析完成：${parsed.curYear} vs ${parsed.prevYear}，${hasData.length} 个月有数据`)
  parsed.rows.forEach((r) => {
    const val = r.monthlyCur !== null ? String(r.monthlyCur) : '-'
    const yoy = r.monthlyYoy || '-'
    console.log(`    ${r.month}: ${val}  同比 ${yoy}`)
  })

  const outFile = path.join(STOCK_ROOT, config.dataDir, config.dataFile)
  const updated = mergeAndWrite(outFile, parsed)
  console.log(`  已更新 ${updated} 条记录 → ${path.relative(STOCK_ROOT, outFile)}`)
  return updated
}

async function main() {
  console.log('========================================')
  console.log('  澳门 DICJ 每月幸运博彩毛收入爬虫')
  console.log('========================================')

  const args = process.argv.slice(2).map(Number).filter((n) => n > 2000 && n < 2100)
  const years = args.length > 0 ? args : [new Date().getFullYear()]

  console.log(`目标年份: ${years.join(', ')}`)

  let totalUpdated = 0
  for (let i = 0; i < years.length; i++) {
    if (i > 0) await sleep(config.delayBetweenRequests || 2000)
    totalUpdated += await crawlYear(years[i])
  }

  console.log('\n========================================')
  console.log(`完成。共更新 ${totalUpdated} 条记录。`)
  console.log('========================================')
}

main().catch((err) => {
  console.error('爬取失败:', err.message)
  process.exit(1)
})
