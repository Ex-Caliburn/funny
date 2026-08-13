#!/usr/bin/env node

/**
 * 海关总署 — 进出口商品国别（地区）总值表（xls）下载
 *
 * 列表页：http://www.customs.gov.cn/customs/302249/zfxxgk/fdzdgknr/302274/302277/{year}/index.html
 * 保存目录：stock/customs_country/
 *
 * 用法（默认仅抓取当前年）：
 *   node scripts/crawler/customs_country/customs_country_crawler.js
 *   node scripts/crawler/customs_country/customs_country_crawler.js --years 2026
 *   node scripts/crawler/customs_country/customs_country_crawler.js --recent-months 2
 *   node scripts/crawler/customs_country/customs_country_crawler.js --no-skip --no-parse
 */

'use strict'

const fs = require('fs')
const path = require('path')
const os = require('os')
const { spawn } = require('child_process')
const axios = require('axios')
const cheerio = require('cheerio')

const CUSTOMS_ORIGIN = 'http://www.customs.gov.cn'

const YEAR_PATH_MAP = {
  2026: '2026',
  2025: '6348926',
  2024: '5668662',
  2023: '4899681',
  2022: '4185050',
  2021: '3512606',
  2020: '3227050',
  2019: '3250476',
  2018: '3250481',
  2017: '3250485',
  2016: '3250487',
  2015: '3250493',
  2014: '3250500',
}

const BASE_URL =
  'http://www.customs.gov.cn/customs/302249/zfxxgk/fdzdgknr/302274/302277/{path}/index.html'

const DOWNLOAD_DIR = path.join(__dirname, '../../../stock/customs_country')
const PARSE_SCRIPT = path.join(__dirname, '../../tools/customs_country_xls_to_json.js')

/** 匹配「进出口商品国别（地区）总值表」人民币版 */
const TITLE_KEYWORDS = ['进出口', '国别', '总值']
const EXCLUDE_KEYWORDS = [
  '美元值',
  '美元',
  '部分国家',
  '特定地区',
  '类章',
  '贸易方式',
]

const DELAY_MS = 1500
const TIMEOUT_MS = 30000
const MAX_RETRIES = 3

const COMMON_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9',
  Connection: 'keep-alive',
}

const REAL_CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const USER_DATA_DIR = path.join(os.tmpdir(), 'pw-customs-export-profile')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let _browserCtx = null

function runParseScript() {
  return new Promise((resolve, reject) => {
    console.log('\n开始同步汇总 JSON: customs_country_rmb.json')
    const child = spawn('node', [PARSE_SCRIPT], {
      cwd: path.join(__dirname, '../../..'),
      stdio: 'inherit',
    })
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`parse 退出码 ${code}`))
    })
    child.on('error', reject)
  })
}

function matchTitle(text) {
  const t = (text || '').replace(/\s+/g, '')
  if (!t) return false
  if (!TITLE_KEYWORDS.every((kw) => t.includes(kw))) return false
  if (EXCLUDE_KEYWORDS.some((kw) => t.includes(kw))) return false
  return true
}

function resolveUrl(href, baseUrl) {
  if (!href) return null
  if (href.startsWith('http')) return href
  try {
    return new URL(href, baseUrl).href
  } catch {
    if (href.startsWith('/')) return `${CUSTOMS_ORIGIN}${href}`
    return null
  }
}

function parsePeriod(title) {
  const t = title || ''
  const rangeM = t.match(/(\d{4})年\d{1,2}至(\d{1,2})月/)
  if (rangeM) {
    const year = Number(rangeM[1])
    const month = Number(rangeM[2])
    return { year, month, dateStr: `${rangeM[1]}-${String(month).padStart(2, '0')}` }
  }
  const m = t.match(/(\d{4})年(\d{1,2})月/)
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2])
  return { year, month, dateStr: `${m[1]}-${String(month).padStart(2, '0')}` }
}

