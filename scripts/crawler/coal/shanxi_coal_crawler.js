#!/usr/bin/env node

/**
 * 山西煤炭周度价格（太原煤炭交易中心公开数据）
 *
 * 配置：scripts/crawler/framework/crawler_config.js → ctctcShanxiCoal
 * 数据写入：stock/coal/shanxi_*.json（与现有三个指标一致，另增无烟块煤）
 *
 * 用法：node scripts/crawler/coal/shanxi_coal_crawler.js
 */

'use strict'

const fs = require('fs')
const path = require('path')
const axios = require('axios')

const config = require('../framework/crawler_config.js').ctctcShanxiCoal

const STOCK_ROOT = path.join(__dirname, '../../../stock')
const RETRY_DELAY_MS = 2000

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * @param {string} url
 * @returns {Promise<{ message: string, data: Array<Record<string, unknown>> }>}
 */
async function fetchHistoryJson(url) {
  const max = config.maxRetries || 3
  let lastErr
  for (let i = 0; i < max; i++) {
    try {
      const res = await axios.get(url, {
        timeout: config.timeout || 30000,
        headers: {
          Accept: 'application/json',
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Referer: config.indexPageUrl || 'https://cj.ctctc.cn/',
        },
      })
      return res.data
    } catch (e) {
      lastErr = e
      if (i < max - 1) await sleep(RETRY_DELAY_MS * (i + 1))
    }
  }
  throw lastErr
}

/**
 * @param {string} filePath
 * @param {Array<{ date: string, price: number }>} fromApi
 */
function mergeAndWrite(filePath, fromApi) {
  let existing = []
  if (fs.existsSync(filePath)) {
    try {
      existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    } catch {
      existing = []
    }
  }

  const map = {}
  for (const r of existing) {
    if (r && r.date) map[r.date] = r
  }
  for (const r of fromApi) {
    map[r.date] = r
  }

  const merged = Object.values(map).sort((a, b) => a.date.localeCompare(b.date))
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(merged, null, 2), 'utf-8')
  return { count: merged.length, latest: merged[merged.length - 1] }
}

async function main() {
  console.log('========================================')
  console.log('  山西煤炭价格（CTCTC zhIndexDataAll）')
  console.log('========================================')

  const body = await fetchHistoryJson(config.historyUrl)
  if (!body || !Array.isArray(body.data)) {
    console.error('接口返回异常，无 data 数组')
    process.exit(1)
  }

  const byCode = {}
  for (const row of body.data) {
    const code = row.INDEX_CODE
    if (!code) continue
    if (!byCode[code]) byCode[code] = []
    byCode[code].push(row)
  }

  const dataDir = path.join(STOCK_ROOT, config.dataDir || 'coal')
  const targets = config.targets || {}

  for (const key of Object.keys(targets)) {
    const t = targets[key]
    const code = t.indexCode
    const rows = byCode[code]
    if (!rows || rows.length === 0) {
      console.warn(`未找到指数 ${code}（${t.name}），跳过`)
      continue
    }

    const series = rows
      .map((r) => ({
        date: String(r.STAGE_DATE || '').slice(0, 10),
        price: Number(r.CURRENT_PRICE),
      }))
      .filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.date) && !Number.isNaN(r.price))

    const out = path.join(dataDir, t.dataFile)
    const { count, latest } = mergeAndWrite(out, series)
    console.log(`${t.name} (${code}) → ${t.dataFile}  共 ${count} 条  最新 ${latest.date}  ${latest.price}`)
  }

  console.log('\n完成。')
}

main().catch((err) => {
  console.error('爬取失败:', err.message)
  process.exit(1)
})
