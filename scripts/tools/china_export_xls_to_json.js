/**
 * 将海关「全国出口重点商品量值表」.xls 转为结构化 JSON
 * 典型表结构：标题行、单位行、表头两行、自第 6 行起为数据（商品名在 B 列）
 *
 * 用法：
 *   node scripts/tools/china_export_xls_to_json.js
 *   node scripts/tools/china_export_xls_to_json.js /path/to/file.xls
 *   node scripts/tools/china_export_xls_to_json.js /path/to/file.xls /path/to/out.json
 *
 * 也可作为模块使用：
 *   const { parseExportXls, isRmbFile } = require('./china_export_xls_to_json');
 */

'use strict'

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const DEFAULT_INPUT = path.join(__dirname, '../../stock/china_export/2026050910092452792.xls');

/**
 * 单元格转可序列化值：「-」与空视为 null，数字保持 number
 * @param {*} cell
 * @returns {number|string|null}
 */
function parseCell(cell) {
  if (cell === null || cell === undefined || cell === '') return null;
  if (cell === '-') return null;
  if (typeof cell === 'number' && !Number.isNaN(cell)) return cell;
  if (typeof cell === 'string') {
    const t = cell.trim();
    if (t === '' || t === '-') return null;
    const n = Number(t);
    if (t !== '' && !Number.isNaN(n) && /^-?\d/.test(t)) return n;
    return cell;
  }
  return cell;
}

/**
 * 规范化月份标签
 *
 * 规则：
 *   - 2 月永远是 "1-2月"（海关不单独发布 1 月数据，首期为 1-2 月累计）
 *   - "N至M月累计" → "N-M月"
 *   - "N月累计"    → "N月"
 *   - 其余保持原值
 *
 * @param {string|null} rawLabel - 原始月份标签
 * @param {number}      month    - 数字月份（1-12）
 * @returns {string}
 */
function normalizeMonthLabel(rawLabel, month) {
  if (month === 2) return '1-2月';
  if (!rawLabel) return month ? `${month}月` : '当月';
  return rawLabel
    .replace(/(\d+)至(\d+)月累计/, '$1-$2月')
    .replace(/(\d+)月累计/, '$1月')
    .trim();
}

/**
 * 从标题中解析年月
 * @param {string} title
 * @returns {{ year?: number, month?: number }}
 */
function parsePeriodFromTitle(title) {
  if (!title || typeof title !== 'string') return {};
  const m = title.match(/(\d{4})年(\d{1,2})月/);
  if (!m) return {};
  return { year: Number(m[1]), month: Number(m[2]) };
}

/** 重点商品表为「亿元人民币」，统一换算为万元 */
function getAmountScale(unitNote) {
  return /亿元/.test(String(unitNote || '')) ? 10000 : 1;
}

function scaleAmount(v, scale) {
  if (scale === 1 || v == null || typeof v !== 'number') return v;
  return v * scale;
}

/**
 * 判断工作簿是否为人民币版本
 * @param {object} wb - xlsx workbook
 */
function isRmbWorkbook(wb) {
  const sheetName = wb.SheetNames[0] || '';
  if (/USD/i.test(sheetName)) return false;
  const rows = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: null, sheetRows: 5 });
  const unitRow = (rows[2] || []).filter(Boolean).join('');
  return !/美元/.test(unitRow);
}

/**
 * 判断 xls 文件是否为人民币版本
 * @param {string} filepath
 */
function isRmbFile(filepath) {
  try {
    const wb = xlsx.readFile(filepath, { sheetRows: 5 });
    return isRmbWorkbook(wb);
  } catch {
    return true;
  }
}

