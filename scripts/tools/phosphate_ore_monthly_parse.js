/**
 * 解析 stock/P₂O₅/月度数据.xlsx（国家统计局磷矿石产量）
 * 输出：stock/P₂O₅/monthly_production.json
 *
 * 用法：node scripts/tools/phosphate_ore_monthly_parse.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const ROOT = path.join(__dirname, '../..');
const INPUT = path.join(ROOT, 'stock/P₂O₅/月度数据.xlsx');
const OUTPUT = path.join(ROOT, 'stock/P₂O₅/monthly_production.json');

function safeNum(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return val;
  const s = String(val).trim();
  if (!s || s === '-' || s === '—') return null;
  const num = parseFloat(s);
  return isNaN(num) ? null : num;
}

/** 解析表头 "2026年7月" → { year, month, yearMonth } */
function parseYearMonth(header) {
  const m = String(header || '').trim().match(/(\d{4})年(\d{1,2})月/);
  if (!m) return null;
  const year = +m[1];
  const month = +m[2];
  return {
    year,
    month,
    yearMonth: year + '-' + String(month).padStart(2, '0'),
  };
}

/**
 * 解析 xlsx
 * @param {string} inputPath
 */
function parsePhosphateOreMonthly(inputPath) {
  const wb = xlsx.readFile(inputPath);
  const rows = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: null });

  const headerRow = rows.find(function (r) {
    return r && r.some(function (c) { return /^\d{4}年\d{1,2}月$/.test(String(c || '').trim()); });
  });
  if (!headerRow) throw new Error('未找到月份表头行');

  const colMeta = [];
  headerRow.forEach(function (cell, col) {
    const ym = parseYearMonth(cell);
    if (ym) colMeta.push({ col, ...ym });
  });

  function findMetricRow(keyword) {
    return rows.find(function (r) {
      return r && r[0] && String(r[0]).includes(keyword);
    });
  }

  const monthlyRow = findMetricRow('产量当期值');
  const cumulativeRow = findMetricRow('产量累计值');
  if (!monthlyRow) throw new Error('未找到「产量当期值」行');

  const records = colMeta.map(function (meta) {
    return {
      yearMonth: meta.yearMonth,
      year: meta.year,
      month: meta.month,
      value: safeNum(monthlyRow[meta.col]),
      cumulative: cumulativeRow ? safeNum(cumulativeRow[meta.col]) : null,
    };
  });

  // 按 yearMonth 升序
  records.sort(function (a, b) { return a.yearMonth.localeCompare(b.yearMonth); });

  // 1-2月当期值在源数据中为空，2月累计即为1-2月合计
  const byYear = {};
  records.forEach(function (r) {
    if (!byYear[r.year]) byYear[r.year] = {};
    byYear[r.year][r.month] = r;
  });

  Object.keys(byYear).forEach(function (year) {
    const feb = byYear[year][2];
    if (!feb || feb.value != null) return;
    if (feb.cumulative != null) feb.value = feb.cumulative;
  });

  // 计算同比（1-2月按2月合并口径同比）
  const byKey = {};
  records.forEach(function (r) { byKey[r.yearMonth] = r; });

  records.forEach(function (r) {
    const prevKey = (r.year - 1) + '-' + String(r.month).padStart(2, '0');
    const prev = byKey[prevKey];
    r.yoy = null;
    r.cumYoy = null;
    if (prev && prev.value != null && r.value != null && prev.value !== 0) {
      r.yoy = +(((r.value - prev.value) / prev.value) * 100).toFixed(2);
    }
    if (prev && prev.cumulative != null && r.cumulative != null && prev.cumulative !== 0) {
      r.cumYoy = +(((r.cumulative - prev.cumulative) / prev.cumulative) * 100).toFixed(2);
    }
  });

  const indicator = String(monthlyRow[0] || '').replace(/\s+/g, ' ').trim();

  return {
    meta: {
      source: '国家统计局',
      indicator: indicator,
      unit: '万吨',
      frequency: 'monthly',
      note: '1-2月合并为一期，当期值取2月累计（1-2月合计）',
      parsedAt: new Date().toISOString(),
      inputFile: path.basename(inputPath),
      count: records.length,
      dateRange: records.length
        ? { start: records[0].yearMonth, end: records[records.length - 1].yearMonth }
        : null,
    },
    data: records,
  };
}

function main() {
  const inputPath = process.argv[2] || INPUT;
  const outputPath = process.argv[3] || OUTPUT;

  if (!fs.existsSync(inputPath)) {
    console.error('文件不存在:', inputPath);
    process.exit(1);
  }

  const result = parsePhosphateOreMonthly(inputPath);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf8');

  const withYoy = result.data.filter(function (d) { return d.yoy != null; }).length;
  console.log('已解析 ' + result.data.length + ' 条月度记录（含同比 ' + withYoy + ' 条）');
  console.log('输出:', outputPath);
}

if (require.main === module) {
  main();
}

module.exports = { parsePhosphateOreMonthly };
