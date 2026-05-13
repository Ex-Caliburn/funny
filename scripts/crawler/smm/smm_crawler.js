#!/usr/bin/env node

/**
 * 上海有色金属网（SMM）有色金属现货均价爬取脚本
 *
 * 数据来源：https://www.smm.com.cn/price
 * 配置：scripts/crawler/framework/crawler_config.js → smmMetalPrices
 * 数据写入：stock/smm/smm_metal_prices.json
 *
 * 每次运行爬取当日价格快照，按日期去重增量追加到 JSON 文件。
 * 追踪品种（均价，元/吨）：
 *   铜  → SMM 1#电解铜
 *   铝  → SMM A00铝
 *   铅  → SMM 1#铅锭
 *   锌  → SMM 0#锌锭
 *   镍  → SMM 1#电解镍
 *   锡  → SMM 1#锡
 *   钴  → 电解钴
 *   碳酸锂 → 电池级碳酸锂
 *
 * 使用方法：
 *   node scripts/crawler/smm/smm_crawler.js
 */

'use strict'

const fs = require('fs')
const path = require('path')
const axios = require('axios')
const cheerio = require('cheerio')

const config = require('../framework/crawler_config').smmMetalPrices

const OUTPUT_FILE = path.join(__dirname, '../../../stock', config.dataDir, config.dataFile)

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 带重试的 HTTP GET，自动识别编码
 * @param {string} url
 * @returns {Promise<string>}
 */
async function fetchHtml(url) {
  const max = config.maxRetries || 3
  let lastErr
  for (let i = 0; i < max; i++) {
    try {
      console.log(`  请求 (${i + 1}/${max}): ${url}`)
      const res = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: config.timeout || 30000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          Referer: 'https://www.smm.com.cn/',
        },
      })

      // 检测编码
      const preview = Buffer.from(res.data).slice(0, 2000).toString('binary')
      const charsetMatch = preview.match(/charset[=\s"']+([a-zA-Z0-9-]+)/i)
      const charset = (charsetMatch ? charsetMatch[1] : 'utf-8').toLowerCase()

      if (charset === 'gbk' || charset === 'gb2312' || charset === 'gb18030') {
        return new TextDecoder('gbk').decode(res.data)
      }
      return Buffer.from(res.data).toString('utf-8')
    } catch (err) {
      lastErr = err
      console.warn(`  请求失败: ${err.message}`)
      if (i < max - 1) await sleep(config.delayBetweenRequests * (i + 1))
    }
  }
  throw lastErr
}

/**
 * 解析数字字符串，去掉千分位逗号，返回数值或 null
 * @param {string} text
 * @returns {number|null}
 */
