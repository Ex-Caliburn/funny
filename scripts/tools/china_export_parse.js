/**
 * 批量解析 stock/china_export/ 下所有人民币版数据，合并输出汇总 JSON
 * 输出：stock/china_export/china_export_rmb.json（按年月汇总，不生成单月文件）
 *
 * 支持三种输入格式（优先级从高到低）：
 *   1. .xls / .xlsx  —— 直接调用 parseExportXls 解析
 *   2. *_html_rmb.json —— HTML 提取后的结构化 JSON（sourceType: 'html'）
 *   3. 其他 *.json   —— xls 转出或其他来源的单月 JSON，需含 { meta, items } 结构
 *
 * 优先级规则：XLS > JSON（含 html/json 来源），同优先级已有则跳过（--force 覆盖）
 *
 * 用法：
 *   node scripts/tools/china_export_parse.js           # 增量
 *   node scripts/tools/china_export_parse.js --force   # 全量
 */

'use strict'

const fs = require('fs');
const path = require('path');
const { parseExportXls, isRmbFile, parsePeriodFromTitle, normalizeMonthLabel } = require('./china_export_xls_to_json');

const EXPORT_DIR = path.join(__dirname, '../../stock/china_export');
const MERGED_JSON = path.join(EXPORT_DIR, 'china_export_rmb.json');

/** 年月 key，如 "2026-04" */
function yearMonthKey(period) {
  if (!period || !period.year || !period.month) return null;
  return `${period.year}-${String(period.month).padStart(2, '0')}`;
}

/** 从文件名猜年月（备用） */
function yearMonthFromFilename(filename) {
  const m = filename.match(/(\d{4})[年-](\d{1,2})月?/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}`;
  return null;
}

/** 合并单条解析结果到 merged 对象，返回 key */
function mergeResult(merged, key, basename, result) {
  const period = result.meta.period || {};
  const rawLabel = result.meta.monthLabel || '';
  // 兜底规范化（确保无论哪个解析器生成的数据都统一）
  const monthLabel = normalizeMonthLabel(rawLabel, period.month);
  merged[key] = {
    sourceFile: basename,
    sourceType: result.meta.sourceType || 'xls',
    title: result.meta.title || '',
    unitNote: result.meta.unitNote || '',
    period,
    monthLabel,
    columnSemantics: {
      ...(result.meta.columnSemantics || {}),
      currentMonth: `当月（${monthLabel}）数量/金额`,
    },
    items: result.items || [],
    footnote: result.footnote || null,
  };
}

function main() {
  const force = process.argv.includes('--force');

  if (!fs.existsSync(EXPORT_DIR)) {
    console.error('目录不存在:', EXPORT_DIR);
    process.exit(1);
  }

  // 读取已有汇总
  let merged = {};
  if (!force && fs.existsSync(MERGED_JSON)) {
    try {
      merged = JSON.parse(fs.readFileSync(MERGED_JSON, 'utf-8'));
    } catch {
      merged = {};
    }
  }

  const MERGED_BASENAME = path.basename(MERGED_JSON);
  const allFiles = fs.readdirSync(EXPORT_DIR).sort();
  const xlsFiles  = allFiles.filter((f) => /\.xlsx?$/i.test(f));
  // 所有单月 JSON（排除汇总输出本身）
  const jsonFiles = allFiles.filter((f) => /\.json$/i.test(f) && f !== MERGED_BASENAME);

  let parsed = 0;
  let skipped = 0;

  // ── 1. 解析 XLS 文件 ────────────────────────────────────────────────────────
  for (const basename of xlsFiles) {
    const xlsPath = path.join(EXPORT_DIR, basename);

    if (!isRmbFile(xlsPath)) {
      console.log(`跳过（非人民币）: ${basename}`);
      skipped++;
      continue;
    }

    if (!force) {
      const guessKey = yearMonthFromFilename(basename);
      if (guessKey && merged[guessKey]) {
        console.log(`跳过（已有 ${guessKey}）: ${basename}`);
        skipped++;
        continue;
      }
    }

    console.log(`解析(xls): ${basename}`);
    try {
      const result = parseExportXls(xlsPath);
      const key =
        yearMonthKey(result.meta && result.meta.period) || yearMonthFromFilename(basename);
      if (!key) {
        console.warn(`  ⚠ 无法确定年月，已跳过`);
        skipped++;
        continue;
      }
      mergeResult(merged, key, basename, result);
      console.log(`  → ${key}，${(result.items || []).length} 条商品`);
      parsed++;
    } catch (e) {
      console.error(`  解析失败: ${e.message}`);
    }
  }

  // ── 2. 读取单月 JSON 文件（_html_rmb.json 或 xls 转出的普通 .json）───────────
  for (const basename of jsonFiles) {
    const jsonPath = path.join(EXPORT_DIR, basename);
    const guessKey = yearMonthFromFilename(basename);

    let result;
    try {
      result = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    } catch (e) {
      console.error(`  读取失败: ${basename}: ${e.message}`);
      continue;
    }

    // 必须具备 meta + items 结构，否则不是单月数据文件
    if (!result || !result.meta || !Array.isArray(result.items)) {
      console.log(`跳过（格式不符）: ${basename}`);
      skipped++;
      continue;
    }

    const key = yearMonthKey(result.meta.period) || guessKey;
    if (!key) {
      console.warn(`  ⚠ 无法确定年月，已跳过: ${basename}`);
      skipped++;
      continue;
    }

    if (merged[key]) {
      // XLS 版始终优先（当前条目 sourceType 不是 json/html 则视为 xls 来源）
      const curType = merged[key].sourceType || 'xls';
      if (curType === 'xls') {
        console.log(`跳过（XLS 已有 ${key}）: ${basename}`);
        skipped++;
        continue;
      }
      // 同年月已有同类 JSON，非 --force 则跳过
      if (!force) {
        console.log(`跳过（已有 ${key}）: ${basename}`);
        skipped++;
        continue;
      }
    }

    // sourceType：优先用文件自带的 meta.sourceType，否则按文件名推断
    if (!result.meta.sourceType) {
      result.meta.sourceType = /_html_rmb\.json$/i.test(basename) ? 'html' : 'json';
    }

    const typeLabel = result.meta.sourceType;
    console.log(`读取(${typeLabel}): ${basename}`);
    mergeResult(merged, key, basename, result);
    console.log(`  → ${key}，${(result.items || []).length} 条商品`);
    parsed++;
  }

  if (parsed === 0 && skipped === 0) {
    console.log('stock/china_export/ 下没有可解析的文件');
    return;
  }

  // 按年月升序排列
  const sorted = Object.fromEntries(
    Object.entries(merged).sort(([a], [b]) => a.localeCompare(b))
  );

  fs.writeFileSync(MERGED_JSON, JSON.stringify(sorted, null, 2), 'utf-8');
  console.log(`\n→ 汇总已写入: china_export_rmb.json（${Object.keys(sorted).length} 个月份）`);
  console.log(`   解析: ${parsed}  跳过: ${skipped}`);
}

main();
