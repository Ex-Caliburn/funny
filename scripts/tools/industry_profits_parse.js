const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const NP = require('number-precision');
NP.enableBoundaryChecking(false);

const ROOT = '/Users/lijiye/work/funny';
const STOCK_DIR = path.join(ROOT, 'stock');
const INDUSTRY_PROFITS_DIR = path.join(STOCK_DIR, 'industry_profits');
const OUTPUT_JSON = path.join(STOCK_DIR, 'cleaned_data', 'industry_profits_cleaned.json');

function normalizeMetricName(raw) {
  var name = String(raw || '').replace(/\s+/g, '');

  // Remove "其中：/其中:" prefix
  name = name.replace(/^其中[:：]/, '');

  // 统一括号格式：将英文括号统一为中文括号
  name = name.replace(/\(/g, '（').replace(/\)/g, '）');

  return name;
}

function parseYearMonthFromFilename(filename) {
  // Handle patterns like "2024年1—2月份", "2024年1—3月份", etc.
  var match = filename.match(/(\d{4})-(\d{2})-\d{2}_(\d{4})年(\d+)—?(\d+)?月份?/);
  if (match) {
    var year = match[3];
    var month1 = parseInt(match[4], 10);
    var month2 = match[5] ? parseInt(match[5], 10) : null;

    if (month2) {
      // Combined month range like "1—2月份", "1—3月份", etc.
      if (month1 === 1 && month2 === 2) {
        return {
          key: year + '-01-02',
          label: year + '-01~02'
        };
      } else {
        // For cumulative data like "1—3月份", use the end month
        var monthStr = String(month2).padStart(2, '0');
        return {
          key: year + '-' + monthStr,
          label: year + '-01~' + monthStr
        };
      }
    } else {
      // Single month
      var monthStr = String(month1).padStart(2, '0');
      return {
        key: year + '-' + monthStr,
        label: year + '-' + monthStr
      };
    }
  }

  // Handle yearly data like "2024年全国"
  var yearMatch = filename.match(/(\d{4})-(\d{2})-\d{2}_(\d{4})年全国/);
  if (yearMatch) {
    var year = yearMatch[3];
    return {
      key: year + '-12',  // Use December for yearly data
      label: year + '年全年'
    };
  }

  return { key: null, label: null };
}

function extractNumbersFromText(text) {
  if (!text) return [];
  var str = String(text);
  var matches = str.match(/-?\d+(?:\.\d+)?/g);
  return matches ? matches.map(parseFloat) : [];
}

function listExcelFiles(directory) {
  return fs.readdirSync(directory)
    .filter(function(name) { return name.endsWith('.xlsx') || name.endsWith('.xls'); })
    .map(function(name) { return path.join(directory, name); })
    .sort();
}

function parseExcelFile(filePath) {
  var entries = [];
  var issues = [];

  try {
    var workbook = xlsx.readFile(filePath);
    var ymInfo = parseYearMonthFromFilename(path.basename(filePath));

    if (!ymInfo.key) {
      issues.push({ file: path.basename(filePath), error: 'Could not parse year-month from filename' });
      return { entries: entries, issues: issues };
    }

    // Process the third sheet (index 2) as requested
    if (workbook.SheetNames.length < 3) {
      issues.push({ file: path.basename(filePath), error: 'File does not have 3 sheets' });
      return { entries: entries, issues: issues };
    }

    var sheetName = workbook.SheetNames[2]; // Third sheet (0-indexed)
    var sheet = workbook.Sheets[sheetName];
    var rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });

    if (rows.length === 0) {
      issues.push({ file: path.basename(filePath), error: 'Third sheet is empty' });
      return { entries: entries, issues: issues };
    }


    // Find all industry rows and extract data
    var headerRowIndex = -1;
    for (var r = 0; r < Math.min(10, rows.length); r++) {
      var row = rows[r];
      if (row && row.length > 0 && String(row[0] || '').trim() === '行  业') {
        headerRowIndex = r;
        break;
      }
    }

    if (headerRowIndex === -1) {
      issues.push({ file: path.basename(filePath), error: 'Could not find header row' });
      return { entries: entries, issues: issues };
    }

    // Process all industry rows starting from header + 3 (skip header, subheader, unit rows)
    var dataStartRow = headerRowIndex + 3;

    var metrics = [
      { name: '营业收入', valueCol: 1, yoyCol: 2 },
      { name: '营业成本', valueCol: 3, yoyCol: 4 },
      { name: '利润总额', valueCol: 5, yoyCol: 6 }
    ];

    for (var r = dataStartRow; r < rows.length; r++) {
      var row = rows[r];
      if (!row || row.length === 0) continue;

      var industryName = String(row[0] || '').trim();
      if (!industryName || industryName.length < 2) continue;

      // Skip obvious non-data rows
      if (industryName.includes('注：') || industryName.includes('说明') ||
          industryName.includes('资料来源') || industryName.includes('备注') ||
          industryName === '分三大门类' || industryName === '分经济类型' ||
          industryName === '分行业' || industryName.includes('小计')) {
        continue;
      }

      metrics.forEach(function(metric) {
        var currentValue = null;
        var yoyGrowth = null;

        // Extract absolute value
        if (row.length > metric.valueCol && row[metric.valueCol] != null) {
          var valueCell = row[metric.valueCol];
          if (typeof valueCell === 'number') {
            currentValue = valueCell;
          } else if (!isNaN(parseFloat(String(valueCell)))) {
            currentValue = parseFloat(String(valueCell));
          }
        }

        // Extract YoY growth rate
        if (row.length > metric.yoyCol && row[metric.yoyCol] != null) {
          var yoyCell = row[metric.yoyCol];
          if (typeof yoyCell === 'number') {
            yoyGrowth = yoyCell;
          } else if (!isNaN(parseFloat(String(yoyCell)))) {
            yoyGrowth = parseFloat(String(yoyCell));
          }
        }

        // Create entry if we found data
        if (currentValue !== null || yoyGrowth !== null) {
          // Create a combined metric name: "行业名称-指标名称"
          var combinedMetricName = industryName + '-' + metric.name;

          entries.push({
            metric: normalizeMetricName(combinedMetricName),
            industry: normalizeMetricName(industryName),
            metricType: metric.name,
            yearMonth: ymInfo.key,
            label: ymInfo.label,
            value: currentValue,
            yoy: yoyGrowth,
            mom: null // We'll compute this later
          });
        }
      });
    }

  } catch (error) {
    issues.push({ file: path.basename(filePath), error: error.message });
  }

  return { entries: entries, issues: issues };
}

