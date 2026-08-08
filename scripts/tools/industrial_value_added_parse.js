/*
  Parse monthly industrial value-added data Excel files in /stock/profits
  Output: /stock/cleaned_data/industrial_value_added_cleaned.json

  规模以上工业增加值数据解析器
  - 提取指标名称、绝对值、环比增长率、同比增长率
  - 输出格式适配 industrial_value_added_chart.html
*/

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const NP = require('number-precision');
NP.enableBoundaryChecking(false);

const ROOT = '/Users/lijiye/work/funny';
const STOCK_DIR = path.join(ROOT, 'stock');
const PROFITS_DIR = path.join(STOCK_DIR, 'profits');
const OUTPUT_JSON = path.join(STOCK_DIR, 'cleaned_data', 'industrial_value_added_cleaned.json');

function normalizeMetricName(raw) {
  var name = String(raw || '').replace(/\s+/g, '');
  
  // Remove "其中：/其中:" prefix
  name = name.replace(/^其中[:：]/, '');
  
  // 统一括号格式：将英文括号统一为中文括号
  name = name.replace(/\(/g, '（').replace(/\)/g, '）');
  
  return name;
}

function parseYearMonthFromFilename(filename) {
  // 从文件名提取年月: 2024-08-15_2024年7月份规模以上工业增加值增长5.1%-国家统计局.xlsx
  const base = path.basename(filename);
  const afterUnderscore = base.split('_')[1] || base;

  // 匹配 "YYYY年M—N月份" 累计区间，取结束月份（如 1—4月份 → 4月）
  let rangeMatch = afterUnderscore.match(/(\d{4})年(\d+)[—-](\d+)月份?/);
  if (rangeMatch) {
    const year = rangeMatch[1];
    const month1 = parseInt(rangeMatch[2], 10);
    const month2 = parseInt(rangeMatch[3], 10);
    if (month1 === 1 && month2 === 2) {
      return { key: year + '-01-02', label: year + '-01~02' };
    }
    const monthStr = String(month2).padStart(2, '0');
    return { key: year + '-' + monthStr, label: year + '-01~' + monthStr };
  }

  // 匹配 "YYYY年M月份" 或 "YYYY年MM月份"（单月）
  let match = afterUnderscore.match(/(\d{4})年(\d{1,2})月份?/);
  if (match) {
    const year = match[1];
    const month = match[2].padStart(2, '0');
    return {
      key: year + '-' + month,
      label: year + '-' + month
    };
  }

  return null;
}

/** 从表头行解析合并单元格对应的时期标签（向左查找） */
function resolvePeriodHeader(headerRow, colIndex) {
  for (let j = colIndex; j >= 0; j--) {
    const h = String(headerRow[j] || '').trim();
    if (h) return h;
  }
  return '';
}

function safeNum(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return val;
  var s = String(val).trim();
  if (!s || s === '-' || s === '—' || s === '.' || s === '…') return null;
  var num = parseFloat(s);
  return isNaN(num) ? null : num;
}

