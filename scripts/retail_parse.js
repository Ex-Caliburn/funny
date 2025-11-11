/*
  Parse monthly retail data Excel files in /stock and compute absolute (value), MoM (环比), YoY (同比).
  Output: /stock/cleaned_data/retail_cleaned.json and /stock/html/retail_chart.html

  Heuristic extraction rules:
  - Prefer rows containing any of these labels: ["社会消费品零售总额", "社会消费品零售总额总计", "当月", "本月"]
  - Try to find columns describing ["当月", "当月值", "本月", "当期"] for absolute
  - Try to find ["环比", "环比增长", "较上月"] for MoM, ["同比", "同比增长", "较上年同月"] for YoY
  - Fallback: pick first numeric cell in the matched row as absolute; pick percentages in the row for MoM/YoY

  Notes:
  - This is resilient to different table formats by scanning sheet to an array-of-arrays.
  - If a field can't be found, it will be null and logged.
*/

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const NP = require('number-precision');
NP.enableBoundaryChecking(false);

const ROOT = '/Users/lijiye/work/funny';
const STOCK_DIR = path.join(ROOT, 'stock');
const RETAIL_DIR = path.join(STOCK_DIR, 'retail');
const OUTPUT_JSON = path.join(STOCK_DIR, 'cleaned_data', 'retail_cleaned.json');
const OUTPUT_HTML = path.join(STOCK_DIR, 'html', 'retail_chart.html');
const VENDOR_DIR = path.join(STOCK_DIR, 'vendor');
const ECHARTS_SRC = path.join(ROOT, 'node_modules', 'echarts', 'dist', 'echarts.min.js');
const ECHARTS_DST = path.join(VENDOR_DIR, 'echarts.min.js');

// Debug 和 raw dump 数组
const DEBUG_LOG = [];
const RAW_DUMP = [];

function normalizeMetricName(raw) {
  var name = String(raw || '').replace(/\s+/g, '');
  
  // Remove "其中：/其中:" prefix (more comprehensive)
  name = name.replace(/^其中[:：]/, '');
  
  // 通用零售/零售额统一处理
  // 将所有以"零售"结尾但不是"零售额"的指标统一为"零售额"
  if (name.endsWith('零售') && !name.endsWith('零售额')) {
    name = name + '额';
  }
  
  // Canonical mappings for similar metric names
  if (name.indexOf('实物商品网上零售额') !== -1) {
    return '实物商品网上零售额';
  }
  
  // 粮油、食品类的各种变体
  if (name.indexOf('粮油') !== -1 && name.indexOf('食品') !== -1) {
    return '粮油、食品类';
  }
  
  // 其他可能的相似指标统一处理
  // 服装鞋帽类的统一
  if (name.indexOf('服装') !== -1 && name.indexOf('鞋帽') !== -1) {
    return '服装、鞋帽、针纺织品类';
  }
  
  // 家用电器类的统一
  if (name.indexOf('家用电器') !== -1 && name.indexOf('音像器材') !== -1) {
    return '家用电器和音像器材类';
  }
  
  // 文化办公用品类的统一
  if (name.indexOf('文化办公') !== -1 && name.indexOf('用品') !== -1) {
    return '文化办公用品类';
  }
  
  // 体育娱乐用品类的统一
  if (name.indexOf('体育') !== -1 && name.indexOf('娱乐') !== -1 && name.indexOf('用品') !== -1) {
    return '体育、娱乐用品类';
  }
  
  // 建筑装潢材料类的统一
  if (name.indexOf('建筑') !== -1 && name.indexOf('装潢') !== -1 && name.indexOf('材料') !== -1) {
    return '建筑及装潢材料类';
  }
  
  return name;
}

function listExcelFiles(directory) {
  return fs
    .readdirSync(directory)
    .filter(function (name) { return name.endsWith('.xls') || name.endsWith('.xlsx'); })
    .map(function (name) { return path.join(directory, name); })
    .sort();
}

function parseYearMonthFromFilename(filename) {
  // Prefer the period in the Chinese part after the first underscore: e.g. 2025年3月份, 2025年1—2月份
  const base = path.basename(filename);
  const afterUnderscore = base.split('_')[1] || base;
  let m;
  let y;
  let combined = false;
  let ymMatch = afterUnderscore.match(/(\d{4})年(\d{1,2})月份/);
  if (ymMatch) {
    y = ymMatch[1];
    m = ymMatch[2].padStart(2, '0');
  } else {
    let comb = afterUnderscore.match(/(\d{4})年1[—-]2月(?:份)?/);
    if (comb) {
      y = comb[1];
      combined = true;
    }
  }
  if (!y) {
    // fallback to prefix date
    const prefix = base.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (prefix) {
      y = prefix[1];
      m = prefix[2];
    }
  }
  if (!y) return { key: null, label: null };
  if (combined) {
    return { key: y + '-01-02', label: y + '-01~02' };
  }
  if (!m) return { key: null, label: null };
  return { key: y + '-' + m, label: y + '-' + m };
}

