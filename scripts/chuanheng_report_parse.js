const { PDFParse } = require('pdf-parse');
const fs = require('fs');
const path = require('path');

/**
 * 川恒股份年报数据提取脚本
 * 提取磷相关的成本、营收、产量、销量数据
 */

// 需要提取的关键词
const keywords = {
  cost: ['成本', '营业成本', '磷成本', '生产成本', '磷销售成本', '主营业务成本', '磷化工营业成本'],
  revenue: ['营收', '营业收入', '磷营收', '磷收入', '主营业务收入', '磷销售收入', '磷化工营业收入'],
  production: ['磷产量', '产量', '生产量', '磷酸产量', '磷矿石产量', '磷肥产量', '磷酸一铵产量', '磷酸二铵产量'],
  sales: ['磷销量', '销量', '销售量', '销售磷', '磷酸销量', '磷肥销量', '磷酸一铵销量', '磷酸二铵销量'],
  inventory: ['库存量', '库存', '磷库存']
};

// 数据提取模式
const patterns = {
  // 匹配数字（可能包含单位：万元、亿元等）
  number: /([\d,，]+\.?\d*)\s*(?:万元|亿元|元|万|亿)?/g,
  // 匹配年份
  year: /(20\d{2})/g,
  // 匹配百分比
  percent: /([\d,，]+\.?\d*)\s*%/g
};


/**
 * 从文本中提取数值
 */
function extractNumber(text) {
  if (!text) return null;
  
  // 移除逗号和空格
  let cleaned = text.replace(/[,，\s]/g, '');
  
  // 检查是否包含"亿"
  let multiplier = 1;
  if (cleaned.includes('亿')) {
    multiplier = 100000000;
    cleaned = cleaned.replace(/亿/g, '');
  } else if (cleaned.includes('万')) {
    multiplier = 10000;
    cleaned = cleaned.replace(/万/g, '');
  }
  
  // 提取数字
  const match = cleaned.match(/[\d.]+/);
  if (match) {
    const num = parseFloat(match[0]);
    return isNaN(num) ? null : num * multiplier;
  }
  
  return null;
}

/**
 * 从文本中提取数值（保持万吨单位，不转换为吨）
 * 用于产量、销量等数据
 */
function extractNumberInWanTons(text) {
  if (!text) return null;
  
  // 移除逗号和空格
  let cleaned = text.replace(/[,，\s]/g, '');
  
  // 移除"万吨"、"吨"等单位
  cleaned = cleaned.replace(/万吨|吨/g, '');
  
  // 提取数字
  const match = cleaned.match(/[\d.]+/);
  if (match) {
    const num = parseFloat(match[0]);
    return isNaN(num) ? null : num; // 直接返回数字，不乘以任何系数
  }
  
  return null;
}

/**
 * 从"主要产品"表格中提取磷产品数据
 * 格式：磷酸(万吨） \t生产量 \t销售量 \t库存量
 */
