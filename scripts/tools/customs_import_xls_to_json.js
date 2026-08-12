#!/usr/bin/env node

/**
 * 将海关总署「进口重点商品量值表」.xls 转为结构化 JSON
 *
 * 表格格式与「全国出口重点商品量值表」相同（非「进口主要商品」）：
 *   当月(N月) | 1至N月累计 | 上年1至N月累计 | 累计同比±%
 *   金额单位：亿元人民币 → JSON 统一为万元
 *
 * 2 月报表无单独 1 月数据，currentMonth 取 Excel「1至2月累计」列。
 *
 * 用法：
 *   node scripts/tools/customs_import_xls_to_json.js
 *   node scripts/tools/customs_import_xls_to_json.js /path/to/dir_or_file.xls
 *   node scripts/tools/customs_import_xls_to_json.js /path/to/dir_or_file.xls /path/to/out.json
 */

'use strict'

const fs = require('fs')
const path = require('path')
const { parseExportXls, normalizeMonthLabel } = require('./china_export_xls_to_json')

const DEFAULT_INPUT_DIR = path.join(__dirname, '../../stock/customs_import')
const DEFAULT_OUTPUT = path.join(DEFAULT_INPUT_DIR, 'customs_import_rmb.json')
const FILE_PATTERN = /进口重点商品量值表/

/**
 * 将 parseExportXls 结果转为与 china_export_rmb.json 一致的扁平结构
 * @param {object} raw
 * @returns {object}
 */
function flattenParsed(raw) {
  const meta = raw.meta || {}
  const entry = {
    sourceFile: meta.sourceFile || raw.sourceFile,
    sourceType: 'xls',
    title: meta.title || raw.title,
    unitNote: meta.unitNote || raw.unitNote,
    period: meta.period || raw.period,
    monthLabel: meta.monthLabel || raw.monthLabel,
    columnSemantics: meta.columnSemantics || raw.columnSemantics,
    items: raw.items || [],
  }
  if (raw.footnote) entry.footnote = raw.footnote
  return entry
}

/**
 * 进口重点商品：2 月取「1至2月累计」作为当期量值（海关不单独发布 1 月）
 * @param {object} entry
 * @returns {object}
 */
function applyKeyImportMonthRules(entry) {
  const { period } = entry
  if (!period || period.month !== 2) return entry

  entry.items = entry.items.map((item) => ({
    ...item,
    currentMonth: item.ytdCurrentYear
      ? { quantity: item.ytdCurrentYear.quantity, amount: item.ytdCurrentYear.amount }
      : item.currentMonth,
  }))

  entry.monthLabel = normalizeMonthLabel(null, 2)
  if (entry.columnSemantics) {
    entry.columnSemantics.currentMonth = `当期（${entry.monthLabel}）数量/金额`
  }
  return entry
}

/**
 * 解析单个 xls
 * @param {string} filePath
 * @returns {object}
 */
function parseImportKeyXls(filePath) {
  return applyKeyImportMonthRules(flattenParsed(parseExportXls(filePath)))
}

/**
 * 扫描目录，整合所有月份
 * @param {string} dir
 * @param {{ filePattern?: RegExp }} [options]
 * @returns {object}
 */
function parseDir(dir, options = {}) {
  const filePattern = options.filePattern || FILE_PATTERN
  const files = fs
    .readdirSync(dir)
    .filter((f) => /\.xlsx?$/i.test(f) && filePattern.test(f))
    .sort()

  if (files.length === 0) {
    console.warn('未找到匹配的 xls 文件:', dir)
    return {}
  }

  const result = {}
  for (const file of files) {
    const filePath = path.join(dir, file)
    console.log('解析:', file)
    try {
      const data = parseImportKeyXls(filePath)
      const { year, month } = data.period || {}
      if (!year || !month) {
        console.warn('  ✗ 无法解析年月，已跳过')
        continue
      }
      const key = `${year}-${String(month).padStart(2, '0')}`
      result[key] = data
      console.log(`  ✓ ${key}（${data.monthLabel}）：${data.items.length} 条商品`)
    } catch (e) {
      console.warn('  ✗ 解析失败:', e.message)
    }
  }
  return result
}

function main() {
  const inputArg = process.argv[2]
  const outputArg = process.argv[3]
  const inputPath = inputArg ? path.resolve(inputArg) : DEFAULT_INPUT_DIR

  if (fs.existsSync(inputPath) && fs.statSync(inputPath).isFile()) {
    const data = parseImportKeyXls(inputPath)
    const { year, month } = data.period || {}
    const key = year && month ? `${year}-${String(month).padStart(2, '0')}` : 'unknown'
    const out = { [key]: data }
    const outPath = outputArg
      ? path.resolve(outputArg)
      : inputPath.replace(/\.xlsx?$/i, '.json')
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf-8')
    console.log('已写入:', outPath)
    console.log('记录数:', data.items.length)
    return
  }

  const dir = fs.existsSync(inputPath) ? inputPath : DEFAULT_INPUT_DIR
  const merged = parseDir(dir)
  const outPath = outputArg ? path.resolve(outputArg) : DEFAULT_OUTPUT
  fs.writeFileSync(outPath, JSON.stringify(merged, null, 2), 'utf-8')
  console.log(`\n已写入: ${outPath}`)
  console.log(`共 ${Object.keys(merged).length} 个月份`)
}

if (require.main === module) {
  main()
}

module.exports = {
  FILE_PATTERN,
  DEFAULT_INPUT_DIR,
  DEFAULT_OUTPUT,
  parseImportKeyXls,
  parseDir,
  applyKeyImportMonthRules,
  flattenParsed,
}