function sortableMonthKey(key) {
  if (!key) return -Infinity;
  let m;
  let y;
  let mm;
  let m2 = key.match(/^(\d{4})-(\d{2})$/);
  if (m2) { y = parseInt(m2[1],10); mm = parseInt(m2[2],10); return y * 100 + mm; }
  let comb = key.match(/^(\d{4})-01-02$/);
  if (comb) { y = parseInt(comb[1],10); return y * 100 + 2; }
  return -Infinity;
}

function normalizeCellValue(value) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return String(value).trim();
}

function to2dArrayFromSheet(sheet) {
  const range = xlsx.utils.decode_range(sheet['!ref']);
  var rows = [];
  for (var r = range.s.r; r <= range.e.r; r++) {
    var row = [];
    for (var c = range.s.c; c <= range.e.c; c++) {
      const cellAddress = xlsx.utils.encode_cell({ r: r, c: c });
      const cell = sheet[cellAddress];
      row.push(normalizeCellValue(cell ? cell.v : ''));
    }
    rows.push(row);
  }
  return rows;
}

function findBestRowForTotal(rows) {
  // Prefer row containing 统计项 and not containing 累计/累计值 when possible
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i].join('');
    if (row.indexOf('社会消费品零售总额') !== -1 && row.indexOf('累计') === -1) {
      return i;
    }
  }
  // Fallback: previous heuristic
  var bestIndex = -1;
  var bestScore = -1;
  var keywords = ['社会消费品零售总额', '社会消费品零售总额总计', '当月', '本月'];
  for (var j = 0; j < rows.length; j++) {
    var rowText = rows[j].join(' ');
    var score = 0;
    for (var k = 0; k < keywords.length; k++) {
      if (rowText.indexOf(keywords[k]) !== -1) score += 1;
    }
    if (/[\d\.]+/.test(rowText)) score += 0.5;
    if (score > bestScore) { bestScore = score; bestIndex = j; }
  }
  return bestIndex;
}

function extractNumbersFromText(text) {
  // Normalize spaces (including NBSP) inside numbers like "1 045" -> "1045"
  var normalized = String(text).replace(/[\u00A0\s\t\u2007\u202F]/g, '');
  // Fixed regex: prioritize longer numbers, avoid splitting 4+ digit numbers
  var matches = normalized.match(/-?\d+(?:\.\d+)?/g);
  if (!matches) return [];
  return matches.map(function (s) { return parseFloat(s.replace(/,/g, '')); })
    .filter(function (n) { return isFinite(n); });
}

function extractPercentFromCell(text) {
  if (!text) return null;
  // Accept like 3.4%、-0.5%、3.4% or numeric 3.4
  var percentMatch = String(text).match(/-?\d+(?:\.\d+)?\s*%|-?\d+(?:\.\d+)?\s*％| -?\d+(?:\.\d+)?\s*\u2030/);
  if (percentMatch) {
    var s = percentMatch[0].replace(/[%％\u2030\s]/g, '');
    var v = parseFloat(s);
    if (isFinite(v)) return v;
  }
  var asNum = parseFloat(String(text).replace(/,/g, ''));
  if (isFinite(asNum)) return asNum;
  return null;
}

