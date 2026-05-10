/**
 * 从海关「全国出口重点商品量值表」文章页 HTML 提取数据
 *
 * 适用于 2025 年前后部分文章：附件改为内嵌 HTML 表格，无 XLS 下载链接。
 *
 * 表格结构（典型 2025 年格式）：
 *   行0  单位行：最后一格含 "单位∶亿元人民币" 或 "单位∶百万美元"
 *   行1  表头1：商品名称(rowspan=2) | 计量单位(rowspan=2) | N月(colspan=2) | 1至N月累计(colspan=2) | 去年同期累计(colspan=2) | 累计同比±%(colspan=2)
 *   行2  表头2：数量 | 金额 | 数量 | 金额 | 数量 | 金额 | 数量 | 金额
 *   行3+  数据行（最后行为注释）
 *
 * 列索引（数据行，共 10 列）：
 *   0: 商品名称  1: 计量单位
 *   2: 当月数量  3: 当月金额
 *   4: 累计数量  5: 累计金额
 *   6: 去年同期累计数量  7: 去年同期累计金额
 *   8: 累计同比数量%  9: 累计同比金额%
 *
 * 与 parseExportXls 输出格式相同，可直接写入 china_export_rmb.json。
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { normalizeMonthLabel } = require('./china_export_xls_to_json');

/**
 * 单元格文本转可序列化值
 * @param {string} text
 * @returns {number|null}
 */
function parseCell(text) {
  if (!text || text === '-' || text === '　' || text.trim() === '') return null;
  const cleaned = text.replace(/,/g, '').trim();
  const n = Number(cleaned);
  if (!Number.isNaN(n) && cleaned !== '') return n;
  return null;
}

/**
 * 从标题解析年月
 * 支持：
 *   "2025年7月" → { year: 2025, month: 7 }
 *   "2025年1至2月" → { year: 2025, month: 2 }（取结束月份）
 * @param {string} title
 */
function parsePeriodFromTitle(title) {
  if (!title) return {};
  // 范围月份：如 "2025年1至2月"
  const rangeM = title.match(/(\d{4})年\d{1,2}至(\d{1,2})月/);
  if (rangeM) return { year: Number(rangeM[1]), month: Number(rangeM[2]) };
  // 单月：如 "2025年7月"
  const m = title.match(/(\d{4})年(\d{1,2})月/);
  if (m) return { year: Number(m[1]), month: Number(m[2]) };
  return {};
}

/**
 * 从文章页 HTML 解析出口商品量值数据
 *
 * @param {string} html       - 完整 HTML 字符串（Playwright page.content()）
 * @param {string} [titleHint] - 从列表页获取的文章标题（用于补全 period）
 * @returns {{ meta: object, items: object[], footnote: string|null } | null}
 *   返回 null 表示页面无有效数据表格，或该表格为美元版本
 */
