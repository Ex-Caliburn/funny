/*
  Parse monthly investment data Excel files in /stock/invest and compute absolute (value), MoM (环比), YoY (同比).
  Output: /stock/cleaned_data/invest_cleaned.json and /stock/html/invest_chart.html

  Heuristic extraction rules:
  - Prefer rows containing any of these labels: ["全国固定资产投资", "固定资产投资", "当月", "本月"]
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
const INVEST_DIR = path.join(STOCK_DIR, 'invest');
const OUTPUT_JSON = path.join(STOCK_DIR, 'cleaned_data', 'invest_cleaned.json');
const OUTPUT_HTML = path.join(STOCK_DIR, 'html', 'invest_chart.html');
const VENDOR_DIR = path.join(STOCK_DIR, 'vendor');
const ECHARTS_SRC = path.join(ROOT, 'node_modules', 'echarts', 'dist', 'echarts.min.js');
const ECHARTS_DST = path.join(VENDOR_DIR, 'echarts.min.js');

function normalizeMetricName(raw) {
  var name = String(raw || '').replace(/\s+/g, '');
  
  // Remove "其中：/其中:" prefix (more comprehensive)
  name = name.replace(/^其中[:：]/, '');
  
  // 统一括号格式：将英文括号统一为中文括号
  name = name.replace(/\(/g, '（').replace(/\)/g, '）');
  
  // Canonical mappings for similar metric names
  if (name.indexOf('全国固定资产投资') !== -1) {
    return '全国固定资产投资';
  }
  
  if (name.indexOf('固定资产投资') !== -1 && name.indexOf('全国') === -1) {
    return '全国固定资产投资';
  }
  
  // 房地产开发投资相关统一
  if (name.indexOf('房地产开发投资') !== -1) {
    return '房地产开发投资';
  }
  
  // 制造业投资相关统一
  if (name.indexOf('制造业投资') !== -1) {
    return '制造业投资';
  }
  
  // 基础设施投资相关统一
  if (name.indexOf('基础设施投资') !== -1) {
    return '基础设施投资';
  }
  
  // 港澳台投资企业相关统一
  if (name.indexOf('港澳台') !== -1 && name.indexOf('投资企业') !== -1) {
    return '港澳台投资企业';
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
  // Prefer the period in the Chinese part after the first underscore
  const base = path.basename(filename);
  const afterUnderscore = base.split('_')[1] || base;
  let m;
  let y;
  let combined = false;
  
  // Handle various patterns
  let ymMatch = afterUnderscore.match(/(\d{4})年(\d{1,2})月份/);
  if (ymMatch) {
    y = ymMatch[1];
    m = ymMatch[2].padStart(2, '0');
  } else {
    // Handle "1—2月份" pattern
    let comb = afterUnderscore.match(/(\d{4})年1[—-]2月(?:份)?/);
    if (comb) {
      y = comb[1];
      combined = true;
    } else {
      // Handle "1—3月份" pattern (report for March)
      let march = afterUnderscore.match(/(\d{4})年1[—-]3月(?:份)?/);
      if (march) {
        y = march[1];
        m = '03';
      } else {
        // Handle "1—4月份" pattern (report for April)
        let april = afterUnderscore.match(/(\d{4})年1[—-]4月(?:份)?/);
        if (april) {
          y = april[1];
          m = '04';
        } else {
          // Handle "1—5月份" pattern (report for May)
          let may = afterUnderscore.match(/(\d{4})年1[—-]5月(?:份)?/);
          if (may) {
            y = may[1];
            m = '05';
          } else {
            // Handle "1—6月份" pattern (report for June)
            let june = afterUnderscore.match(/(\d{4})年1[—-]6月(?:份)?/);
            if (june) {
              y = june[1];
              m = '06';
            } else {
              // Handle "1—7月份" pattern (report for July)
              let july = afterUnderscore.match(/(\d{4})年1[—-]7月(?:份)?/);
              if (july) {
                y = july[1];
                m = '07';
              } else {
                // Handle "1—8月份" pattern (report for August)
                let august = afterUnderscore.match(/(\d{4})年1[—-]8月(?:份)?/);
                if (august) {
                  y = august[1];
                  m = '08';
                } else {
                  // Handle "1—9月份" pattern (report for September)
                  let september = afterUnderscore.match(/(\d{4})年1[—-]9月(?:份)?/);
                  if (september) {
                    y = september[1];
                    m = '09';
                  } else {
                    // Handle "1—10月份" pattern (report for October)
                    let october = afterUnderscore.match(/(\d{4})年1[—-]10月(?:份)?/);
                    if (october) {
                      y = october[1];
                      m = '10';
                    } else {
                      // Handle "1—11月份" pattern (report for November)
                      let november = afterUnderscore.match(/(\d{4})年1[—-]11月(?:份)?/);
                      if (november) {
                        y = november[1];
                        m = '11';
                      } else {
                        // Handle "上半年" pattern
                        let halfYear = afterUnderscore.match(/(\d{4})年上半年/);
                        if (halfYear) {
                          y = halfYear[1];
                          m = '06'; // 上半年用6月表示
                        } else {
                          // Handle "全年" pattern
                          let fullYear = afterUnderscore.match(/(\d{4})年全国固定资产投资/);
                          if (fullYear) {
                            y = fullYear[1];
                            m = '12'; // 全年用12月表示
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
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
  // Prefer row containing 固定资产投资 and not containing 累计/累计值 when possible
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i].join('');
    if (row.indexOf('全国固定资产投资') !== -1 && row.indexOf('累计') === -1) {
      return i;
    }
  }
  // Fallback: previous heuristic
  var bestIndex = -1;
  var bestScore = -1;
  var keywords = ['全国固定资产投资', '固定资产投资', '当月', '本月'];
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
  return null;
}

function findColumnIndex(headerRow, keywords) {
  for (var i = 0; i < headerRow.length; i++) {
    var cellText = String(headerRow[i]).toLowerCase();
    for (var j = 0; j < keywords.length; j++) {
      if (cellText.indexOf(keywords[j]) !== -1) return i;
    }
  }
  return -1;
}

function processSheet(sheet, sheetName, filename) {
  const rows = to2dArrayFromSheet(sheet);
  const results = [];
  
  // Investment data format: Column 0 = metric name, Column 1 = YoY growth rate
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 2) continue;
    
    const metricName = String(row[0] || '').trim();
    if (!metricName || metricName.length < 2) continue;
    
    // Skip obvious header/note rows
    const metricLower = metricName.toLowerCase();
    if (metricLower.includes('指标') || metricLower.includes('统计项') || 
        metricLower.includes('项目') || metricLower.includes('注：') || 
        metricLower.includes('资料来源') || metricLower.includes('说明') || 
        metricLower.includes('备注') || metricLower.includes('单位') ||
        metricLower.includes('主要数据') || metricLower.includes('固定资产投资（不含农户）主要数据') ||
        metricName.includes('分产业') || metricName.includes('分行业') || metricName.includes('按构成分') ||
        metricName === '分产业' || metricName === '分行业' || metricName === '按构成分') continue;
    
    // Skip empty section headers
    if (metricName.trim() === '' || row[1] === '' || row[1] === '  ' || row[1] === null || row[1] === undefined) continue;
    
    const normalizedMetric = normalizeMetricName(metricName);
    if (!normalizedMetric || normalizedMetric.length < 2) continue;
    
    // Extract YoY growth rate from second column
    let yoy = null;
    const secondCell = row[1];
    
    if (typeof secondCell === 'number') {
      yoy = secondCell;
    } else if (secondCell) {
      const percent = extractPercentFromCell(String(secondCell));
      if (percent !== null) {
        yoy = percent;
      } else {
        const numbers = extractNumbersFromText(String(secondCell));
        if (numbers.length > 0) {
          yoy = numbers[0];
        }
      }
    }
    
    // Only accept if we have YoY data
    if (yoy !== null && isFinite(yoy)) {
      results.push({
        metric: normalizedMetric,
        value: null,
        cumulative: null, // Investment data doesn't have cumulative values in these files
        mom: null,
        yoy: yoy,
        debug: {
          file: path.basename(filename),
          sheet: sheetName,
          row: i + 1,
          rawMetric: metricName,
          rawYoy: secondCell
        }
      });
    }
  }
  
  return results;
}

function parseExcelFile(filename) {
  const workbook = xlsx.readFile(filename);
  const sheetNames = workbook.SheetNames;
  let allResults = [];
  
  for (const sheetName of sheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    
    const results = processSheet(sheet, sheetName, filename);
    allResults = allResults.concat(results);
  }
  
  return allResults;
}

function processAllFiles() {
  const files = listExcelFiles(INVEST_DIR);
  console.log(`Found ${files.length} Excel files in ${INVEST_DIR}`);
  
  let allData = [];
  
  for (const file of files) {
    const yearMonth = parseYearMonthFromFilename(file);
    if (!yearMonth.key) {
      console.log(`Skipping file with unparseable date: ${file}`);
      continue;
    }
    
    try {
      const results = parseExcelFile(file);
      
      for (const result of results) {
        allData.push({
          ...result,
          yearMonth: yearMonth.key,
          label: yearMonth.label
        });
      }
    } catch (error) {
      console.error(`Error processing ${file}:`, error.message);
    }
  }
  
  // Group by metric and sort by date
  const grouped = {};
  for (const item of allData) {
    if (!grouped[item.metric]) {
      grouped[item.metric] = [];
    }
    grouped[item.metric].push(item);
  }
  
  // Sort each metric's data by date
  for (const metric in grouped) {
    grouped[metric].sort((a, b) => sortableMonthKey(a.yearMonth) - sortableMonthKey(b.yearMonth));
  }
  
  const output = {
    updatedAt: new Date().toISOString(),
    data: allData.sort((a, b) => {
      const metricCompare = a.metric.localeCompare(b.metric);
      if (metricCompare !== 0) return metricCompare;
      return sortableMonthKey(a.yearMonth) - sortableMonthKey(b.yearMonth);
    }),
    metrics: grouped
  };
  
  // Write JSON output
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(output, null, 2), 'utf8');
  console.log(`\nWrote cleaned data to: ${OUTPUT_JSON}`);
  console.log(`Total metrics: ${Object.keys(grouped).length}`);
  console.log(`Total data points: ${allData.length}`);
  
  // Copy echarts if needed
  if (!fs.existsSync(VENDOR_DIR)) {
    fs.mkdirSync(VENDOR_DIR, { recursive: true });
  }
  
  if (fs.existsSync(ECHARTS_SRC) && !fs.existsSync(ECHARTS_DST)) {
    fs.copyFileSync(ECHARTS_SRC, ECHARTS_DST);
    console.log(`Copied echarts to: ${ECHARTS_DST}`);
  }
  
  return output;
}

if (require.main === module) {
  processAllFiles();
}

module.exports = { processAllFiles };