function extractValuesFromRow(row, headerRow) {
  var absolute = null;
  var mom = null;
  var yoy = null;
  var cumulative = null;

  var absHeaders = ['当月', '当月值', '本月', '当期', '绝对量', '（亿元）', '亿元', '合计', '总计'];
  var momHeaders = ['环比', '环比增长', '较上月', '比上月'];
  var yoyHeaders = ['同比', '同比增长', '较上年同月', '比上年同月'];
  var cumHeaders = ['累计', '累计值', '累计（亿元）', '累计(亿元)'];

  function findByHeader(headers) {
    if (!headerRow) return -1;
    for (var i = 0; i < headerRow.length; i++) {
      var h = headerRow[i] || '';
      // Exclude cumulative bands like "累计" or "1—N月/1-N月"
      if (/累计|1[—-]\d+月/.test(h)) continue;
      // Skip headers that are clearly percent/ratio fields to avoid picking wrong columns
      if (/同比|环比|占比|比重|百分点|%|％/.test(h)) continue;
      for (var j = 0; j < headers.length; j++) {
        if (h.indexOf(headers[j]) !== -1) return i;
      }
    }
    return -1;
  }

  // Also consider unit mention like 亿元
  var absIdx = findByHeader(absHeaders);
  var momIdx = findByHeader(momHeaders);
  var yoyIdx = findByHeader(yoyHeaders);
  var cumIdx = findByHeader(cumHeaders);

  if (absIdx >= 0) {
    var cellAbs = row[absIdx] || '';
    // Guard: avoid cells that look like percent text
    if (!/%|％/.test(String(cellAbs))) {
      var nums = extractNumbersFromText(cellAbs);
      if (nums.length) absolute = nums[0];
      // Heuristic: large integer may be split across neighbor cells (e.g., '15' stored as '104' | '5')
      var baseDigits = String(row[absIdx]||'').replace(/[\u00A0\s\t\u2007\u202F]/g,'').replace(/[^0-9]/g,'');
      if ((absolute == null || absolute < 200) && /^\d{2,3}$/.test(baseDigits)) {
        var stitched = baseDigits;
        for (var look=1; look<=2; look++){
          var nxRaw = String(row[absIdx+look]||'');
          var nxDigits = nxRaw.replace(/[\u00A0\s\t\u2007\u202F]/g,'').replace(/[^0-9]/g,'');
          if (/^\d$/.test(nxDigits)) { stitched += nxDigits; } else { break; }
        }
        if (/^\d{3,6}$/.test(stitched)) {
          absolute = parseFloat(stitched);
        }
      }
    }
  }
  // STRICT: prefer absolute from explicit columns only; do not use row-maximum fallback
  if (absolute === null && headerRow) {
    // Prefer explicit unit columns like 亿元
    for (var i = 0; i < headerRow.length; i++) {
      var hi = headerRow[i] || '';
      if (/同比|环比|占比|比重|百分点|%|％/.test(hi)) continue;
      if (/累计|1[—-]\d+月/.test(hi)) continue;
      if (hi.indexOf('亿元') !== -1 || hi.indexOf('（亿元）') !== -1 || hi.indexOf('(亿元)') !== -1) {
        var cell = row[i] || '';
        if (!/%|％/.test(String(cell))) {
          var numsU = extractNumbersFromText(cell);
          if (numsU.length) { absolute = numsU[0]; break; }
        }
      }
    }
  }
  if (momIdx >= 0) mom = extractPercentFromCell(row[momIdx]);
  if (yoyIdx >= 0) yoy = extractPercentFromCell(row[yoyIdx]);
  if (cumIdx >= 0) {
    var numsC = extractNumbersFromText(row[cumIdx]);
    if (numsC.length) cumulative = numsC[0];
  }

  // Prefer the 2nd column as 当月值 for most tables (except 实物商品网上零售额)
  if (absolute === null) {
    try {
      var label0 = normalizeCellValue(row[0] || '');
      if (label0.indexOf('实物商品网上零售额') === -1) {
        var head1 = (headerRow && headerRow[1]) || '';
        var cell1 = row[1] || '';
        if (!/%|％/.test(String(cell1)) && !/累计|1[—-]\d+月|同比|环比|占比|比重|百分点/.test(head1)) {
          var n1 = extractNumbersFromText(cell1);
          if (n1.length) absolute = n1[0];
        }
      }
    } catch(e) {}
  }

  // If第2列存在更“像当月”的值（位数更长/数值更大），用第2列覆盖先前取到的较小值
  try {
    var lbl0 = normalizeCellValue(row[0] || '');
    if (lbl0.indexOf('实物商品网上零售额') === -1) {
      var cell2 = row[1] || '';
      if (!/%|％/.test(String(cell2))) {
        var n2 = extractNumbersFromText(cell2);
        if (n2.length) {
          var cand2 = n2[0];
          var lenCand = String(Math.floor(Math.abs(cand2))).length;
          var lenAbs = absolute == null ? -1 : String(Math.floor(Math.abs(absolute))).length;
          if (lenCand > lenAbs || (lenCand === lenAbs && cand2 > (absolute==null?-Infinity:absolute))) {
            absolute = cand2;
          }
        }
      }
    }
  } catch(e) {}

  // Heuristic: many tables are laid out as [当月值][同比%][累计][累计同比%]
  // If we see a non-percent followed by a percent, treat the first as 当月、第二个为同比
  if (absolute === null) {
    for (var pc = 1; pc < row.length - 1; pc++) {
      var headA = (headerRow && headerRow[pc]) || '';
      var headB = (headerRow && headerRow[pc+1]) || '';
      var cellA = row[pc] || '';
      var cellB = row[pc+1] || '';
      if (/%|％/.test(String(cellA)) || /累计|占比|比重/.test(headA)) continue;
      var nA = extractNumbersFromText(cellA);
      var pB = extractPercentFromCell(cellB);
      if (nA.length && pB != null) {
        absolute = nA[0];
        if (yoy == null && /同比/.test(headB) || /%|％/.test(String(cellB))) { yoy = pB; }
        break;
      }
    }
  }

  // Do not fallback to arbitrary first number to avoid picking 累计/其他口径
  // As a controlled fallback, scan non-percentage numeric cells whose header doesn't contain forbidden words
  // Disable broad numeric fallback to avoid误取累计；仅在无表头的情况下，再最小化兜底
  if (absolute === null && (!headerRow || !headerRow.length)) {
    for (var c = 1; c < row.length; c++) {
      var cell = row[c] || '';
      if (/%|％/.test(cell)) continue;
      var nums4 = extractNumbersFromText(cell);
      if (nums4.length) { absolute = nums4[0]; break; }
    }
  }

  // Header-agnostic pattern fallback: [number][percent][number][percent] → 当月/同比/累计/累计同比
  if (absolute === null) {
    for (var s = 1; s + 3 < row.length; s++) {
      var c1 = row[s] || ''; var c2 = row[s+1] || ''; var c3 = row[s+2] || ''; var c4 = row[s+3] || '';
      var n1 = extractNumbersFromText(c1); var p1 = extractPercentFromCell(c2);
      var n2 = extractNumbersFromText(c3); var p2 = extractPercentFromCell(c4);
      if (n1.length && p1 != null && n2.length && p2 != null) {
        absolute = n1[0];
        if (yoy == null) yoy = p1;
        if (cumulative == null) cumulative = n2[0];
        break;
      }
    }
  }

  if (mom === null || yoy === null) {
    for (var k2 = 0; k2 < row.length; k2++) {
      if (mom === null && /环比|较上月|比上月/.test(headerRow ? headerRow[k2] : '')) {
        mom = extractPercentFromCell(row[k2]);
      }
      if (yoy === null && /同比|较上年同月|比上年同月/.test(headerRow ? headerRow[k2] : '')) {
        yoy = extractPercentFromCell(row[k2]);
      }
    }
  }

  return { absolute: absolute, mom: mom, yoy: yoy, cumulative: cumulative };
}