function extractInventoryFromMainProducts(text, extractedData) {
  // 匹配"主要产品"表格中的磷产品数据
  // 支持多种格式：制表符、空格分隔
  // 格式1：磷酸(万吨） \t生产量 \t销售量 \t库存量
  // 格式2：主要产品 \t磷酸 \t生产量 \t销售量 \t库存量
  // 格式3：磷酸 \t生产量 \t销售量 \t库存量（不带单位）
  const patterns = [
    // 磷酸（带单位）
    /磷酸[\(（][^）)]*万吨[\)）][\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g,
    // 磷酸（不带单位，在主要产品表格中）
    /主要产品[^\d]*磷酸[^\d]*([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g,
    // 磷酸（直接匹配，前后有数字）
    /磷酸[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)(?![\d,，])/g,
    // 磷酸一铵
    /磷酸一铵[\(（][^）)]*万吨[\)）][\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g,
    // 磷酸二铵
    /磷酸二铵[\(（][^）)]*万吨[\)）][\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g,
    // 磷矿石
    /磷矿石[\(（][^）)]*万吨[\)）][\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g,
    // 磷产品（通用，最后匹配）
    /磷[\(（][^）)]*万吨[\)）][\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      // 检查匹配的文本是否包含"产量"或"销量"关键词，如果包含则跳过（避免误匹配）
      // 但如果是"主要产品"表格格式，则允许包含这些关键词
      const isMainProductTable = match[0].includes('主要产品');
      if (!isMainProductTable && (match[0].includes('产量') || match[0].includes('销量') || match[0].includes('销售量'))) {
        continue;
      }
      
      // 提取三个数值：生产量、销售量、库存量
      const productionStr = match[1].replace(/[,，]/g, '');
      const salesStr = match[2].replace(/[,，]/g, '');
      const inventoryStr = match[3].replace(/[,，]/g, '');
      
      const production = parseFloat(productionStr);
      const sales = parseFloat(salesStr);
      const inventory = parseFloat(inventoryStr);
      
      // 数据合理性验证：产量和销量应该在合理范围内（0-10000万吨）
      // 同时验证：产量和销量不能是百分比（不能小于1，除非是小数如0.5万吨）
      // 对于半年报，产量和销量通常应该在几十到几百万吨之间
      if (!isNaN(production) && production > 0 && production < 100000 && production >= 0.1) {
        // 进一步验证：如果值太小（小于0.5万吨），很可能是误提取的百分比
        if (production >= 0.5 || (production >= 0.1 && production < 0.5 && match[0].includes('主要产品'))) {
          extractedData.production.push({
            keyword: '主要产品-产量',
            line: match[0],
            context: match[0],
            value: production,
            allValues: [production]
          });
        }
      }
      
      if (!isNaN(sales) && sales > 0 && sales < 100000 && sales >= 0.1) {
        // 进一步验证：如果值太小（小于0.5万吨），很可能是误提取的百分比
        if (sales >= 0.5 || (sales >= 0.1 && sales < 0.5 && match[0].includes('主要产品'))) {
          extractedData.sales.push({
            keyword: '主要产品-销量',
            line: match[0],
            context: match[0],
            value: sales,
            allValues: [sales]
          });
        }
      }
      
      if (!isNaN(inventory) && inventory > 0 && inventory < 100000) {
        extractedData.inventory.push({
          keyword: '主要产品-库存',
          line: match[0],
          context: match[0],
          value: inventory,
          allValues: [inventory]
        });
      }
    }
  }
}

/**
 * 从文本中提取分产品销量数据
 * 四个产品：饲料级磷酸二氢钙、磷酸一铵、磷矿石、磷酸
 */
function extractProductSales(text, extractedData) {
  // 饲料级磷酸二氢钙（从主要产品表格中提取，优先）
  const feedGradeMCPMainPattern = /(?:主要产品[^\d]*)?饲料级磷酸二氢钙[\(（]?[^）)]*万吨[\)）]?[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g;
  let feedGradeMCPMainMatch;
  while ((feedGradeMCPMainMatch = feedGradeMCPMainPattern.exec(text)) !== null) {
    if (feedGradeMCPMainMatch[0].includes('产量') || feedGradeMCPMainMatch[0].includes('销量') || feedGradeMCPMainMatch[0].includes('销售量')) {
      continue;
    }
    const salesValue = extractNumberInWanTons(feedGradeMCPMainMatch[2] + '万吨');
    if (salesValue && salesValue > 0) {
      extractedData.productSales.feedGradeMCP.push({
        keyword: '主要产品-饲料级磷酸二氢钙销量',
        line: feedGradeMCPMainMatch[0],
        context: feedGradeMCPMainMatch[0],
        value: salesValue,
        allValues: [salesValue]
      });
      break;
    }
  }
  
  // 饲料级磷酸二氢钙（单独提取，从文本中，如果主要产品表格中没有找到）
  if (extractedData.productSales.feedGradeMCP.length === 0) {
    const feedGradeMCPPattern = /饲料级磷酸二氢钙[\s\t]+([\d,，]+\.?\d*)[\s\t]*万吨/g;
    let feedGradeMCPMatch;
    while ((feedGradeMCPMatch = feedGradeMCPPattern.exec(text)) !== null) {
      const value = extractNumberInWanTons(feedGradeMCPMatch[1] + '万吨');
      if (value && value > 0) {
        extractedData.productSales.feedGradeMCP.push({
          keyword: '饲料级磷酸二氢钙销量',
          line: feedGradeMCPMatch[0],
          context: feedGradeMCPMatch[0],
          value: value,
          allValues: [value]
        });
        break;
      }
    }
  }
  
  // 从"主要产品"表格中提取分产品销量数据（优先）
  // 格式：主要产品 \t磷酸 \t生产量 \t销售量 \t库存量
  // 或者：磷酸(万吨） \t生产量 \t销售量 \t库存量
  const mainProductPattern = /(?:主要产品[^\d]*)?磷酸[\(（]?[^）)]*万吨[\)）]?[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g;
  let mainMatch;
  while ((mainMatch = mainProductPattern.exec(text)) !== null) {
    // 跳过包含"产量"或"销量"关键词的匹配（避免误匹配）
    if (mainMatch[0].includes('产量') || mainMatch[0].includes('销量') || mainMatch[0].includes('销售量')) {
      continue;
    }
    // 第二个数字是销售量
    const salesValue = extractNumberInWanTons(mainMatch[2] + '万吨');
    if (salesValue && salesValue > 0) {
      extractedData.productSales.phosphoricAcid.push({
        keyword: '主要产品-磷酸销量',
        line: mainMatch[0],
        context: mainMatch[0],
        value: salesValue,
        allValues: [salesValue]
      });
      break; // 只取第一个匹配
    }
  }
  
  // 磷酸（单独提取，从文本中，如果主要产品表格中没有找到）
  if (extractedData.productSales.phosphoricAcid.length === 0) {
    const phosphoricAcidPattern = /磷酸[\s\t]+([\d,，]+\.?\d*)[\s\t]*万吨/g;
    let phosphoricAcidMatch;
    while ((phosphoricAcidMatch = phosphoricAcidPattern.exec(text)) !== null) {
      const value = extractNumberInWanTons(phosphoricAcidMatch[1] + '万吨');
      if (value && value > 0) {
        extractedData.productSales.phosphoricAcid.push({
          keyword: '磷酸销量',
          line: phosphoricAcidMatch[0],
          context: phosphoricAcidMatch[0],
          value: value,
          allValues: [value]
        });
        break; // 只取第一个匹配
      }
    }
  }
  
  // 磷酸一铵（从主要产品表格中提取，优先）
  const mapMainPattern = /(?:主要产品[^\d]*)?磷酸一铵[\(（]?[^）)]*万吨[\)）]?[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g;
  let mapMainMatch;
  while ((mapMainMatch = mapMainPattern.exec(text)) !== null) {
    if (mapMainMatch[0].includes('产量') || mapMainMatch[0].includes('销量') || mapMainMatch[0].includes('销售量')) {
      continue;
    }
    const salesValue = extractNumberInWanTons(mapMainMatch[2] + '万吨');
    if (salesValue && salesValue > 0) {
      extractedData.productSales.map.push({
        keyword: '主要产品-磷酸一铵销量',
        line: mapMainMatch[0],
        context: mapMainMatch[0],
        value: salesValue,
        allValues: [salesValue]
      });
      break;
    }
  }
  
  // 磷酸一铵（单独提取，从文本中，如果主要产品表格中没有找到）
  if (extractedData.productSales.map.length === 0) {
    const mapPattern = /磷酸一铵[\s\t]+([\d,，]+\.?\d*)[\s\t]*万吨/g;
    let mapMatch;
    while ((mapMatch = mapPattern.exec(text)) !== null) {
      const value = extractNumberInWanTons(mapMatch[1] + '万吨');
      if (value && value > 0) {
        extractedData.productSales.map.push({
          keyword: '磷酸一铵销量',
          line: mapMatch[0],
          context: mapMatch[0],
          value: value,
          allValues: [value]
        });
        break;
      }
    }
  }
  
  // 磷矿石（单独提取）
  const phosphateRockPattern = /磷矿石[\s\t]+([\d,，]+\.?\d*)[\s\t]*万吨/g;
  let phosphateRockMatch;
  while ((phosphateRockMatch = phosphateRockPattern.exec(text)) !== null) {
    const value = extractNumberInWanTons(phosphateRockMatch[1] + '万吨');
    if (value && value > 0) {
      extractedData.productSales.phosphateRock.push({
        keyword: '磷矿石销量',
        line: phosphateRockMatch[0],
        context: phosphateRockMatch[0],
        value: value,
        allValues: [value]
      });
      break;
    }
  }
}

/**
 * 在文本中搜索关键词并提取相关数据
 */
function extractDataByKeyword(text, keyword, contextLines = 3) {
  const results = [];
  const lines = text.split('\n');
  
  // 判断是否是需要保持万吨单位的关键词
  const isWanTonKeyword = keyword.includes('产量') || keyword.includes('销量') || 
                          keyword.includes('库存');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes(keyword)) {
      // 获取上下文
      const context = [];
      const expandedContextLines = contextLines;
      for (let j = Math.max(0, i - expandedContextLines); j < Math.min(lines.length, i + expandedContextLines + 1); j++) {
        context.push(lines[j]);
      }
      
      // 尝试从关键词附近提取数字
      let extractedValue = null;
      
      // 特殊处理：产量、销量关键词，精确匹配"关键词...数字"模式
      if (!extractedValue && (keyword.includes('产量') || keyword.includes('销量'))) {
        // 优先匹配表格格式：磷酸产量（万吨） 176.80 ... 或 磷酸销售量（万吨） ...
        let patternStr = keyword;
        if (keyword === '销量' || keyword === '销售量') {
          patternStr = '磷销售量';
        } else if (keyword === '产量' || keyword === '磷产量') {
          patternStr = '磷产量';
        }
        let pattern = new RegExp(patternStr + '\\s*[（(]万吨[）)]\\s+([\\d,，]+\\.?\\d*)', 'g');
        let match = pattern.exec(line);
        if (match) {
          extractedValue = extractNumberInWanTons(match[1] + '万吨');
        } else {
          // 如果没有匹配到表格格式，尝试普通格式，但必须包含"万吨"单位
          pattern = new RegExp(keyword + '[^%]*([\\d,，]+\\.?\\d*)\\s*万吨', 'g');
          match = pattern.exec(line);
          if (match) {
            // 验证：确保不是百分比（前后不能有%）
            const beforeMatch = line.substring(0, match.index);
            const afterMatch = line.substring(match.index + match[0].length);
            if (!beforeMatch.includes('%') && !afterMatch.match(/^\s*%/)) {
              extractedValue = extractNumberInWanTons(match[1] + '万吨');
            }
          }
        }
      }
      
      // 如果没有精确匹配，使用通用方法
      // 对于产量和销量，必须确保有"万吨"单位，且不是百分比
      if (!extractedValue) {
        // 对于产量和销量关键词，必须包含"万吨"单位
        if (isWanTonKeyword && (keyword.includes('产量') || keyword.includes('销量'))) {
          // 只匹配包含"万吨"的行
          const wanTonPattern = new RegExp(keyword + '[^%]*([\\d,，]+\\.?\\d*)\\s*万吨', 'g');
          const wanTonMatch = wanTonPattern.exec(line);
          if (wanTonMatch) {
            // 验证：确保不是百分比（前后不能有%）
            const beforeMatch = line.substring(0, wanTonMatch.index);
            const afterMatch = line.substring(wanTonMatch.index + wanTonMatch[0].length);
            if (!beforeMatch.includes('%') && !afterMatch.match(/^\s*%/)) {
              extractedValue = extractNumberInWanTons(wanTonMatch[1] + '万吨');
            }
          }
        } else {
          // 对于其他关键词，使用通用方法
          // 在当前行中查找数字（优先从当前行提取，避免上下文干扰）
          const lineNumbers = line.match(patterns.number);
          
          if (lineNumbers && lineNumbers.length > 0) {
            // 根据关键词类型选择合适的提取函数
            const extractFunc = isWanTonKeyword ? extractNumberInWanTons : extractNumber;
            const values = lineNumbers.map(n => extractFunc(n)).filter(n => n !== null);
            if (values.length > 0) {
              extractedValue = Math.max(...values);
            }
          } else {
            // 如果当前行没有数字，再从上下文中查找
            const contextText = context.join(' ');
            const numbers = contextText.match(patterns.number);
            
            if (numbers && numbers.length > 0) {
              const extractFunc = isWanTonKeyword ? extractNumberInWanTons : extractNumber;
              const values = numbers.map(n => extractFunc(n)).filter(n => n !== null);
              if (values.length > 0) {
                extractedValue = Math.max(...values);
              }
            }
          }
        }
      }
      
      if (extractedValue) {
        const lineNumbers = line.match(patterns.number);
        const extractFunc = isWanTonKeyword ? extractNumberInWanTons : extractNumber;
        const allValues = lineNumbers ? lineNumbers.map(n => extractFunc(n)).filter(n => n !== null) : [extractedValue];
        
        results.push({
          keyword,
          line: line.trim(),
          context: context.join(' '),
          value: extractedValue,
          allValues: allValues
        });
      }
    }
  }
  
  return results;
}