/**
 * 自动探测表格布局
 * 海关表有两种常见格式：
 *   格式A（4月）: row0 空, row1 标题, row2 单位, row3 表头1, row4 表头2, row5+ 数据，商品名在 col1
 *   格式B（2月）: row0 标题, row1 单位, row2 表头1, row3 表头2, row4+ 数据，商品名在 col0
 *
 * 判断依据：找到"商品名称"所在行作为 header1Row，向上找 title 和 unit，向下一行是 header2，再下是数据
 * @param {Array<Array>} rows
 * @returns {{ titleRow: number, unitRow: number, header1Row: number, dataStart: number, nameCol: number }}
 */
function detectLayout(rows) {
  let header1Row = -1;
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const cells = (rows[i] || []).filter(Boolean).map(String);
    if (cells.some((c) => c.includes('商品名称'))) {
      header1Row = i;
      break;
    }
  }
  if (header1Row < 0) {
    // 无法定位，退回默认
    return { titleRow: 1, unitRow: 2, header1Row: 3, dataStart: 5, nameCol: 1 };
  }

  // 商品名称在哪一列
  const h1Row = rows[header1Row] || [];
  let nameCol = 0;
  for (let c = 0; c < h1Row.length; c++) {
    if (h1Row[c] != null && String(h1Row[c]).includes('商品名称')) {
      nameCol = c;
      break;
    }
  }

  // 往上找 title（含年月的行）和 unit（含"单位"的行）
  let titleRow = -1;
  let unitRow = -1;
  for (let i = header1Row - 1; i >= 0; i--) {
    const rowText = (rows[i] || []).filter(Boolean).join('');
    if (unitRow < 0 && /单位[∶:]/.test(rowText)) unitRow = i;
    if (titleRow < 0 && /\d{4}年\d{1,2}月/.test(rowText)) titleRow = i;
  }

  const dataStart = header1Row + 2; // header1 + header2 行各占一行
  return { titleRow, unitRow, header1Row, dataStart, nameCol };
}

/**
 * 解析工作表为导出对象
 * @param {string[][]} rows - sheet_to_json header:1 的原始行数组
 * @param {string} sheetName
 * @param {string} sourceFile
 * @returns {object}
 */