function parseWorkbook(filePath) {
  var wb = xlsx.readFile(filePath, { cellText: false, cellDates: true });
  var ymInfo = parseYearMonthFromFilename(filePath);
  var entries = [];

  for (var si = 0; si < wb.SheetNames.length; si++) {
    var sheetName = wb.SheetNames[si];
    var sheet = wb.Sheets[sheetName];
    var rows = to2dArrayFromSheet(sheet);
    // Keep a lightweight dump of the first 20x20 cells per sheet
    var sample = rows.slice(0,20).map(function(r){ return r.slice(0,20); });
    RAW_DUMP.push({ file: path.basename(filePath), sheet: sheetName, sample: sample });
    if (!rows.length) continue;

    var headerRowIndex = -1;
    for (var i = 0; i < Math.min(8, rows.length); i++) {
      var text = rows[i].join('');
      if (/当月|本月|当期|环比|同比/.test(text)) { headerRowIndex = i; break; }
    }
    var headerRow = headerRowIndex >= 0 ? rows[headerRowIndex] : null;
    // Build merged column headers by concatenating header bands (handle multi-line headers like "绝对量(亿元)")
    var mergedHeader = null;
    if (headerRowIndex >= 0) {
      var width = rows[headerRowIndex].length;
      mergedHeader = new Array(width).fill('');
      for (var hi = Math.max(0, headerRowIndex - 3); hi <= headerRowIndex; hi++) {
        var hr = rows[hi] || [];
        for (var hc = 0; hc < width; hc++) {
          var piece = normalizeCellValue(hr[hc] || '');
          if (piece) {
            mergedHeader[hc] += piece;
          }
        }
      }
    }

    // Compute month-group indices for the current file (e.g., 8月 vs 1—8月)
    var monthGroupIndices = null;
    (function(){
      try{
        var key = ymInfo.key || '';
        var monthText = null;
        if (/\d{4}-\d{2}$/.test(key)) {
          var mm = parseInt(key.slice(5,7),10); monthText = String(mm)+'月';
        } else if (/-01-02$/.test(key)) { monthText = '1-2月'; }
        if (mergedHeader && mergedHeader.length && monthText){
          monthGroupIndices = [];
          for (var ci=0; ci<mergedHeader.length; ci++){
            var h = mergedHeader[ci] || '';
            if (h.indexOf(monthText) !== -1 && !/累计|1[—-]\d+月/.test(h)) monthGroupIndices.push(ci);
          }
        }
      }catch(e){}
    })();

    for (var r = 0; r < rows.length; r++) {
      if (headerRowIndex >= 0 && r <= headerRowIndex) continue;
      var row = rows[r];
      var label = normalizeCellValue(row[0]);
      if (!/[\u4e00-\u9fa5]/.test(label)) continue;
      var rowJoin = row.join('');
      if (!/\d/.test(rowJoin)) continue;
      if (/注：|说明：/.test(rowJoin)) continue;
      var values = { absolute:null, mom:null, yoy:null, cumulative:null };
      var usedMonthGroup = false;
      // 方案：优先在"当月（月度组）"区间内取 绝对量/亿元（严格排除同比/环比/占比等增长列）
      if (monthGroupIndices && monthGroupIndices.length && label.indexOf('实物商品网上零售额') === -1) {
        // 为候选列打分：绝对量最高，其次单位列（亿元），最后是当月/本月/当期（且不含增长/同比/环比）
        var bestIdx = -1; var bestScore = -1;
        for (var ai = 0; ai < monthGroupIndices.length; ai++) {
          var idx = monthGroupIndices[ai];
          var hh = (mergedHeader || headerRow || [])[idx] || '';
          // 排除增长/百分比类
          if (/同比|环比|占比|比重|百分点|%|％|增长|比上/.test(hh)) continue;
          var score = 0;
          if (/绝对量/.test(hh)) score += 10;
          if (/(亿元|\(亿元\)|（亿元）)/.test(hh)) score += 6;
          if (/(当月|本月|当期)/.test(hh)) score += 2;
          if (score > bestScore) { bestScore = score; bestIdx = idx; }
        }
        if (bestIdx >= 0) {
          var cellText = String(row[bestIdx] || '');
          if (!/%|％/.test(cellText)) {
            var numsPick = extractNumbersFromText(cellText);
            if (numsPick.length) {
              values.absolute = numsPick[0];
              usedMonthGroup = true;
              // 针对单位列的安全拼接：向右最多看2列，若为1-2位纯数字，且相邻列非增长/百分比列，则拼接
              var baseDigitsMG = cellText.replace(/[\u00A0\s\t\u2007\u202F]/g,'').replace(/[^0-9]/g,'');
              if (/^\d{2,3}$/.test(baseDigitsMG)) {
                var stitchedMG = baseDigitsMG;
                for (var lookA = 1; lookA <= 2; lookA++) {
                  var nh = String((mergedHeader || headerRow || [])[bestIdx + lookA] || '');
                  var nc = String(row[bestIdx + lookA] || '');
                  var nd = nc.replace(/[\u00A0\s\t\u2007\u202F]/g,'').replace(/[^0-9]/g,'');
                  if (!nh && !nc) break;
                  if (/%|％/.test(nc) || /同比|环比|占比|比重|百分点|增长|累计/.test(nh)) break;
                  if (!/^\d{1,2}$/.test(nd)) break;
                  stitchedMG += nd;
                  if (stitchedMG.length >= 4) break;
                }
                if (/^\d{3,8}$/.test(stitchedMG) && parseFloat(stitchedMG) > (values.absolute||0)) {
                  values.absolute = parseFloat(stitchedMG);
                }
              }
            }
          }
        }
      }
      // 若未命中"当月组"或为实物商品网上零售额，再走通用提取
      if (!usedMonthGroup){
        values = extractValuesFromRow(row, mergedHeader || headerRow);
      } else {
        // 当月组已提取绝对值，仅补充缺失的 mom/yoy/cumulative
        var supplementValues = extractValuesFromRow(row, mergedHeader || headerRow);
        if (values.mom == null) values.mom = supplementValues.mom;
        if (values.yoy == null) values.yoy = supplementValues.yoy;
        if (values.cumulative == null) values.cumulative = supplementValues.cumulative;
      }
  // Remove row-maximum special rule; we stick to explicit absolute/unit headers only
      // Heuristic: for "其中：实物商品网上零售额" 当月缺失而只有 "1—N月" 累计时，前面的提取往往把累计当成了absolute，这里纠正为累计
      if (/实物商品网上零售额/.test(label) && values && values.cumulative == null && values.absolute != null) {
        var headerJoin = (headerRow || []).join('');
        if (/\d+\s*[—-]\s*\d+\s*月/.test(headerJoin)) {
          values.cumulative = values.absolute;
          values.absolute = null;
        }
      }
      if (values.absolute === null && values.mom === null && values.yoy === null) continue;
      entries.push({
        metric: normalizeMetricName(label),
        yearMonth: ymInfo.key,
        label: ymInfo.label,
        value: values.absolute,
        cumulative: values.cumulative,
        mom: values.mom,
        yoy: values.yoy
      });
      if (/服装鞋帽/.test(label) && /2025/.test(ymInfo.key)) {
        DEBUG_LOG.push({
          stage: 'raw_row',
          file: path.basename(filePath),
          sheet: sheetName,
          row: r,
          ym: ymInfo.key,
          label: label,
          header: headerRow,
          rowValues: row,
          extracted: values
        });
      }
    }
  }

  return entries;
}