function buildFilename(title, fileUrl) {
  const ext = (fileUrl.match(/\.(xlsx?)(\?.*)?$/i) || [])[1] || 'xls'
  const period = parsePeriod(title)
  const datePrefix = period ? period.dateStr : new Date().toISOString().slice(0, 10)
  const cleanTitle = title
    .replace(/^[（(]\d+[）)]\s*/, '')
    .replace(/[（(][^（(）)]*[）)]/g, '')
    .replace(/[\\/:*?"<>|]/g, '_')
    .trim()
  return `${datePrefix}_${cleanTitle}.xls`
}

async function getBrowser() {
  if (_browserCtx) return _browserCtx
  const { chromium } = require('playwright')
  _browserCtx = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    executablePath: REAL_CHROME_PATH,
    args: ['--disable-blink-features=AutomationControlled'],
    ignoreDefaultArgs: ['--enable-automation'],
    locale: 'zh-CN',
  })
  return _browserCtx
}

async function closeBrowser() {
  if (_browserCtx) {
    await _browserCtx.close().catch(() => {})
    _browserCtx = null
  }
}

async function fetchHtmlViaBrowser(url) {
  const browser = await getBrowser()
  const page = await browser.newPage()
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: TIMEOUT_MS }).catch(() => {})
    await page.waitForTimeout(3000)
    return await page.content()
  } finally {
    await page.close()
  }
}

async function fetchHtml(url) {
  return fetchHtmlViaBrowser(url)
}

async function downloadFile(fileUrl, savePath, referer) {
  let lastErr
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const res = await axios.get(fileUrl, {
        responseType: 'arraybuffer',
        timeout: TIMEOUT_MS,
        validateStatus: () => true,
        headers: {
          ...COMMON_HEADERS,
          Referer: referer || CUSTOMS_ORIGIN,
        },
      })
      if (res.status !== 200) throw new Error(`HTTP ${res.status}`)
      fs.writeFileSync(savePath, Buffer.from(res.data))
      return
    } catch (e) {
      lastErr = e
      console.warn(`  下载重试 (${i + 1}/${MAX_RETRIES}): ${e.message}`)
      if (i < MAX_RETRIES - 1) await sleep(2000 * (i + 1))
    }
  }
  throw lastErr
}

function parseListPage(html, pageUrl) {
  const $ = cheerio.load(html)
  const items = []
  const seen = new Set()

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href')
    if (!href || /^javascript:/i.test(href)) return
    const text = $(el).text().replace(/\s+/g, ' ').trim()
    if (!matchTitle(text)) return
    if (/\.xlsx?$/i.test(href)) {
      const abs = resolveUrl(href, pageUrl)
      if (!abs || seen.has(abs)) return
      seen.add(abs)
      items.push({ title: text, detailUrl: null, fileUrl: abs })
      return
    }
    const abs = resolveUrl(href, pageUrl)
    if (!abs || seen.has(abs)) return
    seen.add(abs)
    items.push({ title: text, detailUrl: abs })
  })

  if (items.length > 0) return items

  $('tr').each((_, tr) => {
    const cells = $(tr).find('td, th').toArray()
    if (cells.length < 2) return

    const rowLabel = $(cells[0]).text().replace(/\s+/g, '').trim()
    if (!matchTitle(rowLabel)) return

    cells.slice(1).forEach((cell) => {
      $(cell)
        .find('a[href]')
        .each((_, a) => {
          const href = $(a).attr('href')
          if (!href || /^javascript:/i.test(href)) return
          const monthText = $(a).text().replace(/\s+/g, '').trim()
          const mMatch = monthText.match(/^(\d{1,2})月$/)
          if (!mMatch) return
          const month = mMatch[1]

          const abs = resolveUrl(href, pageUrl)
          if (!abs || seen.has(abs)) return
          seen.add(abs)

          const yearMatch = (abs || '').match(/\/customs\/(\d{4})-\d{2}\//)
          const yearHint = yearMatch ? yearMatch[1] : ''
          const title = yearHint
            ? `${rowLabel}（${yearHint}年${month}月）`
            : `${rowLabel}（${month}月）`

          items.push({ title, detailUrl: abs })
        })
    })
  })

  return items
}

