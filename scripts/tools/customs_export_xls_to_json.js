/**
 * 将海关总署「出口主要商品量值表」.xls 转为结构化 JSON
 *
 * 表格格式（统计月报版）：
 *   行0: 空
 *   行1: 标题「（N）YYYY年M月出口主要商品量值表（人民币值）」
 *   行2: 单位「单位：万元人民币」
 *   行3: 表头第1行「商品名称 | 计量单位 | N月 |  | 比去年同期±%」
 *   行4: 表头第2行「       |         | 数量 | 金额 | 数量 | 金额」
 *   行5+: 数据行
 *
 * 与 china_export_rmb.json 的差异：
 *   - 单位：万元（不是亿元）
 *   - 无累计（YTD）数据列，ytdCurrentYear / ytdSamePeriodLastYear 设为 null
 *   - yoyYtdPercent 对应「比去年同期±%」（当月同比，非累计同比）
 *
 * 生成 JSON 结构与 china_export_rmb.json 保持一致：
 *   { "YYYY-MM": { sourceFile, title, unitNote, period, monthLabel, columnSemantics, items } }
 *
 * 用法：
 *   node scripts/tools/customs_export_xls_to_json.js
 *   node scripts/tools/customs_export_xls_to_json.js /path/to/dir_or_file.xls
 *   node scripts/tools/customs_export_xls_to_json.js /path/to/dir_or_file.xls /path/to/out.json
 */

'use strict'

const fs = require('fs')
const path = require('path')
const xlsx = require('xlsx')

const DEFAULT_INPUT_DIR = path.join(__dirname, '../../stock/customs_export')
const DEFAULT_OUTPUT = path.join(DEFAULT_INPUT_DIR, 'customs_export_rmb.json')

// ─── 单元格解析 ───────────────────────────────────────────────────────────────

/**
 * 解析单元格值，处理逗号千分位数字、「-」空值
 * @param {*} v
 * @returns {number|string|null}
 */
function parseCell(v) {
  if (v === null || v === undefined || v === '') return null
  if (v === '-') return null
  if (typeof v === 'number' && !Number.isNaN(v)) return v
  if (typeof v === 'string') {
    const t = v.trim()
    if (!t || t === '-') return null
    // 去掉千分位逗号后转数字
    const stripped = t.replace(/,/g, '')
    const n = Number(stripped)
    if (!Number.isNaN(n) && /^-?\d/.test(stripped)) return n
    return v
  }
  return v
}

// ─── 标题解析 ─────────────────────────────────────────────────────────────────

/**
 * 从标题提取年月
 * @param {string} title
 * @returns {{ year?: number, month?: number }}
 */
function parsePeriod(title) {
  const m = (title || '').match(/(\d{4})年(\d{1,2})月/)
  if (!m) return {}
  return { year: Number(m[1]), month: Number(m[2]) }
}

/**
 * 清理标题：去掉序号「（N）」和括号说明「（人民币值）」
 * @param {string} raw
 */
function cleanTitle(raw) {
  return (raw || '')
    .replace(/^[（(]\d+[）)]\s*/, '')
    .replace(/[（(][^（(）)]*[）)]/g, '')
    .trim()
}

// ─── 布局探测 ─────────────────────────────────────────────────────────────────

/**
 * 探测表格布局，返回各关键行号和名称列号
 * @param {Array<Array>} rows
 */
function detectLayout(rows) {
  let header1Row = -1
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const cells = (rows[i] || []).filter(Boolean).map(String)
    if (cells.some((c) => c.includes('商品名称'))) {
      header1Row = i
      break
    }
  }
  if (header1Row < 0) {
    return { titleRow: 1, unitRow: 2, header1Row: 3, dataStart: 5, nameCol: 1 }
  }

  const h1Row = rows[header1Row] || []
  let nameCol = 0
  for (let c = 0; c < h1Row.length; c++) {
    if (h1Row[c] != null && String(h1Row[c]).includes('商品名称')) {
      nameCol = c
      break
    }
  }

  let titleRow = -1
  let unitRow = -1
  for (let i = header1Row - 1; i >= 0; i--) {
    const rowText = (rows[i] || []).filter(Boolean).join('')
    if (unitRow < 0 && /单位[∶:：]/.test(rowText)) unitRow = i
    if (titleRow < 0 && /\d{4}年\d{1,2}月/.test(rowText)) titleRow = i
  }

  return { titleRow, unitRow, header1Row, dataStart: header1Row + 2, nameCol }
}

// ─── 列格式探测 ───────────────────────────────────────────────────────────────

/**
 * 根据表头第一行判断数据列的格式
 *
 * 海关统计月报有两种格式：
 *   格式 A（1月）：6 数据列
 *     [当月数量, 当月金额, 同比数量%, 同比金额%]
 *   格式 B（2月起）：10 数据列
 *     [当月数量, 当月金额, 累计数量, 累计金额, 同比数量%, 同比金额%, 累计同比数量%, 累计同比金额%]
 *
 * 判断依据：header1Row 中是否存在含"累计"的单元格
 *
 * @param {Array<Array>} rows
 * @param {number} header1Row
 * @param {number} nameCol
 * @returns {{ hasYtd: boolean, offsets: object }}
 */
