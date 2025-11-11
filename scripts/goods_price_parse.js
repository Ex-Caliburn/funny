/*
  Parse NBS goods price Excel files in /stock/goods_price and compute value, MoM (%), YoY (%).
  Output: /stock/cleaned_data/goods_price_cleaned.json
  Visualization: /stock/html/goods_price_chart.html (uses /stock/vendor/echarts.min.js)
*/

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const ROOT = '/Users/lijiye/work/funny';
const STOCK_DIR = path.join(ROOT, 'stock');
const SRC_DIR = path.join(STOCK_DIR, 'goods_price');
const OUTPUT_JSON = path.join(STOCK_DIR, 'cleaned_data', 'goods_price_cleaned.json');

// 归一化指标名：去空格、统一中英标点/括号/破折号
function normalizeMetricName(raw) {
  var s = String(raw || '').trim();
  // 去除前缀“其中：/其中:”
  s = s.replace(/^其中[:：]/, '');
  // 去除所有空白
  s = s.replace(/\s+/g, '');
  // 括号统一为中文
  s = s.replace(/[()]/g, function (m) { return m === '(' ? '（' : '）'; });
  // 逗号统一为中文逗号
  s = s.replace(/,/g, '，');
  // 破折号/连字符统一为中文破折号（常见三种：-、–、—）
  s = s.replace(/[\-–—]+/g, '—');
  // 冒号统一为中文
  s = s.replace(/:/g, '：');
  return s;
}

function listExcelFiles(directory) {
  return fs
    .readdirSync(directory)
    .filter(function (name) { return name.endsWith('.xls') || name.endsWith('.xlsx'); })
    .map(function (name) { return path.join(directory, name); })
    .sort();
}

function parseYearMonthFromFilename(filename) {
  const base = path.basename(filename);
  const prefix = base.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!prefix) return null;
  const y = prefix[1];
  const m = prefix[2];
  const d = parseInt(prefix[3], 10);
  const chinese = base.split('_')[1] || '';
  // 优先从中文标题完整提取：YYYY年M月(上/中/下)旬
  const zhFull = chinese.match(/(\d{4})年\s*(\d{1,2})月\s*(上旬|中旬|下旬)/);
  if (zhFull) {
    const yy = zhFull[1];
    const mm = ('0' + parseInt(zhFull[2], 10)).slice(-2);
    const tt = zhFull[3];
    return yy + '-' + mm + '-' + tt;
  }
  // 不再推断：必须从标题解析完整年月与旬，否则跳过
  try { console.warn('SKIP_FILE_NO_TEN_DAY', base); } catch (e) {}
  return null;
}

function toRows(sheet) {
  const range = xlsx.utils.decode_range(sheet['!ref']);
  var rows = [];
  for (var r = range.s.r; r <= range.e.r; r++) {
    var row = [];
    for (var c = range.s.c; c <= range.e.c; c++) {
      const cellAddress = xlsx.utils.encode_cell({ r: r, c: c });
      const cell = sheet[cellAddress];
      row.push(cell ? String(cell.v).trim() : '');
    }
    rows.push(row);
  }
  return rows;
}