function parseDetailPage(html, pageUrl) {
  const $ = cheerio.load(html)
  const xlsLinks = []

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href')
    if (!href || /^javascript:/i.test(href)) return
    if (!/\.xlsx?$/i.test(href)) return
    const abs = resolveUrl(href, pageUrl)
    if (!abs) return
    const text = $(el).text().trim()
    xlsLinks.push({ text, url: abs })
  })

  if (xlsLinks.length === 0) return null
  const dl = xlsLinks.find((l) => l.text === '下载')
  return (dl || xlsLinks[0]).url
}

async function processItem(item, skipExisting) {
  let fileUrl = item.fileUrl || null

  if (!fileUrl && item.detailUrl) {
    let html
    try {
      html = await fetchHtml(item.detailUrl)
    } catch (e) {
      console.warn(`  ✗ 详情页加载失败: ${e.message} — ${item.detailUrl}`)
      return null
    }
    fileUrl = parseDetailPage(html, item.detailUrl)
    if (!fileUrl) {
      console.warn(`  ✗ 未找到 XLS 下载链接: ${item.detailUrl}`)
      return null
    }
  }

  if (!fileUrl) return null

  const filename = buildFilename(item.title, fileUrl)
  const savePath = path.join(DOWNLOAD_DIR, filename)

  if (skipExisting && fs.existsSync(savePath)) {
    const size = (fs.statSync(savePath).size / 1024).toFixed(1)
    console.log(`  ○ 已存在，跳过: ${filename} (${size} KB)`)
    return savePath
  }

  console.log(`  ↓ 下载: ${filename}`)
  try {
    await downloadFile(fileUrl, savePath, item.detailUrl || fileUrl)
    const size = (fs.statSync(savePath).size / 1024).toFixed(1)
    console.log(`  ✓ 保存成功: ${filename} (${size} KB)`)
    await sleep(DELAY_MS)
    return savePath
  } catch (e) {
    console.warn(`  ✗ 下载失败: ${e.message}`)
    return null
  }
}

async function fetchYearItems(year) {
  const pathSeg = YEAR_PATH_MAP[year]
  if (!pathSeg) {
    console.warn(`\n── ${year} 年：未找到路径映射，跳过（请在 YEAR_PATH_MAP 中补充）`)
    return []
  }
  const url = BASE_URL.replace('{path}', pathSeg)
  console.log(`\n── ${year} 年列表页: ${url}`)

  let html
  try {
    html = await fetchHtml(url)
  } catch (e) {
    console.error(`  ✗ 列表页加载失败: ${e.message}`)
    return []
  }

  const items = parseListPage(html, url)
  console.log(`  找到 ${items.length} 条匹配链接`)
  return items
}

function filterRecentMonthItems(items, monthCount) {
  const withPeriod = items
    .map((item) => ({ item, period: parsePeriod(item.title) }))
    .filter((x) => x.period)

  const periodKeys = [...new Set(withPeriod.map((x) => x.period.dateStr))]
  periodKeys.sort((a, b) => b.localeCompare(a))
  const targetPeriods = new Set(periodKeys.slice(0, monthCount))

  return withPeriod.filter((x) => targetPeriods.has(x.period.dateStr)).map((x) => x.item)
}

async function downloadItems(items, skipExisting) {
  const saved = []
  for (const item of items) {
    console.log(`  → ${item.title.slice(0, 60)}`)
    const file = await processItem(item, skipExisting)
    if (file) saved.push(file)
  }
  return saved
}

async function crawlYear(year, skipExisting) {
  const items = await fetchYearItems(year)
  return downloadItems(items, skipExisting)
}

async function crawlRecentMonths(monthCount, skipExisting) {
  const currentYear = new Date().getFullYear()
  const years = [currentYear, currentYear - 1]

  const allItems = []
  for (const year of years) {
    const items = await fetchYearItems(year)
    allItems.push(...items)
  }

  const filtered = filterRecentMonthItems(allItems, monthCount)
  const periods = [...new Set(filtered.map((item) => parsePeriod(item.title)?.dateStr).filter(Boolean))]
  periods.sort((a, b) => b.localeCompare(a))
  console.log(`\n最近 ${monthCount} 个月: ${periods.join(', ') || '（无匹配）'}`)
  console.log(`待下载 ${filtered.length} 条（共扫描 ${allItems.length} 条）`)

  return downloadItems(filtered, skipExisting)
}

