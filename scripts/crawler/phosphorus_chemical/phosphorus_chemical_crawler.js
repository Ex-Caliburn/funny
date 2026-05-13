#!/usr/bin/env node

/**
 * 磷化工产品价格爬虫（周度，数据来自 p2o5.com）
 *
 * 数据来源：https://cms.p2o5.com/p2o5/pd/zh/list.jhtml
 * 配置：scripts/crawler/framework/crawler_config.js → phosphorusChemicalPrices
 * 数据写入：stock/phosphorus_chemical/weekly_prices.json
 *
 * 接口一次返回全量历史数据（按周更新），脚本将按日期分组后增量写入 JSON。
 *
 * 使用方法：
 *   node scripts/crawler/phosphorus_chemical/phosphorus_chemical_crawler.js
 */

'use strict'

const fs = require('fs')
const path = require('path')
const axios = require('axios')

const config = require('../framework/crawler_config').phosphorusChemicalPrices

const OUTPUT_FILE = path.join(
  __dirname,
  '../../../stock',
  config.dataDir,
  config.dataFile
)

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 带重试的 HTTP GET，返回解析好的 JSON 对象
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
          Accept: 'application/json, text/plain, */*',
          'Accept-Language': 'zh-CN,zh;q=0.9',
          Referer: config.referer || 'https://p2o5.com/zh/',
        },
        responseType: 'json',
      })
      return res.data
    } catch (err) {
      lastErr = err
      console.warn(`  请求失败: ${err.message}`)
      if (i < max - 1) await sleep(config.delayBetweenRequests * (i + 1))
    }
  }
  throw lastErr
}

/**
 * 将 products 字段文本与配置中的 match（前缀）匹配，返回 target key 或 null
 * @param {string} productName
 * @returns {string|null}
 */
function matchTarget(productName) {
  for (const [key, cfg] of Object.entries(config.targets)) {
    const pattern = cfg.match || cfg.displayName
    if (productName.startsWith(pattern) || productName.includes(pattern)) {
      return key
    }
  }
  return null
}

/**
 * 将接口返回的全量记录按日期分组，每日取各品种最新的一条（id 最大）
 * @param {Array} records  接口 body 数组
 * @returns {Map<string, object>}  date → { date, <key>: price, ... }
 */
function groupByDate(records) {
  const best = new Map()

  for (const r of records) {
    const key = matchTarget(r.products)
    if (!key) continue

    const mapKey = `${r.recordDate}::${key}`
    const prev = best.get(mapKey)
    if (!prev || r.id > prev.id) {
      best.set(mapKey, r)
    }
  }

  const byDate = new Map()
  for (const r of best.values()) {
    const key = matchTarget(r.products)
    const date = r.recordDate
    if (!byDate.has(date)) byDate.set(date, { date })
    const snapshot = byDate.get(date)
    snapshot[key] = r.latestPrice
  }

  return byDate
}

/**
 * 增量合并写入 JSON 文件（按日期去重，倒序排列）
 * @param {Map<string, object>} byDate  groupByDate 返回结果
 */
function mergeAndSave(byDate) {
  const meta = {
    title: '磷化工产品价格（周度）',
    unit: '元/吨',
    source: config.apiUrl,
    products: Object.fromEntries(
      Object.entries(config.targets).map(([k, v]) => [k, v.displayName])
    ),
  }

  let existing = { ...meta, updatedAt: '', data: [] }
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      const saved = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'))
      existing.data = Array.isArray(saved.data) ? saved.data : []
    } catch {
      // 文件损坏，重建
    }
  }
  existing.updatedAt = new Date().toISOString().slice(0, 10)

  const map = {}
  for (const r of existing.data) map[r.date] = r
  let added = 0
  let updated = 0
  for (const [date, snapshot] of byDate) {
    const old = map[date]
    if (old) {
      updated++
      const pinned = Array.isArray(old._pinned) ? old._pinned : []
      if (pinned.length) {
        for (const field of pinned) {
          snapshot[field] = old[field]
        }
        snapshot._pinned = pinned
      }
    } else {
      added++
    }
    map[date] = snapshot
  }

  existing.data = Object.values(map).sort((a, b) => b.date.localeCompare(a.date))

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true })
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(existing, null, 2), 'utf-8')
  return { added, updated }
}

async function main() {
  console.log('==========================================')
  console.log('  磷化工价格爬虫（p2o5.com）')
  console.log('==========================================\n')

  let json
  try {
    json = await fetchJson(config.apiUrl)
  } catch (err) {
    console.error(`接口请求失败: ${err.message}`)
    process.exit(1)
  }

  const records = json.body
  if (!Array.isArray(records) || records.length === 0) {
    console.error('接口未返回有效数据，请检查接口地址或响应格式。')
    console.error('响应:', JSON.stringify(json).slice(0, 500))
    process.exit(1)
  }

  console.log(`\n接口返回 ${records.length} 条历史记录`)

  const byDate = groupByDate(records)
  console.log(`\n解析出 ${byDate.size} 个有效日期快照`)

  const latestDate = [...byDate.keys()].sort().reverse()[0]
  const latest = byDate.get(latestDate)
  console.log(`\n最新价格（${latestDate}）：`)
  for (const [key, cfg] of Object.entries(config.targets)) {
    const price = latest[key]
    const label = cfg.displayName || cfg.match
    if (price != null) {
      console.log(`  ${label.padEnd(24)} ${String(price).padStart(8)} ${cfg.unit}`)
    } else {
      console.warn(`  ${label.padEnd(24)} -- 本期无数据`)
    }
  }

  console.log('\n写入文件...')
  const { added, updated } = mergeAndSave(byDate)
  const rel = path.relative(process.cwd(), OUTPUT_FILE)
  const total = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8')).data.length
  console.log(`  已写入: ${rel}`)
  console.log(`  新增 ${added} 期，更新 ${updated} 期，共 ${total} 期记录`)

  console.log('\n==========================================')
}

main().catch((err) => {
  console.error('爬取失败:', err.message)
  process.exit(1)
})
