const { PDFParse } = require('pdf-parse');
const fs = require('fs');
const path = require('path');

/**
 * 兴业银锡年报数据提取脚本
 * 提取银、锡产品的产销营收成本数据
 */

// 需要提取的关键词（针对银和锡）
const keywords = {
  silver: {
    cost: ['银成本', '银营业成本', '银销售成本', '银生产成本'],
    revenue: ['银营收', '银营业收入', '银收入', '银销售收入', '银产品收入'],
    production: ['银产量', '银生产量', '银金属产量'],
    sales: ['银销量', '银销售量', '银销售金属量']
  },
  tin: {
    cost: ['锡成本', '锡营业成本', '锡销售成本', '锡生产成本'],
    revenue: ['锡营收', '锡营业收入', '锡收入', '锡销售收入', '锡产品收入'],
    production: ['锡产量', '锡生产量', '锡金属产量'],
    sales: ['锡销量', '锡销售量', '锡销售金属量']
  }
};

// 数据提取模式
const patterns = {
  number: /([\d,，]+\.?\d*)\s*(?:万元|亿元|元|万|亿)?/g,
  year: /(20\d{2})/g,
  percent: /([\d,，]+\.?\d*)\s*%/g
};

/**
 * 从文本中提取数值（亿元）
 */
function extractNumber(text) {
  if (!text) return null;
  
  let cleaned = text.replace(/[,，\s]/g, '');
  
  let multiplier = 1;
  if (cleaned.includes('亿')) {
    multiplier = 100000000;
    cleaned = cleaned.replace(/亿/g, '');
  } else if (cleaned.includes('万')) {
    multiplier = 10000;
    cleaned = cleaned.replace(/万/g, '');
  }
  
  const match = cleaned.match(/[\d.]+/);
  if (match) {
    const num = parseFloat(match[0]);
    return isNaN(num) ? null : num * multiplier;
  }
  
  return null;
}

/**
 * 从文本中提取数值（吨，保持原单位）
 */
function extractNumberInTons(text) {
  if (!text) return null;
  
  let cleaned = text.replace(/[,，\s]/g, '');
  
  // 移除"吨"、"万吨"等单位
  cleaned = cleaned.replace(/万吨|吨/g, '');
  
  const match = cleaned.match(/[\d.]+/);
  if (match) {
    const num = parseFloat(match[0]);
    return isNaN(num) ? null : num;
  }
  
  return null;
}

/**
 * 从文本中提取数据（通过关键词）
 */
function extractDataByKeyword(text, keyword) {
  const results = [];
  const lines = text.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes(keyword)) {
      // 在当前行和前后几行中查找数值
      const searchRange = [
        lines[Math.max(0, i - 2)],
        lines[i],
        lines[Math.min(lines.length - 1, i + 2)]
      ].join(' ');
      
      // 尝试提取数值
      const numbers = searchRange.match(patterns.number);
      if (numbers && numbers.length > 0) {
        // 提取第一个合理的数值
        for (const numStr of numbers) {
          const value = extractNumber(numStr);
          if (value && value > 0) {
            results.push({
              keyword: keyword,
              line: line,
              context: searchRange,
              value: value,
              allValues: numbers.map(n => extractNumber(n)).filter(v => v !== null)
            });
            break; // 只取第一个匹配
          }
        }
      }
    }
  }
  
  return results;
}

/**
 * 从"主要产品"或"分产品"表格中提取银、锡数据
 */