function detectColFormat(rows, header1Row, nameCol) {
  const h1 = rows[header1Row] || []
  const hasYtd = h1.some((v) => v != null && /累计/.test(String(v)))

  if (hasYtd) {
    // 格式 B：当月(+2,+3)  累计(+4,+5)  当月同比(+6,+7)  累计同比(+8,+9)
    return {
      hasYtd: true,
      offsets: {
        curQty: 2, curAmt: 3,
        ytdQty: 4, ytdAmt: 5,
        yoyQty: 6, yoyAmt: 7,
        yoyYtdQty: 8, yoyYtdAmt: 9,
      },
    }
  }
  // 格式 A：当月(+2,+3)  当月同比(+4,+5)
  return {
    hasYtd: false,
    offsets: {
      curQty: 2, curAmt: 3,
      ytdQty: null, ytdAmt: null,
      yoyQty: 4, yoyAmt: 5,
      yoyYtdQty: null, yoyYtdAmt: null,
    },
  }
}

// ─── 工作表解析 ───────────────────────────────────────────────────────────────

/**
 * 将单张工作表解析为导出对象
 * @param {Array<Array>} rows
 * @param {string} sourceFile
 * @returns {object}
 */
function parseSheet(rows, sourceFile) {
  const layout = detectLayout(rows)
  const { titleRow, unitRow, header1Row, dataStart, nameCol } = layout

  // 标题
  const titleCells = titleRow >= 0 ? (rows[titleRow] || []).filter(Boolean) : []
  const rawTitle =
    (titleCells.find((c) => /出口|进口/.test(String(c))) || titleCells[0] || '').toString()
  const title = cleanTitle(rawTitle)

  // 单位
  const unitCells = unitRow >= 0 ? (rows[unitRow] || []).filter(Boolean) : []
  const unitNote = (unitCells.find((c) => /单位[∶:：]/.test(String(c))) || unitCells.join('')).toString()

  const period = parsePeriod(rawTitle || title)

  // 从表头提取月份标签（如"1月"、"2月"）
  const h1Row = rows[header1Row] || []
  let monthLabel = period.month ? `${period.month}月` : '当月'
  for (let c = nameCol + 2; c < h1Row.length; c++) {
    const v = h1Row[c]
    if (v != null && /月/.test(String(v)) && !/累计/.test(String(v))) {
      monthLabel = String(v).trim()
      break
    }
  }

  // 探测列格式（1月 vs 2月+）
  const { hasYtd, offsets: off } = detectColFormat(rows, header1Row, nameCol)

  const items = []
  let footnote = null

  for (let i = dataStart; i < rows.length; i++) {
    const row = rows[i]
    if (!row) continue
    const nameRaw = row[nameCol]
    if (nameRaw === null || nameRaw === undefined) continue
    const name = String(nameRaw).replace(/\r\n/g, '\n').trim()
    if (!name) continue
    if (/^注[:：]/.test(name)) {
      footnote = name
      break
    }

    const c = nameCol
    const unitRaw = row[c + 1] != null ? String(row[c + 1]).trim() : ''
    const unit = !unitRaw || unitRaw === '-' ? null : unitRaw

    const ytd = hasYtd
      ? { quantity: parseCell(row[c + off.ytdQty]), amount: parseCell(row[c + off.ytdAmt]) }
      : null

    items.push({
      name,
      unit,
      currentMonth: {
        quantity: parseCell(row[c + off.curQty]),
        amount:   parseCell(row[c + off.curAmt]),
      },
      ytdCurrentYear: ytd,
      ytdSamePeriodLastYear: null,
      yoyYtdPercent: {
        quantity: off.yoyQty != null ? parseCell(row[c + off.yoyQty]) : null,
        amount:   off.yoyAmt != null ? parseCell(row[c + off.yoyAmt]) : null,
      },
    })
  }

  const result = {
    sourceFile: path.basename(sourceFile),
    sourceType: 'xls',
    title,
    unitNote,
    period,
    monthLabel,
    columnSemantics: {
      currentMonth: `当月（${monthLabel}）数量/金额`,
      ytdCurrentYear: hasYtd ? `当年1至${monthLabel}累计数量/金额` : null,
      ytdSamePeriodLastYear: null,
      yoyYtdPercent: `当月比去年同期 ±%（数量/金额）`,
    },
    items,
  }
  if (footnote) result.footnote = footnote
  return result
}

// ─── 单文件解析 ───────────────────────────────────────────────────────────────

/**
 * 解析单个 xls 文件
 * @param {string} filePath
 * @returns {object}
 */
function parseXls(filePath) {
  const wb = xlsx.readFile(filePath, { cellDates: true, cellNF: false, cellText: false })
  const sheetName = wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: null })
  return parseSheet(rows, filePath)
}

// ─── 批量解析整合 ─────────────────────────────────────────────────────────────

/**
 * 扫描目录，解析所有 *出口主要商品量值表*.xls，整合为与 china_export_rmb.json 一致的结构
 * @param {string} dir
 * @returns {object} 以 "YYYY-MM" 为键的对象
 */
function parseDir(dir) {
  const files = fs
    .readdirSync(dir)
    .filter((f) => /\.xlsx?$/i.test(f) && /出口主要商品量值表/.test(f))
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
      const data = parseXls(filePath)
      const { year, month } = data.period || {}
      if (!year || !month) {
        console.warn('  ✗ 无法解析年月，已跳过')
        continue
      }
      const key = `${year}-${String(month).padStart(2, '0')}`
      result[key] = data
      console.log(`  ✓ ${key}：${data.items.length} 条商品`)
    } catch (e) {
      console.warn('  ✗ 解析失败:', e.message)
    }
  }
  return result
}

// ─── 主入口 ───────────────────────────────────────────────────────────────────

function main() {
  const inputArg = process.argv[2]
  const outputArg = process.argv[3]

  const inputPath = inputArg ? path.resolve(inputArg) : DEFAULT_INPUT_DIR

  // 单文件模式
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

  // 目录模式：整合所有月份
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

module.exports = { parseXls, parseDir, parseSheet, parseCell, parsePeriod }