function parseArgs(argv) {
  const currentYear = new Date().getFullYear()
  let startYear = currentYear
  let endYear = currentYear
  let skipExisting = true
  let noParse = false
  let recentMonths = null
  let yearsExplicit = false
  let minYearTouched = false
  let maxYearTouched = false

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--no-skip') {
      skipExisting = false
    } else if (a === '--no-parse') {
      noParse = true
    } else if (a === '--recent-months' && argv[i + 1]) {
      recentMonths = Math.max(1, Number(argv[++i]) || 1)
    } else if (/^--recent-months=/.test(a)) {
      recentMonths = Math.max(1, Number(a.split('=')[1]) || 1)
    } else if (a === '--min-year' && argv[i + 1]) {
      startYear = Number(argv[++i])
      minYearTouched = true
    } else if (/^--min-year=/.test(a)) {
      startYear = Number(a.split('=')[1])
      minYearTouched = true
    } else if (a === '--max-year' && argv[i + 1]) {
      endYear = Number(argv[++i])
      maxYearTouched = true
    } else if (/^--max-year=/.test(a)) {
      endYear = Number(a.split('=')[1])
      maxYearTouched = true
    } else if ((a === '--years' || a === '-y') && argv[i + 1]) {
      yearsExplicit = true
      const raw = argv[++i]
      const m = raw.match(/^(\d{4})-(\d{4})$/)
      if (m) {
        startYear = Number(m[1])
        endYear = Number(m[2])
      } else if (/^\d{4}$/.test(raw)) {
        startYear = Number(raw)
        endYear = Number(raw)
      }
    } else if (/^--years=/.test(a)) {
      yearsExplicit = true
      const raw = a.split('=')[1]
      const m = raw.match(/^(\d{4})-(\d{4})$/)
      if (m) {
        startYear = Number(m[1])
        endYear = Number(m[2])
      } else if (/^\d{4}$/.test(raw)) {
        startYear = Number(raw)
        endYear = Number(raw)
      }
    } else if (/^\d{4}-\d{4}$/.test(a)) {
      yearsExplicit = true
      const [s, e] = a.split('-').map(Number)
      startYear = s
      endYear = e
    } else if (/^\d{4}$/.test(a)) {
      yearsExplicit = true
      startYear = Number(a)
      endYear = Number(a)
    }
  }

  if (!yearsExplicit) {
    if (minYearTouched && !maxYearTouched) {
      endYear = currentYear
    } else if (maxYearTouched && !minYearTouched) {
      startYear = endYear
    }
  }

  if (startYear > endYear) {
    const t = startYear
    startYear = endYear
    endYear = t
  }

  if (yearsExplicit) recentMonths = null

  return { startYear, endYear, skipExisting, noParse, recentMonths }
}

async function main() {
  const { startYear, endYear, skipExisting, noParse, recentMonths } = parseArgs(process.argv.slice(2))

  if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true })
  }

  console.log('海关总署 — 进出口商品国别（地区）总值表下载')
  if (recentMonths) {
    console.log(`模式: 最近 ${recentMonths} 个月`)
  } else {
    console.log(`年份范围: ${startYear} - ${endYear}`)
  }
  console.log(`保存目录: ${DOWNLOAD_DIR}`)
  console.log(`跳过已存在文件: ${skipExisting}`)

  const allFiles = []

  try {
    if (recentMonths) {
      const files = await crawlRecentMonths(recentMonths, skipExisting)
      allFiles.push(...files)
    } else {
      for (let year = startYear; year <= endYear; year++) {
        const files = await crawlYear(year, skipExisting)
        allFiles.push(...files)
      }
    }
  } finally {
    await closeBrowser()
  }

  console.log(`\n完成，共保存 ${allFiles.length} 个文件`)
  allFiles.forEach((f) => console.log(' ', path.basename(f)))

  if (!noParse) {
    await runParseScript()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
