/**
 * 将海关总署「进出口商品国别（地区）总值表」.xls 转为结构化 JSON
 *
 * 表格格式（统计月报版）：
 *   行1: 标题「（2）YYYY年M月进出口商品国别（地区）总值表（人民币值）」
 *   行2: 单位「单位：万元人民币」
 *   行3: 表头第1行「国别 | 进出口 | 出口 | 进口 | 累计比去年同期±％」
 *   行4: 表头第2行「     | M月 | 1至M月 | M月 | 1至M月 | M月 | 1至M月 | 进出口 | 出口 | 进口」
 *   行5+: 数据行（大洲/国家/经济体，用前导空格表示层级）
 *
 * 每条记录包含进出口合计、出口、进口各自的当月值、累计值及累计同比%
 *
 * 用法：
 *   node scripts/tools/customs_country_xls_to_json.js
 *   node scripts/tools/customs_country_xls_to_json.js /path/to/dir_or_file.xls
 */

'use strict'

const fs = require('fs')
const path = require('path')
const xlsx = require('xlsx')

const DEFAULT_INPUT_DIR = path.join(__dirname, '../../stock/customs_country')
const DEFAULT_OUTPUT = path.join(DEFAULT_INPUT_DIR, 'customs_country_rmb.json')

function parseCell(v) {
  if (v === null || v === undefined || v === '') return null
  if (v === '-') return null
  if (typeof v === 'number' && !Number.isNaN(v)) return v
  if (typeof v === 'string') {
    const t = v.trim()
    if (!t || t === '-') return null
    const stripped = t.replace(/,/g, '')
    const n = Number(stripped)
    if (!Number.isNaN(n) && /^-?\d/.test(stripped)) return n
    return v
  }
  return v
}

function parsePeriod(title) {
  const m = (title || '').match(/(\d{4})年(\d{1,2})月/)
  if (!m) return {}
  return { year: Number(m[1]), month: Number(m[2]) }
}

function cleanTitle(raw) {
  return (raw || '')
    .replace(/^[（(]\d+[）)]\s*/, '')
    .replace(/[（(][^（(）)]*[）)]/g, '')
    .trim()
}

function countLeadingSpaces(str) {
  let i = 0
  while (i < str.length && str[i] === ' ') i++
  return i
}

/**
 * 探测表格布局
 * @param {Array<Array>} rows
 */
function detectLayout(rows) {
  let header1Row = -1
  for (let i = 0; i < Math.min(rows.length, 12); i++) {
    const cells = (rows[i] || []).filter(Boolean).map(String)
    // 必须匹配表头特征（含「原产国/目的国」），避免标题行中的「国别」误判
    if (cells.some((c) => /原产国|目的国/.test(c))) {
      header1Row = i
      break
    }
  }
  if (header1Row < 0) {
    return { titleRow: 1, unitRow: 2, header1Row: 3, dataStart: 5, nameCol: 1, hasYtd: true }
  }

  const h1Row = rows[header1Row] || []
  let nameCol = 0
  for (let c = 0; c < h1Row.length; c++) {
    if (h1Row[c] != null && /原产国|目的国/.test(String(h1Row[c]))) {
      nameCol = c
      break
    }
  }

  const h2Row = rows[header1Row + 1] || []
  const hasYtd = h2Row.some((v) => v != null && /1至|累计/.test(String(v)))

  let titleRow = -1
  let unitRow = -1
  for (let i = header1Row - 1; i >= 0; i--) {
    const rowText = (rows[i] || []).filter(Boolean).join('')
    if (unitRow < 0 && /单位[∶:：]/.test(rowText)) unitRow = i
    if (titleRow < 0 && /\d{4}年\d{1,2}月/.test(rowText)) titleRow = i
  }

  return {
    titleRow,
    unitRow,
    header1Row,
    dataStart: header1Row + 2,
    nameCol,
    hasYtd,
  }
}

/**
 * 根据表头确定列偏移（相对 nameCol）
 * @param {Array<Array>} rows
 * @param {number} header1Row
 * @param {number} nameCol
 * @param {boolean} hasYtd
 */
function detectColOffsets(rows, header1Row, nameCol, hasYtd) {
  if (!hasYtd) {
    // 1月等无累计列：进出口/出口/进口 各一列当月值 + 三列累计同比
    return {
      totalMonth: 1,
      exportMonth: 2,
      importMonth: 3,
      ytdYoyTotal: 4,
      ytdYoyExport: 5,
      ytdYoyImport: 6,
      totalYtd: null,
      exportYtd: null,
      importYtd: null,
    }
  }

  return {
    totalMonth: 1,
    totalYtd: 2,
    exportMonth: 3,
    exportYtd: 4,
    importMonth: 5,
    importYtd: 6,
    ytdYoyTotal: 7,
    ytdYoyExport: 8,
    ytdYoyImport: 9,
  }
}

