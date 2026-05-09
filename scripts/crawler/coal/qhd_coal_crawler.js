#!/usr/bin/env node

/**
 * CCTD 秦皇岛动力煤综合交易价爬取脚本
 *
 * 数据来源：CCTD 中国煤炭市场网首页
 * URL: https://www.cctd.com.cn/index.php?Ar=iq
 *
 * 该页面静态 HTML 中包含三个热值的综合交易价：
 *   713 元/吨  变化：12  1.71%  日期：05-08 综合交易5500
 *   646 元/吨  变化：11  1.73%  日期：05-08 综合交易5000
 *   578 元/吨  变化：11  1.94%  日期：05-08 综合交易4500
 *
 * 功能：
 *   - 增量更新 stock/coal/qhd_coal_{5500k,5000k,4500k}.json，按日期去重
 *
 * 使用方法：
 *   node scripts/crawler/coal/qhd_coal_crawler.js
 */

'use strict'

const fs = require('fs')
const path = require('path')
const axios = require('axios')

const PAGE_URL = 'https://www.cctd.com.cn/index.php?Ar=iq'

const OUTPUT_FILES = {
  5500: path.join(__dirname, '../../../stock/coal/qhd_coal_5500k.json'),
  5000: path.join(__dirname, '../../../stock/coal/qhd_coal_5000k.json'),
  4500: path.join(__dirname, '../../../stock/coal/qhd_coal_4500k.json'),
}

const MAX_RETRIES = 3
const RETRY_DELAY = 2000

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 带重试的 HTTP GET，自动处理 GBK 编码
 */
async function fetchPage(url) {
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      console.log(`请求页面 (${i + 1}/${MAX_RETRIES})...`)
      const res = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9',
          'Accept-Encoding': 'gzip, deflate',
          Referer: 'https://www.cctd.com.cn/',
        },
      })
      return new TextDecoder('gbk').decode(res.data)
    } catch (err) {
      console.warn(`请求失败: ${err.message}`)
      if (i === MAX_RETRIES - 1) throw err
      await sleep(RETRY_DELAY * (i + 1))
    }
  }
}

/**
 * 将 MM-DD 日期补全为 YYYY-MM-DD
 * 若月份比当前月超前 2 个月以上，认为是上一年的数据
 */
function resolveYear(mmdd) {
  const now = new Date()
  const year = now.getFullYear()
  const month = parseInt(mmdd.slice(0, 2), 10)
  const fullDate = `${year}-${mmdd}`
  // 如果解析出的月份比当前月超前超过 2 个月，说明是去年数据
  if (month > now.getMonth() + 1 + 2) {
    return `${year - 1}-${mmdd}`
  }
  return fullDate
}

/**
 * 从页面 HTML 中提取三个热值的综合交易价
 *
 * 页面结构（每个价格块）：
 *   <em style="...">713</em></b>元/吨
 *   ...日期：05-08</span>
 *   ...<p ...>综合交易5500</p>
 */
function parsePrices(html) {
  // 匹配：<em>价格</em></b>元/吨 ... 日期：MM-DD</span> ... 综合交易{热值}</p>
  const pattern =
    /<em[^>]*>(\d+(?:\.\d+)?)<\/em>\s*<\/b>元\/吨[\s\S]{0,400}?日期[：:]\s*(\d{2}-\d{2})<\/span>[\s\S]{0,200}?综合交易(5500|5000|4500)</g

  const results = {}
  let m
  while ((m = pattern.exec(html)) !== null) {
    const grade = parseInt(m[3], 10)
    if (!results[grade]) {
      results[grade] = {
        price: parseFloat(m[1]),
        date: resolveYear(m[2]),
      }
    }
  }

  return results
}

/**
 * 增量合并并写入 JSON 文件
 */
function mergeAndSave(filePath, date, price) {
  let existing = []
  if (fs.existsSync(filePath)) {
    try { existing = JSON.parse(fs.readFileSync(filePath, 'utf-8')) } catch { /* 重建 */ }
  }

  const map = {}
  for (const r of existing) map[r.date] = r
  const prev = map[date]

  if (prev?.price === price) {
    console.log(`  ${path.basename(filePath)}: 无变化（${date}: ${price} 元/吨）`)
    return
  }

  const action = prev ? `更新 ${prev.price} → ${price}` : `追加 ${price}`
  console.log(`  ${path.basename(filePath)}: ${action} 元/吨（${date}）`)

  map[date] = { date, price }
  const sorted = Object.values(map).sort((a, b) => a.date.localeCompare(b.date))
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2), 'utf-8')
  console.log(`  ${path.basename(filePath)}: 已保存（共 ${sorted.length} 条）`)
}

async function main() {
  console.log('========================================')
  console.log('  CCTD 秦皇岛动力煤综合交易价爬虫')
  console.log('  5500 / 5000 / 4500 大卡')
  console.log('========================================\n')

  const html = await fetchPage(PAGE_URL)
  const prices = parsePrices(html)

  const grades = Object.keys(prices).map(Number)
  if (grades.length === 0) {
    console.error('未能解析到价格，请检查页面结构是否变化')
    process.exit(1)
  }

  console.log('\n解析结果：')
  grades.forEach((g) => console.log(`  综合交易${g}大卡  ${prices[g].date}  ${prices[g].price} 元/吨`))

  console.log('\n更新文件：')
  for (const grade of [5500, 5000, 4500]) {
    if (!prices[grade]) {
      console.log(`  qhd_coal_${grade}k.json: 未获取到数据，跳过`)
      continue
    }
    mergeAndSave(OUTPUT_FILES[grade], prices[grade].date, prices[grade].price)
  }

  console.log('\n========================================')
}

main().catch((err) => {
  console.error('爬取失败:', err.message)
  process.exit(1)
})
