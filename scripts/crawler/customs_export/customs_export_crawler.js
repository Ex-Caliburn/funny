#!/usr/bin/env node

/**
 * 海关总署 — 出口主要商品量值表（xls）下载
 *
 * 数据页面规律：切换 URL 中的年份即可获取对应年份的数据列表
 * 列表页：http://www.customs.gov.cn/customs/302249/zfxxgk/fdzdgknr/302274/302277/{year}/index.html
 * 保存目录：stock/customs_export/
 *
 * 用法：
 *   node scripts/crawler/customs_export/customs_export_crawler.js
 *   node scripts/crawler/customs_export/customs_export_crawler.js --years 2024-2026
 *   node scripts/crawler/customs_export/customs_export_crawler.js --years 2025
 *   node scripts/crawler/customs_export/customs_export_crawler.js --no-skip
 */

'use strict'

const fs = require('fs')
const path = require('path')
const axios = require('axios')
const cheerio = require('cheerio')

// ─── 配置 ─────────────────────────────────────────────────────────────────────

const CUSTOMS_ORIGIN = 'http://www.customs.gov.cn'

/**
 * 年份 → 列表页路径段映射
 * 2026 年用年份本身，其余年份使用海关网站内部 ID
 * 新年份上线后在此补充（可从 2026 年列表页侧边栏链接中获取）
 */
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

const DOWNLOAD_DIR = path.join(__dirname, '../../../stock/customs_export')

/** 匹配目标链接的关键词（同时包含以下词才算命中） */
const TITLE_KEYWORDS = ['出口', '商品', '量值']
/** 排除词（含任意一个则跳过，过滤美元值版本及贸易方式量值表） */
const EXCLUDE_KEYWORDS = ['美元值', '美元', '贸易方式', '部分出口商品', '部分进口商品']

const DELAY_MS = 1500
const TIMEOUT_MS = 30000
const MAX_RETRIES = 3

/** 浏览器伪装请求头 */
const COMMON_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9',
  Connection: 'keep-alive',
}

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * 判断链接文字是否为目标数据
 * @param {string} text
 */
function matchTitle(text) {
  const t = (text || '').replace(/\s+/g, '')
  if (!t) return false
  if (!TITLE_KEYWORDS.every((kw) => t.includes(kw))) return false
  if (EXCLUDE_KEYWORDS.some((kw) => t.includes(kw))) return false
  return true
}

/**
 * 将相对 URL 解析为绝对 URL
 * @param {string} href
 * @param {string} baseUrl
 */
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

/**
 * 从标题中提取年月信息，用于文件命名
 * 支持 "2026年3月"（单月）和 "2026年1至3月"（累计月）两种格式
 * 累计月取最后一个月作为日期前缀
 * @param {string} title
 * @returns {{ year: number, month: number, dateStr: string } | null}
 */
function parsePeriod(title) {
  const t = title || ''
  // 累计月：2026年1至3月 → 取 3 月
  const rangeM = t.match(/(\d{4})年\d{1,2}至(\d{1,2})月/)
  if (rangeM) {
    const year = Number(rangeM[1])
    const month = Number(rangeM[2])
    return { year, month, dateStr: `${rangeM[1]}-${String(month).padStart(2, '0')}` }
  }
  // 单月：2026年3月
  const m = t.match(/(\d{4})年(\d{1,2})月/)
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2])
  return { year, month, dateStr: `${m[1]}-${String(month).padStart(2, '0')}` }
}

/**
 * 构造保存文件名，格式：{dateStr}_{title}.{ext}
 * @param {string} title
 * @param {string} fileUrl
 */
