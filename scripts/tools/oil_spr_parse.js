/**
 * 解析 EIA 美国 SPR 原油库存周报（WCSSTUS1w.xls）为 JSON
 *
 * 用法：
 *   node scripts/tools/oil_spr_parse.js
 *   node scripts/tools/oil_spr_parse.js /path/to/WCSSTUS1w.xls
 *   node scripts/tools/oil_spr_parse.js /path/to/WCSSTUS1w.xls /path/to/out.json
 */

'use strict';

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const DEFAULT_INPUT = path.join(__dirname, '../../stock/oil/WCSSTUS1w.xls');
const DEFAULT_OUTPUT = path.join(__dirname, '../../stock/oil/spr_stocks.json');

/**
 * EIA Excel 序列日期 → YYYY-MM-DD
 * @param {number} serial
 * @returns {string}
 */
function excelSerialToDate(serial) {
  const utcDays = Math.floor(serial - 25569);
  return new Date(utcDays * 86400000).toISOString().slice(0, 10);
}

/**
 * 解析 WCSSTUS1w.xls
 * @param {string} inputPath
 * @returns {{ meta: object, data: Array<{date: string, value: number}> }}
 */
function parseSprXls(inputPath) {
  const wb = xlsx.readFile(inputPath);
  const sheetName = wb.SheetNames.find((n) => n.startsWith('Data')) || wb.SheetNames[1];
  const rows = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' });

  const titleRow = rows.find((r) => typeof r[1] === 'string' && r[1].includes('SPR'));
  const sourceKeyRow = rows.find((r) => r[0] === 'Sourcekey');
  const dataRows = rows.filter((r) => typeof r[0] === 'number' && typeof r[1] === 'number');

  // EIA 原始单位为千桶，转为百万桶便于阅读
  const data = dataRows.map(([serial, value]) => ({
    date: excelSerialToDate(serial),
    value: +(value / 1000).toFixed(2),
  }));

  return {
    meta: {
      source: 'U.S. Energy Information Administration',
      sourceKey: sourceKeyRow ? sourceKeyRow[1] : 'WCSSTUS1',
      title: titleRow ? titleRow[1] : 'Weekly U.S. Ending Stocks of Crude Oil in SPR (Thousand Barrels)',
      unit: '百万桶',
      rawUnit: '千桶',
      frequency: 'Weekly',
      parsedAt: new Date().toISOString(),
      count: data.length,
      dateRange: data.length
        ? { start: data[0].date, end: data[data.length - 1].date }
        : null,
    },
    data,
  };
}

function main() {
  const inputPath = process.argv[2] || DEFAULT_INPUT;
  const outputPath = process.argv[3] || DEFAULT_OUTPUT;

  if (!fs.existsSync(inputPath)) {
    console.error('文件不存在:', inputPath);
    process.exit(1);
  }

  const result = parseSprXls(inputPath);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf8');

  console.log(`已解析 ${result.data.length} 条记录`);
  console.log(`日期范围: ${result.meta.dateRange.start} ~ ${result.meta.dateRange.end}`);
  console.log(`输出: ${outputPath}`);
}

if (require.main === module) {
  main();
}

module.exports = { parseSprXls, excelSerialToDate };