function extractProductDataFromTable(text, extractedData) {
  // 首先从"矿产品产量"文本中提取产量数据
  // 格式：矿产品产量：2025 年 1-6 月，公司生产矿产锡 3,589.82 吨，较上年同比减少 20.64%；矿产银 131.32 吨
  // 注意：文本可能跨行，需要匹配多行
  const productionTextPattern = /矿产品产量[：:][\s\S]{0,500}?生产矿产锡[\s\t]+([\d,，]+\.?\d*)[\s\t]+吨[\s\S]{0,200}?矿产银[\s\t]+([\d,，]+\.?\d*)[\s\t]+吨/g;
  let prodMatch;
  while ((prodMatch = productionTextPattern.exec(text)) !== null) {
    const tinProdStr = prodMatch[1].replace(/[,，]/g, '');
    const silverProdStr = prodMatch[2].replace(/[,，]/g, '');
    const tinProd = parseFloat(tinProdStr);
    const silverProd = parseFloat(silverProdStr);
    
    if (tinProd && tinProd > 0 && tinProd < 100000) {
      extractedData.tin.production.push({
        keyword: '锡-产量文本提取',
        line: prodMatch[0].substring(0, 200),
        context: prodMatch[0].substring(0, 500),
        value: tinProd,
        allValues: [tinProd]
      });
    }
    
    if (silverProd && silverProd > 0 && silverProd < 10000) {
      extractedData.silver.production.push({
        keyword: '银-产量文本提取',
        line: prodMatch[0].substring(0, 200),
        context: prodMatch[0].substring(0, 500),
        value: silverProd,
        allValues: [silverProd]
      });
    }
  }
  
  // 也尝试单独匹配每个产品的产量
  // 匹配：生产矿产锡/锡精粉 3,589.82 吨
  const tinProdPattern = /生产(?:矿产锡|锡精粉)[\s\t]+([\d,，]+\.?\d*)[\s\t]+吨/g;
  while ((prodMatch = tinProdPattern.exec(text)) !== null) {
    const context = text.substring(Math.max(0, prodMatch.index - 100), Math.min(text.length, prodMatch.index + 100));
    // 确保是在"矿产品产量"相关的上下文中
    if (context.includes('矿产品产量') || context.includes('生产')) {
      const tinProdStr = prodMatch[1].replace(/[,，]/g, '');
      const tinProd = parseFloat(tinProdStr);
      if (tinProd && tinProd > 0 && tinProd < 100000) {
        extractedData.tin.production.push({
          keyword: '锡-产量单独提取',
          line: prodMatch[0],
          context: context,
          value: tinProd,
          allValues: [tinProd]
        });
      }
    }
  }
  
  // 匹配：矿产银 131.32 吨（在产量相关上下文中）
  const silverProdPattern = /矿产银[\s\t]+([\d,，]+\.?\d*)[\s\t]+吨/g;
  while ((prodMatch = silverProdPattern.exec(text)) !== null) {
    const context = text.substring(Math.max(0, prodMatch.index - 200), Math.min(text.length, prodMatch.index + 200));
    // 确保是在产量相关上下文中，且不是营收数据
    if ((context.includes('矿产品产量') || context.includes('生产')) && !context.includes('万元') && !context.includes('%')) {
      const silverProdStr = prodMatch[1].replace(/[,，]/g, '');
      const silverProd = parseFloat(silverProdStr);
      // 银产量应该是较小的数值（通常小于1000吨）
      if (silverProd && silverProd > 0 && silverProd < 10000 && silverProdStr.split('.')[0].length <= 4) {
        extractedData.silver.production.push({
          keyword: '银-产量单独提取',
          line: prodMatch[0],
          context: context,
          value: silverProd,
          allValues: [silverProd]
        });
      }
    }
  }
  
  // 匹配产量数据格式：矿产银 	131.32 	125.58（当期 去年同期）
  // 格式：矿产银/矿产锡 [\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)
  
  // 匹配银产量数据（吨）（只匹配"矿产银"）
  // 格式：矿产银 	131.32 	125.58 或 矿产银 147.87 199.62 228.93（支持2-4列数据）
  const silverProductionPattern = /矿产银[\s\t]+([\d,，]+\.?\d*)(?:[\s\t]+([\d,，]+\.?\d*))?(?:[\s\t]+([\d,，]+\.?\d*))?(?:[\s\t]+([\d,，]+\.?\d*))?/g;
  let match;
  while ((match = silverProductionPattern.exec(text)) !== null) {
    // 扩大上下文范围以检查是否是产量表格
    const widerContext = text.substring(Math.max(0, match.index - 500), Math.min(text.length, match.index + 500));
    const isProductionTable = widerContext.includes('公司矿产品产量') || widerContext.includes('上年同期') || widerContext.includes('本期');
    
    // 检查上下文，确保是产量数据而不是营收数据
    const context = text.substring(Math.max(0, match.index - 200), Math.min(text.length, match.index + 200));
    // 如果是产量表格，即使包含"万元"或"%"也要处理（因为表格标题可能包含这些）
    if (!isProductionTable && (context.includes('万元') || context.includes('%') || context.includes('占比'))) {
      continue;
    }
    
    // 提取所有列的数值（可能有2-4列）
    const allValues = [];
    for (let i = 1; i <= 4; i++) {
      if (match[i]) {
        const valueStr = match[i].replace(/[,，]/g, '');
        const value = parseFloat(valueStr);
        // 银产量应该在合理范围内（吨），通常小于10000吨
        if (value && value > 0 && value < 10000 && !match[i].includes(',') && valueStr.split('.')[0].length <= 4) {
          allValues.push(value);
        }
      }
    }
    
    if (allValues.length > 0) {
      // 判断是多年对比表格还是当期vs上年同期表格
      // 如果有3列或更多数据，或者上下文包含3个或更多年份，则是多年对比表格
      const yearMatches = widerContext.match(/20\d{2}/g);
      const isMultiYearTable = allValues.length >= 3 || (yearMatches && yearMatches.length >= 3);
      
      if (isMultiYearTable) {
        // 多年对比表格：取最大值作为当期（通常是最新年份）
        const maxValue = Math.max(...allValues);
        extractedData.silver.production.push({
          keyword: '银-产量表格提取',
          line: match[0],
          context: context,
          value: maxValue,
          allValues: allValues
        });
        
        // 找到最大值的索引，然后取前一个值作为上年同期
        if (allValues.length >= 2) {
          const maxIndex = allValues.indexOf(maxValue);
          const lastYearValue = maxIndex > 0 ? allValues[maxIndex - 1] : allValues[1];
          extractedData.silver.lastYearProduction.push({
            keyword: '银-上年同期产量表格提取',
            line: match[0],
            context: widerContext.substring(0, 300),
            value: lastYearValue,
            allValues: allValues
          });
        }
        
        // 存储多年对比数据（用于填充历史年份）
        if (!extractedData.multiYearProduction) {
          extractedData.multiYearProduction = {};
        }
        if (!extractedData.multiYearProduction.silver) {
          extractedData.multiYearProduction.silver = [];
        }
        // 从表格标题中提取年份（格式：2022 年度 2023 年度 2024 年度）
        // 查找表格标题行，提取按顺序排列的年份
        const tableHeaderPattern = /(20\d{2})\s*年度[\s\t]+(20\d{2})\s*年度[\s\t]+(20\d{2})\s*年度/;
        const headerMatch = widerContext.match(tableHeaderPattern);
        let years = [];
        if (headerMatch) {
          // 从标题中提取年份（按顺序），只处理2022-2026年的数据
          const year1 = parseInt(headerMatch[1]);
          const year2 = parseInt(headerMatch[2]);
          const year3 = parseInt(headerMatch[3]);
          if (year1 >= 2022 && year1 <= 2026 && year2 >= 2022 && year2 <= 2026 && year3 >= 2022 && year3 <= 2026) {
            years = [year1, year2, year3];
          }
        } else {
          // 如果找不到标准格式，尝试提取所有唯一的年份并排序，但只保留2022-2026年的
          const allYears = [...new Set((widerContext.match(/20\d{2}/g) || []).map(y => parseInt(y)))].sort();
          years = allYears.filter(y => y >= 2022 && y <= 2026).slice(0, allValues.length);
        }
        if (years.length >= allValues.length) {
          // 将年份和对应的产量值存储（按顺序对应）
          for (let i = 0; i < allValues.length && i < years.length; i++) {
            extractedData.multiYearProduction.silver.push({
              year: years[i],
              value: allValues[i],
              keyword: '银-多年对比产量表格提取'
            });
          }
        }
      } else {
        // 两列数据：第一列是当期，第二列是上年同期
        extractedData.silver.production.push({
          keyword: '银-产量表格提取',
          line: match[0],
          context: context,
          value: allValues[0],
          allValues: allValues
        });
        
        if (allValues.length >= 2) {
          extractedData.silver.lastYearProduction.push({
            keyword: '银-上年同期产量表格提取',
            line: match[0],
            context: widerContext.substring(0, 300),
            value: allValues[1],
            allValues: allValues
          });
        }
      }
    }
  }
  
  // 匹配锡产量数据（吨）（同时匹配"矿产锡"和"锡精粉"）
  // 格式：矿产锡/锡精粉 	3,589.82 	4,523.23 或多列数据（支持2-4列）
  const tinProductionPattern = /(?:矿产锡|锡精粉)[\s\t]+([\d,，]+\.?\d*)(?:[\s\t]+([\d,，]+\.?\d*))?(?:[\s\t]+([\d,，]+\.?\d*))?(?:[\s\t]+([\d,，]+\.?\d*))?/g;
  while ((match = tinProductionPattern.exec(text)) !== null) {
    // 扩大上下文范围以检查是否是产量表格
    const widerContext = text.substring(Math.max(0, match.index - 500), Math.min(text.length, match.index + 500));
    const isProductionTable = widerContext.includes('公司矿产品产量') || widerContext.includes('上年同期') || widerContext.includes('本期');
    
    const context = text.substring(Math.max(0, match.index - 200), Math.min(text.length, match.index + 200));
    // 如果是产量表格，即使包含"万元"或"%"也要处理（因为表格标题可能包含这些）
    if (!isProductionTable && (context.includes('万元') || context.includes('%') || context.includes('占比'))) {
      continue;
    }
    
    // 提取所有列的数值（可能有2-4列）
    const allValues = [];
    for (let i = 1; i <= 4; i++) {
      if (match[i]) {
        const valueStr = match[i].replace(/[,，]/g, '');
        const value = parseFloat(valueStr);
        // 锡产量应该在合理范围内（吨），通常小于100000吨
        if (value && value > 0 && value < 100000 && valueStr.split('.')[0].length <= 5) {
          allValues.push(value);
        }
      }
    }
    
    if (allValues.length > 0) {
      // 判断是多年对比表格还是当期vs上年同期表格
      // 如果有3列或更多数据，或者上下文包含3个或更多年份，则是多年对比表格
      const yearMatches = widerContext.match(/20\d{2}/g);
      const isMultiYearTable = allValues.length >= 3 || (yearMatches && yearMatches.length >= 3);
      
      if (isMultiYearTable) {
        // 多年对比表格：取最大值作为当期（通常是最新年份）
        const maxValue = Math.max(...allValues);
        extractedData.tin.production.push({
          keyword: '锡-产量表格提取',
          line: match[0],
          context: context,
          value: maxValue,
          allValues: allValues
        });
        
        // 找到最大值的索引，然后取前一个值作为上年同期
        if (allValues.length >= 2) {
          const maxIndex = allValues.indexOf(maxValue);
          const lastYearValue = maxIndex > 0 ? allValues[maxIndex - 1] : allValues[1];
          extractedData.tin.lastYearProduction.push({
            keyword: '锡-上年同期产量表格提取',
            line: match[0],
            context: widerContext.substring(0, 300),
            value: lastYearValue,
            allValues: allValues
          });
        }
        
        // 存储多年对比数据（用于填充历史年份）
        if (!extractedData.multiYearProduction) {
          extractedData.multiYearProduction = {};
        }
        if (!extractedData.multiYearProduction.tin) {
          extractedData.multiYearProduction.tin = [];
        }
        // 从表格标题中提取年份（格式：2022 年度 2023 年度 2024 年度）
        // 查找表格标题行，提取按顺序排列的年份
        const tableHeaderPattern = /(20\d{2})\s*年度[\s\t]+(20\d{2})\s*年度[\s\t]+(20\d{2})\s*年度/;
        const headerMatch = widerContext.match(tableHeaderPattern);
        let years = [];
        if (headerMatch) {
          // 从标题中提取年份（按顺序），只处理2022-2026年的数据
          const year1 = parseInt(headerMatch[1]);
          const year2 = parseInt(headerMatch[2]);
          const year3 = parseInt(headerMatch[3]);
          if (year1 >= 2022 && year1 <= 2026 && year2 >= 2022 && year2 <= 2026 && year3 >= 2022 && year3 <= 2026) {
            years = [year1, year2, year3];
          }
        } else {
          // 如果找不到标准格式，尝试提取所有唯一的年份并排序，但只保留2022-2026年的
          const allYears = [...new Set((widerContext.match(/20\d{2}/g) || []).map(y => parseInt(y)))].sort();
          years = allYears.filter(y => y >= 2022 && y <= 2026).slice(0, allValues.length);
        }
        if (years.length >= allValues.length) {
          // 将年份和对应的产量值存储（按顺序对应）
          for (let i = 0; i < allValues.length && i < years.length; i++) {
            extractedData.multiYearProduction.tin.push({
              year: years[i],
              value: allValues[i],
              keyword: '锡-多年对比产量表格提取'
            });
          }
        }
      } else {
        // 两列数据：第一列是当期，第二列是上年同期
        extractedData.tin.production.push({
          keyword: '锡-产量表格提取',
          line: match[0],
          context: context,
          value: allValues[0],
          allValues: allValues
        });
        
        if (allValues.length >= 2) {
          extractedData.tin.lastYearProduction.push({
            keyword: '锡-上年同期产量表格提取',
            line: match[0],
            context: widerContext.substring(0, 300),
            value: allValues[1],
            allValues: allValues
          });
        }
      }
    }
  }
  
  // 提取销量数据（从"采矿行业"表格）
  // 银销量格式：采矿行业(矿产银) 销售量 千克 209,819.08
  const silverSalesPattern = /采矿行业\s*\(\s*矿产银\s*\)[\s\S]{0,100}?销售量[\s\t]+(?:千克|吨)[\s\t]+([\d,，]+\.?\d*)/g;
  while ((match = silverSalesPattern.exec(text)) !== null) {
    const valueStr = match[1].replace(/[,，]/g, '');
    let value = parseFloat(valueStr);
    
    // 检查单位，如果是千克则转换为吨
    const context = text.substring(Math.max(0, match.index - 50), Math.min(text.length, match.index + 200));
    if (context.includes('千克')) {
      value = value / 1000; // 千克转吨
    }
    
    if (value && value > 0 && value < 10000) {
      extractedData.silver.sales.push({
        keyword: '银-销量采矿行业表格提取',
        line: match[0],
        context: context,
        value: value,
        allValues: [value]
      });
    }
  }
  
  // 锡销量格式：采矿行业(矿产锡) 销售量 吨 7,611.80
  const tinSalesPattern = /采矿行业\s*\(\s*矿产锡\s*\)[\s\S]{0,100}?销售量[\s\t]+吨[\s\t]+([\d,，]+\.?\d*)/g;
  while ((match = tinSalesPattern.exec(text)) !== null) {
    const valueStr = match[1].replace(/[,，]/g, '');
    const value = parseFloat(valueStr);
    
    if (value && value > 0 && value < 100000) {
      const context = text.substring(Math.max(0, match.index - 50), Math.min(text.length, match.index + 200));
      extractedData.tin.sales.push({
        keyword: '锡-销量采矿行业表格提取',
        line: match[0],
        context: context,
        value: value,
        allValues: [value]
      });
    }
  }
}