function buildFilename(title, fileUrl) {
  const ext = (fileUrl.match(/\.(xlsx?)(\?.*)?$/i) || [])[1] || 'xls'
  const period = parsePeriod(title)
  const datePrefix = period ? period.dateStr : new Date().toISOString().slice(0, 10)
  // 清理标题中的括号说明、序号等
  const cleanTitle = title
    .replace(/^[（(]\d+[）)]\s*/, '')
    .replace(/[（(][^（(）)]*[）)]/g, '')
    .replace(/[\\/:*?"<>|]/g, '_')
    .trim()
  return `${datePrefix}_${cleanTitle}.${ext}`
}

// ─── 浏览器（Playwright）────────────────────────────────────────────────────

const os = require('os')

/** 系统 Chrome 路径（macOS），WAF 拦截 headless 时使用真实浏览器 */
const REAL_CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
/** 持久化用户数据目录，避免每次冷启动 */
const USER_DATA_DIR = path.join(os.tmpdir(), 'pw-customs-export-profile')

let _browserCtx = null

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

/**
 * 用 Playwright 打开页面并返回 HTML 字符串
 * @param {string} url
 * @returns {Promise<string>}
 */
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

// ─── 网络请求 ─────────────────────────────────────────────────────────────────

/**
 * 获取 HTML 页面内容（Playwright，绕过 WAF）
 * @param {string} url
 * @returns {Promise<string>} HTML 字符串
 */
async function fetchHtml(url) {
  return fetchHtmlViaBrowser(url)
}

/**
 * 用 axios 下载文件并保存到磁盘
 * @param {string} fileUrl
 * @param {string} savePath
 * @param {string} referer
 */
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

// ─── 页面解析 ─────────────────────────────────────────────────────────────────

/**
 * 从年度列表页 HTML 解析出匹配的详情页链接
 *
 * 海关总署统计月报页面有两种链接形态：
 *  1. 带完整标题的 <a> 链接（如 tooltip/底部区域）：直接匹配关键词
 *  2. 表格结构：第一列是报表名称，其余列是月份链接（文字仅为"1月"/"2月"）
 *     — 针对这种结构，找到名称含目标关键词的行，再收集该行所有月份链接
 *
 * @param {string} html
 * @param {string} pageUrl
 * @returns {Array<{ title: string, detailUrl: string }>}
 */
function parseListPage(html, pageUrl) {
  const $ = cheerio.load(html)
  const items = []
  const seen = new Set()

  // ── 策略1：直接匹配含完整标题的链接 ─────────────────────────────────
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

  // ── 策略2：从表格结构解析（链接文字为月份，行首是报表名称） ──────────
  $('tr').each((_, tr) => {
    const cells = $(tr).find('td, th').toArray()
    if (cells.length < 2) return

    // 取第一列文字作为行标题
    const rowLabel = $(cells[0]).text().replace(/\s+/g, '').trim()
    if (!matchTitle(rowLabel)) return

    // 收集该行内所有月份链接
    cells.slice(1).forEach((cell) => {
      $(cell).find('a[href]').each((_, a) => {
        const href = $(a).attr('href')
        if (!href || /^javascript:/i.test(href)) return
        const monthText = $(a).text().replace(/\s+/g, '').trim()
        // 从月份文字提取数字，如"3月" → 3
        const mMatch = monthText.match(/^(\d{1,2})月$/)
        if (!mMatch) return
        const month = mMatch[1]

        const abs = resolveUrl(href, pageUrl)
        if (!abs || seen.has(abs)) return
        seen.add(abs)

        // 从详情页 URL 尝试提取年份（格式：/customs/2026-03/18/...）
        const yearMatch = (abs || '').match(/\/customs\/(\d{4})-\d{2}\//)
        const yearHint = yearMatch ? yearMatch[1] : ''
        // 拼出临时标题（不含年份时用 URL 里的年份）
        const title = yearHint
          ? `${rowLabel}（${yearHint}年${month}月）`
          : `${rowLabel}（${month}月）`

        items.push({ title, detailUrl: abs })
      })
    })
  })

  return items
}

/**
 * 从详情页 HTML 提取 XLS 下载链接
 * @param {string} html
 * @param {string} pageUrl
 * @returns {string | null}
 */
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
  // 优先取文字为「下载」的链接
  const dl = xlsLinks.find((l) => l.text === '下载')
  return (dl || xlsLinks[0]).url
}

// ─── 主流程 ───────────────────────────────────────────────────────────────────

/**
 * 处理单个条目（详情页 → 找 XLS → 下载）
 * @param {{ title: string, detailUrl: string | null, fileUrl?: string }} item
 * @param {boolean} skipExisting
 * @returns {Promise<string | null>} 保存的文件路径，跳过/失败返回 null
 */
async function processItem(item, skipExisting) {
  let fileUrl = item.fileUrl || null

  // 若是详情页链接，先进入详情页寻找 XLS
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

/**
 * 爬取单个年份的列表页
 * @param {number} year
 * @param {boolean} skipExisting
 * @returns {Promise<string[]>} 本年已保存的文件路径列表
 */
async function crawlYear(year, skipExisting) {
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

  const saved = []
  for (const item of items) {
    console.log(`  → ${item.title.slice(0, 60)}`)
    const file = await processItem(item, skipExisting)
    if (file) saved.push(file)
  }

  return saved
}

/**
 * 解析命令行参数
 * @param {string[]} argv
 * @returns {{ startYear: number, endYear: number, skipExisting: boolean }}
 */
function parseArgs(argv) {
  const currentYear = new Date().getFullYear()
  let startYear = 2020
  let endYear = currentYear
  let skipExisting = true

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--no-skip') {
      skipExisting = false
    } else if ((a === '--years' || a === '-y') && argv[i + 1]) {
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
      const [s, e] = a.split('-').map(Number)
      startYear = s
      endYear = e
    } else if (/^\d{4}$/.test(a)) {
      startYear = Number(a)
      endYear = Number(a)
    }
  }

  return { startYear, endYear, skipExisting }
}

async function main() {
  const { startYear, endYear, skipExisting } = parseArgs(process.argv.slice(2))

  if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true })
  }

  console.log('海关总署 — 出口主要商品量值表下载')
  console.log(`年份范围: ${startYear} - ${endYear}`)
  console.log(`保存目录: ${DOWNLOAD_DIR}`)
  console.log(`跳过已存在文件: ${skipExisting}`)

  const allFiles = []

  try {
    for (let year = startYear; year <= endYear; year++) {
      const files = await crawlYear(year, skipExisting)
      allFiles.push(...files)
    }
  } finally {
    await closeBrowser()
  }

  console.log(`\n完成，共保存 ${allFiles.length} 个文件`)
  allFiles.forEach((f) => console.log(' ', path.basename(f)))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
