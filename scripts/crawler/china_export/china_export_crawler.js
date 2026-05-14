#!/usr/bin/env node

/**
 * 海关总署 — 出口重点/主要商品量值表（xls）下载
 *
 * 列表页（分页）：配置项 chinaExport.listUrlTemplate，{page} → 1、2、3…
 * 保存目录：stock/china_export/
 *
 * 用法（不传页码时分页见 crawler_config.chinaExport.pagination，默认最新 2 页）：
 *   node scripts/crawler/china_export/china_export_crawler.js
 *   node scripts/crawler/china_export/china_export_crawler.js --pages 1-5
 *   node scripts/crawler/china_export/china_export_crawler.js --pages 1-30
 *   node scripts/crawler/china_export/china_export_crawler.js 1-8 --min-year 2025 --max-year 2026
 *   node scripts/crawler/china_export/china_export_crawler.js --no-skip
 */

'use strict'

const ChinaExportExtractor = require('../extractors/china_export_extractor.js')

/**
 * @param {string[]} argv
 * @returns {{ startPage: number, endPage: number, minYear: number|null, maxYear: number|null, noSkip: boolean }}
 */
function parseArgs(argv) {
  let startPage
  let endPage
  let minYear = null
  let maxYear = null
  let noSkip = false

  const rest = []
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
    } else if (a === '--min-year' && argv[i + 1]) {
      minYear = parseInt(argv[++i], 10)
    } else if (/^--min-year=/.test(a)) {
      minYear = parseInt(a.split('=')[1], 10)
    } else if (a === '--max-year' && argv[i + 1]) {
      maxYear = parseInt(argv[++i], 10)
    } else if (/^--max-year=/.test(a)) {
      maxYear = parseInt(a.split('=')[1], 10)
    } else if (a === '--no-skip') {
      noSkip = true
    } else if (!a.startsWith('-')) {
      rest.push(a)
    }
  }

  if (startPage == null && rest[0]) {
    const r = parsePageRange(rest[0])
    startPage = r.start
    endPage = r.end
  }

  return {
    startPage,
    endPage,
    minYear: Number.isNaN(minYear) ? null : minYear,
    maxYear: Number.isNaN(maxYear) ? null : maxYear,
    noSkip,
  }
}

/**
 * @param {string} s 如 "5" 表示 1-5；"2-8" 表示 2-8
 */
function parsePageRange(s) {
  const t = String(s).trim()
  const range = t.match(/^(\d+)\s*-\s*(\d+)$/)
  if (range) {
    return { start: parseInt(range[1], 10), end: parseInt(range[2], 10) }
  }
  const n = parseInt(t, 10)
  if (!Number.isNaN(n) && n >= 1) {
    return { start: 1, end: n }
  }
  return { start: undefined, end: undefined }
}

async function main() {
  const argv = process.argv.slice(2)
  const parsed = parseArgs(argv)

  const options = {}
  if (parsed.noSkip) options.skipExistingFiles = false

  const extractor = new ChinaExportExtractor(undefined, options)

  const override = {}
  if (parsed.startPage != null && parsed.endPage != null) {
    override.startPage = parsed.startPage
    override.endPage = parsed.endPage
  }
  if (parsed.minYear !== null && parsed.minYear !== undefined)
    override.minYear = parsed.minYear
  if (parsed.maxYear !== null && parsed.maxYear !== undefined)
    override.maxYear = parsed.maxYear

  console.log('海关总署出口商品量值表下载')
  const effStart = override.startPage ?? extractor.pagination.startPage
  const effEnd = override.endPage ?? extractor.pagination.endPage
  console.log('分页:', effStart, '-', effEnd)

  const previewMin =
    override.minYear !== undefined ? override.minYear : extractor.yearRange.minYear
  const previewMax =
    override.maxYear !== undefined ? override.maxYear : extractor.yearRange.maxYear
  console.log('年份:', previewMin ?? '不限', '-', previewMax ?? '不限')

  const result = await extractor.crawl(override)
  console.log('\n完成，保存文件数:', result.totalSaved)
  if (result.files.length) {
    result.files.forEach((f) => console.log(' ', f))
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