/**
 * 从"主营业务分产品"表格中提取银、锡的营收和成本
 */
function extractFinancialDataFromTable(text, extractedData) {
  // 匹配营收数据格式：矿产锡 	761,965,306.25 	30.81%（营收万元 占比）
  // 匹配成本数据格式：矿产锡 	761,965,306.25 	240,839,644.48（营收万元 成本万元）
  // 2025年之前：含铜银精粉、锡精粉
  // 2025年之后：矿产银、矿产锡
  
  // 匹配银营收数据（只匹配"矿产银"）
  // 格式：矿产银 [\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]*%
  const silverRevenuePattern = /矿产银[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]*%/g;
  let match;
  while ((match = silverRevenuePattern.exec(text)) !== null) {
    const context = text.substring(Math.max(0, match.index - 500), Math.min(text.length, match.index + 500));
    // 确保是营收数据（包含%表示占比）
    if (context.includes('%')) {
      const valueStr = match[1].replace(/[,，]/g, '');
      const value = parseFloat(valueStr);
      if (value && value > 1000) {
        let valueInYuan = value;
        // 如果上下文包含"主营业务"、"分产品"或"单位：元"，数据是元；否则判断数值大小
        if (context.includes('主营业务') || context.includes('分产品') || context.includes('单位：元') || context.includes('单位:元')) {
          // 已经是元，不需要转换
          valueInYuan = value;
        } else if (value < 100000000) {
          // 数值较小，可能是万元，转换为元
          valueInYuan = value * 10000;
        }
        extractedData.silver.revenue.push({
          keyword: '银-营收表格提取',
          line: match[0],
          context: context,
          value: valueInYuan,
          allValues: [valueInYuan]
        });
      }
    }
  }
  
  // 匹配银成本数据（只匹配"矿产银"）
  // 格式：矿产银 [\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]*(?!%)（营收 成本，不包含%）
  const silverCostPattern = /矿产银[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)(?![\s\t]*%)/g;
  while ((match = silverCostPattern.exec(text)) !== null) {
    const context = text.substring(Math.max(0, match.index - 1000), Math.min(text.length, match.index + 500));
    // 确保匹配的文本本身不包含%（避免匹配到占比行），且第二个值小于第一个值（成本小于营收）
    const matchText = match[0];
    if (!matchText.includes('%') && !matchText.includes('占比')) {
      const revenueValueStr = match[1].replace(/[,，]/g, '');
      const costValueStr = match[2].replace(/[,，]/g, '');
      const revenueValue = parseFloat(revenueValueStr);
      const costValue = parseFloat(costValueStr);
      // 判断单位：如果上下文包含"主营业务"或"分产品"，通常是元；否则可能是万元
      if (costValue && costValue > 1000 && revenueValue && revenueValue > 1000 && costValue < revenueValue) {
        let costInYuan = costValue;
        let revenueInYuan = revenueValue;
        // 如果上下文包含"主营业务"、"分产品"或"单位：元"，数据是元；否则判断数值大小
        if (context.includes('主营业务') || context.includes('分产品') || context.includes('单位：元') || context.includes('单位:元')) {
          // 已经是元，不需要转换
          costInYuan = costValue;
          revenueInYuan = revenueValue;
        } else if (revenueValue < 100000000) {
          // 数值较小，可能是万元，转换为元
          revenueInYuan = revenueValue * 10000;
          costInYuan = costValue * 10000;
        }
        extractedData.silver.cost.push({
          keyword: '银-成本表格提取',
          line: match[0],
          context: context,
          value: costInYuan,
          allValues: [costInYuan]
        });
      }
    }
  }
  
  // 匹配锡营收数据（同时匹配"矿产锡"和"锡精粉"）
  const tinRevenuePattern = /(?:矿产锡|锡精粉)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]*%/g;
  while ((match = tinRevenuePattern.exec(text)) !== null) {
    const context = text.substring(Math.max(0, match.index - 500), Math.min(text.length, match.index + 500));
    if (context.includes('%')) {
      const valueStr = match[1].replace(/[,，]/g, '');
      const value = parseFloat(valueStr);
      if (value && value > 1000) {
        let valueInYuan = value;
        // 如果上下文包含"主营业务"、"分产品"或"单位：元"，数据是元；否则判断数值大小
        if (context.includes('主营业务') || context.includes('分产品') || context.includes('单位：元') || context.includes('单位:元')) {
          valueInYuan = value; // 已经是元
        } else if (value < 100000000) {
          valueInYuan = value * 10000; // 万元转元
        }
        extractedData.tin.revenue.push({
          keyword: '锡-营收表格提取',
          line: match[0],
          context: context,
          value: valueInYuan,
          allValues: [valueInYuan]
        });
      }
    }
  }
  
  // 提取"营业收入构成"文本格式的营收数据
  // 格式：营业收入构成：... 矿产锡 135,443.61 万元，占比 33.04%；矿产银 148,918.24 万元，占比 36.33%
  // 或者：营业收入构成情况... 矿产锡 135,443.61 万元，占比 33.04%
  const revenueCompositionPattern = /(?:矿产(?:银|锡)|(?:含铜银精粉|锡精粉))[\s\t]+([\d,，]+\.?\d*)[\s\t]+万元[，,；;]?[\s\t]*(?:占比[\s\t]+[\d,，]+\.?\d*%|[\d,，]+\.?\d*%)/g;
  let compMatch;
  while ((compMatch = revenueCompositionPattern.exec(text)) !== null) {
    const context = text.substring(Math.max(0, compMatch.index - 500), Math.min(text.length, compMatch.index + 200));
    // 确保上下文包含"营业收入构成"
    if (context.includes('营业收入构成')) {
      const valueStr = compMatch[1].replace(/[,，]/g, '');
      const value = parseFloat(valueStr);
      
      if (value && value > 100) {
        const valueInYuan = value * 10000; // 万元转元
        
        // 判断是银还是锡（从匹配的文本中判断）
        const matchText = compMatch[0];
        if (matchText.includes('矿产银') || matchText.includes('含铜银精粉')) {
          extractedData.silver.revenue.push({
            keyword: '银-营收营业收入构成文本提取',
            line: compMatch[0],
            context: context,
            value: valueInYuan,
            allValues: [valueInYuan]
          });
        } else if (matchText.includes('矿产锡') || matchText.includes('锡精粉')) {
          extractedData.tin.revenue.push({
            keyword: '锡-营收营业收入构成文本提取',
            line: compMatch[0],
            context: context,
            value: valueInYuan,
            allValues: [valueInYuan]
          });
        }
      }
    }
  }
  
  // 匹配锡成本数据（同时匹配"矿产锡"和"锡精粉"）
  const tinCostPattern = /(?:矿产锡|锡精粉)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)(?![\s\t]*%)/g;
  while ((match = tinCostPattern.exec(text)) !== null) {
    const context = text.substring(Math.max(0, match.index - 1000), Math.min(text.length, match.index + 500));
    // 确保匹配的文本本身不包含%（避免匹配到占比行），且第二个值小于第一个值（成本小于营收）
    const matchText = match[0];
    if (!matchText.includes('%') && !matchText.includes('占比')) {
      const revenueValueStr = match[1].replace(/[,，]/g, '');
      const costValueStr = match[2].replace(/[,，]/g, '');
      const revenueValue = parseFloat(revenueValueStr);
      const costValue = parseFloat(costValueStr);
      if (costValue && costValue > 1000 && revenueValue && revenueValue > 1000 && costValue < revenueValue) {
        let costInYuan = costValue;
        let revenueInYuan = revenueValue;
        // 如果上下文包含"主营业务"、"分产品"或"单位：元"，数据是元；否则判断数值大小
        if (context.includes('主营业务') || context.includes('分产品') || context.includes('单位：元') || context.includes('单位:元')) {
          costInYuan = costValue; // 已经是元
          revenueInYuan = revenueValue;
        } else if (revenueValue < 100000000) {
          revenueInYuan = revenueValue * 10000;
          costInYuan = costValue * 10000;
        }
        extractedData.tin.cost.push({
          keyword: '锡-成本表格提取',
          line: match[0],
          context: context,
          value: costInYuan,
          allValues: [costInYuan]
        });
      }
    }
  }
}

