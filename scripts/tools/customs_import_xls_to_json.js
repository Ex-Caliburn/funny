#!/usr/bin/env node

/**
 * 将海关总署「进口重点/主要商品量值表」.xls 转为结构化 JSON
 *
 * 用法：
 *   node scripts/tools/customs_import_xls_to_json.js
 *   node scripts/tools/customs_import_xls_to_json.js /path/to/dir_or_file.xls
 *   node scripts/tools/customs_import_xls_to_json.js /path/to/dir_or_file.xls /path/to/out.json
 */

'use strict'

const fs = require('fs')
const path = require('path')
const { parseXls, parseDir } = require('./customs_export_xls_to_json')

const DEFAULT_INPUT_DIR = path.join(__dirname, '../../stock/customs_import')
const DEFAULT_OUTPUT = path.join(DEFAULT_INPUT_DIR, 'customs_import_rmb.json')
const FILE_PATTERN = /进口(?:主要|重点)商品量值表/

function main() {
  const inputArg = process.argv[2]
  const outputArg = process.argv[3]
  const inputPath = inputArg ? path.resolve(inputArg) : DEFAULT_INPUT_DIR

  if (fs.existsSync(inputPath) && fs.statSync(inputPath).isFile()) {
    const data = parseXls(inputPath)
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
  const merged = parseDir(dir, { filePattern: FILE_PATTERN })
  const outPath = outputArg ? path.resolve(outputArg) : DEFAULT_OUTPUT
  fs.writeFileSync(outPath, JSON.stringify(merged, null, 2), 'utf-8')
  console.log(`\n已写入: ${outPath}`)
  console.log(`共 ${Object.keys(merged).length} 个月份`)
}

if (require.main === module) {
  main()
}

module.exports = { FILE_PATTERN, DEFAULT_INPUT_DIR, DEFAULT_OUTPUT }