/**
 * 从"行业分类"表格中提取磷化工的销售量、生产量、库存量（单位：吨，需转换为万吨）
 */
function extractIndustryClassification(text, extractedData) {
  // 查找"行业分类"表格区域
  const industryIndex = text.indexOf('行业分类');
  if (industryIndex === -1) return;
  
  // 获取"行业分类"表格附近2000字符的文本
  const industrySection = text.substring(industryIndex, industryIndex + 2000);
  
  // 匹配"磷化工"行的数据
  // 格式：磷化工 \t销售量 \t吨 \t1,064,374.51 \t789,265.21 \t34.86%
  // 或者：磷化工 \t生产量 \t吨 \t1,072,841.35 \t779,738.65 \t37.59%
  // 或者：磷化工 \t库存量 \t吨 \t70,030.62 \t61,718.77 \t13.47%
  
  // 销售量
  const salesPattern = /磷化工[\s\S]{0,100}?销售量[\s\S]{0,50}?([\d,，]+\.?\d*)[\s\t]+[\d,，]+\.?\d*/g;
  let salesMatch;
  while ((salesMatch = salesPattern.exec(industrySection)) !== null) {
    const valueStr = salesMatch[1].replace(/[,，]/g, '');
    const value = parseFloat(valueStr);
    if (!isNaN(value) && value > 0) {
      // 转换为万吨
      const valueInWanTons = value / 10000;
      extractedData.sales.push({
        keyword: '行业分类-磷化工销售量',
        line: salesMatch[0],
        context: industrySection.substring(0, 500),
        value: valueInWanTons,
        allValues: [valueInWanTons]
      });
      break;
    }
  }
  
  // 生产量
  const productionPattern = /磷化工[\s\S]{0,100}?生产量[\s\S]{0,50}?([\d,，]+\.?\d*)[\s\t]+[\d,，]+\.?\d*/g;
  let productionMatch;
  while ((productionMatch = productionPattern.exec(industrySection)) !== null) {
    const valueStr = productionMatch[1].replace(/[,，]/g, '');
    const value = parseFloat(valueStr);
    if (!isNaN(value) && value > 0) {
      // 转换为万吨
      const valueInWanTons = value / 10000;
      extractedData.production.push({
        keyword: '行业分类-磷化工生产量',
        line: productionMatch[0],
        context: industrySection.substring(0, 500),
        value: valueInWanTons,
        allValues: [valueInWanTons]
      });
      break;
    }
  }
  
  // 库存量
  const inventoryPattern = /磷化工[\s\S]{0,100}?库存量[\s\S]{0,50}?([\d,，]+\.?\d*)[\s\t]+[\d,，]+\.?\d*/g;
  let inventoryMatch;
  while ((inventoryMatch = inventoryPattern.exec(industrySection)) !== null) {
    const valueStr = inventoryMatch[1].replace(/[,，]/g, '');
    const value = parseFloat(valueStr);
    if (!isNaN(value) && value > 0) {
      // 转换为万吨
      const valueInWanTons = value / 10000;
      extractedData.inventory.push({
        keyword: '行业分类-磷化工库存量',
        line: inventoryMatch[0],
        context: industrySection.substring(0, 500),
        value: valueInWanTons,
        allValues: [valueInWanTons]
      });
      break;
    }
  }
}

/**
 * 从"分产品"表格中提取所有产品的财务数据（营收、成本、毛利率）
 * 四个产品：饲料级磷酸二氢钙、磷酸一铵、磷矿石、磷酸
 */
