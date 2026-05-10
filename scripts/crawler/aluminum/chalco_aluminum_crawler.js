#!/usr/bin/env node

/**
 * 中国铝业（Chalco）产品报价爬虫
 *
 * 数据来源：https://www.chalco.com.cn/cpyfw/cpbj/2020bj/index.html
 * 配置：scripts/crawler/framework/crawler_config.js → chalcoAluminum
 * 数据写入：
 *   stock/aluminum/aluminum_ingot.json  — 铝锭现货价（华东/华南/西南/中原）
 *   stock/aluminum/alumina.json         — 氧化铝现货价（山东/河南/山西/贵州/广西）
 *
 * 分页规律：
 *   第1页：index.html
 *   第2页：index_1.html
 *   第3页：index_2.html  ...依此类推
 *
 * 用法：
 *   node scripts/crawler/aluminum/chalco_aluminum_crawler.js           # 爬取2025-2026年
 *   node scripts/crawler/aluminum/chalco_aluminum_crawler.js 2026      # 爬取指定年份
 *   node scripts/crawler/aluminum/chalco_aluminum_crawler.js 2025 2026 # 多年份
 */

'use strict'

const fs = require('fs')
const path = require('path')
const axios = require('axios')
const cheerio = require('cheerio')

const config = require('../framework/crawler_config.js').chalcoAluminum

const STOCK_ROOT = path.join(__dirname, '../../../stock')

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 带重试的 HTTP GET，自动识别 GBK / UTF-8 编码
 * @param {string} url
 * @returns {Promise<string>} 解码后的 HTML 字符串
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
          'Accept-Encoding': 'gzip, deflate',
          Referer: 'https://www.chalco.com.cn/',
        },
      })

      // 先用 UTF-8 预览页头，检测 meta charset 声明
      const preview = Buffer.from(res.data).slice(0, 2000).toString('binary')
      const charsetMatch = preview.match(/charset[=\s"']+([a-zA-Z0-9-]+)/i)
      const charset = charsetMatch ? charsetMatch[1].toLowerCase() : 'utf-8'

      if (charset === 'gbk' || charset === 'gb2312' || charset === 'gb18030') {
        return new TextDecoder('gbk').decode(res.data)
      }
      return Buffer.from(res.data).toString('utf-8')
    } catch (err) {
      lastErr = err
      console.warn(`  请求失败: ${err.message}`)
      if (i < max - 1) await sleep((config.delayBetweenRequests || 2500) * (i + 1))
    }
  }
  throw lastErr
}

/**
 * 将相对 URL 转换为绝对 URL
 * @param {string} href
 * @param {string} baseUrl 当前页面 URL
 * @returns {string}
 */
function resolveUrl(href, baseUrl) {
  if (!href) return null
  if (href.startsWith('http://') || href.startsWith('https://')) return href
  if (href.startsWith('/')) {
    const u = new URL(baseUrl)
    return `${u.protocol}//${u.host}${href}`
  }
  return new URL(href, baseUrl).href
}

/**
 * 解析列表页，提取所有日报报价链接
 *
 * 页面 HTML 中每条历史报价类似：
 *   <li>
 *     <span>2026-05-08</span>
 *     <a href="...">中国铝业2026年5月8日产品报价</a>
 *     <a href="...">查看</a>
 *   </li>
 *
 * @param {string} html
 * @param {string} pageUrl 当前列表页 URL（用于解析相对链接）
 * @returns {Array<{date: string, url: string}>}
 */
function parseListPage(html, pageUrl) {
  const $ = cheerio.load(html)
  const items = []
  const seen = new Set()

  // 策略1：查找标题匹配 "中国铝业YYYY年M月D日产品报价" 的链接
  $('a[href]').each((_, el) => {
    const text = $(el).text().trim()
    const href = $(el).attr('href')

    const titleMatch = text.match(/中国铝业(\d{4})年(\d{1,2})月(\d{1,2})日产品报价/)
    if (titleMatch) {
      const y = titleMatch[1]
      const m = titleMatch[2].padStart(2, '0')
      const d = titleMatch[3].padStart(2, '0')
      const date = `${y}-${m}-${d}`
      const url = resolveUrl(href, pageUrl)
      if (url && !seen.has(date)) {
        seen.add(date)
        items.push({ date, url })
      }
    }
  })

  // 策略2：若策略1没找到，查找包含 YYYY-MM-DD 日期文本和链接的父容器
  if (items.length === 0) {
    $('li, .item, .news-item, .list-item, tr').each((_, el) => {
      const container = $(el)
      const text = container.text()
      const dateMatch = text.match(/(\d{4})-(\d{2})-(\d{2})/)
      if (!dateMatch) return

      const date = dateMatch[0]
      const link = container.find('a[href]').last() // "查看" 链接通常在最后
      const href = link.attr('href')
      const url = resolveUrl(href, pageUrl)
      if (url && !seen.has(date)) {
        seen.add(date)
        items.push({ date, url })
      }
    })
  }

  return items
}