function parseNum(text) {
  if (!text) return null
  const cleaned = text.replace(/,/g, '').trim()
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

/**
 * 从页面 HTML 中提取各品种当日均价
 *
 * 页面结构预期：
 *   每个大类（铜/铝/…）下有一个 <table>，表头为：名称 价格范围 均价 涨跌 单位 日期
 *   每行 <tr> 的第一个 <td> 为品种名称。
 *
 * 兼容策略：
 *   1. 遍历所有 <tr>，查找第一列文字包含目标品种名的行
 *   2. 依次取后续列：价格范围（col[1]）、均价（col[2]）、涨跌（col[3]）、单位（col[4]）、日期（col[5]）
 *
 * @param {string} html
 * @returns {object} 形如 { copper: {avg, low, high, change, unit, date}, ... }
 */
function parsePrices(html) {
  const $ = cheerio.load(html)
  const results = {}

  // 建立 "页面名称关键词 → target key" 反查表
  const nameToKey = {}
  for (const [key, cfg] of Object.entries(config.targets)) {
    nameToKey[cfg.name] = key
  }

  $('tr').each((_, tr) => {
    const cells = $(tr)
      .find('td')
      .map((__, td) => $(td).text().trim())
      .get()

    if (cells.length < 3) return

    const rowName = cells[0]

    // 匹配目标品种（精确或部分包含）
    let matchedKey = null
    for (const [name, key] of Object.entries(nameToKey)) {
      if (rowName === name || rowName.includes(name) || name.includes(rowName)) {
        matchedKey = key
        break
      }
    }
    if (!matchedKey || results[matchedKey]) return

    // 尝试解析各列（表头：名称 | 价格范围 | 均价 | 涨跌 | 单位 | 日期）
    const rawRange = cells[1] || ''  // e.g. "108200~108800" 或 "108200\~108800"
    const rawAvg   = cells[2] || ''
    const rawChg   = cells[3] || ''
    const unit     = cells[4] || config.targets[matchedKey].unit
    const date     = cells[5] || ''

    // 解析均价
    const avg = parseNum(rawAvg)
    if (avg === null) return

    // 解析价格范围
    const rangeMatch = rawRange.replace(/\\/g, '').match(/([\d,]+)[~～\-到]([\d,]+)/)
    const low  = rangeMatch ? parseNum(rangeMatch[1]) : null
    const high = rangeMatch ? parseNum(rangeMatch[2]) : null

    // 解析涨跌（可能带 + 或 - 符号）
    const chgMatch = rawChg.match(/([+-]?\s*[\d,]+(?:\.\d+)?)/)
    const change   = chgMatch ? parseNum(chgMatch[1].replace(/\s/g, '')) : null

    results[matchedKey] = { avg, low, high, change, unit, date }
  })

  return results
}

/**
 * 增量合并并写入 JSON 文件（按日期去重，倒序排列）
 * @param {object} pricesByKey  parsePrices 返回的结果
 */
function mergeAndSave(pricesByKey) {
  // 从解析结果中推断日期（取第一个有日期的品种）
  let date = ''
  for (const v of Object.values(pricesByKey)) {
    if (v.date) { date = v.date; break }
  }
  if (!date) {
    // 回退到今天
    date = new Date().toISOString().slice(0, 10)
  }

  // 构建当日记录
  const todayRecord = { date }
  for (const [key, v] of Object.entries(pricesByKey)) {
    todayRecord[key] = v.avg
  }

  // 读取现有文件
  const meta = {
    title: '上海有色金属网-有色金属现货均价',
    unit: '元/吨',
    source: config.pageUrl,
    metals: Object.fromEntries(
      Object.entries(config.targets).map(([k, v]) => [k, v.name])
    ),
  }

  let existing = { ...meta, updatedAt: '', data: [] }
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      const saved = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'))
      // 保留历史 data，但元数据（metals 等）始终以当前 config 为准
      existing.data = Array.isArray(saved.data) ? saved.data : []
    } catch {
      // 文件损坏，重建
    }
  }
  existing.updatedAt = new Date().toISOString().slice(0, 10)

  // 按日期去重合并
  const map = {}
  for (const r of existing.data) map[r.date] = r
  const prev = map[date]

  if (prev) {
    console.log(`  已存在 ${date} 的记录，更新价格数据`)
  } else {
    console.log(`  追加新记录：${date}`)
  }
  map[date] = todayRecord

  // 倒序排列
  existing.data = Object.values(map).sort((a, b) => b.date.localeCompare(a.date))

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true })
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(existing, null, 2), 'utf-8')
}

async function main() {
  console.log('========================================')
  console.log('  上海有色金属网（SMM）有色金属现货价格爬虫')
  console.log('========================================\n')

  let html
  try {
    html = await fetchHtml(config.pageUrl)
  } catch (err) {
    console.error(`页面请求失败: ${err.message}`)
    process.exit(1)
  }

  const prices = parsePrices(html)
  const found = Object.keys(prices)

  if (found.length === 0) {
    console.error('\n未能解析到任何价格，页面结构可能已变更，请检查。')
    // 调试：输出页面片段
    const snippet = html.slice(0, 2000)
    console.log('\n页面前 2000 字符：\n', snippet)
    process.exit(1)
  }

  console.log('\n解析结果：')
  const missing = []
  for (const [key, cfg] of Object.entries(config.targets)) {
    const v = prices[key]
    if (v) {
      const chgStr = v.change !== null ? `  涨跌 ${v.change > 0 ? '+' : ''}${v.change}` : ''
      console.log(`  ${cfg.name.padEnd(16)} ${String(v.avg).padStart(8)} ${v.unit}  (${v.date})${chgStr}`)
    } else {
      missing.push(cfg.name)
    }
  }

  if (missing.length > 0) {
    console.warn(`\n⚠ 以下品种未能解析（页面可能需要登录或结构已变更）：`)
    missing.forEach((n) => console.warn(`    - ${n}`))
  }

  if (found.length > 0) {
    console.log('\n写入文件...')
    mergeAndSave(prices)
    const rel = path.relative(process.cwd(), OUTPUT_FILE)
    console.log(`  已写入: ${rel} (共 ${JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8')).data.length} 条记录)`)
  }

  console.log('\n========================================')
}

main().catch((err) => {
  console.error('爬取失败:', err.message)
  process.exit(1)
})