function extractNumbers(text) {
  var m = String(text || '').replace(/[,\s]/g, '').match(/-?\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

function parseWorkbook(filePath) {
  var ym = parseYearMonthFromFilename(filePath);
  if (!ym) return [];
  var wb = xlsx.readFile(filePath, { cellText: false, cellDates: true });
  var list = [];
  for (var si = 0; si < wb.SheetNames.length; si++) {
    var sh = wb.Sheets[wb.SheetNames[si]];
    var rows = toRows(sh);
    if (!rows.length) continue;
    // Find header band
    var headerIdx = -1;
    for (var i = 0; i < Math.min(8, rows.length); i++) {
      var t = rows[i].join('');
      if (/本期价格|涨跌幅|价格涨跌/.test(t)) { headerIdx = i; break; }
    }
    var header = headerIdx >= 0 ? rows[headerIdx] : null;
    // 自动定位“价格”列索引
    var valueColIdx = 2; // fallback
    var unitColIdx = -1;
    if (header) {
      for (var ci = 0; ci < header.length; ci++) {
        var hc = String(header[ci] || '');
        if (/本期价格|当期价格|价格\s*\(|价格（|本期平均价格/.test(hc)) { valueColIdx = ci; break; }
      }
      for (var cj = 0; cj < header.length; cj++) {
        var hc2 = String(header[cj] || '');
        if (/^\s*单位\s*$/.test(hc2) || /\b单位\b/.test(hc2)) { unitColIdx = cj; break; }
      }
    }
    // Try extracting unit from the value column header text, e.g. "本期价格（元/吨）"
    var unitFromHeader = null;
    var itemUnitFromHeader = null; // e.g. 吨、千克、台
    try {
      var headerCell = header && header[valueColIdx] ? String(header[valueColIdx]) : '';
      var mUnit = headerCell.match(/（([^）]+)）/);
      unitFromHeader = mUnit ? mUnit[1] : null;
      if (unitFromHeader) {
        var s = unitFromHeader;
        var m1 = s.match(/元\/(.+)$/); // 元/吨
        if (m1) { itemUnitFromHeader = m1[1]; }
        if (!itemUnitFromHeader) {
          var s2 = s.replace(/含税|不含税/g, '');
          var m2 = s2.match(/每([\u4e00-\u9fa5A-Za-z0-9·\/]+)$/); // 每吨
          if (m2) { itemUnitFromHeader = m2[1]; }
        }
      }
    } catch (e) { unitFromHeader = null; }
    for (var r = headerIdx + 1; r < rows.length; r++) {
      var row = rows[r];
      var label = (row[0] || '').trim();
      if (!label || !/[\u4e00-\u9fa5]/.test(label)) continue;
      if (/^一、|^二、|^三、|^四、|^五、|^六、|^七、|^八、|^九、/.test(label)) continue;
      if (/注：|说明：/.test(row.join(''))) continue;
      var value = extractNumbers(row[valueColIdx]);
      var diff = extractNumbers(row[valueColIdx + 1]);
      var mom = row[valueColIdx + 2] != null ? extractNumbers(row[valueColIdx + 2]) : null;
      // 读取行内单位列（如 吨/千克/台）
      var itemUnitCell = unitColIdx >= 0 ? String(row[unitColIdx] || '').trim() : '';
      var itemUnitFromRow = itemUnitCell ? itemUnitCell.replace(/\s+/g, '') : null;
      var finalItemUnit = itemUnitFromHeader || itemUnitFromRow || null;
      // 价格单位：优先表头；否则按 元/计量单位；再否则退化为 元
      var finalPriceUnit = unitFromHeader || (finalItemUnit ? ('元/' + finalItemUnit) : '元');
      var name = normalizeMetricName(label);
      if (value == null) {
        try { console.warn('MISSING_VALUE', path.basename(filePath), ym, name); } catch (e) {}
      }
      list.push({ metric: name, yearMonth: ym, value: value, diff: diff, mom: mom, yoy: null, unit: finalPriceUnit, itemUnit: finalItemUnit });
    }
  }
  return list;
}

function main() {
  var files = listExcelFiles(SRC_DIR);
  if (!files.length) { console.error('No goods_price excel files'); process.exit(1); }
  var byMetric = {};
  var units = {}; // price unit e.g. 元/吨
  var itemUnits = {}; // measurement unit e.g. 吨
  var displayNames = {};
  files.forEach(function (f) {
    parseWorkbook(f).forEach(function (rec) {
      var key = normalizeMetricName(rec.metric);
      if (!displayNames[key]) { displayNames[key] = rec.metric; }
      (byMetric[key] || (byMetric[key] = [])).push({ yearMonth: rec.yearMonth, value: rec.value, mom: rec.mom, yoy: rec.yoy });
      if (rec.unit && !units[key]) { units[key] = rec.unit; }
      if (rec.itemUnit && !itemUnits[key]) { itemUnits[key] = rec.itemUnit; }
    });
  });
  // Sort each series by year, month, ten-day order (上/中/下)
  function periodKey(k) {
    if (!k) return -Infinity;
    var m = k.match(/^(\d{4})-(\d{2})-(上旬|中旬|下旬)$/);
    if (!m) return -Infinity;
    var year = parseInt(m[1], 10);
    var mon = parseInt(m[2], 10);
    var ten = m[3] === '上旬' ? 0 : (m[3] === '中旬' ? 1 : 2);
    return year * 1000 + mon * 10 + ten;
  }
  Object.keys(byMetric).forEach(function (k) {
    byMetric[k].sort(function (a, b) { return periodKey(a.yearMonth) - periodKey(b.yearMonth); });
  });

  // 统一计算环比、同比（基于同一指标的上一个期次，以及去年同月同旬）
  function percent(a, b) {
    if (a == null || b == null || b === 0) return null;
    var v = ((a - b) / b) * 100;
    return Math.round(v * 10) / 10; // 保留1位小数
  }
  Object.keys(byMetric).forEach(function (metric) {
    var arr = byMetric[metric];
    // 建图便于找去年同期
    var map = {};
    arr.forEach(function (r) { map[r.yearMonth] = r; });
    for (var i = 0; i < arr.length; i++) {
      var cur = arr[i];
      // 上一个期次
      var prev = i > 0 ? arr[i - 1] : null;
      cur.mom = percent(cur.value, prev ? prev.value : null);
      // 去年同期（同月、同旬）
      var m = cur.yearMonth.match(/^(\d{4})-(\d{2})-(上旬|中旬|下旬)$/);
      if (m) {
        var lastKey = (parseInt(m[1], 10) - 1) + '-' + m[2] + '-' + m[3];
        var last = map[lastKey];
        cur.yoy = percent(cur.value, last ? last.value : null);
      } else {
        cur.yoy = null;
      }
    }
  });

  // Parents mapping from section headings in the latest file (best effort)
  // Simple heuristic: scan latest file for category blocks and map following rows until next heading
  var parents = {};
  try {
    var last = files[files.length - 1];
    var wb = xlsx.readFile(last);
    var sh = wb.Sheets[wb.SheetNames[0]];
    var rows = toRows(sh);
    var current = '';
    for (var i = 0; i < rows.length; i++) {
      var text = (rows[i][0] || '').trim();
      if (/^([一二三四五六七八九]、)(.+)$/.test(text)) { current = normalizeMetricName(text.replace(/^([一二三四五六七八九]、)/, '')); continue; }
      if (current && text && /[\u4e00-\u9fa5]/.test(text)) {
        var key = normalizeMetricName(text);
        parents[key] = current;
        if (!displayNames[key]) { displayNames[key] = text; }
      }
    }
  } catch (e) {}

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify({ metrics: byMetric, parents: parents, displayNames: displayNames, units: units, itemUnits: itemUnits }, null, 2), 'utf8');
  console.log('Wrote', OUTPUT_JSON);
}

main();