/**
 * 从单行 TD 文本数组中提取在指定价格范围内的数字
 * @param {string[]} cells
 * @param {number} min
 * @param {number} max
 * @returns {number[]}
 */
function extractPrices(cells, min, max) {
  return cells
    .map((c) => c.replace(/,/g, '').trim())
    .filter((c) => /^\d+$/.test(c))
    .map(Number)
    .filter((n) => n >= min && n <= max)
}

/**
 * 解析报价详情页，提取铝锭与氧化铝价格
 *
 * 铝锭行（AL99.70）：华东、华南、西南、中原（4个价格，约20000+）
 * 氧化铝行：山东、河南、山西、贵州、广西（5个价格，约2000-4000）
 *
 * @param {string} html
 * @param {string} date
 * @returns {{ date: string, aluminumIngot: object|null, alumina: object|null }}
 */
function parseDetailPage(html, date) {
  const $ = cheerio.load(html)
  const ingotCfg = config.targets.aluminumIngot
  const aluminaCfg = config.targets.alumina

  let aluminumIngot = null
  let alumina = null

  $('tr').each((_, tr) => {
    if (aluminumIngot && alumina) return // 两种数据都找到了，提前退出

    const cells = $(tr)
      .find('td')
      .map((_, td) => $(td).text().trim())
      .get()

    const rowText = cells.join(' ')

    // 铝锭行识别：包含"铝锭"或"AL99.70"
    if (!aluminumIngot && (rowText.includes('铝锭') || rowText.includes('AL99.70'))) {
      const prices = extractPrices(cells, ingotCfg.priceMin, ingotCfg.priceMax)
      if (prices.length >= 4) {
        aluminumIngot = {}
        ingotCfg.regions.forEach((key, i) => {
          aluminumIngot[key] = prices[i]
        })
      }
    }

    // 氧化铝行识别：包含"氧化铝"
    if (!alumina && rowText.includes('氧化铝')) {
      const prices = extractPrices(cells, aluminaCfg.priceMin, aluminaCfg.priceMax)
      if (prices.length >= 5) {
        alumina = {}
        aluminaCfg.regions.forEach((key, i) => {
          alumina[key] = prices[i]
        })
      }
    }
  })

  return { date, aluminumIngot, alumina }
}

/**
 * 增量合并并写入 JSON 文件（按日期去重，倒序排列）
 * @param {string} filePath
 * @param {object[]} newRecords
 * @param {object} meta 顶层元信息（title / unit / source / regions）
 */
function mergeAndWrite(filePath, newRecords, meta) {
  let existing = { ...meta, updatedAt: '', data: [] }

  if (fs.existsSync(filePath)) {
    try {
      existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    } catch {
      // 文件损坏，重建
    }
  }

  if (!Array.isArray(existing.data)) existing.data = []
  existing.updatedAt = new Date().toISOString().slice(0, 10)

  // 以 date 为键合并（新数据覆盖旧数据）
  const map = {}
  for (const r of existing.data) map[r.date] = r
  for (const r of newRecords) map[r.date] = r

  // 按日期倒序排列
  existing.data = Object.values(map).sort((a, b) => b.date.localeCompare(a.date))

  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), 'utf-8')
}

/**
 * 爬取单个报价详情页
 * @param {{date: string, url: string}} item
 * @returns {Promise<{date, aluminumIngot, alumina}>}
 */
async function crawlDetailPage(item) {
  try {
    const html = await fetchHtml(item.url)
    const parsed = parseDetailPage(html, item.date)

    if (parsed.aluminumIngot) {
      const cfg = config.targets.aluminumIngot
      const vals = cfg.regions.map((k) => `${cfg.regionNames[cfg.regions.indexOf(k)]}:${parsed.aluminumIngot[k]}`).join(' ')
      console.log(`    铝锭: ${vals}`)
    } else {
      console.log('    铝锭: 未解析到')
    }

    if (parsed.alumina) {
      const cfg = config.targets.alumina
      const vals = cfg.regions.map((k) => `${cfg.regionNames[cfg.regions.indexOf(k)]}:${parsed.alumina[k]}`).join(' ')
      console.log(`    氧化铝: ${vals}`)
    } else {
      console.log('    氧化铝: 未解析到')
    }

    return parsed
  } catch (err) {
    console.warn(`    详情页爬取失败: ${err.message}`)
    return { date: item.date, aluminumIngot: null, alumina: null }
  }
}

