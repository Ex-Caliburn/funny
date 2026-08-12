#!/usr/bin/env node

/**
 * 海关总署 — 进口重点商品量值表（xls）下载
 *
 * 列表页（分页，按发布时间倒序）：
 *   第 1 页：…/302275/index.html
 *   第 2–5 页：…/9f806879-{page}.html
 *   第 6 页起：eportal 动态页（见 crawler_config.customsImport.listEportalUrlTemplate）
 * 保存目录：stock/customs_import/
 *
 * 用法（默认仅抓取最新 1 个月）：
 *   node scripts/crawler/customs_import/customs_import_crawler.js
 *   node scripts/crawler/customs_import/customs_import_crawler.js --recent-months 2
 *   node scripts/crawler/customs_import/customs_import_crawler.js --years 2024-2026
 *   node scripts/crawler/customs_import/customs_import_crawler.js 2024-2026
 *   node scripts/crawler/customs_import/customs_import_crawler.js --pages 1-30
 *   node scripts/crawler/customs_import/customs_import_crawler.js --no-skip --no-parse
 */

'use strict'

const path = require('path')
const { spawn } = require('child_process')

const ChinaExportExtractor = require('../extractors/china_export_extractor.js')
const crawlerConfig = require('../framework/crawler_config.js')

const PARSE_SCRIPT = path.join(__dirname, '../../tools/customs_import_xls_to_json.js')

function runParseScript() {
  return new Promise((resolve, reject) => {
    console.log('\n开始同步汇总 JSON: customs_import_rmb.json')
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

function parsePageRange(s) {
  const t = String(s).trim()
  const range = t.match(/^(\d+)\s*-\s*(\d+)$/)
  if (range) {
    return { start: parseInt(range[1], 10), end: parseInt(range[2], 10) }
  }
  const n = parseInt(t, 10)
  if (!Number.isNaN(n) && n >= 1) return { start: 1, end: n }
  return { start: undefined, end: undefined }
}

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  let startPage
  let endPage
  let recentMonths = 1
  let minYear = null
  let maxYear = null
  let yearsExplicit = false
  let noSkip = false
  let noParse = false

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--pages' && argv[i + 1]) {
      const r = parsePageRange(argv[++i])
      startPage = r.start
      endPage = r.end
    } else if (/^--pages=/.test(a)) {
      const r = parsePageRange(a.replace(/^--pages=/, ''))
      startPage = r.start
      endPage = r.end
    } else if (a === '--recent-months' && argv[i + 1]) {
      recentMonths = Math.max(1, Number(argv[++i]) || 1)
    } else if (/^--recent-months=/.test(a)) {
      recentMonths = Math.max(1, Number(a.split('=')[1]) || 1)
    } else if (a === '--min-year' && argv[i + 1]) {
      minYear = parseInt(argv[++i], 10)
    } else if (/^--min-year=/.test(a)) {
      minYear = parseInt(a.split('=')[1], 10)
    } else if (a === '--max-year' && argv[i + 1]) {
      maxYear = parseInt(argv[++i], 10)
    } else if (/^--max-year=/.test(a)) {
      maxYear = parseInt(a.split('=')[1], 10)
    } else if ((a === '--years' || a === '-y') && argv[i + 1]) {
      yearsExplicit = true
      const raw = argv[++i]
      const m = raw.match(/^(\d{4})-(\d{4})$/)
      if (m) {
        minYear = Number(m[1])
        maxYear = Number(m[2])
      } else if (/^\d{4}$/.test(raw)) {
        minYear = Number(raw)
        maxYear = Number(raw)
      }
    } else if (/^--years=/.test(a)) {
      yearsExplicit = true
      const raw = a.split('=')[1]
      const m = raw.match(/^(\d{4})-(\d{4})$/)
      if (m) {
        minYear = Number(m[1])
        maxYear = Number(m[2])
      } else if (/^\d{4}$/.test(raw)) {
        minYear = Number(raw)
        maxYear = Number(raw)
      }
    } else if (/^\d{4}-\d{4}$/.test(a)) {
      yearsExplicit = true
      const [s, e] = a.split('-').map(Number)
      minYear = s
      maxYear = e
    } else if (/^\d{4}$/.test(a)) {
      yearsExplicit = true
      minYear = Number(a)
      maxYear = Number(a)
    } else if (a === '--no-skip') {
      noSkip = true
    } else if (a === '--no-parse') {
      noParse = true
    } else if (!a.startsWith('-') && startPage == null) {
      const r = parsePageRange(a)
      if (r.start != null) {
        startPage = r.start
        endPage = r.end
      }
    }
  }

  if (yearsExplicit) recentMonths = null

  return {
    startPage,
    endPage,
    recentMonths,
    minYear: Number.isNaN(minYear) ? null : minYear,
    maxYear: Number.isNaN(maxYear) ? null : maxYear,
    yearsExplicit,
    noSkip,
    noParse,
  }
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2))
  const cfg = crawlerConfig.customsImport || {}
  const downloadDir = path.join(__dirname, '../../../stock', cfg.downloadDirRel || 'customs_import')

  const options = { ...cfg }
  if (parsed.noSkip) options.skipExistingFiles = false

  const extractor = new ChinaExportExtractor(downloadDir, options)
  const usePageRange = parsed.startPage != null && parsed.endPage != null
  const useYearRange = parsed.minYear != null || parsed.maxYear != null

  console.log('海关总署 — 进口重点商品量值表下载')
  if (usePageRange) {
    console.log('分页:', parsed.startPage, '-', parsed.endPage)
  } else if (useYearRange) {
    console.log('年份:', parsed.minYear ?? '不限', '-', parsed.maxYear ?? '不限')
  } else {
    console.log(`模式: 最近 ${parsed.recentMonths} 个月`)
  }

  let result
  if (usePageRange || useYearRange) {
    const override = {}
    if (usePageRange) {
      override.startPage = parsed.startPage
      override.endPage = parsed.endPage
    } else {
      override.startPage = cfg.pagination?.startPage ?? 1
      override.endPage = cfg.yearRangeEndPage ?? cfg.maxScanPages ?? 40
    }
    if (parsed.minYear != null) override.minYear = parsed.minYear
    if (parsed.maxYear != null) override.maxYear = parsed.maxYear
    result = await extractor.crawl(override)
  } else {
    result = await extractor.crawlRecentMonths(parsed.recentMonths)
  }

  console.log('\n完成，保存文件数:', result.totalSaved)
  if (result.files.length) result.files.forEach((f) => console.log(' ', f))

  if (!parsed.noParse) {
    await runParseScript()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
