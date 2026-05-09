#!/usr/bin/env node

/**
 * 解析 stock/gold/*.xlsx，提取月度黄金储备数据
 * 输出 stock/gold/gold_data.json
 *
 * xlsx 结构（Sheet1）：
 *   行3  : 表头，奇数列为月份（YYYY.MM 数字）
 *   行13 : 黄金价值（亿美元），奇数列对应各月
 *   行15 : 黄金持有量（万盎司），奇数列对应各月
 */

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const GOLD_DIR = path.join(__dirname, '../../../stock/gold');
const OUTPUT_FILE = path.join(GOLD_DIR, 'gold_data.json');
const HTML_FILE = path.join(__dirname, '../../../stock/html/gold_chart.html');

/**
 * 清理数字字符串，去掉"万盎司"、空格等，返回 number 或 null
 */
function parseNum(raw) {
  if (raw === '' || raw === null || raw === undefined) return null;
  const s = String(raw).replace(/万盎司|亿美元|亿SDR|\s/g, '').trim();
  if (s === '') return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

/**
 * 解析单个 xlsx 文件，返回该年份的月度数据
 * @param {string} filePath
 * @returns {{ year: number, months: Array<{month:number, valueUsd:number|null, holdingsOz:number|null}> }}
 */
function parseFile(filePath) {
  const wb = xlsx.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });

  // 从文件名提取年份（如 2026.xlsx → 2026）
  const yearFromFile = parseInt(path.basename(filePath, path.extname(filePath)), 10);

  // 行3（index 3）：表头，奇数列（1,3,5,...）= YYYY.MM 格式
  const headerRow = rows[3] || [];
  // 行13（index 13）：黄金价值（亿美元）
  const valueRow = rows[13] || [];
  // 行15（index 15）：黄金持有量（万盎司）
  const holdingsRow = rows[15] || [];

  const months = [];

  for (let col = 1; col < headerRow.length; col += 2) {
    const headerVal = headerRow[col];
    if (!headerVal && headerVal !== 0) continue;

    // 解析月份（YYYY.MM 可能是数字 2026.01 = 2026.1 → 需要特殊处理）
    const headerStr = String(headerVal).trim();

    // 先尝试 "YYYY.MM" 格式（如 "2026.01" 或 2026.01）
    let year, month;
    const dotMatch = headerStr.match(/^(\d{4})\.(\d{1,2})$/);
    if (dotMatch) {
      year = parseInt(dotMatch[1], 10);
      month = parseInt(dotMatch[2], 10);
    } else {
      // 数字 2026.01 → 浮点数转字符串可能是 "2026.01" 或 "2026.1"
      const num = parseFloat(headerStr);
      if (isNaN(num)) continue;
      year = Math.floor(num);
      // 取小数部分，乘以100并四舍五入
      const dec = Math.round((num - year) * 100);
      month = dec === 0 ? 1 : dec;
    }

    if (!year || !month) continue;

    const valueUsd = parseNum(valueRow[col]);
    const holdingsOz = parseNum(holdingsRow[col]);

    // 跳过完全没有数据的月份（未发布）
    if (valueUsd === null && holdingsOz === null) continue;

    months.push({ month, valueUsd, holdingsOz });
  }

  return { year: yearFromFile, months };
}

/**
 * 主流程
 */
function main() {
  const files = fs.readdirSync(GOLD_DIR)
    .filter(f => /^\d{4}\.xlsx?$/.test(f))
    .sort();

  if (files.length === 0) {
    console.error('未找到 xlsx 文件，请先运行 gold_crawler.js 下载数据');
    process.exit(1);
  }

  console.log(`找到 ${files.length} 个文件: ${files.join(', ')}`);

  const years = {};

  for (const file of files) {
    const filePath = path.join(GOLD_DIR, file);
    try {
      const { year, months } = parseFile(filePath);
      years[year] = months;
      console.log(`解析 ${file}: ${months.length} 个月份，最新月份 ${months[months.length - 1]?.month} 月`);
    } catch (err) {
      console.error(`解析 ${file} 失败: ${err.message}`);
    }
  }

  // 读取已有文件，仅在数据真正变化时才更新 generatedAt
  let generatedAt = new Date().toISOString();
  let dataChanged = true;
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      const existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
      if (JSON.stringify(existing.years) === JSON.stringify(years)) {
        // 数据没有变化，保留原来的 generatedAt
        generatedAt = existing.generatedAt;
        dataChanged = false;
      }
    } catch (e) {
      // 解析失败则视为数据已变化，使用当前时间
    }
  }

  const result = { generatedAt, years };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`\n输出 JSON: ${OUTPUT_FILE}`);

  // 仅在数据变化时才更新 HTML
  if (dataChanged && fs.existsSync(HTML_FILE)) {
    let html = fs.readFileSync(HTML_FILE, 'utf-8');
    // 替换占位符（或上次嵌入的数据）
    html = html.replace(
      /const RAW_DATA = (?:%%GOLD_DATA%%|[\s\S]*?);(\s*\/\/ ─)/,
      `const RAW_DATA = ${JSON.stringify(result)};$1`
    );
    fs.writeFileSync(HTML_FILE, html, 'utf-8');
    console.log(`已将数据内嵌到 HTML: ${HTML_FILE}`);
  } else if (!dataChanged) {
    console.log(`数据无变化，跳过 HTML 更新: ${HTML_FILE}`);
  }

  // 打印预览
  for (const [year, months] of Object.entries(result.years)) {
    console.log(`\n  ${year} 年 (${months.length} 个月):`);
    months.slice(0, 3).forEach(m => {
      console.log(`    ${m.month}月: 持有量=${m.holdingsOz}万盎司  价值=${m.valueUsd}亿美元`);
    });
    if (months.length > 3) console.log(`    ...`);
  }
}

main();