/**
 * 解析PDF文件
 */
async function parsePDF(filePath) {
  try {
    console.log(`正在解析: ${path.basename(filePath)}`);
    const dataBuffer = fs.readFileSync(filePath);
    const parser = new PDFParse({ data: dataBuffer });
    const textData = await parser.getText();
    const text = textData.text;
    
    // 提取年份
    const yearMatch = text.match(/20\d{2}/);
    const year = yearMatch ? yearMatch[0] : null;
    
    console.log(`提取到年份: ${year || '未知'}`);
    console.log(`文本长度: ${text.length} 字符`);
    
    // 提取各类数据
    const extractedData = {
      year: year,
      filename: path.basename(filePath),
      silver: {
        cost: [],
        revenue: [],
        production: [],
        sales: [],
        lastYearProduction: [] // 上年同期产量
      },
      tin: {
        cost: [],
        revenue: [],
        production: [],
        sales: [],
        lastYearProduction: [] // 上年同期产量
      }
    };
    
    // 提取银相关数据
    for (const keyword of keywords.silver.cost) {
      const results = extractDataByKeyword(text, keyword);
      extractedData.silver.cost.push(...results);
    }
    
    for (const keyword of keywords.silver.revenue) {
      const results = extractDataByKeyword(text, keyword);
      extractedData.silver.revenue.push(...results);
    }
    
    for (const keyword of keywords.silver.production) {
      const results = extractDataByKeyword(text, keyword);
      extractedData.silver.production.push(...results);
    }
    
    for (const keyword of keywords.silver.sales) {
      const results = extractDataByKeyword(text, keyword);
      extractedData.silver.sales.push(...results);
    }
    
    // 提取锡相关数据
    for (const keyword of keywords.tin.cost) {
      const results = extractDataByKeyword(text, keyword);
      extractedData.tin.cost.push(...results);
    }
    
    for (const keyword of keywords.tin.revenue) {
      const results = extractDataByKeyword(text, keyword);
      extractedData.tin.revenue.push(...results);
    }
    
    for (const keyword of keywords.tin.production) {
      const results = extractDataByKeyword(text, keyword);
      extractedData.tin.production.push(...results);
    }
    
    for (const keyword of keywords.tin.sales) {
      const results = extractDataByKeyword(text, keyword);
      extractedData.tin.sales.push(...results);
    }
    
    // 从表格中提取数据
    extractProductDataFromTable(text, extractedData);
    extractFinancialDataFromTable(text, extractedData);
    
    return {
      filename: path.basename(filePath),
      year: year,
      ...extractedData
    };
  } catch (error) {
    console.error(`解析 ${filePath} 时出错:`, error.message);
    return null;
  }
}

