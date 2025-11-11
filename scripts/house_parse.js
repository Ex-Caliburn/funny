const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

/**
 * 房地产数据解析脚本
 * 解析国家统计局发布的房地产市场基本情况数据
 * 处理重复数据类目，保留上层标题作为前缀
 */

function parseHouseData() {
  const houseDir = path.join(__dirname, '../stock/house');
  const files = fs.readdirSync(houseDir)
    .filter(f => f.endsWith('.xlsx'))
    .sort();

  console.log(`找到 ${files.length} 个房地产数据文件`);

  const metrics = {};
  const processedFiles = [];

  files.forEach(filename => {
    try {
      console.log(`处理文件: ${filename}`);
      
      // 从文件名提取日期信息
      const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2})/);
      const yearMonthMatch = filename.match(/(\d{4})年(?:(\d+)—(\d+)月份|(\d+)月份|全年|上半年|全国房地产市场基本情况)/);
      
      if (!dateMatch || !yearMonthMatch) {
        console.log(`跳过无法解析日期的文件: ${filename}`);
        return;
      }

      const publishDate = dateMatch[1];
      const year = yearMonthMatch[1];
      let endMonth;

      if (yearMonthMatch[4]) {
        // 单月数据，如"4月份"
        endMonth = parseInt(yearMonthMatch[4]);
      } else if (yearMonthMatch[3]) {
        // 累计数据，如"1—8月份"
        endMonth = parseInt(yearMonthMatch[3]);
      } else if (filename.includes('全年')) {
        endMonth = 12;
      } else if (filename.includes('上半年')) {
        endMonth = 6;
      } else if (filename.includes('全国房地产市场基本情况')) {
        // 全年数据
        endMonth = 12;
      } else {
        console.log(`无法解析月份信息: ${filename}`);
        return;
      }

      const filePath = path.join(houseDir, filename);
      const workbook = XLSX.readFile(filePath);
      
      // 使用第一个工作表（表1）
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      // 解析数据行
      let currentCategory = '';
      
      jsonData.forEach((row, rowIndex) => {
        if (!row || row.length < 3) return;
        
        const indicator = String(row[0] || '');
        const absoluteValue = row[1];
        const yoyGrowth = row[2];

        if (!indicator.trim()) return;
        
        // 跳过标题行
        if (indicator.includes('表1') || indicator === '指标' || indicator.includes('绝对量')) {
          return;
        }

        let metricName = indicator;
        
        // 处理层级关系，保留上层标题
        const spaces = indicator.match(/^\s*/)[0].length;
        
        if (spaces >= 2) {
          // 子项目，需要加上上层类别
          const subItem = indicator.replace(/^\s+/, '').replace(/其中：/, '');
          if (currentCategory) {
            // 处理特殊情况：住宅、办公楼、商业营业用房等重复出现的子类
            if (subItem === '住宅') {
              metricName = `${currentCategory} - 住宅`;
            } else if (subItem === '办公楼') {
              metricName = `${currentCategory} - 办公楼`;
            } else if (subItem === '商业营业用房') {
              metricName = `${currentCategory} - 商业营业用房`;
            } else {
              metricName = `${currentCategory} - ${subItem}`;
            }
          } else {
            metricName = subItem;
          }
        } else {
          // 主项目，更新当前类别
          currentCategory = indicator;
          metricName = indicator;
        }

        // 清理指标名称
        metricName = metricName
          .replace(/其中：/g, '')
          .replace(/（[^）]*）/g, '') // 移除括号内容，如（亿元）、（万平方米）
          .trim();

        // 判断指标类型：存量数据 vs 流量数据
        const isStockData = metricName.includes('施工面积') || 
                           metricName.includes('待售面积') ||
                           metricName.includes('竣工面积'); // 竣工面积也是存量概念

        // 确保数值有效
        if (typeof absoluteValue === 'number' && !isNaN(absoluteValue)) {
          if (!metrics[metricName]) {
            metrics[metricName] = [];
          }

          const yearMonth = `${year}-${String(endMonth).padStart(2, '0')}`;
          
          // 检查是否已存在相同年月的数据
          const existingIndex = metrics[metricName].findIndex(item => item.yearMonth === yearMonth);
          
          const dataPoint = {
            yearMonth,
            publishDate,
            value: absoluteValue,
            yoy: typeof yoyGrowth === 'number' && !isNaN(yoyGrowth) ? yoyGrowth : null,
            mom: null, // 房地产数据通常不提供环比数据
            filename,
            isStockData // 标记是否为存量数据
          };

          if (existingIndex >= 0) {
            // 更新现有数据（使用最新发布的数据）
            if (publishDate >= metrics[metricName][existingIndex].publishDate) {
              metrics[metricName][existingIndex] = dataPoint;
            }
          } else {
            metrics[metricName].push(dataPoint);
          }
        }
      });

      processedFiles.push({
        filename,
        publishDate,
        year,
        endMonth,
        sheetName: firstSheetName
      });

    } catch (error) {
      console.error(`处理文件 ${filename} 时出错:`, error.message);
    }
  });

  // 对每个指标的数据按时间排序
  Object.keys(metrics).forEach(metricName => {
    metrics[metricName].sort((a, b) => {
      if (a.yearMonth !== b.yearMonth) {
        return a.yearMonth.localeCompare(b.yearMonth);
      }
      return b.publishDate.localeCompare(a.publishDate); // 相同年月时，使用最新发布的数据
    });
  });

  // 计算当月数据（从累积数据转换）
  console.log('\n=== 转换累积数据为当月数据 ===');
  Object.keys(metrics).forEach(metricName => {
    const points = metrics[metricName];
    
    // 按年份分组处理
    const yearGroups = {};
    points.forEach(point => {
      const year = point.yearMonth.slice(0, 4);
      if (!yearGroups[year]) yearGroups[year] = [];
      yearGroups[year].push(point);
    });

    // 为每个年份计算当月数据
    Object.keys(yearGroups).forEach(year => {
      const yearPoints = yearGroups[year];
      yearPoints.sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));

      for (let i = 0; i < yearPoints.length; i++) {
        const current = yearPoints[i];
        const month = parseInt(current.yearMonth.slice(5, 7));
        
        if (current.isStockData) {
          // 存量数据：直接使用累积值，计算累积值的环比
          current.valueMonthly = current.value;
          
          if (i > 0) {
            const prevPoint = yearPoints[i - 1];
            if (prevPoint && prevPoint.value != null && current.value != null && prevPoint.value !== 0) {
              current.mom = ((current.value - prevPoint.value) / Math.abs(prevPoint.value)) * 100;
              current.mom = Math.round(current.mom * 10) / 10;
            } else {
              current.mom = null;
            }
          } else {
            current.mom = null;
          }
        } else {
          // 流量数据：计算当月值
          if (month <= 2) {
            // 1-2月数据保持不变（因为统计局合并发布1-2月数据）
            current.valueMonthly = current.value;
            current.mom = null;
          } else {
            // 3月及以后：当月值 = 累积值 - 上月累积值
            const prevPoint = yearPoints[i - 1];
            if (prevPoint && current.value != null && prevPoint.value != null) {
              current.valueMonthly = current.value - prevPoint.value;
              
              // 计算环比增速：(当月值 - 上月值) / 上月值 * 100
              const prevMonthly = prevPoint.valueMonthly;
              if (prevMonthly != null && prevMonthly !== 0 && current.valueMonthly != null) {
                current.mom = ((current.valueMonthly - prevMonthly) / Math.abs(prevMonthly)) * 100;
                current.mom = Math.round(current.mom * 10) / 10;
              } else {
                current.mom = null;
              }
            } else {
              current.valueMonthly = null;
              current.mom = null;
            }
          }
        }
      }
    });

    // 计算跨年环比：为每年的1-2月计算相对于上一年12月的环比
    const sortedPoints = points.sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
    for (let i = 0; i < sortedPoints.length; i++) {
      const current = sortedPoints[i];
      const month = parseInt(current.yearMonth.slice(5, 7));
      
      // 只处理1-2月数据且环比为null的情况
      if (month === 2 && current.mom === null) {
        // 查找上一年的12月数据
        const currentYear = parseInt(current.yearMonth.slice(0, 4));
        const prevYearDec = `${currentYear - 1}-12`;
        const prevDecPoint = sortedPoints.find(p => p.yearMonth === prevYearDec);
        
        if (prevDecPoint && prevDecPoint.valueMonthly != null && current.valueMonthly != null) {
          if (current.isStockData) {
            // 存量数据：比较累积值
            if (prevDecPoint.value != null && current.value != null && prevDecPoint.value !== 0) {
              current.mom = ((current.value - prevDecPoint.value) / Math.abs(prevDecPoint.value)) * 100;
              current.mom = Math.round(current.mom * 10) / 10;
            }
          } else {
            // 流量数据：比较当月值
            if (prevDecPoint.valueMonthly !== 0) {
              current.mom = ((current.valueMonthly - prevDecPoint.valueMonthly) / Math.abs(prevDecPoint.valueMonthly)) * 100;
              current.mom = Math.round(current.mom * 10) / 10;
            }
          }
        }
      }
    }

    // 统计转换结果
    const monthlyCount = points.filter(p => p.valueMonthly != null).length;
    const momCount = points.filter(p => p.mom != null).length;
    if (monthlyCount > 0) {
      console.log(`${metricName}: ${monthlyCount}/${points.length} 个数据点转换为当月值, ${momCount} 个环比数据`);
    }
  });

  const result = {
    metadata: {
      totalFiles: processedFiles.length,
      totalMetrics: Object.keys(metrics).length,
      dateRange: {
        start: processedFiles.length > 0 ? Math.min(...processedFiles.map(f => f.year)) : null,
        end: processedFiles.length > 0 ? Math.max(...processedFiles.map(f => f.year)) : null
      },
      processedAt: new Date().toISOString(),
      description: "全国房地产市场基本情况数据，包含开发投资、施工面积、销售等指标。累积数据已转换为当月数据（1-2月为合并数据）"
    },
    files: processedFiles,
    metrics
  };

  // 输出统计信息
  console.log('\n=== 解析统计 ===');
  console.log(`处理文件数: ${result.metadata.totalFiles}`);
  console.log(`提取指标数: ${result.metadata.totalMetrics}`);
  console.log(`数据年份范围: ${result.metadata.dateRange.start} - ${result.metadata.dateRange.end}`);
  
  console.log('\n=== 主要指标 ===');
  Object.keys(metrics).slice(0, 10).forEach(name => {
    const count = metrics[name].length;
    const latest = metrics[name][count - 1];
    console.log(`${name}: ${count}个数据点, 最新值: ${latest.value} (${latest.yearMonth})`);
  });

  // 保存到JSON文件
  const outputPath = path.join(__dirname, '../stock/cleaned_data/house_cleaned.json');
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf8');
  console.log(`\n数据已保存到: ${outputPath}`);

  return result;
}

// 如果直接运行此脚本
if (require.main === module) {
  parseHouseData();
}

module.exports = { parseHouseData };