function extractAllProductFinancials(text) {
  const result = {
    feedGradeMCP: { revenue: null, cost: null, grossMargin: null },  // 饲料级磷酸二氢钙
    map: { revenue: null, cost: null, grossMargin: null },            // 磷酸一铵
    phosphateRock: { revenue: null, cost: null, grossMargin: null },  // 磷矿石
    phosphoricAcid: { revenue: null, cost: null, grossMargin: null } // 磷酸
  };
  
  // 从"分产品"表格中提取数据
  // 格式：分产品 \t饲料级磷酸二氢钙 \t营业收入 \t营业成本 \t毛利率
  // 或者：饲料级磷酸二氢钙 \t843,787,216.36 \t568,743,382.81 \t32.60%
  
  // 查找"分产品"表格区域
  const productTableIndex = text.indexOf('分产品');
  if (productTableIndex !== -1) {
    // 获取"分产品"表格附近5000字符的文本（扩大范围以包含所有产品）
    const productTableSection = text.substring(productTableIndex, productTableIndex + 5000);
    
    // 匹配饲料级磷酸二氢钙
    const feedGradeMCPPatterns = [
      /(?:分产品[^\d]*)?饲料级磷酸二氢钙[^\d]*([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)\s*%/g,
      /(?:分产品[^\d]*)?饲料级磷酸二氢钙[^\d]*([\d,，]+\.?\d*)[\s\t]+[\d,，]+\.?\d*%[^\d]*([\d,，]+\.?\d*)[\s\t]+[\d,，]+\.?\d*%[^\d]*([\d,，]+\.?\d*)\s*%/g,
      /饲料级磷酸二氢钙[\s\S]{0,200}?([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)\s*%/g
    ];
    
    for (const pattern of feedGradeMCPPatterns) {
      let match;
      while ((match = pattern.exec(productTableSection)) !== null) {
        const revenueValue = extractNumber(match[1] + '元');
        const costValue = extractNumber(match[2] + '元');
        const marginStr = match[3].replace(/[,，]/g, '');
        const marginValue = parseFloat(marginStr);
        
        if (revenueValue && revenueValue > 10000000 && costValue && costValue > 10000000) {
          result.feedGradeMCP.revenue = revenueValue;
          result.feedGradeMCP.cost = costValue;
          if (!isNaN(marginValue) && marginValue >= 0 && marginValue <= 100) {
            result.feedGradeMCP.grossMargin = marginValue;
          }
          break;
        }
      }
      if (result.feedGradeMCP.revenue) break;
    }
    
    // 匹配磷酸一铵
    const mapPatterns = [
      /(?:分产品[^\d]*)?磷酸一铵[^\d]*([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)\s*%/g,
      /(?:分产品[^\d]*)?磷酸一铵[^\d]*([\d,，]+\.?\d*)[\s\t]+[\d,，]+\.?\d*%[^\d]*([\d,，]+\.?\d*)[\s\t]+[\d,，]+\.?\d*%[^\d]*([\d,，]+\.?\d*)\s*%/g,
      /磷酸一铵[\s\S]{0,200}?([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)\s*%/g
    ];
    
    for (const pattern of mapPatterns) {
      let match;
      while ((match = pattern.exec(productTableSection)) !== null) {
        const revenueValue = extractNumber(match[1] + '元');
        const costValue = extractNumber(match[2] + '元');
        const marginStr = match[3].replace(/[,，]/g, '');
        const marginValue = parseFloat(marginStr);
        
        if (revenueValue && revenueValue > 10000000 && costValue && costValue > 10000000) {
          result.map.revenue = revenueValue;
          result.map.cost = costValue;
          if (!isNaN(marginValue) && marginValue >= 0 && marginValue <= 100) {
            result.map.grossMargin = marginValue;
          }
          break;
        }
      }
      if (result.map.revenue) break;
    }
    
    // 匹配磷矿石
    const phosphateRockPatterns = [
      /(?:分产品[^\d]*)?磷矿石[^\d]*([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)\s*%/g,
      /(?:分产品[^\d]*)?磷矿石[^\d]*([\d,，]+\.?\d*)[\s\t]+[\d,，]+\.?\d*%[^\d]*([\d,，]+\.?\d*)[\s\t]+[\d,，]+\.?\d*%[^\d]*([\d,，]+\.?\d*)\s*%/g,
      /磷矿石[\s\S]{0,200}?([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)\s*%/g
    ];
    
    for (const pattern of phosphateRockPatterns) {
      let match;
      while ((match = pattern.exec(productTableSection)) !== null) {
        const revenueValue = extractNumber(match[1] + '元');
        const costValue = extractNumber(match[2] + '元');
        const marginStr = match[3].replace(/[,，]/g, '');
        const marginValue = parseFloat(marginStr);
        
        if (revenueValue && revenueValue > 10000000 && costValue && costValue > 10000000) {
          result.phosphateRock.revenue = revenueValue;
          result.phosphateRock.cost = costValue;
          if (!isNaN(marginValue) && marginValue >= 0 && marginValue <= 100) {
            result.phosphateRock.grossMargin = marginValue;
          }
          break;
        }
      }
      if (result.phosphateRock.revenue) break;
    }
    
    // 匹配磷酸
    const phosphoricAcidPatterns = [
      /(?:分产品[^\d]*)?磷酸[^\d]*([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)\s*%/g,
      /(?:分产品[^\d]*)?磷酸[^\d]*([\d,，]+\.?\d*)[\s\t]+[\d,，]+\.?\d*%[^\d]*([\d,，]+\.?\d*)[\s\t]+[\d,，]+\.?\d*%[^\d]*([\d,，]+\.?\d*)\s*%/g,
      /磷酸[\s\S]{0,200}?([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)\s*%/g
    ];
    
    for (const pattern of phosphoricAcidPatterns) {
      let match;
      while ((match = pattern.exec(productTableSection)) !== null) {
        // 排除"饲料级磷酸二氢钙"和"磷酸一铵"的误匹配
        const beforeMatch = productTableSection.substring(0, match.index);
        if (beforeMatch.includes('饲料级') || beforeMatch.includes('一铵')) {
          continue;
        }
        
        const revenueValue = extractNumber(match[1] + '元');
        const costValue = extractNumber(match[2] + '元');
        const marginStr = match[3].replace(/[,，]/g, '');
        const marginValue = parseFloat(marginStr);
        
        if (revenueValue && revenueValue > 10000000 && costValue && costValue > 10000000) {
          result.phosphoricAcid.revenue = revenueValue;
          result.phosphoricAcid.cost = costValue;
          if (!isNaN(marginValue) && marginValue >= 0 && marginValue <= 100) {
            result.phosphoricAcid.grossMargin = marginValue;
          }
          break;
        }
      }
      if (result.phosphoricAcid.revenue) break;
    }
  }
  
  return result;
}

/**
 * 从文本中提取磷产品销售收入、成本和毛利
 * 优先从"分行业"表格中提取"磷化工"的数据
 */
function extractPhosphorusFinancials(text) {
  const result = {
    phosphorusRevenue: null,
    phosphorusCost: null,
    grossProfit: null,
    grossMargin: null  // 毛利率
  };
  
  // 优先从"分行业"表格中提取"磷化工"的数据（营业收入、营业成本、毛利率都在同一行）
  // 根据实际PDF文本，格式是：磷化工 3,127,388,431.01 2,269,609,525.65 27.43%
  // 需要匹配：磷化工后面跟着三个数字（营业收入、营业成本、毛利率），最后一个数字后面有%
  const patterns = [
    // 格式1：磷化工 后面直接跟三个大数字，用空格分隔，最后一个是百分比
    // 匹配：磷化工 3,127,388,431.01 2,269,609,525.65 27.43%
    /磷化工[\s\t]+([\d,，]{9,}\.?\d{0,2})[\s\t]+([\d,，]{9,}\.?\d{0,2})[\s\t]+([\d,，]*\.?\d{1,2})\s*%/,
    // 格式2：更宽松，允许中间有其他字符，但确保三个数字都是大数字（营业收入和成本）和小数字（毛利率）
    /磷化工[\s\S]{0,300}?([\d,，]{9,}\.?\d{0,2})[\s\S]{0,100}?([\d,，]{9,}\.?\d{0,2})[\s\S]{0,100}?([\d,，]*\.?\d{1,2})\s*%/
  ];
  
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      // 第一个数字是营业收入（元），第二个是营业成本（元），第三个是毛利率（%）
      const revenueValue = extractNumber(match[1] + '元');
      const costValue = extractNumber(match[2] + '元');
      const marginStr = match[3].replace(/[,，]/g, '');
      const marginValue = parseFloat(marginStr);
      
      // 验证数据合理性：
      // 1. 营收和成本应该大于1亿（100,000,000元）
      // 2. 营收应该大于成本（否则不合理）
      // 3. 毛利率应该在合理范围内（0-100%），且不应该太大（如果>50%可能是误匹配）
      if (revenueValue && revenueValue > 100000000 && 
          costValue && costValue > 100000000 &&
          revenueValue > costValue &&
          !isNaN(marginValue) && marginValue >= 0 && marginValue <= 100) {
        // 进一步验证：毛利率不应该太大（如果>50%，可能是误匹配了其他数据）
        // 根据图片，磷化工的毛利率是27.43%，所以应该在合理范围内
        if (marginValue <= 50) {
          result.phosphorusRevenue = revenueValue;
          result.phosphorusCost = costValue;
          result.grossMargin = marginValue;
          // 如果找到"分行业"表格中的数据，直接返回
          console.log(`  从"分行业"表格提取到磷化工数据: 营收${(revenueValue/100000000).toFixed(2)}亿元, 成本${(costValue/100000000).toFixed(2)}亿元, 毛利率${marginValue}%`);
          return result;
        }
      }
    }
  }
  
  // 如果"分行业"表格中没找到，再尝试从"分产品"表格中提取磷化工数据
  const productPattern = /分产品[^\d]*磷化工[^\d]*([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)\s*%/g;
  let productMatch;
  while ((productMatch = productPattern.exec(text)) !== null) {
    const revenueValue = extractNumber(productMatch[1] + '元');
    const costValue = extractNumber(productMatch[2] + '元');
    const marginStr = productMatch[3].replace(/[,，]/g, '');
    const marginValue = parseFloat(marginStr);
    
    if (revenueValue && revenueValue > 100000000 && costValue && costValue > 100000000) {
      result.phosphorusRevenue = revenueValue;
      result.phosphorusCost = costValue;
      if (!isNaN(marginValue) && marginValue >= 0 && marginValue <= 100) {
        result.grossMargin = marginValue;
      }
      return result;
    }
  }
  
  // 匹配格式：磷产品销售收入 \tXX \t亿元，磷产品销售成本 \tXX \t亿元，毛利 \tXX \t亿
  const pattern1 = /(?:磷产品|磷化工)销售收入[\s\t]+([\d,，]+\.?\d*)[\s\t]+亿元[，,]*[\s\t]*(?:磷产品|磷化工)销售成本[\s\t]+([\d,，]+\.?\d*)[\s\t]+亿元[，,]*[\s\t]*毛利[\s\t]+([\d,，]+\.?\d*)[\s\t]*亿/g;
  let match1 = pattern1.exec(text);
  if (match1) {
    result.phosphorusRevenue = extractNumber(match1[1] + '亿元');
    result.phosphorusCost = extractNumber(match1[2] + '亿元');
    result.grossProfit = extractNumber(match1[3] + '亿元');
    return result;
  }
  
  // 匹配格式：磷产品销售收入 \tXX \t亿元，磷产品销售成本 \tXX \t亿元
  const pattern2 = /磷产品销售收入[\s\t]+([\d,，]+\.?\d*)[\s\t]+亿元[，,]*[\s\t]*磷产品销售成本[\s\t]+([\d,，]+\.?\d*)[\s\t]+亿元/g;
  let match2 = pattern2.exec(text);
  if (match2) {
    result.phosphorusRevenue = extractNumber(match2[1] + '亿元');
    result.phosphorusCost = extractNumber(match2[2] + '亿元');
    if (result.phosphorusRevenue && result.phosphorusCost) {
      result.grossProfit = result.phosphorusRevenue - result.phosphorusCost;
    }
    return result;
  }
  
  // 格式3：其中磷产品销售收入 XX 亿元（半年报格式）
  if (!result.phosphorusRevenue) {
    const pattern5 = /(?:其中)?(?:磷产品|磷酸)销售收入[\s\t]+([\d,，]+\.?\d*)[\s\t]*亿元/g;
    let match5;
    while ((match5 = pattern5.exec(text)) !== null) {
      const value = extractNumber(match5[1] + '亿元');
      if (value && value > 10000000) {
        result.phosphorusRevenue = value;
        break;
      }
    }
  }
  
  // 格式4：磷产品销售成本 XX 亿元（半年报格式）
  if (!result.phosphorusCost) {
    const pattern6 = /(?:其中)?(?:磷产品|磷酸)销售成本[\s\t]+([\d,，]+\.?\d*)[\s\t]*亿元/g;
    let match6;
    while ((match6 = pattern6.exec(text)) !== null) {
      const value = extractNumber(match6[1] + '亿元');
      if (value && value > 10000000) {
        result.phosphorusCost = value;
        break;
      }
    }
  }
  
  // 格式5：从"分产品"表格中提取磷化工的营业收入、营业成本和毛利率（优先匹配磷化工）
  if (!result.phosphorusRevenue || !result.phosphorusCost || !result.grossMargin) {
    // 匹配"分产品"表格中的磷化工行（优先）
    const productTablePattern = /分产品[^\d]*磷化工[^\d]*([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)\s*%/g;
    let productMatch;
    while ((productMatch = productTablePattern.exec(text)) !== null) {
      // 第一个数字是营业收入（元），第二个是营业成本（元），第三个是毛利率（%）
      const revenueValue = extractNumber(productMatch[1] + '元');
      const costValue = extractNumber(productMatch[2] + '元');
      const marginStr = productMatch[3].replace(/[,，]/g, '');
      const marginValue = parseFloat(marginStr);
      
      if (revenueValue && revenueValue > 1000000000 && costValue && costValue > 1000000000) {
        if (!result.phosphorusRevenue) result.phosphorusRevenue = revenueValue;
        if (!result.phosphorusCost) result.phosphorusCost = costValue;
        if (!result.grossMargin && !isNaN(marginValue) && marginValue >= 0 && marginValue <= 100) {
          result.grossMargin = marginValue;
        }
        break;
      }
    }
  }
  
  // 格式6：磷产品销售收入（万元） XX,XXX.XX（表格格式）
  if (!result.phosphorusRevenue) {
    const pattern7a = /(?:磷产品|磷酸)销售收入\s*[（(]万元[）)]\s+([\d,，]+\.?\d*)/g;
    let match7a;
    while ((match7a = pattern7a.exec(text)) !== null) {
      const value = extractNumber(match7a[1] + '万元');
      if (value && value > 1000000) {
        result.phosphorusRevenue = value;
        break;
      }
    }
    if (!result.phosphorusRevenue) {
      const pattern7 = /(?:磷产品|磷酸)销售收入[\s\t]+([\d,，]+\.?\d*)[\s\t]*万元/g;
      let match7;
      while ((match7 = pattern7.exec(text)) !== null) {
        const value = extractNumber(match7[1] + '万元');
        if (value && value > 1000000) {
          result.phosphorusRevenue = value;
          break;
        }
      }
    }
  }
  
  // 格式7：磷产品销售成本（万元） XX,XXX.XX（表格格式）
  if (!result.phosphorusCost) {
    const pattern8a = /(?:磷产品|磷酸)销售成本\s*[（(]万元[）)]\s+([\d,，]+\.?\d*)/g;
    let match8a;
    while ((match8a = pattern8a.exec(text)) !== null) {
      const value = extractNumber(match8a[1] + '万元');
      if (value && value > 1000000) {
        result.phosphorusCost = value;
        break;
      }
    }
    if (!result.phosphorusCost) {
      const pattern8 = /(?:磷产品|磷酸)销售成本[\s\t]+([\d,，]+\.?\d*)[\s\t]*万元/g;
      let match8;
      while ((match8 = pattern8.exec(text)) !== null) {
        const value = extractNumber(match8[1] + '万元');
        if (value && value > 1000000) {
          result.phosphorusCost = value;
          break;
        }
      }
    }
  }
  
  // 单独匹配磷产品销售收入（兜底，亿元）
  if (!result.phosphorusRevenue) {
    const pattern3 = /(?:磷产品|磷酸)销售收入[\s\t]+([\d,，]+\.?\d*)[\s\t]*亿元/g;
    let match3 = pattern3.exec(text);
    if (match3) {
      const value = extractNumber(match3[1] + '亿元');
      if (value && value > 10000000) {
        result.phosphorusRevenue = value;
      }
    }
  }
  
  // 单独匹配磷产品销售成本（兜底，亿元）
  if (!result.phosphorusCost) {
    const pattern4 = /(?:磷产品|磷酸)销售成本[\s\t]+([\d,，]+\.?\d*)[\s\t]*亿元/g;
    let match4 = pattern4.exec(text);
    if (match4) {
      const value = extractNumber(match4[1] + '亿元');
      if (value && value > 10000000) {
        result.phosphorusCost = value;
      }
    }
  }
  
  // 如果都有，计算毛利
  if (result.phosphorusRevenue && result.phosphorusCost && !result.grossProfit) {
    result.grossProfit = result.phosphorusRevenue - result.phosphorusCost;
  }
  
  // 提取毛利率（从分产品表格中）
  const grossMarginPatterns = [
    /(?:磷产品|磷酸|磷化工)[^\d]*[\d,，]+\.?\d*[^\d]*[\d,，]+\.?\d*[^\d]*([\d,，]+\.?\d*)\s*%/g,
    /毛利率[\s\t]+([\d,，]+\.?\d*)\s*%[^\d]*(?:磷产品|磷酸)/g,
    /(?:磷产品|磷酸|磷化工)[^\d]*毛利率[\s\t]+([\d,，]+\.?\d*)\s*%/g,
    /分产品[^\d]*(?:磷产品|磷酸|磷化工)[\s\S]{0,500}毛利率[\s\t]+([\d,，]+\.?\d*)\s*%/g
  ];
  
  for (const pattern of grossMarginPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const marginStr = match[1].replace(/[,，]/g, '');
      const margin = parseFloat(marginStr);
      if (!isNaN(margin) && margin >= 0 && margin <= 100) {
        result.grossMargin = margin;
        break;
      }
    }
    if (result.grossMargin !== null) break;
  }
  
  // 不再计算毛利率，毛利率必须从PDF中提取（都在同一行）
  // 如果提取到营收和成本但没有毛利率，不计算，保持为null
  
  return result;
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
    const data = { text: textData.text };
    
    // 提取年份
    const yearMatch = data.text.match(/20\d{2}/);
    const year = yearMatch ? yearMatch[0] : null;
    
    console.log(`提取到年份: ${year || '未知'}`);
    console.log(`文本长度: ${data.text.length} 字符`);
    
    // 提取各类数据
    const extractedData = {
      year: year,
      filename: path.basename(filePath),
      cost: [],
      revenue: [],
      production: [],
      sales: [],
      inventory: [],
      grossMargin: null,  // 毛利率
      productSales: {
        feedGradeMCP: [],         // 饲料级磷酸二氢钙
        phosphoricAcid: [],        // 磷酸
        map: [],                   // 磷酸一铵
        phosphateRock: []         // 磷矿石
      },
      otherProducts: {
        fertilizer: { revenue: null, cost: null, grossMargin: null },  // 磷肥产品
        other: { revenue: null, cost: null, grossMargin: null }        // 其他产品
      }
    };
    
    // 提取成本相关数据
    for (const keyword of keywords.cost) {
      const results = extractDataByKeyword(data.text, keyword);
      extractedData.cost.push(...results);
    }
    
    // 提取营收相关数据
    for (const keyword of keywords.revenue) {
      const results = extractDataByKeyword(data.text, keyword);
      extractedData.revenue.push(...results);
    }
    
    // 提取产量相关数据
    for (const keyword of keywords.production) {
      const results = extractDataByKeyword(data.text, keyword);
      extractedData.production.push(...results);
    }
    
    // 提取销量相关数据
    for (const keyword of keywords.sales) {
      const results = extractDataByKeyword(data.text, keyword);
      extractedData.sales.push(...results);
    }
    
    // 提取库存相关数据（从"主要产品"表格中提取）
    extractInventoryFromMainProducts(data.text, extractedData);
    
    // 从"行业分类"表格中提取磷化工的销售量、生产量、库存量
    extractIndustryClassification(data.text, extractedData);
    
    // 提取分产品销量数据
    extractProductSales(data.text, extractedData);
    
    // 提取磷产品财务数据（销售收入、成本、毛利率）
    // 优先从"分行业"表格中提取"磷化工"的数据
    const phosphorusFinancials = extractPhosphorusFinancials(data.text);
    
    // 如果从"分行业"表格提取到了数据，优先使用
    if (phosphorusFinancials.phosphorusRevenue && phosphorusFinancials.phosphorusCost) {
      extractedData.revenue.push({
        keyword: '磷化工营业收入（分行业表格）',
        line: '从extractPhosphorusFinancials提取（分行业表格）',
        context: '从extractPhosphorusFinancials提取（分行业表格）',
        value: phosphorusFinancials.phosphorusRevenue,
        allValues: [phosphorusFinancials.phosphorusRevenue]
      });
      extractedData.cost.push({
        keyword: '磷化工营业成本（分行业表格）',
        line: '从extractPhosphorusFinancials提取（分行业表格）',
        context: '从extractPhosphorusFinancials提取（分行业表格）',
        value: phosphorusFinancials.phosphorusCost,
        allValues: [phosphorusFinancials.phosphorusCost]
      });
      if (phosphorusFinancials.grossMargin !== null) {
        extractedData.grossMargin = phosphorusFinancials.grossMargin;
      }
    } else {
      // 如果没从"分行业"表格提取到，再使用其他方法提取的数据
      if (phosphorusFinancials.phosphorusRevenue) {
        extractedData.revenue.push({
          keyword: '磷产品销售收入',
          line: '从extractPhosphorusFinancials提取',
          context: '从extractPhosphorusFinancials提取',
          value: phosphorusFinancials.phosphorusRevenue,
          allValues: [phosphorusFinancials.phosphorusRevenue]
        });
      }
      if (phosphorusFinancials.phosphorusCost) {
        extractedData.cost.push({
          keyword: '磷产品销售成本',
          line: '从extractPhosphorusFinancials提取',
          context: '从extractPhosphorusFinancials提取',
          value: phosphorusFinancials.phosphorusCost,
          allValues: [phosphorusFinancials.phosphorusCost]
        });
      }
      if (phosphorusFinancials.grossMargin !== null) {
        extractedData.grossMargin = phosphorusFinancials.grossMargin;
      }
    }
    
    // 提取所有产品的财务数据（四个分产品：饲料级磷酸二氢钙、磷酸一铵、磷矿石、磷酸）
    const allProductFinancials = extractAllProductFinancials(data.text);
    // 将四个分产品的财务数据存储到productSales中
    if (allProductFinancials.feedGradeMCP.revenue) {
      extractedData.productFinancials = extractedData.productFinancials || {};
      extractedData.productFinancials.feedGradeMCP = allProductFinancials.feedGradeMCP;
    }
    if (allProductFinancials.map.revenue) {
      extractedData.productFinancials = extractedData.productFinancials || {};
      extractedData.productFinancials.map = allProductFinancials.map;
    }
    if (allProductFinancials.phosphateRock.revenue) {
      extractedData.productFinancials = extractedData.productFinancials || {};
      extractedData.productFinancials.phosphateRock = allProductFinancials.phosphateRock;
    }
    if (allProductFinancials.phosphoricAcid.revenue) {
      extractedData.productFinancials = extractedData.productFinancials || {};
      extractedData.productFinancials.phosphoricAcid = allProductFinancials.phosphoricAcid;
    }
    
    return extractedData;
  } catch (error) {
    console.error(`解析 ${filePath} 时出错:`, error.message);
    return null;
  }
}

/**
 * 处理所有PDF文件
 */
async function processAllPDFs() {
  const reportDir = path.join(__dirname, '../stock/report_analysis/川恒股份');
  const files = fs.readdirSync(reportDir)
    .filter(f => f.toLowerCase().endsWith('.pdf'))
    .sort();
  
  console.log(`找到 ${files.length} 个PDF文件`);
  
  const allData = [];
  
  for (const file of files) {
    const filePath = path.join(reportDir, file);
    const data = await parsePDF(filePath);
    if (data) {
      allData.push(data);
    }
  }
  
  // 按年份排序
  allData.sort((a, b) => {
    if (a.year && b.year) {
      return parseInt(b.year) - parseInt(a.year);
    }
    return 0;
  });
  
  return allData;
}

/**
 * 提取主要数据值（取最大值或最相关的值）
 */
function getMainValue(results, preferKeyword = null) {
  if (!results || results.length === 0) return null;
  
  // 如果指定了优先关键词，先查找匹配的
  if (preferKeyword) {
    const preferredItems = results.filter(r => r.keyword && r.keyword.includes(preferKeyword));
    if (preferredItems.length > 0) {
      const preferredValues = preferredItems.map(r => r.value).filter(v => v !== null && v > 0);
      if (preferredValues.length > 0) {
        return Math.max(...preferredValues);
      }
    }
  }
  
  // 如果没有找到优先的，或没有指定优先关键词，取所有结果中的最大值
  const values = results.map(r => r.value).filter(v => v !== null && v > 0);
  if (values.length === 0) return null;
  
  return Math.max(...values);
}

/**
 * 生成数据摘要
 */
function generateSummary(allData) {
  const summary = [];
  
  for (const data of allData) {
    const year = data.year || '未知';
    
    // 优先从已提取的数据中查找"磷产品销售收入"和"磷产品销售成本"
    let phosphorusRevenue = null;
    let phosphorusCost = null;
    let grossProfit = null;
    
    // 从revenue中查找"磷化工营业收入（分行业表格）"（优先）
    for (const rev of data.revenue) {
      if (rev.line && rev.line.includes('分行业表格')) {
        phosphorusRevenue = rev.value;
        break;
      }
    }
    // 如果没找到，再查找"磷产品销售收入"
    if (!phosphorusRevenue) {
      for (const rev of data.revenue) {
        if (rev.line === '从extractPhosphorusFinancials提取') {
          phosphorusRevenue = rev.value;
          break;
        }
      }
    }
    if (!phosphorusRevenue) {
      for (const rev of data.revenue) {
        if (rev.keyword === '磷产品销售收入' || rev.line.includes('磷产品销售收入')) {
          phosphorusRevenue = rev.value;
          break;
        }
        if (rev.line.includes('磷产品销售收入')) {
          let match = rev.line.match(/磷产品销售收入[\s\t]+([\d,，]+\.?\d*)[\s\t]*万元/);
          if (match) {
            const value = extractNumber(match[1] + '万元');
            if (value && value > 1000000) {
              phosphorusRevenue = value;
              break;
            }
          }
          match = rev.line.match(/磷产品销售收入[\s\t]+([\d,，]+\.?\d*)[\s\t]*亿元/);
          if (match) {
            const value = extractNumber(match[1] + '亿元');
            if (value && value > 10000000) {
              phosphorusRevenue = value;
              break;
            }
          }
        }
      }
    }
    
    // 从cost中查找"磷化工营业成本（分行业表格）"（优先）
    for (const c of data.cost) {
      if (c.line && c.line.includes('分行业表格')) {
        phosphorusCost = c.value;
        break;
      }
    }
    // 如果没找到，再查找"磷产品销售成本"
    if (!phosphorusCost) {
      for (const c of data.cost) {
        if (c.keyword === '磷产品销售成本' && c.line.includes('从extractPhosphorusFinancials提取')) {
          phosphorusCost = c.value;
          break;
        }
      }
    }
    if (!phosphorusCost) {
      for (const c of data.cost) {
        if (c.keyword === '磷产品销售成本') {
          phosphorusCost = c.value;
          break;
        }
      }
    }
    if (!phosphorusCost) {
      for (const c of data.cost) {
        if (c.line.includes('磷产品销售成本')) {
          let match = c.line.match(/磷产品销售成本[\s\t]+([\d,，]+\.?\d*)[\s\t]*万元/);
          if (match) {
            const value = extractNumber(match[1] + '万元');
            if (value && value > 1000000) {
              phosphorusCost = value;
              break;
            }
          }
          match = c.line.match(/磷产品销售成本[\s\t]+([\d,，]+\.?\d*)[\s\t]*亿元/);
          if (match) {
            const value = extractNumber(match[1] + '亿元');
            if (value && value > 10000000) {
              phosphorusCost = value;
              break;
            }
          }
        }
      }
    }
    
    // 如果还没找到，使用默认值
    if (!phosphorusRevenue) {
      phosphorusRevenue = getMainValue(data.revenue);
    }
    if (!phosphorusCost) {
      phosphorusCost = getMainValue(data.cost);
    }
    if (!grossProfit && phosphorusRevenue && phosphorusCost) {
      grossProfit = phosphorusRevenue - phosphorusCost;
    }
    
    // 优先从"行业分类"表格中提取磷化工的产量、销量、库存量
    let production = getMainValue(data.production, '行业分类-磷化工生产量');
    let sales = getMainValue(data.sales, '行业分类-磷化工销售量');
    let inventory = getMainValue(data.inventory, '行业分类-磷化工库存量');
    
    // 如果没找到"行业分类"的数据，再尝试"主要产品"表格
    if (!production) {
      const productionItems = data.production.filter(p => 
        p.keyword && p.keyword.includes('主要产品') && 
        p.line && p.line.includes('万吨') &&
        !p.line.includes('%') && 
        p.value && p.value >= 0.5
      );
      if (productionItems.length > 0) {
        production = Math.max(...productionItems.map(p => p.value));
      }
    }
    
    if (!sales) {
      const salesItems = data.sales.filter(s => 
        s.keyword && s.keyword.includes('主要产品') && 
        s.line && s.line.includes('万吨') &&
        !s.line.includes('%') && 
        s.value && s.value >= 0.5
      );
      if (salesItems.length > 0) {
        sales = Math.max(...salesItems.map(s => s.value));
      }
    }
    
    if (!inventory) {
      inventory = getMainValue(data.inventory, '主要产品');
    }
    
    // 如果还没找到，再尝试其他来源
    if (!production) {
      const otherProductionItems = data.production.filter(p => 
        p.line && p.line.includes('万吨') &&
        !p.line.includes('%') && 
        p.value && p.value >= 0.5
      );
      if (otherProductionItems.length > 0) {
        production = Math.max(...otherProductionItems.map(p => p.value));
      }
    }
    
    if (!sales) {
      const otherSalesItems = data.sales.filter(s => 
        s.line && s.line.includes('万吨') &&
        !s.line.includes('%') && 
        s.value && s.value >= 0.5
      );
      if (otherSalesItems.length > 0) {
        sales = Math.max(...otherSalesItems.map(s => s.value));
      }
    }
    
    // 数据合理性验证
    if (production && (production > 100000 || production < 0.5)) {
      console.log(`  ⚠️  产量数据异常 (${production.toFixed(2)}万吨)，已清空`);
      production = null;
    }
    
    if (sales && (sales > 100000 || sales < 0.5)) {
      console.log(`  ⚠️  销量数据异常 (${sales.toFixed(2)}万吨)，已清空`);
      sales = null;
    }
    
    if (phosphorusRevenue && phosphorusRevenue > 50000000000) {
      console.log(`  ⚠️  营收数据异常 (${(phosphorusRevenue/100000000).toFixed(2)}亿元)，可能是总营收而非磷产品营收`);
    }
    
    // 提取分产品销量
    const feedGradeMCP = getMainValue(data.productSales.feedGradeMCP);
    const phosphoricAcid = getMainValue(data.productSales.phosphoricAcid);
    const map = getMainValue(data.productSales.map);
    const phosphateRock = getMainValue(data.productSales.phosphateRock);
    
    // 提取分产品财务数据
    const productFinancials = data.productFinancials || {};
    
    summary.push({
      year: year,
      filename: data.filename,
      cost: phosphorusCost,
      revenue: phosphorusRevenue,
      production: production,
      sales: sales,
      inventory: inventory,
      grossMargin: data.grossMargin !== null ? data.grossMargin : null,
      productSales: {
        feedGradeMCP: feedGradeMCP,
        phosphoricAcid: phosphoricAcid,
        map: map,
        phosphateRock: phosphateRock
      },
      productFinancials: {
        feedGradeMCP: productFinancials.feedGradeMCP || { revenue: null, cost: null, grossMargin: null },
        map: productFinancials.map || { revenue: null, cost: null, grossMargin: null },
        phosphateRock: productFinancials.phosphateRock || { revenue: null, cost: null, grossMargin: null },
        phosphoricAcid: productFinancials.phosphoricAcid || { revenue: null, cost: null, grossMargin: null }
      }
    });
  }
  
  return summary;
}

/**
 * 主函数
 */
async function main() {
  console.log('开始解析川恒股份年报PDF文件...\n');
  
  const allData = await processAllPDFs();
  
  if (allData.length === 0) {
    console.log('未找到任何数据');
    return;
  }
  
  const summary = generateSummary(allData);
  
  // 输出摘要
  console.log('\n=== 数据摘要 ===');
  summary.forEach(item => {
    console.log(`\n${item.year}年 (${item.filename}):`);
    console.log(`  成本: ${item.cost ? (item.cost / 100000000).toFixed(2) + '亿元' : '未找到'}`);
    console.log(`  营收: ${item.revenue ? (item.revenue / 100000000).toFixed(2) + '亿元' : '未找到'}`);
    console.log(`  产量: ${item.production ? item.production.toFixed(2) + '万吨' : '未找到'}`);
    console.log(`  销量: ${item.sales ? item.sales.toFixed(2) + '万吨' : '未找到'}`);
    console.log(`  库存: ${item.inventory ? item.inventory.toFixed(2) + '万吨' : '未找到'}`);
    console.log(`  毛利率: ${item.grossMargin !== null && item.grossMargin !== undefined ? item.grossMargin.toFixed(2) + '%' : '未找到'}`);
    if (item.productSales) {
      console.log(`  分产品销量:`);
      console.log(`    饲料级磷酸二氢钙: ${item.productSales.feedGradeMCP ? item.productSales.feedGradeMCP.toFixed(2) + '万吨' : '未找到'}`);
      console.log(`    磷酸: ${item.productSales.phosphoricAcid ? item.productSales.phosphoricAcid.toFixed(2) + '万吨' : '未找到'}`);
      console.log(`    磷酸一铵: ${item.productSales.map ? item.productSales.map.toFixed(2) + '万吨' : '未找到'}`);
      console.log(`    磷矿石: ${item.productSales.phosphateRock ? item.productSales.phosphateRock.toFixed(2) + '万吨' : '未找到'}`);
    }
    if (item.productFinancials) {
      console.log(`  分产品财务数据:`);
      if (item.productFinancials.feedGradeMCP && item.productFinancials.feedGradeMCP.revenue) {
        console.log(`    饲料级磷酸二氢钙: 营收${(item.productFinancials.feedGradeMCP.revenue/100000000).toFixed(2)}亿元, 成本${(item.productFinancials.feedGradeMCP.cost/100000000).toFixed(2)}亿元, 毛利率${item.productFinancials.feedGradeMCP.grossMargin ? item.productFinancials.feedGradeMCP.grossMargin.toFixed(2) + '%' : '未找到'}`);
      }
      if (item.productFinancials.map && item.productFinancials.map.revenue) {
        console.log(`    磷酸一铵: 营收${(item.productFinancials.map.revenue/100000000).toFixed(2)}亿元, 成本${(item.productFinancials.map.cost/100000000).toFixed(2)}亿元, 毛利率${item.productFinancials.map.grossMargin ? item.productFinancials.map.grossMargin.toFixed(2) + '%' : '未找到'}`);
      }
      if (item.productFinancials.phosphateRock && item.productFinancials.phosphateRock.revenue) {
        console.log(`    磷矿石: 营收${(item.productFinancials.phosphateRock.revenue/100000000).toFixed(2)}亿元, 成本${(item.productFinancials.phosphateRock.cost/100000000).toFixed(2)}亿元, 毛利率${item.productFinancials.phosphateRock.grossMargin ? item.productFinancials.phosphateRock.grossMargin.toFixed(2) + '%' : '未找到'}`);
      }
      if (item.productFinancials.phosphoricAcid && item.productFinancials.phosphoricAcid.revenue) {
        console.log(`    磷酸: 营收${(item.productFinancials.phosphoricAcid.revenue/100000000).toFixed(2)}亿元, 成本${(item.productFinancials.phosphoricAcid.cost/100000000).toFixed(2)}亿元, 毛利率${item.productFinancials.phosphoricAcid.grossMargin ? item.productFinancials.phosphoricAcid.grossMargin.toFixed(2) + '%' : '未找到'}`);
      }
    }
  });
  
  // 保存为JSON文件
  const outputPath = path.join(__dirname, '../stock/report_analysis/川恒股份/chuanheng_data.json');
  fs.writeFileSync(outputPath, JSON.stringify({ allData, summary }, null, 2), 'utf8');
  console.log(`\n数据已保存到: ${outputPath}`);
  
  return { allData, summary };
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { parsePDF, processAllPDFs, generateSummary };