function parseExportHtmlTable(html, titleHint) {
  const cheerio = require('cheerio');
  const $ = cheerio.load(html);

  // 找到正文区最大的数据表（行数最多且含"商品名称"）
  let dataTable = null;
  $('table').each((_, el) => {
    const $t = $(el);
    const rowCount = $t.find('tr').length;
    if (rowCount < 5) return;
    const text = $t.text();
    if (!text.includes('商品名称') && !text.includes('商品')) return;
    if (dataTable === null || rowCount > $(dataTable).find('tr').length) {
      dataTable = el;
    }
  });

  if (!dataTable) return null;

  // 将 table 转为二维文本数组（忽略 rowspan/colspan，直接按顺序取 textContent）
  const rows = [];
  $(dataTable).find('tr').each((_, tr) => {
    const cells = [];
    $(tr).find('td, th').each((_, td) => {
      cells.push($(td).text().trim());
    });
    rows.push(cells);
  });

  if (rows.length < 4) return null;

  // 找单位行（含"单位"的行）
  let unitNote = '';
  let unitRowIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const rowText = rows[i].join('');
    if (/单位[∶:：]/.test(rowText)) {
      unitNote = rowText.replace(/\s/g, '');
      unitRowIdx = i;
      break;
    }
  }

  // 如果是美元版，跳过
  if (/美元/.test(unitNote)) return null;

  // 提取标题（从 titleHint 清理）
  const cleanTitle = (titleHint || '')
    .replace(/^[（(]\d+[）)]\s*/, '')
    .trim();

  // 找表头行（含"商品名称"的行）
  let header1Idx = -1;
  for (let i = 0; i < Math.min(rows.length, 8); i++) {
    if (rows[i].join('').includes('商品名称')) {
      header1Idx = i;
      break;
    }
  }
  if (header1Idx < 0) return null;

  // 解析月份标签（表头1第3个格，如 "7月"），并规范化
  const h1 = rows[header1Idx];
  const rawMonthLabel = h1[2] || '当月';
  const period = parsePeriodFromTitle(cleanTitle);
  const monthLabel = normalizeMonthLabel(rawMonthLabel, period.month);

  // 数据从 header1 + 2 行开始
  const dataStart = header1Idx + 2;
  const items = [];
  let footnote = null;

  for (let i = dataStart; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 2) continue;

    const name = row[0].replace(/\r\n|\n/g, '').trim();
    if (!name || name === '　') continue;

    // 注释行
    if (/^注[：:]/.test(name) || /^注$/.test(name)) {
      footnote = row.join(' ').trim();
      break;
    }

    // 跳过空白行或只有单位的行
    if (row.length < 5) continue;

    items.push({
      name,
      unit: row[1] === '-' || !row[1] ? null : row[1],
      currentMonth: {
        quantity: parseCell(row[2]),
        amount: parseCell(row[3]),
      },
      ytdCurrentYear: {
        quantity: parseCell(row[4]),
        amount: parseCell(row[5]),
      },
      ytdSamePeriodLastYear: {
        quantity: parseCell(row[6]),
        amount: parseCell(row[7]),
      },
      yoyYtdPercent: {
        quantity: parseCell(row[8]),
        amount: parseCell(row[9]),
      },
    });
  }

  if (items.length === 0) return null;

  // period 已在解析 monthLabel 时提前计算

  return {
    meta: {
      sourceType: 'html',
      title: cleanTitle,
      unitNote,
      period,
      monthLabel,
      columnSemantics: {
        currentMonth: `当月（${monthLabel}）数量/金额`,
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
 * 将 HTML 解析结果保存为 JSON 文件
 *
 * @param {object} data         - parseExportHtmlTable 的返回值
 * @param {string} titleHint    - 文章标题（用于生成文件名）
 * @param {string} downloadDir  - 输出目录
 * @returns {string|null}        - 保存路径，失败返回 null
 */
function saveHtmlExtracted(data, titleHint, downloadDir) {
  try {
    const period = data.meta.period || {};
    if (!period.year || !period.month) return null;

    const dateStr = `${period.year}-${String(period.month).padStart(2, '0')}-01`;
    let cleanTitle = (titleHint || data.meta.title || '')
      .replace(/^[（(]\d+[）)]\s*/, '')   // 开头序号
      .replace(/[（(][^（(）)]*[）)]/g, '') // 所有括号及内容
      .trim();
    // 2 月文件名统一含 "1至2月"（海关首期数据为 1-2 月累计）
    if (period.month === 2 && !/1至2月/.test(cleanTitle)) {
      cleanTitle = cleanTitle.replace(/2月/, '1至2月');
    }
    const filename = `${dateStr}_${cleanTitle}_html_rmb.json`;
    const filepath = path.join(downloadDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
    return filepath;
  } catch (e) {
    console.error('保存 HTML 提取结果失败:', e.message);
    return null;
  }
}

module.exports = { parseExportHtmlTable, saveHtmlExtracted, parsePeriodFromTitle };