function main() {
  var files = listExcelFiles(RETAIL_DIR);
  if (!files.length) {
    console.error('No Excel files found in', RETAIL_DIR);
    process.exit(1);
  }

  var results = [];
  var issues = [];
  var metricsMap = {};

  for (var i = 0; i < files.length; i++) {
    try {
      var list = parseWorkbook(files[i]);
      for (var li = 0; li < list.length; li++) {
        var rec = list[li];
        results.push(rec);
        if (!metricsMap[rec.metric]) metricsMap[rec.metric] = [];
        metricsMap[rec.metric].push({ yearMonth: rec.yearMonth, label: rec.label || rec.yearMonth, value: rec.value, valueMonthly: null, cumulative: rec.cumulative, mom: rec.mom, yoy: rec.yoy, debug: rec.debug });
        if (rec.value === null || rec.mom === null || rec.yoy === null) {
          issues.push({ file: path.basename(files[i]), metric: rec.metric, extracted: rec });
        }
      }
    } catch (err) {
      issues.push({ file: path.basename(files[i]), error: String(err && err.message || err) });
    }
  }

  // Sort by period ascending with special handling for 1-2合并
  results.sort(function (a, b) { return sortableMonthKey(a.yearMonth) - sortableMonthKey(b.yearMonth); });

  // For 实物商品网上零售额：如果存在 cumulative，则强制按累计口径推导当月值（把 value 置空以便后续推导）
  Object.keys(metricsMap).forEach(function(k){
    if (/实物商品网上零售额/.test(k)){
      var arrN = metricsMap[k] || [];
      for (var iN = 0; iN < arrN.length; iN++){
        if (arrN[iN] && arrN[iN].cumulative != null){
          arrN[iN].value = null;
        }
      }
    }
  });

  // Derive monthly absolute values from cumulative when needed (e.g., 实物商品网上零售额 只有累计)
  function isCombinedJanFeb(key){ return /-01-02$/.test(key); }
  function sameYear(a,b){ return a && b && a.slice(0,4)===b.slice(0,4); }
  var metricNames0 = Object.keys(metricsMap);
  for (var mi0 = 0; mi0 < metricNames0.length; mi0++) {
    var name0 = metricNames0[mi0];
    // Apply ONLY to metrics confirmed as cumulative-only by user feedback
    if (!/实物商品网上零售额/.test(name0)) continue;
    var arr0 = metricsMap[name0];
    arr0.sort(function (a, b) { return sortableMonthKey(a.yearMonth) - sortableMonthKey(b.yearMonth); });
    for (var r0 = 0; r0 < arr0.length; r0++) {
      var cur = arr0[r0];
      if (cur && (cur.cumulative != null)) {
        // If 1-2月合并点，则当月值=累计（表示1-2月合计）
        if (isCombinedJanFeb(cur.yearMonth)) {
          cur.valueMonthly = cur.cumulative;
          continue;
        }
        // 否则用同年上一个点的累计做差；若上一个点不是同一年，则无法计算
        var prev = null;
        for (var p = r0 - 1; p >= 0; p--) {
          if (arr0[p] && arr0[p].cumulative != null) { prev = arr0[p]; break; }
        }
        if (prev && sameYear(prev.yearMonth, cur.yearMonth)) {
          var diff = cur.cumulative - prev.cumulative;
          if (isFinite(diff)) cur.valueMonthly = diff;
        }
      }
    }

    // Fallback: if未识别到 cumulative，但该指标的 value 实为累计，则按差分生成 valueMonthly
    for (var r1 = 0; r1 < arr0.length; r1++) {
      var node = arr0[r1];
      if (!node) continue;
      if (node.valueMonthly != null) continue; // already set
      if (node.value == null) continue;
      // combined 1-2
      if (isCombinedJanFeb(node.yearMonth)) { node.valueMonthly = node.value; continue; }
      // previous period raw value
      var prevNode = null;
      for (var p1 = r1 - 1; p1 >= 0; p1--) { if (arr0[p1] && arr0[p1].value != null) { prevNode = arr0[p1]; break; } }
      if (prevNode && sameYear(prevNode.yearMonth, node.yearMonth)) {
        var diff1 = node.value - prevNode.value;
        if (isFinite(diff1)) node.valueMonthly = diff1;
      }
    }
  }

  // Compute MoM/YoY per metric when missing
  var metricNames = Object.keys(metricsMap);
  for (var mi = 0; mi < metricNames.length; mi++) {
    var name = metricNames[mi];
    var arr = metricsMap[name];
    arr.sort(function (a, b) { return sortableMonthKey(a.yearMonth) - sortableMonthKey(b.yearMonth); });
    for (var r = 0; r < arr.length; r++) {
      var v = arr[r];
      // If valueMonthly computed, use it as value for downstream
      if (v && v.valueMonthly != null) { v.value = v.valueMonthly; }
      if (v && v.value != null) {
        // Skip MoM if current period is combined (1-2)
        if (v.mom == null && r > 0 && arr[r - 1].value != null && !/-01-02$/.test(v.yearMonth)) {
          var prev = arr[r - 1].value;
          if (prev != 0) v.mom = NP.times(NP.divide(NP.minus(v.value, prev), prev), 100);
        }
        // For combined period (1-2), compute MoM from previous month (Dec of last year)
        if (v.mom == null && /-01-02$/.test(v.yearMonth) && v.value != null) {
          var year = parseInt(v.yearMonth.slice(0, 4), 10);
          var prevDecKey = (year - 1) + '-12';
          for (var r3 = 0; r3 < arr.length; r3++) {
            if (arr[r3].yearMonth === prevDecKey && arr[r3].value != null) {
              var prevDec = arr[r3].value;
              if (prevDec != 0) v.mom = NP.times(NP.divide(NP.minus(v.value, prevDec), prevDec), 100);
              break;
            }
          }
        }
        if (v.yoy == null) {
          var ymStr = v.yearMonth;
          if (ymStr && /\d{4}-\d{2}/.test(ymStr) && !/-01-02$/.test(ymStr)) {
            var yy = parseInt(ymStr.slice(0, 4), 10);
            var mm = parseInt(ymStr.slice(5, 7), 10);
            var target = (yy - 1) + '-' + (mm < 10 ? '0' + mm : String(mm));
            for (var r2 = 0; r2 < arr.length; r2++) {
              if (arr[r2].yearMonth === target && arr[r2].value != null) {
                var base = arr[r2].value;
                if (base != 0) v.yoy = NP.times(NP.divide(NP.minus(v.value, base), base), 100);
                break;
              }
            }
          }
        }
        // Round mom/yoy to two decimals if present
        if (v.mom != null) v.mom = Number((Math.round(v.mom * 100) / 100).toFixed(2));
        if (v.yoy != null) v.yoy = Number((Math.round(v.yoy * 100) / 100).toFixed(2));
      }
    }
    if (/服装鞋帽/.test(name)) {
      DEBUG_LOG.push({ stage:'after_compute', metric:name, series: arr.map(function(x){ return { ym:x.yearMonth, valueMonthly:x.valueMonthly, value:x.value, cumulative:x.cumulative, src:x.debug&&x.debug.file }; }) });
    }
  }

  // Deduplicate per metric per month: keep a single record per yearMonth, prefer records with non-null valueMonthly, else value
  Object.keys(metricsMap).forEach(function(metric){
    var arr = metricsMap[metric] || [];
    // sort again to keep chronological order
    arr.sort(function(a,b){ return sortableMonthKey(a.yearMonth) - sortableMonthKey(b.yearMonth); });
    var pick = {};
    for (var i = 0; i < arr.length; i++) {
      var k = arr[i].yearMonth;
      if (!k) continue;
      if (!pick[k]) { pick[k] = arr[i]; continue; }
      // Prefer with non-null valueMonthly; else prefer non-null value; if both present, take latter
      var curBest = pick[k];
      var candidate = arr[i];
      function score(x){ return (x.valueMonthly!=null?2:0) + (x.value!=null?1:0); }
      if (score(candidate) >= score(curBest)) {
        pick[k] = arr[i];
      }
    }
    var cleaned = Object.keys(pick).sort(function(a,b){ return sortableMonthKey(a) - sortableMonthKey(b); }).map(function(k){ return pick[k]; });
    metricsMap[metric] = cleaned;
  });

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify({ updatedAt: new Date().toISOString(), data: results, metrics: metricsMap, issues: issues, debug: DEBUG_LOG, raw: RAW_DUMP }, null, 2), 'utf8');
  try {
    var keyClothes = Object.keys(metricsMap||{}).find(function(k){ return /服装/.test(k) && /鞋帽/.test(k); });
    if (keyClothes) {
      var ser = (metricsMap[keyClothes]||[]).map(function(x){ return { ym:x.yearMonth, valueMonthly:x.valueMonthly, value:x.value, cumulative:x.cumulative, src:x.debug&&x.debug.file }; });
      console.log('DEBUG metric(服装鞋帽) =>', ser);
    } else {
      console.log('DEBUG metric(服装鞋帽) not found. keys:', Object.keys(metricsMap||{}).slice(0,20));
    }
    console.log('DEBUG rows captured:', DEBUG_LOG.length);
  } catch (e) { /* noop */ }

  // Generate HTML (skipped if a custom page already exists)
  var html = '' +
    '<!doctype html>\n' +
    '<html lang="zh">\n<head>\n<meta charset="utf-8" />\n<meta name="viewport" content="width=device-width, initial-scale=1" />\n<title>社会消费品零售总额 - 月度趋势</title>\n' +
    '<style>body{font-family:-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial; margin:0; padding:16px; background:#0b0f19; color:#dbe0ea;} #app{height:80vh;} .legend-note{opacity:.7; font-size:12px;}</style>\n' +
    '</head>\n<body>\n<h2>社会消费品零售总额 - 月度趋势</h2>\n<div class="legend-note">展示每月绝对值（左轴），以及环比、同比增速（右轴，单位%）。</div>\n<div style="margin:12px 0; display:flex; gap:12px; align-items:center;"><label for="metric" style="opacity:.8">指标</label><select id="metric" style="background:#0f172a;color:#e5e7eb;border:1px solid #334155;padding:6px 8px;border-radius:6px;"></select></div>\n<div id="app"></div>\n' +
    '<script src="./vendor/echarts.min.js"></script>\n' +
    '<script>\n' +
    'const payload = ' + JSON.stringify({ data: [] }) + ';\n' +
    'fetch("./retail_cleaned.json").then(r=>r.json()).then(json=>{\n' +
    '  const metricNames = Object.keys(json.metrics||{});\n' +
    '  const prefer = metricNames.find(n=>n.includes("社会消费品零售总额")) || metricNames[0];\n' +
    '  const select = document.getElementById("metric");\n' +
    '  metricNames.forEach(n=>{ const opt=document.createElement("option"); opt.value=n; opt.textContent=n; if(n===prefer) opt.selected=true; select.appendChild(opt); });\n' +
    '  const el = document.getElementById("app");\n' +
    '  const chart = echarts.init(el, null, { renderer: "canvas" });\n' +
    '  function render(name){\n' +
    '    const rows = (json.metrics&&json.metrics[name])||[];\n' +
    '    const x = rows.map(d=>d.yearMonth);\n' +
    '    const abs = rows.map(d=>d.value);\n' +
    '    const mom = rows.map(d=>d.mom);\n' +
    '    const yoy = rows.map(d=>d.yoy);\n' +
    '    const option = {\n' +
    '    backgroundColor: "#0b0f19",\n' +
    '    tooltip: { trigger: "axis", valueFormatter: v => v == null ? "-" : v },\n' +
    '    legend: { data: [name+"-当月值", name+"-环比%", name+"-同比%"], textStyle: { color: "#cbd5e1" } },\n' +
    '    grid: { left: 60, right: 60, top: 40, bottom: 40 },\n' +
    '    xAxis: { type: "category", data: x, axisLabel: { color: "#9aa4b2" } },\n' +
    '    yAxis: [\n' +
    '      { type: "value", name: "当月值", position: "left", axisLabel: { color: "#9aa4b2" }, splitLine: { lineStyle: { color: "#1f2937" } } },\n' +
    '      { type: "value", name: "%", position: "right", axisLabel: { color: "#9aa4b2" }, splitLine: { show: false } }\n' +
    '    ],\n' +
    '    series: [\n' +
    '      { name: name+"-当月值", type: "line", yAxisIndex: 0, data: abs, smooth: true, lineStyle: { width: 2 }, symbol: "circle", symbolSize: 6 },\n' +
    '      { name: name+"-环比%", type: "line", yAxisIndex: 1, data: mom, smooth: true, lineStyle: { width: 2 }, symbol: "circle", symbolSize: 6 },\n' +
    '      { name: name+"-同比%", type: "line", yAxisIndex: 1, data: yoy, smooth: true, lineStyle: { width: 2 }, symbol: "circle", symbolSize: 6 }\n' +
    '    ]\n' +
    '  };\n' +
    '    chart.setOption(option, true);\n' +
    '  }\n' +
    '  render(prefer);\n' +
    '  select.addEventListener("change", function(){ render(this.value); });\n' +
    '});\n' +
    '</script>\n' +
    '</body>\n</html>\n';

  try {
    if (!fs.existsSync(OUTPUT_HTML)) {
      fs.writeFileSync(OUTPUT_HTML, html, 'utf8');
      console.log('Wrote', OUTPUT_HTML);
    } else {
      console.log('Skipped writing', OUTPUT_HTML, '(file exists: preserving manual edits)');
    }
  } catch (e) {
    console.warn('Failed writing HTML:', e && e.message || e);
  }


  // Ensure local vendor echarts exists
  try {
    if (!fs.existsSync(VENDOR_DIR)) fs.mkdirSync(VENDOR_DIR);
    if (fs.existsSync(ECHARTS_SRC)) {
      fs.copyFileSync(ECHARTS_SRC, ECHARTS_DST);
    } else {
      console.warn('ECharts not found at', ECHARTS_SRC);
    }
  } catch (e) {
    console.warn('Failed to prepare vendor assets:', e && e.message || e);
  }

  console.log('Wrote', OUTPUT_JSON);
  // OUTPUT_HTML may be skipped if exists
  if (issues.length) {
    console.warn('Extraction issues:', issues.length, '- see retail_cleaned.json → issues');
  }
}

main();