/**
 * 处理所有PDF文件
 */
async function processAllPDFs() {
  const reportDir = path.join(__dirname, '../stock/report_analysis/兴业银锡');
  
  if (!fs.existsSync(reportDir)) {
    console.error(`目录不存在: ${reportDir}`);
    return;
  }
  
  const files = fs.readdirSync(reportDir)
    .filter(file => file.endsWith('.pdf'))
    .sort();
  
  console.log(`找到 ${files.length} 个PDF文件`);
  
  const allData = [];
  
  for (const file of files) {
    const filePath = path.join(reportDir, file);
    const extractedData = await parsePDF(filePath);
    
    if (extractedData) {
      allData.push(extractedData);
    }
  }
  
  // 保存原始提取数据
  const outputPath = path.join(reportDir, 'xyyx_data.json');
  fs.writeFileSync(outputPath, JSON.stringify({ rawData: allData }, null, 2), 'utf8');
  console.log(`\n原始数据已保存到: ${outputPath}`);
  
  // 处理并生成标准化的数据
  const processedData = processData(allData);
  const correctedPath = path.join(reportDir, 'xyyx_data_corrected.json');
  fs.writeFileSync(correctedPath, JSON.stringify(processedData, null, 2), 'utf8');
  console.log(`标准化数据已保存到: ${correctedPath}`);
  
  return processedData;
}