function sheetToExport(rows, sheetName, sourceFile) {
  const layout = detectLayout(rows);
  const { titleRow, unitRow, header1Row, dataStart, nameCol } = layout;

  // 标题：找含"全国"或"出口"的格，否则取第一个非空格；去掉开头的「（N）」序号
  const titleCells = titleRow >= 0 ? (rows[titleRow] || []).filter(Boolean) : [];
  const title = (titleCells.find((c) => /全国|出口|进口/.test(String(c))) || titleCells[0] || '')
    .toString()
    .replace(/^[（(]\d+[）)]\s*/, '')
    .trim();

  // 单位
  const unitCells = unitRow >= 0 ? (rows[unitRow] || []).filter(Boolean) : [];
  const unitNoteRaw = unitCells.find((c) => /单位[∶:]/.test(String(c))) || unitCells.join('') || '';
  const amountScale = getAmountScale(unitNoteRaw);
  const unitNote = amountScale > 1 ? '单位：万元人民币' : String(unitNoteRaw);

  const period = parsePeriodFromTitle(title);

  // 从表头第一行读月份标签（在商品名称、计量单位之后的第一个非空格）
  const h1Row = rows[header1Row] || [];
  const monthLabel = (() => {
    for (let c = nameCol + 2; c < h1Row.length; c++) {
      const v = h1Row[c];
      if (v != null && /月/.test(String(v))) return String(v).trim();
    }
    return period.month ? `${period.month}月` : '当月';
  })();

  // 规范化月份标签（2 月统一为 "1-2月"）
  const normalizedMonthLabel = normalizeMonthLabel(monthLabel, period.month);
  const displayMonthLabel = normalizedMonthLabel;

  const items = [];
  let footnote = null;
  // 层级栈：{ indent: number, name: string }
  const hierarchyStack = [];

  for (let i = dataStart; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const nameRaw = row[nameCol];
    if (nameRaw === null || nameRaw === undefined) continue;
    const nameStr = String(nameRaw).replace(/\r\n/g, '\n');
    const name = nameStr.trim();
    if (!name) continue;
    if (/^注[:：]/.test(name)) {
      footnote = name;
      break;
    }

    // 根据前导空格数维护层级栈，确定父级
    const indent = nameStr.match(/^ */)[0].length;
    while (hierarchyStack.length > 0 && hierarchyStack[hierarchyStack.length - 1].indent >= indent) {
      hierarchyStack.pop();
    }
    const parentName = hierarchyStack.length > 0 ? hierarchyStack[hierarchyStack.length - 1].name : null;
    const level = hierarchyStack.length; // 0 = 顶级
    hierarchyStack.push({ indent, name });

    // 数量/金额列紧跟在 nameCol 之后：+1 计量单位，+2 当月数量，+3 当月金额，+4 累计数量，+5 累计金额，+6 上年数量，+7 上年金额，+8 同比数量，+9 同比金额
    const c = nameCol;
    const unit = row[c + 1] != null ? String(row[c + 1]).trim() : '';
    items.push({
      name,
      level,
      parentName,
      unit: unit || null,
      currentMonth: {
        quantity: parseCell(row[c + 2]),
        amount: scaleAmount(parseCell(row[c + 3]), amountScale),
      },
      ytdCurrentYear: {
        quantity: parseCell(row[c + 4]),
        amount: scaleAmount(parseCell(row[c + 5]), amountScale),
      },
      ytdSamePeriodLastYear: {
        quantity: parseCell(row[c + 6]),
        amount: scaleAmount(parseCell(row[c + 7]), amountScale),
      },
      yoyYtdPercent: {
        quantity: parseCell(row[c + 8]),
        amount: parseCell(row[c + 9]),
      },
    });
  }

  return {
    meta: {
      sourceFile: path.basename(sourceFile),
      sheetName,
      title: String(title),
      unitNote: String(unitNote),
      period,
      monthLabel: displayMonthLabel,
      columnSemantics: {
        currentMonth: `当月（${displayMonthLabel}）数量/金额`,
        ytdCurrentYear: '当年累计至该月数量/金额',
        ytdSamePeriodLastYear: '上年同期累计数量/金额',
        yoyYtdPercent: '累计比去年同期 ±%',
      },
    },
    items,
    footnote,
  };
}

/**
 * 解析单个 xls 文件
 * @param {string} inputPath
 * @returns {object}
 */
function parseExportXls(inputPath) {
  const wb = xlsx.readFile(inputPath, { cellDates: true, cellNF: false, cellText: false });
  const sheets = {};

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: null });
    sheets[sheetName] = sheetToExport(rows, sheetName, inputPath);
  }

  return wb.SheetNames.length === 1
    ? sheets[wb.SheetNames[0]]
    : { sourceFile: path.basename(inputPath), sheets };
}

function main() {
  const inputArg = process.argv[2];
  const outputArg = process.argv[3];
  const inputPath = path.resolve(inputArg || DEFAULT_INPUT);

  if (!fs.existsSync(inputPath)) {
    console.error('文件不存在:', inputPath);
    process.exit(1);
  }

  const out = parseExportXls(inputPath);
  const period = (out.meta && out.meta.period) || {};
  // 规范输出文件名：2 月 xls 标题含 "N年2月" → 替换为 "N年1至2月"
  let defaultOut = inputPath.replace(/\.xls$/i, '.json');
  if (period.month === 2) {
    defaultOut = defaultOut.replace(/(\d{4}年)2月/, '$11至2月');
  }
  const outPath = path.resolve(outputArg || defaultOut);
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf-8');
  console.log('已写入', outPath);
  const count = out.items ? out.items.length : '(多表)';
  console.log('记录数', count);
}

if (require.main === module) {
  main();
}

module.exports = { parseExportXls, isRmbFile, isRmbWorkbook, sheetToExport, parsePeriodFromTitle, normalizeMonthLabel };