async function main() {
  console.log('========================================')
  console.log('  中国铝业（Chalco）产品报价爬虫')
  console.log('  铝锭 & 氧化铝 2025-2026 历史数据')
  console.log('========================================')

  const args = process.argv.slice(2).map(Number).filter((n) => n > 2000 && n < 2100)
  const targetYears = args.length > 0 ? new Set(args) : new Set([2025, 2026])
  const minYear = Math.min(...targetYears)

  console.log(`目标年份: ${[...targetYears].sort().join(', ')}`)

  const baseUrl = config.listBaseUrl
  const ingotRecords = []
  const aluminaRecords = []

  let pageNum = 0
  let shouldStop = false

  while (!shouldStop) {
    // 构建分页 URL：第1页 index.html，后续 index_{n}.html
    const listUrl =
      pageNum === 0 ? `${baseUrl}/index.html` : `${baseUrl}/index_${pageNum}.html`

    console.log(`\n[列表页 ${pageNum + 1}] ${listUrl}`)

    let listHtml
    try {
      listHtml = await fetchHtml(listUrl)
    } catch (err) {
      console.warn(`列表页获取失败，停止翻页: ${err.message}`)
      break
    }

    const items = parseListPage(listHtml, listUrl)

    if (items.length === 0) {
      console.log('  当前页未找到报价链接，停止翻页')
      break
    }

    console.log(`  找到 ${items.length} 条报价链接`)

    // 检查该页最早日期，决定是否继续翻页
    const datesOnPage = items.map((i) => i.date).sort()
    const earliestOnPage = datesOnPage[0]
    const earliestYear = parseInt(earliestOnPage.split('-')[0], 10)

    for (const item of items) {
      const year = parseInt(item.date.split('-')[0], 10)

      if (!targetYears.has(year)) {
        // 该日期不在目标年份，跳过（但不停止，因为页内可能混有目标年份数据）
        if (year < minYear) {
          console.log(`  日期 ${item.date} 已超出范围，本页后续跳过`)
          shouldStop = true
        }
        continue
      }

      console.log(`\n  爬取 ${item.date}: ${item.url}`)
      await sleep(config.delayBetweenRequests || 2500)

      const result = await crawlDetailPage(item)

      if (result.aluminumIngot) {
        ingotRecords.push({ date: result.date, ...result.aluminumIngot })
      }
      if (result.alumina) {
        aluminaRecords.push({ date: result.date, ...result.alumina })
      }
    }

    if (earliestYear < minYear) shouldStop = true

    if (!shouldStop) {
      pageNum++
      await sleep(config.delayBetweenRequests || 2500)
    }
  }

  // 写入 JSON 文件
  const dataDir = path.join(STOCK_ROOT, config.dataDir)

  if (ingotRecords.length > 0) {
    const ingotFile = path.join(dataDir, config.targets.aluminumIngot.dataFile)
    const ingotMeta = {
      title: '中国铝业铝锭现货报价',
      unit: '元/吨',
      source: 'https://www.chalco.com.cn/cpyfw/cpbj/',
      regions: Object.fromEntries(
        config.targets.aluminumIngot.regions.map((k, i) => [k, config.targets.aluminumIngot.regionNames[i]])
      ),
    }
    mergeAndWrite(ingotFile, ingotRecords, ingotMeta)
    console.log(`\n铝锭数据已写入: ${path.relative(process.cwd(), ingotFile)} (${ingotRecords.length} 条)`)
  } else {
    console.log('\n警告：未获取到铝锭数据')
  }

  if (aluminaRecords.length > 0) {
    const aluminaFile = path.join(dataDir, config.targets.alumina.dataFile)
    const aluminaMeta = {
      title: '中国铝业氧化铝现货报价',
      unit: '元/吨',
      source: 'https://www.chalco.com.cn/cpyfw/cpbj/',
      regions: Object.fromEntries(
        config.targets.alumina.regions.map((k, i) => [k, config.targets.alumina.regionNames[i]])
      ),
    }
    mergeAndWrite(aluminaFile, aluminaRecords, aluminaMeta)
    console.log(`氧化铝数据已写入: ${path.relative(process.cwd(), aluminaFile)} (${aluminaRecords.length} 条)`)
  } else {
    console.log('警告：未获取到氧化铝数据')
  }

  console.log('\n========================================')
  console.log(`完成。铝锭 ${ingotRecords.length} 条，氧化铝 ${aluminaRecords.length} 条。`)
  console.log('========================================')
}

main().catch((err) => {
  console.error('爬取失败:', err.message)
  process.exit(1)
})
