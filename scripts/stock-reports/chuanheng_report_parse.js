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
      // 注意：此函数只在年度报告中调用，所以生产量、库存量都是年度报告数据
      const productionStr = match[1].replace(/[,，]/g, '');
      const salesStr = match[2].replace(/[,，]/g, '');
      const inventoryStr = match[3].replace(/[,，]/g, '');

      const production = parseFloat(productionStr);
      const sales = parseFloat(salesStr);
      const inventory = parseFloat(inventoryStr);

      // 数据合理性验证：产量和销量应该在合理范围内（0-10000万吨）
      // 同时验证：产量和销量不能是百分比（不能小于1，除非是小数如0.5万吨）
      // 年度报告的产量和销量通常应该在几十到几百万吨之间
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
      // 如果关键词是"成本"或"营业成本"，排除"营业总成本"
      if ((keyword === '成本' || keyword === '营业成本') && line.includes('营业总成本')) {
        continue;
      }
      // 如果关键词是"营收"或"营业收入"，排除"营业总收入"
      if ((keyword === '营收' || keyword === '营业收入') && line.includes('营业总收入')) {
        continue;
      }
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
function extractIndustryClassification(text, extractedData, isAnnualReport = false) {
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

  // 生产量（仅年度报告有此数据）
  if (isAnnualReport) {
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
  }

  // 库存量（仅年度报告有此数据）
  if (isAnnualReport) {
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
}

/**
 * 从"分产品"表格中提取所有产品的财务数据（营收、成本、毛利率）
 * 五个产品：饲料级磷酸二氢钙、磷酸一铵、磷矿石、磷酸、磷酸铁
 */
function extractAllProductFinancials(text) {
  const result = {
    feedGradeMCP: { revenue: null, cost: null, grossMargin: null },  // 饲料级磷酸二氢钙
    map: { revenue: null, cost: null, grossMargin: null },            // 磷酸一铵
    phosphateRock: { revenue: null, cost: null, grossMargin: null },  // 磷矿石
    phosphoricAcid: { revenue: null, cost: null, grossMargin: null }, // 磷酸
    ironPhosphate: { revenue: null, cost: null, grossMargin: null }   // 磷酸铁
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

    // 匹配磷酸铁（参考磷酸一铵）
    // 磷酸铁仅在其占营收≥10%（达到披露门槛）时进入"营业成本"分产品表（如2026年上半年），
    // 此时"营业成本"表行格式为：磷酸铁 营收 成本 毛利率%（与磷酸一铵完全一致）；
    // 其余年份仅"营业收入构成"分产品表披露营收（成本/毛利率未单列），故只取营收。
    const ironPhosphatePattern = /(?:分产品[^\d]*)?磷酸铁(?!锂)[^\d]*([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)\s*%/g;
    let ironPhosphateMatch;
    while ((ironPhosphateMatch = ironPhosphatePattern.exec(productTableSection)) !== null) {
      const revenueValue = extractNumber(ironPhosphateMatch[1] + '元');
      const costValue = extractNumber(ironPhosphateMatch[2] + '元');
      const marginStr = ironPhosphateMatch[3].replace(/[,，]/g, '');
      const marginValue = parseFloat(marginStr);

      if (revenueValue && revenueValue > 10000000 && costValue && costValue > 10000000) {
        result.ironPhosphate.revenue = revenueValue;
        result.ironPhosphate.cost = costValue;
        if (!isNaN(marginValue) && marginValue >= 0 && marginValue <= 100) {
          result.ironPhosphate.grossMargin = marginValue;
        }
        break;
      }
    }

    // 若"营业成本"表未单列磷酸铁（未达10%披露门槛），回退从"营业收入构成"表取营收
    if (!result.ironPhosphate.revenue) {
      const ironPhosphateRevenuePattern = /磷酸铁(?!锂)[^\d]*([\d,，]+\.?\d*)/g;
      let ironPhosphateRevenueMatch;
      while ((ironPhosphateRevenueMatch = ironPhosphateRevenuePattern.exec(productTableSection)) !== null) {
        const revenueValue = extractNumber(ironPhosphateRevenueMatch[1] + '元');
        // 阈值放宽到100万：磷酸铁2022年刚投产，全年营收仅约134万元，远低于磷酸一铵的1000万门槛
        if (revenueValue && revenueValue > 1000000) {
          result.ironPhosphate.revenue = revenueValue;
          break;
        }
      }
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

    // 匹配磷酸（需要更严格的匹配，避免匹配到"饲料级磷酸二氢钙"）
    // 策略：优先匹配标准格式（营收 成本 毛利率%），然后检查行文本排除误匹配
    // 标准格式：磷酸 954,641,684.47 774,363,662.32 18.88%
    // 非标准格式：磷酸 954,641,684.47 28.41% 747,816,169.60 30.10% 27.66%

    // 优先匹配标准格式：磷酸 营收 成本 毛利率%
    const standardPattern = /(?:^|[\n\r])(?!.*饲料级)(?!.*一铵)(?!.*二氢钙)(?!.*磷酸铁)磷酸[^\d]*([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)\s*%/gm;
    let match = standardPattern.exec(productTableSection);
    if (match) {
      const lineStart = productTableSection.lastIndexOf('\n', match.index);
      const lineEnd = productTableSection.indexOf('\n', match.index + match[0].length);
      const lineText = productTableSection.substring(
        lineStart < 0 ? 0 : lineStart,
        lineEnd < 0 ? productTableSection.length : lineEnd
      );

      // 检查行文本，确保不包含"饲料级"、"一铵"、"二氢钙"、"磷酸铁"
      if (!lineText.includes('饲料级') && !lineText.includes('一铵') && !lineText.includes('二氢钙') && !lineText.includes('磷酸铁')) {
        const revenueValue = extractNumber(match[1] + '元');
        const costValue = extractNumber(match[2] + '元');
        const marginStr = match[3].replace(/[,，]/g, '');
        const marginValue = parseFloat(marginStr);

        if (revenueValue && revenueValue > 10000000 && costValue && costValue > 10000000) {
          // 验证：如果营收等于已提取的饲料级磷酸二氢钙的营收，说明匹配错了
          if (!result.feedGradeMCP.revenue || Math.abs(revenueValue - result.feedGradeMCP.revenue) >= 1000) {
            result.phosphoricAcid.revenue = revenueValue;
            result.phosphoricAcid.cost = costValue;
            if (!isNaN(marginValue) && marginValue >= 0 && marginValue <= 100) {
              result.phosphoricAcid.grossMargin = marginValue;
            }
          }
        }
      }
    }

    // 如果标准格式没匹配到，尝试其他格式
    if (!result.phosphoricAcid.revenue) {
      const phosphoricAcidPatterns = [
        /(?:分产品[^\d]*)?磷酸[^\d]*([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)\s*%/g,
        /(?:分产品[^\d]*)?磷酸[^\d]*([\d,，]+\.?\d*)[\s\t]+[\d,，]+\.?\d*%[^\d]*([\d,，]+\.?\d*)[\s\t]+[\d,，]+\.?\d*%[^\d]*([\d,，]+\.?\d*)\s*%/g,
        /磷酸[\s\S]{0,200}?([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)\s*%/g
      ];

      for (const pattern of phosphoricAcidPatterns) {
        let match;
        while ((match = pattern.exec(productTableSection)) !== null) {
          // 获取匹配行的完整文本
          const lineStart = productTableSection.lastIndexOf('\n', match.index);
          const lineEnd = productTableSection.indexOf('\n', match.index + match[0].length);
          const lineText = productTableSection.substring(
            lineStart < 0 ? 0 : lineStart,
            lineEnd < 0 ? productTableSection.length : lineEnd
          );

          // 检查行文本，排除误匹配
          if (lineText.includes('饲料级') || lineText.includes('一铵') || lineText.includes('二氢钙') || lineText.includes('磷酸铁')) {
            continue;
          }

          const revenueValue = extractNumber(match[1] + '元');
          const costValue = extractNumber(match[2] + '元');
          const marginStr = match[3].replace(/[,，]/g, '');
          const marginValue = parseFloat(marginStr);

          if (revenueValue && revenueValue > 10000000 && costValue && costValue > 10000000) {
            // 验证：如果营收等于已提取的饲料级磷酸二氢钙的营收，说明匹配错了
            if (!result.feedGradeMCP.revenue || Math.abs(revenueValue - result.feedGradeMCP.revenue) >= 1000) {
              result.phosphoricAcid.revenue = revenueValue;
              result.phosphoricAcid.cost = costValue;
              if (!isNaN(marginValue) && marginValue >= 0 && marginValue <= 100) {
                result.phosphoricAcid.grossMargin = marginValue;
              }
              break;
            }
          }
        }
        if (result.phosphoricAcid.revenue) break;
      }
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

    // 提取库存相关数据（仅年报有此数据，不包括半年度报告和季度报告）
    const isAnnualReport = extractedData.filename && extractedData.filename.match(/\d{4}年年度报告/);

    // 提取产量相关数据（仅年报有此数据，不包括半年度报告和季度报告）
    if (isAnnualReport) {
      for (const keyword of keywords.production) {
        const results = extractDataByKeyword(data.text, keyword);
        extractedData.production.push(...results);
      }
    }

    // 提取销量相关数据
    for (const keyword of keywords.sales) {
      const results = extractDataByKeyword(data.text, keyword);
      extractedData.sales.push(...results);
    }

    // 提取库存相关数据（仅年报有此数据）
    if (isAnnualReport) {
      extractInventoryFromMainProducts(data.text, extractedData);
    }

    // 从"行业分类"表格中提取磷化工的销售量、生产量、库存量
    // 注意：生产量和库存量只在年度报告中提取
    extractIndustryClassification(data.text, extractedData, isAnnualReport);

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

    // 提取所有产品的财务数据（五个分产品：饲料级磷酸二氢钙、磷酸一铵、磷矿石、磷酸、磷酸铁）
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
    if (allProductFinancials.ironPhosphate.revenue) {
      extractedData.productFinancials = extractedData.productFinancials || {};
      extractedData.productFinancials.ironPhosphate = allProductFinancials.ironPhosphate;
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
  const reportDir = path.join(__dirname, '../../stock/report_analysis/川恒股份');
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
    const isAnnualReport = data.filename && data.filename.match(/\d{4}年年度报告/);

    // 优先从已提取的数据中查找整体的"营业收入"和"营业成本"（不是"分行业"表格中的"磷化工"数据）
    let phosphorusRevenue = null;
    let phosphorusCost = null;
    let grossProfit = null;

    // 如果是年报，优先从"合并利润表"中提取"营业收入"和"营业成本"
    if (isAnnualReport) {
      // 查找合并利润表中的"营业收入"（"其中: 营业收入"）
      // 识别特征：行内容包含"其中：营业收入"或"其中: 营业收入"，且上下文包含"一、营业总收入"（合并利润表的特征）
      for (const rev of data.revenue) {
        const line = rev.line || '';
        const context = rev.context || '';
        const keyword = rev.keyword || '';
        const fullText = line + ' ' + context;
        // 优先匹配合并利润表中的"其中: 营业收入"
        // 特征1：行内容包含"其中：营业收入"或"其中: 营业收入"
        // 特征2：上下文包含"一、营业总收入"（这是合并利润表的特征，区别于母公司利润表）
        // 特征3：或者上下文包含"合并利润表"或"3、合并利润表"
        if (keyword === '营业收入' && 
            rev.value && rev.value > 1000000000 &&
            (line.includes('其中：营业收入') || line.includes('其中: 营业收入')) &&
            (fullText.includes('一、营业总收入') || 
             fullText.includes('合并利润表') || 
             fullText.includes('3、合并利润表') ||
             (fullText.includes('利润表') && !fullText.includes('母公司利润表')))) {
          phosphorusRevenue = rev.value;
          console.log(`  从合并利润表提取到营业收入: ${(rev.value/100000000).toFixed(2)}亿元`);
          break;
        }
      }
      
      // 查找合并利润表中的"营业成本"（"其中: 营业成本"）
      // 识别特征：行内容包含"其中：营业成本"或"其中: 营业成本"，且上下文包含"二、营业总成本"（合并利润表的特征）
      for (const c of data.cost) {
        const line = c.line || '';
        const context = c.context || '';
        const keyword = c.keyword || '';
        const fullText = line + ' ' + context;
        // 优先匹配合并利润表中的"其中: 营业成本"
        // 特征1：行内容包含"其中：营业成本"或"其中: 营业成本"
        // 特征2：上下文包含"二、营业总成本"（这是合并利润表的特征，区别于母公司利润表）
        // 特征3：或者上下文包含"合并利润表"或"3、合并利润表"
        if (keyword === '营业成本' && 
            c.value && c.value > 1000000000 &&
            (line.includes('其中：营业成本') || line.includes('其中: 营业成本')) &&
            (fullText.includes('二、营业总成本') || 
             fullText.includes('合并利润表') || 
             fullText.includes('3、合并利润表') ||
             (fullText.includes('利润表') && !fullText.includes('母公司利润表')))) {
          phosphorusCost = c.value;
          console.log(`  从合并利润表提取到营业成本: ${(c.value/100000000).toFixed(2)}亿元`);
          break;
        }
      }
    }

    // 如果年报没找到，或者不是年报，继续查找其他来源的"营业收入"
    if (!phosphorusRevenue) {
      // 查找整体的"营业收入"：优先使用行内容格式为"营业收入 3,360,414,277.16"这样的数据
      for (const rev of data.revenue) {
        const line = rev.line || '';
        const keyword = rev.keyword || '';
      // 优先使用：关键词为"营业收入"，行内容包含"营业收入"后跟大数字，且不包含"分行业"、"磷化工"、"营业总收入"
      if (keyword === '营业收入' && 
          rev.value && rev.value > 1000000000 && // 确保是大数字（大于10亿）
          !line.includes('营业总收入') && 
          !line.includes('分行业') &&
          !line.includes('分行业表格') &&
          !line.includes('磷化工') &&
          !keyword.includes('分行业表格')) {
        // 进一步验证：行内容应该是"营业收入 数字"的格式，而不是其他格式
        if (line.match(/营业收入[\s\t]+[\d,，]{9,}/) || 
            line.match(/营业收入[（(]元[）)][\s\t]+[\d,，]{9,}/) ||
            line.match(/营业收入合计[\s\t]+[\d,，]{9,}/) ||
            line.match(/其中：营业收入[\s\t]+[\d,，]{9,}/) ||
            line.match(/其中: 营业收入[\s\t]+[\d,，]{9,}/)) {
          phosphorusRevenue = rev.value;
          break;
        }
      }
      }
    }
    
    // 如果没找到，再查找其他符合条件的"营业收入"数据
    if (!phosphorusRevenue) {
      const filteredRevenues = data.revenue.filter(r => {
        const line = r.line || '';
        const keyword = r.keyword || '';
        return r.value && r.value > 1000000000 && // 确保是大数字
               !line.includes('营业总收入') && 
               !keyword.includes('营业总收入') &&
               !line.includes('分行业表格') &&
               !keyword.includes('分行业表格') &&
               !line.includes('分行业') &&
               !line.includes('磷化工');
      });
      // 优先使用关键词为"营业收入"的数据
      const revenueItems = filteredRevenues.filter(r => r.keyword === '营业收入');
      if (revenueItems.length > 0) {
        phosphorusRevenue = getMainValue(revenueItems);
      } else {
        phosphorusRevenue = getMainValue(filteredRevenues);
      }
    }

    // 如果年报没找到，或者不是年报，继续查找其他来源的"营业成本"
    if (!phosphorusCost) {
      // 查找整体的"营业成本"：优先使用行内容格式为"营业成本 2,313,388,366.97"这样的数据
      for (const c of data.cost) {
        const line = c.line || '';
        const keyword = c.keyword || '';
        // 优先使用：关键词为"营业成本"，行内容包含"营业成本"后跟大数字，且不包含"分行业"、"磷化工"、"营业总成本"
        if (keyword === '营业成本' && 
            c.value && c.value > 1000000000 && // 确保是大数字（大于10亿）
            !line.includes('营业总成本') && 
            !line.includes('分行业') &&
            !line.includes('分行业表格') &&
            !line.includes('磷化工') &&
            !keyword.includes('分行业表格')) {
          // 进一步验证：行内容应该是"营业成本 数字"的格式
          if (line.match(/营业成本[\s\t]+[\d,，]{9,}/) || 
              line.match(/其中：营业成本[\s\t]+[\d,，]{9,}/) ||
              line.match(/其中: 营业成本[\s\t]+[\d,，]{9,}/)) {
            phosphorusCost = c.value;
            break;
          }
        }
      }
    }
    
    // 如果没找到，再查找其他符合条件的"营业成本"数据
    if (!phosphorusCost) {
      const filteredCosts = data.cost.filter(c => {
        const line = c.line || '';
        const keyword = c.keyword || '';
        return c.value && c.value > 1000000000 && // 确保是大数字
               !line.includes('营业总成本') && 
               !keyword.includes('营业总成本') &&
               !line.includes('分行业表格') &&
               !keyword.includes('分行业表格') &&
               !line.includes('分行业') &&
               !line.includes('磷化工');
      });
      // 优先使用关键词为"营业成本"的数据
      const costItems = filteredCosts.filter(c => c.keyword === '营业成本');
      if (costItems.length > 0) {
        phosphorusCost = getMainValue(costItems);
      } else {
        phosphorusCost = getMainValue(filteredCosts);
      }
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
        phosphoricAcid: productFinancials.phosphoricAcid || { revenue: null, cost: null, grossMargin: null },
        ironPhosphate: productFinancials.ironPhosphate || { revenue: null, cost: null, grossMargin: null }
      }
    });
  }

  return summary;
}

/**
 * 从文件名解析报告期（与 jinkong_report_parse / zijin_report_parse 一致）
 * @param {string} filename
 * @param {string|number} year
 * @returns {string|null}
 */
function getPeriodFromFilename(filename, year) {
  if (!filename) return null;
  const y = String(year);
  if (filename.includes('第一季度')) {
    return `${y}年1-3月`;
  }
  if (filename.includes('半年度') || filename.includes('半年')) {
    return `${y}年上半年`;
  }
  if (filename.includes('第三季度')) {
    return `${y}年1-9月`;
  }
  if ((filename.includes('年度报告') || filename.includes('年报')) && !filename.includes('半年度')) {
    return `${y}年全年`;
  }
  return null;
}

/** 报告期排序权重：与现有 chuanheng_data_corrected.json 展示顺序一致（同年份内由大到小） */
function periodEndRank(period) {
  if (!period) return 0;
  if (period.includes('全年')) return 12;
  if (period.includes('1-9月')) return 9;
  if (period.includes('上半年')) return 6;
  if (period.includes('1-3月')) return 3;
  return 0;
}

function emptyProductFinancials() {
  return {
    feedGradeMCP: { revenue: null, cost: null, grossMargin: null },
    map: { revenue: null, cost: null, grossMargin: null },
    phosphateRock: { revenue: null, cost: null, grossMargin: null },
    phosphoricAcid: { revenue: null, cost: null, grossMargin: null },
    ironPhosphate: { revenue: null, cost: null, grossMargin: null }
  };
}

/**
 * 将 generateSummary 的一条记录转为修正表结构（磷化工营收/成本为亿元）
 * @param {object} item
 * @returns {object|null}
 */
function buildCorrectedItemFromRaw(item) {
  const yearStr = String(item.year);
  const period = getPeriodFromFilename(item.filename, yearStr);
  if (!period) return null;

  const pf = emptyProductFinancials();
  const src = item.productFinancials || {};
  for (const key of Object.keys(pf)) {
    if (src[key]) {
      pf[key].revenue = src[key].revenue != null ? src[key].revenue : null;
      pf[key].cost = src[key].cost != null ? src[key].cost : null;
      pf[key].grossMargin = src[key].grossMargin != null ? src[key].grossMargin : null;
    }
  }

  const ps = item.productSales || {};
  return {
    period,
    year: yearStr,
    filename: item.filename,
    phosphorus: {
      production: item.production ?? null,
      sales: item.sales ?? null,
      inventory: item.inventory ?? null,
      revenue: item.revenue != null ? item.revenue / 100000000 : null,
      cost: item.cost != null ? item.cost / 100000000 : null,
      unitPrice: null,
      unitCost: null,
      unitGrossProfit: null,
      grossMargin: item.grossMargin != null ? item.grossMargin : null,
      _corrected: false,
      _verified: false,
      _notes: null
    },
    productSales: {
      feedGradeMCP: ps.feedGradeMCP ?? null,
      phosphoricAcid: ps.phosphoricAcid ?? null,
      map: ps.map ?? null,
      phosphateRock: ps.phosphateRock ?? null
    },
    productFinancials: pf
  };
}

/**
 * 智能合并：保留 phosphorus._corrected 及分产品 _corrected，只向空字段填入新提取值
 * @param {object} existing
 * @param {object} incoming
 * @returns {boolean} 是否有字段被更新
 */
function smartMergeChuanheng(existing, incoming) {
  let updated = false;

  if (existing.phosphorus && !existing.phosphorus._corrected) {
    const fields = [
      'production',
      'sales',
      'inventory',
      'revenue',
      'cost',
      'unitPrice',
      'unitCost',
      'unitGrossProfit',
      'grossMargin'
    ];
    for (const f of fields) {
      if (existing.phosphorus[f] == null && incoming.phosphorus[f] != null) {
        existing.phosphorus[f] = incoming.phosphorus[f];
        updated = true;
      }
    }
    if (incoming.filename && existing.filename !== incoming.filename) {
      existing.filename = incoming.filename;
      updated = true;
    }
  }

  const psKeys = ['feedGradeMCP', 'phosphoricAcid', 'map', 'phosphateRock'];
  for (const k of psKeys) {
    if (existing.productSales[k] == null && incoming.productSales[k] != null) {
      existing.productSales[k] = incoming.productSales[k];
      updated = true;
    }
  }

  const finKeys = ['feedGradeMCP', 'map', 'phosphateRock', 'phosphoricAcid', 'ironPhosphate'];
  for (const k of finKeys) {
    const ex = existing.productFinancials[k];
    const inc = incoming.productFinancials[k];
    if (!ex || ex._corrected) continue;
    for (const f of ['revenue', 'cost', 'grossMargin']) {
      if (ex[f] == null && inc && inc[f] != null) {
        ex[f] = inc[f];
        updated = true;
      }
    }
  }

  return updated;
}

/**
 * 解析完成后同步 chuanheng_data_corrected.json（新增报告期 + 对未修正记录补全空字段）
 */
function updateCorrectedData() {
  const baseDir = path.join(__dirname, '../../stock/report_analysis/川恒股份');
  const rawPath = path.join(baseDir, 'chuanheng_data.json');
  const correctedPath = path.join(baseDir, 'chuanheng_data_corrected.json');

  console.log('\n' + '='.repeat(60));
  console.log('同步 chuanheng_data_corrected.json ...');

  if (!fs.existsSync(rawPath)) {
    console.error('❌ chuanheng_data.json 不存在，跳过修正文件同步');
    console.log('='.repeat(60));
    return;
  }

  const rawFile = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
  const rawSummary = rawFile.summary || [];
  console.log(`  原始 summary: ${rawSummary.length} 条`);

  let correctedData;
  if (fs.existsSync(correctedPath)) {
    correctedData = JSON.parse(fs.readFileSync(correctedPath, 'utf8'));
    console.log(`  已有修正记录: ${(correctedData.summary || []).length} 条`);
  } else {
    correctedData = {
      _metadata: {
        stockName: '川恒股份',
        stockCode: '002895',
        description: '此文件包含修正后的数据，用于页面展示。手动修正的数据会被标记。',
        dataSource: 'chuanheng_data.json',
        lastUpdated: new Date().toISOString().split('T')[0],
        products: ['phosphorus'],
        dataFlow: 'PDF报告 → 自动提取(chuanheng_data.json) → 增量更新(本文件) → 手动修正 → 页面展示',
        correctionRules: {
          manual: '手动填入或修改的数据，标记 _source: "manual"',
          verified: '经过人工验证确认正确的数据，标记 _verified: true'
        }
      },
      summary: []
    };
    console.log('  将创建新的 chuanheng_data_corrected.json');
  }

  if (!Array.isArray(correctedData.summary)) {
    correctedData.summary = [];
  }

  const periodToIndex = new Map();
  correctedData.summary.forEach((row, idx) => {
    if (row.period) periodToIndex.set(row.period, idx);
  });

  let added = 0;
  let merged = 0;

  for (const rawItem of rawSummary) {
    const newItem = buildCorrectedItemFromRaw(rawItem);
    if (!newItem) continue;

    if (!periodToIndex.has(newItem.period)) {
      correctedData.summary.push(newItem);
      periodToIndex.set(newItem.period, correctedData.summary.length - 1);
      added++;
      console.log(`  + 新增: ${newItem.period}`);
    } else {
      const idx = periodToIndex.get(newItem.period);
      const existing = correctedData.summary[idx];
      if (smartMergeChuanheng(existing, newItem)) {
        merged++;
        console.log(`  ↻ 合并: ${newItem.period}（仅填充空字段）`);
      }
    }
  }

  correctedData.summary.sort((a, b) => {
    const yA = parseInt(a.year, 10);
    const yB = parseInt(b.year, 10);
    if (yA !== yB) return yB - yA;
    return periodEndRank(b.period) - periodEndRank(a.period);
  });

  correctedData._metadata = correctedData._metadata || {};
  correctedData._metadata.lastUpdated = new Date().toISOString().split('T')[0];
  correctedData._metadata.dataSource = 'chuanheng_data.json';

  fs.writeFileSync(correctedPath, JSON.stringify(correctedData, null, 2), 'utf8');

  console.log(`\n✅ 已写入: ${correctedPath}`);
  console.log(`   总记录: ${correctedData.summary.length}，新增: ${added}，合并更新: ${merged}`);
  console.log('📌 已标记 _corrected / 分产品 _corrected 的条目不会被自动覆盖');
  console.log('='.repeat(60));
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
      if (item.productFinancials.ironPhosphate && item.productFinancials.ironPhosphate.revenue) {
        const ip = item.productFinancials.ironPhosphate;
        console.log(`    磷酸铁: 营收${(ip.revenue/100000000).toFixed(2)}亿元, 成本${ip.cost ? (ip.cost/100000000).toFixed(2) + '亿元' : '未单列'}, 毛利率${ip.grossMargin ? ip.grossMargin.toFixed(2) + '%' : '未单列'}`);
      }
    }
  });

  // 保存为JSON文件
  const outputPath = path.join(__dirname, '../../stock/report_analysis/川恒股份/chuanheng_data.json');
  fs.writeFileSync(outputPath, JSON.stringify({ allData, summary }, null, 2), 'utf8');
  console.log(`\n数据已保存到: ${outputPath}`);

  updateCorrectedData();

  return { allData, summary };
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  parsePDF,
  processAllPDFs,
  generateSummary,
  updateCorrectedData,
  getPeriodFromFilename,
  buildCorrectedItemFromRaw
};