/**
 * 从累积值序列推算各期当月值（与 industry_profits_chart.html 逻辑一致）
 * @param {Array<{yearMonth: string, value: number|null}>} sortedData
 * @returns {Object<string, number|null>}
 */
function buildMonthlyValueMap(sortedData) {
  var map = {};

  sortedData.forEach(function(current) {
    var ym = current.yearMonth;
    var val = current.value;
    var currentYear = ym.slice(0, 4);

    if (val === null || val === undefined) {
      map[ym] = null;
      return;
    }

    if (ym.endsWith('-01-02')) {
      map[ym] = val;
    } else if (ym.endsWith('-12')) {
      var nov = sortedData.find(function(d) { return d.yearMonth === currentYear + '-11'; });
      map[ym] = (nov && nov.value != null) ? NP.round(val - nov.value, 2) : val;
    } else {
      var currentMonth = parseInt(ym.slice(5, 7), 10);
      var prevMonthKey = null;
      if (currentMonth === 3) {
        prevMonthKey = currentYear + '-01-02';
      } else if (currentMonth > 3) {
        prevMonthKey = currentYear + '-' + String(currentMonth - 1).padStart(2, '0');
      }
      var prev = prevMonthKey
        ? sortedData.find(function(d) { return d.yearMonth === prevMonthKey; })
        : null;
      map[ym] = (prev && prev.value != null) ? NP.round(val - prev.value, 2) : val;
    }
  });

  return map;
}

/**
 * 基于当月值计算环比（value 字段仍为 Excel 原始累积值）
 */
function computeMissingValues(metricsMap) {
  Object.keys(metricsMap).forEach(function(metric) {
    var data = metricsMap[metric];
    data.sort(function(a, b) {
      return a.yearMonth.localeCompare(b.yearMonth);
    });

    var monthlyMap = buildMonthlyValueMap(data);

    data.forEach(function(current) {
      var ym = current.yearMonth;
      var currentYear = parseInt(ym.slice(0, 4), 10);
      var prevYear = currentYear - 1;
      var monthlyVal = monthlyMap[ym];
      var monthlyMoM = null;

      if (monthlyVal != null) {
        if (ym.endsWith('-01-02')) {
          var prevDecVal = monthlyMap[prevYear + '-12'];
          if (prevDecVal != null && prevDecVal !== 0) {
            monthlyMoM = NP.round(((monthlyVal - prevDecVal) / Math.abs(prevDecVal)) * 100, 2);
          }
        } else {
          var currentMonth = parseInt(ym.slice(5, 7), 10);
          var prevMonthKey = null;
          if (currentMonth === 3) {
            prevMonthKey = currentYear + '-01-02';
          } else if (currentMonth > 3) {
            prevMonthKey = currentYear + '-' + String(currentMonth - 1).padStart(2, '0');
          }
          if (prevMonthKey) {
            var prevVal = monthlyMap[prevMonthKey];
            if (prevVal != null && prevVal !== 0) {
              monthlyMoM = NP.round(((monthlyVal - prevVal) / Math.abs(prevVal)) * 100, 2);
            }
          }
        }
      }

      if (monthlyMoM !== null) {
        current.mom = monthlyMoM;
      }
    });
  });
}

function main() {
  console.log('Parsing industry profits Excel files...');

  var files = listExcelFiles(INDUSTRY_PROFITS_DIR);
  console.log(`Found ${files.length} files to process`);

  var allEntries = [];
  var allIssues = [];

  files.forEach(function(file) {
    var result = parseExcelFile(file);
    allEntries = allEntries.concat(result.entries);
    allIssues = allIssues.concat(result.issues);
  });

  console.log(`\nTotal entries extracted: ${allEntries.length}`);
  console.log(`Issues encountered: ${allIssues.length}`);

  if (allIssues.length > 0) {
    console.log('\nIssues:');
    allIssues.forEach(function(issue) {
      console.log(`- ${issue.file}: ${issue.error}`);
    });
  }

  // Group by metric
  var metricsMap = {};
  allEntries.forEach(function(entry) {
    if (!metricsMap[entry.metric]) {
      metricsMap[entry.metric] = [];
    }
    metricsMap[entry.metric].push(entry);
  });

  console.log(`\nMetrics found: ${Object.keys(metricsMap).length}`);

  // Compute missing values (MoM)
  computeMissingValues(metricsMap);

  // Create output structure
  var output = {
    lastUpdated: new Date().toISOString(),
    totalEntries: allEntries.length,
    totalMetrics: Object.keys(metricsMap).length,
    metrics: metricsMap,
    issues: allIssues
  };

  // Write to JSON file
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(output, null, 2), 'utf8');
  console.log(`\nData written to: ${OUTPUT_JSON}`);

  return output;
}

if (require.main === module) {
  main();
}

module.exports = { main, parseExcelFile, buildMonthlyValueMap, computeMissingValues };