/**
 * 处理数据，生成标准格式
 */
function processData(allData) {
  const rawData = [];
  
  for (const item of allData) {
    const filename = item.filename;
    const year = parseInt(item.year);
    
    // 确定报告期
    let period = '';
    let month = 0;
    
    if (filename.includes('第一季度')) {
      period = `${year}年1-3月`;
      month = 3;
    } else if (filename.includes('半年度') || filename.includes('半年')) {
      period = `${year}年上半年`;
      month = 6;
    } else if (filename.includes('第三季度')) {
      period = `${year}年1-9月`;
      month = 9;
    } else if (filename.includes('年度报告') || filename.includes('年报')) {
      period = `${year}年全年`;
      month = 12;
    }
    
    if (!period) {
      console.warn(`无法确定报告期: ${filename}`);
      continue;
    }
    
    // 提取银数据（取最大值或第一个有效值）
    // 营收和成本已经是元（从万元*10000转换来的），需要转换为亿元
    // 1亿元 = 100000000元，所以除以100000000
    const silverRevenue = item.silver.revenue.length > 0 
      ? Math.max(...item.silver.revenue.map(r => r.value)) / 100000000 // 元转亿元
      : null;
    const silverCost = item.silver.cost.length > 0
      ? Math.max(...item.silver.cost.map(r => r.value)) / 100000000 // 元转亿元
      : null;
    // 产量和销量是吨，保持原单位
    // 过滤掉明显错误的值（如1、2等很小的值，可能是误匹配）
    const silverProductionValues = item.silver.production
      .filter(r => r.value > 10) // 银产量应该大于10吨
      .map(r => r.value);
    const silverProduction = silverProductionValues.length > 0
      ? Math.max(...silverProductionValues)
      : null;
    const silverSalesValues = item.silver.sales
      .filter(r => r.value > 10) // 银销量应该大于10吨
      .map(r => r.value);
    const silverSales = silverSalesValues.length > 0
      ? Math.max(...silverSalesValues)
      : null;
    // 提取上年同期产量（如果有）
    // 优先从 allValues 中查找不等于当期产量的值
    let silverLastYearProduction = null;
    for (const r of item.silver.lastYearProduction) {
      if (r.allValues && r.allValues.length >= 2) {
        // 从 allValues 中找到不等于当期产量的值
        const candidates = r.allValues.filter(v => v !== silverProduction && v > 10 && v < 10000);
        if (candidates.length > 0) {
          silverLastYearProduction = Math.max(...candidates);
          break;
        }
      } else if (r.value && r.value !== silverProduction && r.value > 10 && r.value < 10000) {
        // 检查是否是占比数据
        const isPercentage = r.context && (r.context.includes('占比') || r.context.includes('%') && r.value < 100);
        if (!isPercentage) {
          silverLastYearProduction = r.value;
          break;
        }
      }
    }
    
    // 提取锡数据
    const tinRevenue = item.tin.revenue.length > 0
      ? Math.max(...item.tin.revenue.map(r => r.value)) / 100000000 // 元转亿元
      : null;
    const tinCost = item.tin.cost.length > 0
      ? Math.max(...item.tin.cost.map(r => r.value)) / 100000000 // 元转亿元
      : null;
    // 产量和销量是吨，保持原单位
    // 优先使用从"矿产品产量"文本中提取的值，过滤掉明显错误的值
    const tinProductionFromText = item.tin.production
      .filter(r => (r.keyword.includes('产量文本') || r.keyword.includes('产量单独')) && r.value > 100 && r.value < 10000)
      .map(r => r.value);
    const tinProductionOther = item.tin.production
      .filter(r => !r.keyword.includes('产量文本') && !r.keyword.includes('产量单独'))
      .filter(r => {
        // 锡产量应该在合理范围内（100-10000吨），排除明显错误的值
        // 排除8902这样的值（可能是误匹配）
        return r.value > 100 && r.value < 10000 && r.value !== 8902;
      })
      .map(r => r.value);
    
    // 优先使用文本提取的值，如果没有则使用其他值
    const tinProductionValues = tinProductionFromText.length > 0 ? tinProductionFromText : tinProductionOther;
    const tinProduction = tinProductionValues.length > 0
      ? Math.max(...tinProductionValues)
      : null;
    const tinSalesValues = item.tin.sales
      .filter(r => r.value > 100 && r.value < 10000)
      .map(r => r.value);
    const tinSales = tinSalesValues.length > 0
      ? Math.max(...tinSalesValues)
      : null;
    // 提取上年同期产量（如果有）
    // 优先从 allValues 中查找不等于当期产量的值
    let tinLastYearProduction = null;
    for (const r of item.tin.lastYearProduction) {
      if (r.allValues && r.allValues.length >= 2) {
        // 从 allValues 中找到不等于当期产量的值
        const candidates = r.allValues.filter(v => v !== tinProduction && v > 1000 && v < 10000);
        if (candidates.length > 0) {
          tinLastYearProduction = Math.max(...candidates);
          break;
        }
      } else if (r.value && r.value !== tinProduction && r.value > 1000 && r.value < 10000) {
        // 检查是否是占比数据
        const isPercentage = r.context && (r.context.includes('占比') || (r.context.includes('%') && r.value < 100));
        if (!isPercentage) {
          tinLastYearProduction = r.value;
          break;
        }
      }
    }
    
    rawData.push({
      period: period,
      year: year,
      month: month,
      type: 'cumulative',
      silver: {
        revenue: silverRevenue,
        cost: silverCost,
        production: silverProduction,
        sales: silverSales,
        lastYearProduction: silverLastYearProduction // 上年同期产量
      },
      tin: {
        revenue: tinRevenue,
        cost: tinCost,
        production: tinProduction,
        sales: tinSales,
        lastYearProduction: tinLastYearProduction // 上年同期产量
      }
    });
  }
  
  // 处理多年对比产量数据（从年报中提取的历史年份数据）
  allData.forEach(item => {
    if (item.multiYearProduction) {
      // 处理银产品多年对比数据（只处理2022-2026年的数据，排除2020-2021年）
      if (item.multiYearProduction.silver && item.multiYearProduction.silver.length > 0) {
        item.multiYearProduction.silver
          .filter(multiYearItem => multiYearItem.year >= 2022 && multiYearItem.year <= 2026)
          .forEach(multiYearItem => {
            // 查找对应年份的全年数据
            let targetItem = rawData.find(d => 
              d.year === multiYearItem.year && 
              d.period.includes('全年')
            );
            
            // 如果不存在，创建新的记录
            if (!targetItem) {
              targetItem = {
                period: `${multiYearItem.year}年全年`,
                year: multiYearItem.year,
                month: 12,
                type: 'cumulative',
                silver: {
                  revenue: null,
                  cost: null,
                  production: null,
                  sales: null,
                  lastYearProduction: null
                },
                tin: {
                  revenue: null,
                  cost: null,
                  production: null,
                  sales: null,
                  lastYearProduction: null
                }
              };
              rawData.push(targetItem);
            }
            
            if (targetItem.silver.production === null) {
              targetItem.silver.production = multiYearItem.value;
              console.log(`自动填充 ${targetItem.period} 银产量: ${multiYearItem.value} 吨（来自 ${item.filename} 多年对比表格）`);
            }
          });
      }
      
      // 处理锡产品多年对比数据（只处理2022-2026年的数据，排除2020-2021年）
      if (item.multiYearProduction.tin && item.multiYearProduction.tin.length > 0) {
        item.multiYearProduction.tin
          .filter(multiYearItem => multiYearItem.year >= 2022 && multiYearItem.year <= 2026)
          .forEach(multiYearItem => {
            // 查找对应年份的全年数据
            let targetItem = rawData.find(d => 
              d.year === multiYearItem.year && 
              d.period.includes('全年')
            );
            
            // 如果不存在，创建新的记录
            if (!targetItem) {
              targetItem = {
                period: `${multiYearItem.year}年全年`,
                year: multiYearItem.year,
                month: 12,
                type: 'cumulative',
                silver: {
                  revenue: null,
                  cost: null,
                  production: null,
                  sales: null,
                  lastYearProduction: null
                },
                tin: {
                  revenue: null,
                  cost: null,
                  production: null,
                  sales: null,
                  lastYearProduction: null
                }
              };
              rawData.push(targetItem);
            }
            
            if (targetItem.tin.production === null) {
              targetItem.tin.production = multiYearItem.value;
              console.log(`自动填充 ${targetItem.period} 锡产量: ${multiYearItem.value} 吨（来自 ${item.filename} 多年对比表格）`);
            }
          });
      }
    }
  });
  
  // 自动填充上年同期产量数据
  // 遍历所有2025年的数据，将lastYearProduction填充到对应的2024年数据中
  rawData.forEach(item => {
    if (item.year === 2025 && (item.silver.lastYearProduction !== null || item.tin.lastYearProduction !== null)) {
      // 查找对应的2024年同期数据
      const lastYearItem = rawData.find(d => 
        d.year === 2024 && 
        d.month === item.month && 
        d.type === item.type
      );
      
      if (lastYearItem) {
        // 如果2024年的产量数据为空，则填充从2025年报告中提取的上年同期数据
        if (lastYearItem.silver.production === null && item.silver.lastYearProduction !== null) {
          lastYearItem.silver.production = item.silver.lastYearProduction;
          console.log(`自动填充 ${lastYearItem.period} 银产量: ${item.silver.lastYearProduction} 吨（来自 ${item.period} 报告）`);
        }
        if (lastYearItem.tin.production === null && item.tin.lastYearProduction !== null) {
          lastYearItem.tin.production = item.tin.lastYearProduction;
          console.log(`自动填充 ${lastYearItem.period} 锡产量: ${item.tin.lastYearProduction} 吨（来自 ${item.period} 报告）`);
        }
      }
    }
  });
  
  // 删除2020年和2021年的全年数据（这些数据不正确或不完整）
  const indicesToRemove = [];
  rawData.forEach((item, index) => {
    if ((item.year === 2020 || item.year === 2021) && item.period.includes('全年')) {
      indicesToRemove.push(index);
    }
  });
  // 从后往前删除，避免索引变化
  for (let i = indicesToRemove.length - 1; i >= 0; i--) {
    rawData.splice(indicesToRemove[i], 1);
    console.log(`删除不正确的数据: ${rawData[indicesToRemove[i]]?.period || '未知'}`);
  }
  
  return { rawData };
}

// 如果直接运行此脚本
if (require.main === module) {
  processAllPDFs()
    .then(() => {
      console.log('\n处理完成！');
      process.exit(0);
    })
    .catch(error => {
      console.error('处理失败:', error);
      process.exit(1);
    });
}

module.exports = { parsePDF, processAllPDFs };