function readMetric(row, baseCol, colOffset) {
  if (colOffset == null) return null
  return parseCell(row[baseCol + colOffset])
}

/**
 * 读取一组 当月/累计/同比 指标
 * 1月部分表格无单独「1至1月」列，此时累计值等于当月值
 */
function readTradeGroup(row, nameCol, monthOff, ytdOff, yoyOff) {
  const month = readMetric(row, nameCol, monthOff)
  let ytd = readMetric(row, nameCol, ytdOff)
  if (ytd == null && month != null) ytd = month
  return {
    month,
    ytd,
    ytdYoy: readMetric(row, nameCol, yoyOff),
  }
}

/**
 * @param {Array<Array>} rows
 * @param {string} sourceFile
 */
function parseSheet(rows, sourceFile) {
  const layout = detectLayout(rows)
  const { titleRow, unitRow, header1Row, dataStart, nameCol, hasYtd } = layout
  const off = detectColOffsets(rows, header1Row, nameCol, hasYtd)

  const titleCells = titleRow >= 0 ? (rows[titleRow] || []).filter(Boolean) : []
  const rawTitle =
    (titleCells.find((c) => /进出口|国别/.test(String(c))) || titleCells[0] || '').toString()
  const title = cleanTitle(rawTitle)

  const unitCells = unitRow >= 0 ? (rows[unitRow] || []).filter(Boolean) : []
  const unitNote = (unitCells.find((c) => /单位[∶:：]/.test(String(c))) || unitCells.join('')).toString()

  const period = parsePeriod(rawTitle || title)

  const h2Row = rows[header1Row + 1] || []
  let monthLabel = period.month ? `${period.month}月` : '当月'
  for (let c = nameCol + 1; c < h2Row.length; c++) {
    const v = h2Row[c]
    if (v != null && /^\d{1,2}月$/.test(String(v).trim())) {
      monthLabel = String(v).trim()
      break
    }
  }

  const items = []
  let footnote = null
  const hierarchyStack = []

  for (let i = dataStart; i < rows.length; i++) {
    const row = rows[i]
    if (!row) continue
    const nameRaw = row[nameCol]
    if (nameRaw === null || nameRaw === undefined) continue
    const nameStr = String(nameRaw).replace(/\r\n/g, '\n')
    const name = nameStr.trim()
    if (!name) continue
    if (/^注[:：]/.test(name)) {
      footnote = name
      break
    }

    const indent = countLeadingSpaces(nameStr)
    while (hierarchyStack.length > 0 && hierarchyStack[hierarchyStack.length - 1].indent >= indent) {
      hierarchyStack.pop()
    }
    const parentName = hierarchyStack.length > 0 ? hierarchyStack[hierarchyStack.length - 1].name : null
    const level = hierarchyStack.length
    hierarchyStack.push({ indent, name })

    items.push({
      name,
      level,
      parentName,
      tradeTotal: readTradeGroup(row, nameCol, off.totalMonth, off.totalYtd, off.ytdYoyTotal),
      export: readTradeGroup(row, nameCol, off.exportMonth, off.exportYtd, off.ytdYoyExport),
      import: readTradeGroup(row, nameCol, off.importMonth, off.importYtd, off.ytdYoyImport),
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
      tradeTotal: `进出口合计 当月/累计（${monthLabel}）`,
      export: `出口 当月/累计（${monthLabel}）`,
      import: `进口 当月/累计（${monthLabel}）`,
      ytdYoy: hasYtd ? '累计比去年同期 ±%（进出口/出口/进口）' : '比去年同期 ±%（进出口/出口/进口）',
    },
    items,
  }
  if (footnote) result.footnote = footnote
  return result
}

function parseXls(filePath) {
  const wb = xlsx.readFile(filePath, { cellDates: true, cellNF: false, cellText: false })
  const sheetName = wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: null })
  return parseSheet(rows, filePath)
}

function parseDir(dir, options = {}) {
  const filePattern = options.filePattern || /进出口商品国别.*总值表/
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
      const data = parseXls(filePath)
      const { year, month } = data.period || {}
      if (!year || !month) {
        console.warn('  ✗ 无法解析年月，已跳过')
        continue
      }
      const key = `${year}-${String(month).padStart(2, '0')}`
      result[key] = data
      console.log(`  ✓ ${key}：${data.items.length} 条国别/地区`)
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
  const merged = parseDir(dir)
  const outPath = outputArg ? path.resolve(outputArg) : DEFAULT_OUTPUT
  fs.writeFileSync(outPath, JSON.stringify(merged, null, 2), 'utf-8')
  console.log(`\n已写入: ${outPath}`)
  console.log(`共 ${Object.keys(merged).length} 个月份`)
}

if (require.main === module) {
  main()
}

module.exports = { parseXls, parseDir, parseSheet, parseCell, parsePeriod, countLeadingSpaces }