function parseExcelFile(filepath) {
  try {
    const workbook = xlsx.readFile(filepath, { cellDates: false, cellText: false });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      console.log('  ⚠️  工作表不存在');
      return [];
    }
    
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
    
    if (!data || data.length === 0) {
      console.log('  ⚠️  工作表为空');
      return [];
    }
    
    // 提取时间信息（优先文件名，其次表格标题行）
    const filename = path.basename(filepath);
    let timeInfo = parseYearMonthFromFilename(filename);
    if (!timeInfo) {
      for (let i = 0; i < Math.min(5, data.length); i++) {
        const rowText = (data[i] || []).map(function (c) { return String(c || ''); }).join(' ');
        const titleMatch = rowText.match(/(\d{4})年(\d{1,2})月份/);
        if (titleMatch) {
          const year = titleMatch[1];
          const month = titleMatch[2].padStart(2, '0');
          timeInfo = { key: year + '-' + month, label: year + '-' + month };
          break;
        }
      }
    }
    if (!timeInfo) {
      console.log('  ⚠️  无法从文件名提取时间');
      return [];
    }
    
    // 查找表头行（包含"指标"列）
    let headerRowIndex = -1;
    let headerRow = null;
    
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i];
      if (row && row.length > 0) {
        // 检查任意列是否包含"指标"
        for (let j = 0; j < row.length; j++) {
          const cell = String(row[j] || '').trim();
          if (cell === '指标' || cell.includes('指标')) {
            headerRowIndex = i;
            headerRow = row;
            break;
          }
        }
        if (headerRowIndex !== -1) break;
      }
    }
    
    if (headerRowIndex === -1) {
      console.log('  ⚠️  未找到表头行');
      return [];
    }
    
    // 找到"指标"列的位置
    let metricColIndex = -1;
    for (let i = 0; i < headerRow.length; i++) {
      const cell = String(headerRow[i] || '').trim();
      if (cell === '指标' || cell.includes('指标')) {
        metricColIndex = i;
        break;
      }
    }
    
    // 检查是否有子表头（下一行）
    let subHeaderRow = null;
    if (headerRowIndex + 1 < data.length) {
      const nextRow = data[headerRowIndex + 1];
      // 如果下一行不是指标行（没有指标名称），可能是子表头
      if (nextRow && !String(nextRow[metricColIndex] || '').trim()) {
        subHeaderRow = nextRow;
      }
    }
    
    // 解析表头，识别数据列（合并主表头和子表头）
    // 优先提取单月数据，避免累计值
    const columnTypes = {}; // { colIndex: 'value' | 'mom' | 'yoy' }
    const periodColumns = []; // 记录所有时期列 { index, period, isMonthly }
    
    for (let i = 0; i < headerRow.length; i++) {
      if (i === metricColIndex) continue; // 跳过指标列本身
      
      const periodHeader = resolvePeriodHeader(headerRow, i);
      let mainHeader = periodHeader;
      let cellText = mainHeader.toLowerCase();

      // 如果有子表头，合并文本
      if (subHeaderRow) {
        const subText = String(subHeaderRow[i] || '').trim().toLowerCase();
        if (subText) {
          cellText = cellText + ' ' + subText;
        }
      }

      if (!cellText.trim()) continue;

      // 判断是否为单月数据（如"4月"）还是累计数据（如"1—4月"）
      const isMonthly = /^\d{1,2}月$/.test(periodHeader);
      const isCumulative = /[—\-~至]/.test(periodHeader) && /\d+月/.test(periodHeader);
      
      // 识别列类型，优先记录单月数据
      if (cellText.includes('同比')) {
        if (!columnTypes.hasOwnProperty('yoy') || isMonthly) {
          columnTypes[i] = 'yoy';
          if (isMonthly) columnTypes.yoy = i; // 标记单月同比列
        }
      } else if (cellText.includes('环比')) {
        if (!columnTypes.hasOwnProperty('mom') || isMonthly) {
          columnTypes[i] = 'mom';
          if (isMonthly) columnTypes.mom = i; // 标记单月环比列
        }
      } else if (cellText.includes('绝对') || cellText.includes('当月') || cellText.includes('本期')) {
        if (!columnTypes.hasOwnProperty('value') || isMonthly) {
          columnTypes[i] = 'value';
          if (isMonthly) columnTypes.value = i; // 标记单月绝对值列
        }
      }
    }
    
    // 过滤出单月数据列（只保留第一个出现的同类型列）
    const finalColumns = {};
    const usedTypes = new Set();
    
    for (let key in columnTypes) {
      if (key === 'yoy' || key === 'mom' || key === 'value') continue; // 跳过标记
      const colIdx = parseInt(key);
      const colType = columnTypes[key];
      
      // 如果这个类型已经被使用，跳过
      if (usedTypes.has(colType)) {
        continue;
      }
      
      finalColumns[colIdx] = colType;
      usedTypes.add(colType);
    }
    
    // 数据起始行（跳过表头和子表头）
    const dataStartRow = subHeaderRow ? headerRowIndex + 2 : headerRowIndex + 1;
    
    // 解析数据行
    const records = [];
    let recordCount = 0;
    
    for (let i = dataStartRow; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;
      
      const metricName = normalizeMetricName(row[metricColIndex]);
      if (!metricName) continue;
      
      // 提取该行的数据（只提取单月数据）
      let valueData = null;
      let momData = null;
      let yoyData = null;
      
      for (let colIdx in finalColumns) {
        const colType = finalColumns[colIdx];
        const val = safeNum(row[colIdx]);
        
        if (val !== null) {
          if (colType === 'value') {
            valueData = val;
          } else if (colType === 'mom') {
            momData = val;
          } else if (colType === 'yoy') {
            yoyData = val;
          }
        }
      }
      
      // 如果没有识别出列类型，尝试启发式提取
      if (Object.keys(finalColumns).length === 0) {
        // 第一个数值列作为value
        for (let j = 1; j < row.length; j++) {
          const val = safeNum(row[j]);
          if (val !== null && valueData === null) {
            valueData = val;
            break;
          }
        }
        
        // 查找百分比作为增长率
        for (let j = 1; j < row.length; j++) {
          const cellText = String(row[j] || '').trim();
          if (cellText.includes('%')) {
            const val = safeNum(cellText.replace('%', ''));
            if (val !== null) {
              if (yoyData === null) {
                yoyData = val;
              } else if (momData === null) {
                momData = val;
              }
            }
          }
        }
      }
      
      records.push({
        time: timeInfo.key,
        timeLabel: timeInfo.label,
        metric: metricName,
        value: valueData,
        mom: momData,
        yoy: yoyData
      });
      recordCount++;
    }
    
    return records;
    
  } catch (error) {
    console.error(`  ❌ 解析失败: ${error.message}`);
    return [];
  }
}

function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  规模以上工业增加值数据解析');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (!fs.existsSync(PROFITS_DIR)) {
    console.error(`❌ 目录不存在: ${PROFITS_DIR}`);
    process.exit(1);
  }
  
  const files = fs.readdirSync(PROFITS_DIR)
    .filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'))
    .map(f => path.join(PROFITS_DIR, f));
  
  console.log(`发现 ${files.length} 个Excel文件\n`);
  
  if (files.length === 0) {
    console.log('没有找到Excel文件');
    process.exit(0);
  }
  
  // 解析所有文件
  let allRecords = [];
  for (const file of files) {
    const records = parseExcelFile(file);
    allRecords = allRecords.concat(records);
  }
  
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`总记录数: ${allRecords.length}`);
  
  // 按指标分组
  const metricMap = {};
  for (const record of allRecords) {
    const key = record.metric;
    if (!metricMap[key]) {
      metricMap[key] = [];
    }
    
    // 查找或创建该时间点的数据
    let timeEntry = metricMap[key].find(e => e.yearMonth === record.time);
    if (!timeEntry) {
      timeEntry = {
        yearMonth: record.time,
        timeLabel: record.timeLabel,
        value: null,
        mom: null,
        yoy: null
      };
      metricMap[key].push(timeEntry);
    }
    
    // 合并数据（如果有多个来源，保留非空值）
    if (record.value !== null) timeEntry.value = record.value;
    if (record.mom !== null) timeEntry.mom = record.mom;
    if (record.yoy !== null) timeEntry.yoy = record.yoy;
  }
  
  // 排序
  for (const key in metricMap) {
    metricMap[key].sort((a, b) => {
      if (a.yearMonth < b.yearMonth) return -1;
      if (a.yearMonth > b.yearMonth) return 1;
      return 0;
    });
  }
  
  // 计算环比（只处理有真实绝对值的数据）
  for (const key in metricMap) {
    const data = metricMap[key];
    
    // 只在有真实绝对值的情况下计算环比
    for (let i = 1; i < data.length; i++) {
      const current = data[i];
      const previous = data[i - 1];
      
      // 如果当前和上一个都有真实的绝对值（不是推算的），才计算环比
      if (current.value !== null && previous.value !== null && 
          current.value !== undefined && previous.value !== undefined &&
          previous.value !== 0) {
        const mom = ((current.value - previous.value) / previous.value) * 100;
        current.mom = Math.round(mom * 100) / 100; // 保留2位小数
      }
    }
  }
  
  console.log(`指标数量: ${Object.keys(metricMap).length}`);
  
  // 输出JSON
  const output = {
    metrics: metricMap,
    meta: {
      totalRecords: allRecords.length,
      metricCount: Object.keys(metricMap).length,
      generatedAt: new Date().toISOString()
    }
  };
  
  // 确保输出目录存在
  const outputDir = path.dirname(OUTPUT_JSON);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\n✅ 已保存到: ${OUTPUT_JSON}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

if (require.main === module) {
  main();
}

module.exports = { parseExcelFile, normalizeMetricName };

