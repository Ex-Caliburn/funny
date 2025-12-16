const { PDFParse } = require('pdf-parse');
const fs = require('fs');
const path = require('path');

/**
 * 铜陵有色年报数据提取脚本
 * 提取铜相关的成本、营收、产量、销量数据
 */

// 需要提取的关键词
const keywords = {
  cost: ['成本', '营业成本', '铜成本', '生产成本', '铜销售成本', '主营业务成本'],
  revenue: ['营收', '营业收入', '铜营收', '铜收入', '主营业务收入', '铜销售收入'],
  production: ['铜产量', '产量', '生产量', '阴极铜产量', '铜精矿产量', '铜材产量'],
  sales: ['铜销量', '销量', '销售量', '销售铜', '阴极铜销量', '铜材销量'],
  inventory: ['库存量', '库存', '铜库存']
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
 * 从"主要产品"表格中提取铜产品数据
 * 格式：阴极铜(万吨） \t生产量 \t销售量 \t库存量
 */
function extractInventoryFromMainProducts(text, extractedData) {
  // 匹配"主要产品"表格中的铜产品数据
  // 支持多种格式：制表符、空格分隔
  // 格式1：阴极铜(万吨） \t生产量 \t销售量 \t库存量
  // 格式2：主要产品 \t阴极铜 \t生产量 \t销售量 \t库存量
  // 格式3：阴极铜 \t生产量 \t销售量 \t库存量（不带单位）
  const patterns = [
    // 阴极铜（带单位）
    /阴极铜[\(（][^）)]*万吨[\)）][\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g,
    // 阴极铜（不带单位，在主要产品表格中）
    /主要产品[^\d]*阴极铜[^\d]*([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g,
    // 阴极铜（直接匹配，前后有数字）
    /阴极铜[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)(?![\d,，])/g,
    // 铜精矿
    /铜精矿[\(（][^）)]*万吨[\)）][\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g,
    // 铜材
    /铜材[\(（][^）)]*万吨[\)）][\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g,
    // 铜产品（通用，最后匹配）
    /铜[\(（][^）)]*万吨[\)）][\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g
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
 * 格式：其中阴极铜 176.80 万吨、铜精矿含铜 15.52 万吨、铜材 XX 万吨
 */
function extractProductSales(text, extractedData) {
  // 从"主要产品"表格中提取分产品销量数据（优先）
  // 格式：主要产品 \t阴极铜 \t生产量 \t销售量 \t库存量
  // 或者：阴极铜(万吨） \t生产量 \t销售量 \t库存量
  const mainProductPattern = /(?:主要产品[^\d]*)?阴极铜[\(（]?[^）)]*万吨[\)）]?[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g;
  let mainMatch;
  while ((mainMatch = mainProductPattern.exec(text)) !== null) {
    // 跳过包含"产量"或"销量"关键词的匹配（避免误匹配）
    if (mainMatch[0].includes('产量') || mainMatch[0].includes('销量') || mainMatch[0].includes('销售量')) {
      continue;
    }
    // 第二个数字是销售量
    const salesValue = extractNumberInWanTons(mainMatch[2] + '万吨');
    if (salesValue && salesValue > 0) {
      extractedData.productSales.cathodeCopper.push({
        keyword: '主要产品-阴极铜销量',
        line: mainMatch[0],
        context: mainMatch[0],
        value: salesValue,
        allValues: [salesValue]
      });
      break; // 只取第一个匹配
    }
  }
  
  // 阴极铜（单独提取，从文本中，如果主要产品表格中没有找到）
  if (extractedData.productSales.cathodeCopper.length === 0) {
    const cathodeCopperPattern = /阴极铜[\s\t]+([\d,，]+\.?\d*)[\s\t]*万吨/g;
    let cathodeMatch;
    while ((cathodeMatch = cathodeCopperPattern.exec(text)) !== null) {
      const value = extractNumberInWanTons(cathodeMatch[1] + '万吨');
      if (value && value > 0) {
        extractedData.productSales.cathodeCopper.push({
          keyword: '阴极铜销量',
          line: cathodeMatch[0],
          context: cathodeMatch[0],
          value: value,
          allValues: [value]
        });
        break; // 只取第一个匹配
      }
    }
  }
  
  // 铜精矿含铜（从主要产品表格中提取，优先）
  const copperConcentrateMainPattern = /(?:主要产品[^\d]*)?铜精矿[\(（]?[^）)]*万吨[\)）]?[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g;
  let concentrateMainMatch;
  while ((concentrateMainMatch = copperConcentrateMainPattern.exec(text)) !== null) {
    if (concentrateMainMatch[0].includes('产量') || concentrateMainMatch[0].includes('销量') || concentrateMainMatch[0].includes('销售量')) {
      continue;
    }
    const salesValue = extractNumberInWanTons(concentrateMainMatch[2] + '万吨');
    if (salesValue && salesValue > 0) {
      extractedData.productSales.copperConcentrate.push({
        keyword: '主要产品-铜精矿销量',
        line: concentrateMainMatch[0],
        context: concentrateMainMatch[0],
        value: salesValue,
        allValues: [salesValue]
      });
      break;
    }
  }
  
  // 铜精矿含铜（单独提取，从文本中，如果主要产品表格中没有找到）
  if (extractedData.productSales.copperConcentrate.length === 0) {
    const copperConcentratePattern = /铜精矿含铜[\s\t]+([\d,，]+\.?\d*)[\s\t]*万吨/g;
    let concentrateMatch;
    while ((concentrateMatch = copperConcentratePattern.exec(text)) !== null) {
      const value = extractNumberInWanTons(concentrateMatch[1] + '万吨');
      if (value && value > 0) {
        extractedData.productSales.copperConcentrate.push({
          keyword: '铜精矿含铜',
          line: concentrateMatch[0],
          context: concentrateMatch[0],
          value: value,
          allValues: [value]
        });
        break;
      }
    }
  }
  
  // 铜材（单独提取）
  const copperMaterialPattern = /铜材[\s\t]+([\d,，]+\.?\d*)[\s\t]*万吨/g;
  let materialMatch;
  while ((materialMatch = copperMaterialPattern.exec(text)) !== null) {
    const value = extractNumberInWanTons(materialMatch[1] + '万吨');
    if (value && value > 0) {
      extractedData.productSales.copperMaterial.push({
        keyword: '铜材销量',
        line: materialMatch[0],
        context: materialMatch[0],
        value: value,
        allValues: [value]
      });
      break;
    }
  }
  
  // 从"分产品"表格中提取销量数据（如果主要产品表格中没有找到）
  // 格式：分产品 \t铜产品 \t营业收入 \t营业成本 \t毛利率 \t销量（如果有）
  // 注意：分产品表格通常只有营收、成本、毛利率，但有些报告可能包含销量
  // 尝试从"分产品"表格附近查找销量数据
  if (extractedData.productSales.cathodeCopper.length === 0 || 
      extractedData.productSales.copperConcentrate.length === 0 || 
      extractedData.productSales.copperMaterial.length === 0) {
    // 查找"分产品"表格区域
    const productTableIndex = text.indexOf('分产品');
    if (productTableIndex !== -1) {
      // 获取"分产品"表格附近2000字符的文本
      const productTableSection = text.substring(productTableIndex, productTableIndex + 2000);
      
      // 在"分产品"表格区域中查找销量数据
      // 格式：铜产品.*销量.*([\d,，]+\.?\d*).*万吨
      const productSalesPatterns = [
        /铜产品[^\d]*销量[^\d]*([\d,，]+\.?\d*)[\s\t]*万吨/g,
        /阴极铜[^\d]*销量[^\d]*([\d,，]+\.?\d*)[\s\t]*万吨/g,
        /铜精矿[^\d]*销量[^\d]*([\d,，]+\.?\d*)[\s\t]*万吨/g,
        /铜材[^\d]*销量[^\d]*([\d,，]+\.?\d*)[\s\t]*万吨/g
      ];
      
      for (const pattern of productSalesPatterns) {
        let match;
        while ((match = pattern.exec(productTableSection)) !== null) {
          const value = extractNumberInWanTons(match[1] + '万吨');
          if (value && value > 0) {
            if (match[0].includes('阴极铜') || match[0].includes('铜产品')) {
              if (extractedData.productSales.cathodeCopper.length === 0) {
                extractedData.productSales.cathodeCopper.push({
                  keyword: '分产品-阴极铜销量',
                  line: match[0],
                  context: productTableSection.substring(0, 500),
                  value: value,
                  allValues: [value]
                });
              }
            } else if (match[0].includes('铜精矿')) {
              if (extractedData.productSales.copperConcentrate.length === 0) {
                extractedData.productSales.copperConcentrate.push({
                  keyword: '分产品-铜精矿销量',
                  line: match[0],
                  context: productTableSection.substring(0, 500),
                  value: value,
                  allValues: [value]
                });
              }
            } else if (match[0].includes('铜材')) {
              if (extractedData.productSales.copperMaterial.length === 0) {
                extractedData.productSales.copperMaterial.push({
                  keyword: '分产品-铜材销量',
                  line: match[0],
                  context: productTableSection.substring(0, 500),
                  value: value,
                  allValues: [value]
                });
              }
            }
          }
        }
      }
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
        // 优先匹配表格格式：阴极铜产量（万吨） 176.80 ... 或 阴极铜销售量（万吨） ...
        let patternStr = keyword;
        if (keyword === '销量' || keyword === '销售量') {
          patternStr = '铜销售量';
        } else if (keyword === '产量' || keyword === '铜产量') {
          patternStr = '铜产量';
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
 * 从"分产品"表格中提取所有产品的财务数据（营收、成本、毛利率）
 */
function extractAllProductFinancials(text) {
  const result = {
    copper: { revenue: null, cost: null, grossMargin: null },
    goldByproduct: { revenue: null, cost: null, grossMargin: null },
    chemical: { revenue: null, cost: null, grossMargin: null }
  };
  
  // 从"分产品"表格中提取数据
  // 格式：分产品 \t铜产品 \t营业收入 \t营业成本 \t毛利率
  // 或者：铜产品 \t63,736,262,956.68 \t60,291,314,387.94 \t5.41%
  // 黄金等副产品 \t10,332,616,011.38 \t8,764,646,179.29 \t15.17%
  // 化工及其他产品 \t1,657,995,418.97 \t745,471,485.87 \t55.04%
  
  // 查找"分产品"表格区域
  const productTableIndex = text.indexOf('分产品');
  if (productTableIndex !== -1) {
    // 获取"分产品"表格附近3000字符的文本
    const productTableSection = text.substring(productTableIndex, productTableIndex + 3000);
    
    // 匹配铜产品
    const copperPattern = /(?:分产品[^\d]*)?铜产品[^\d]*([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)\s*%/g;
    let copperMatch;
    while ((copperMatch = copperPattern.exec(productTableSection)) !== null) {
      const revenueValue = extractNumber(copperMatch[1] + '元');
      const costValue = extractNumber(copperMatch[2] + '元');
      const marginStr = copperMatch[3].replace(/[,，]/g, '');
      const marginValue = parseFloat(marginStr);
      
      if (revenueValue && revenueValue > 1000000000 && costValue && costValue > 1000000000) {
        result.copper.revenue = revenueValue;
        result.copper.cost = costValue;
        if (!isNaN(marginValue) && marginValue >= 0 && marginValue <= 100) {
          result.copper.grossMargin = marginValue;
        }
        break;
      }
    }
    
    // 匹配黄金等副产品（支持多种格式）
    // 格式1：黄金等副产品 \t营业收入 \t营业成本 \t毛利率
    // 格式2：黄金等副产品 \t10,332,616,011.38 \t8,764,646,179.29 \t15.17%
    // 格式3：黄金等副产品 19,273,117,131.88 13.24% 14,693,241,548.63 10.69% 31.17%（2024年报格式：营收 营收占比% 成本 成本占比% 毛利率%）
    // 格式4：黄金等副产品（可能跨行）
    const goldPatterns = [
      // 格式1：标准格式（营收 成本 毛利率）
      /(?:分产品[^\d]*)?黄金等副产品[^\d]*([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)\s*%/g,
      // 格式2：2024年报格式（营收 营收占比% 成本 成本占比% 毛利率%）
      /(?:分产品[^\d]*)?黄金等副产品[^\d]*([\d,，]+\.?\d*)[\s\t]+[\d,，]+\.?\d*%[^\d]*([\d,，]+\.?\d*)[\s\t]+[\d,，]+\.?\d*%[^\d]*([\d,，]+\.?\d*)\s*%/g,
      // 格式3：跨行匹配
      /黄金等副产品[\s\S]{0,200}?([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)\s*%/g,
      // 格式4：跨行匹配2024年报格式
      /黄金等副产品[\s\S]{0,300}?([\d,，]+\.?\d*)[\s\t]+[\d,，]+\.?\d*%[^\d]*([\d,，]+\.?\d*)[\s\t]+[\d,，]+\.?\d*%[^\d]*([\d,，]+\.?\d*)\s*%/g
    ];
    
    for (const goldPattern of goldPatterns) {
      let goldMatch;
      while ((goldMatch = goldPattern.exec(productTableSection)) !== null) {
        const revenueValue = extractNumber(goldMatch[1] + '元');
        const costValue = extractNumber(goldMatch[2] + '元');
        const marginStr = goldMatch[3].replace(/[,，]/g, '');
        const marginValue = parseFloat(marginStr);
        
        // 降低阈值，因为有些年份的数据可能较小
        if (revenueValue && revenueValue > 100000000 && costValue && costValue > 100000000) {
          result.goldByproduct.revenue = revenueValue;
          result.goldByproduct.cost = costValue;
          if (!isNaN(marginValue) && marginValue >= 0 && marginValue <= 100) {
            result.goldByproduct.grossMargin = marginValue;
          }
          break;
        }
      }
      if (result.goldByproduct.revenue) break;
    }
    
    // 匹配化工及其他产品（支持多种格式）
    // 格式1：化工及其他产品 \t营业收入 \t营业成本 \t毛利率
    // 格式2：化工及其他产品 \t1,657,995,418.97 \t745,471,485.87 \t55.04%
    // 格式3：化工及其他产品 2,292,699,511.02 1.58% 2,509,724,305.75 1.83% -8.65%（2024年报格式：营收 营收占比% 成本 成本占比% 毛利率%，注意毛利率可能是负数）
    // 格式4：化工及其他产品（可能跨行）
    const chemicalPatterns = [
      // 格式1：标准格式（营收 成本 毛利率）
      /(?:分产品[^\d]*)?化工及其他产品[^\d]*([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)\s*%/g,
      // 格式2：2024年报格式（营收 营收占比% 成本 成本占比% 毛利率%，注意毛利率可能是负数）
      /(?:分产品[^\d]*)?化工及其他产品[^\d]*([\d,，]+\.?\d*)[\s\t]+[\d,，]+\.?\d*%[^\d]*([\d,，]+\.?\d*)[\s\t]+[\d,，]+\.?\d*%[^\d]*([-]?[\d,，]+\.?\d*)\s*%/g,
      // 格式3：跨行匹配
      /化工及其他产品[\s\S]{0,200}?([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)\s*%/g,
      // 格式4：跨行匹配2024年报格式
      /化工及其他产品[\s\S]{0,300}?([\d,，]+\.?\d*)[\s\t]+[\d,，]+\.?\d*%[^\d]*([\d,，]+\.?\d*)[\s\t]+[\d,，]+\.?\d*%[^\d]*([-]?[\d,，]+\.?\d*)\s*%/g
    ];
    
    for (const chemicalPattern of chemicalPatterns) {
      let chemicalMatch;
      while ((chemicalMatch = chemicalPattern.exec(productTableSection)) !== null) {
        const revenueValue = extractNumber(chemicalMatch[1] + '元');
        const costValue = extractNumber(chemicalMatch[2] + '元');
        const marginStr = chemicalMatch[3].replace(/[,，]/g, '');
        const marginValue = parseFloat(marginStr);
        
        // 降低阈值，因为有些年份的数据可能较小
        // 注意：2024年报中毛利率是-8.65%，这是同比变化，不是毛利率本身
        // 需要从后面的表格中提取真正的毛利率：49.49%
        if (revenueValue && revenueValue > 10000000 && costValue && costValue > 10000000) {
          result.chemical.revenue = revenueValue;
          result.chemical.cost = costValue;
          // 对于2024年报格式，第三个数字是同比变化，不是毛利率，需要从后面的表格中提取
          // 但这里先尝试匹配，如果匹配到负数或异常值，会在后面重新匹配
          if (!isNaN(marginValue) && marginValue >= 0 && marginValue <= 100) {
            result.chemical.grossMargin = marginValue;
          }
          break;
        }
      }
      if (result.chemical.revenue) break;
    }
    
    // 如果提取到营收和成本但没有毛利率，尝试从后面的表格中提取
    // 2024年报格式：分产品表格有两部分，第一部分是同比数据，第二部分是详细数据（包含毛利率）
    if (result.chemical.revenue && result.chemical.cost && !result.chemical.grossMargin) {
      // 查找"营业收入 营业成本 毛利率"标题后的数据
      const detailedTablePattern = /营业收入[\s\t]+营业成本[\s\t]+毛利率[\s\S]{0,1000}?化工及其他产品[^\d]*[\d,，]+\.?\d*[^\d]*[\d,，]+\.?\d*[^\d]*([\d,，]+\.?\d*)\s*%/g;
      let detailedMatch;
      while ((detailedMatch = detailedTablePattern.exec(productTableSection)) !== null) {
        const marginStr = detailedMatch[1].replace(/[,，]/g, '');
        const marginValue = parseFloat(marginStr);
        if (!isNaN(marginValue) && marginValue >= 0 && marginValue <= 100) {
          result.chemical.grossMargin = marginValue;
          break;
        }
      }
    }
    
    // 同样处理黄金等副产品
    if (result.goldByproduct.revenue && result.goldByproduct.cost && !result.goldByproduct.grossMargin) {
      const detailedTablePattern = /营业收入[\s\t]+营业成本[\s\t]+毛利率[\s\S]{0,1000}?黄金等副产品[^\d]*[\d,，]+\.?\d*[^\d]*[\d,，]+\.?\d*[^\d]*([\d,，]+\.?\d*)\s*%/g;
      let detailedMatch;
      while ((detailedMatch = detailedTablePattern.exec(productTableSection)) !== null) {
        const marginStr = detailedMatch[1].replace(/[,，]/g, '');
        const marginValue = parseFloat(marginStr);
        if (!isNaN(marginValue) && marginValue >= 0 && marginValue <= 100) {
          result.goldByproduct.grossMargin = marginValue;
          break;
        }
      }
    }
  }
  
  return result;
}

/**
 * 从文本中提取铜产品销售收入、成本和毛利
 */
function extractCopperFinancials(text) {
  const result = {
    copperRevenue: null,
    copperCost: null,
    grossProfit: null,
    grossMargin: null  // 毛利率
  };
  
  // 匹配格式：铜产品销售收入 \tXX \t亿元，铜产品销售成本 \tXX \t亿元，毛利 \tXX \t亿
  const pattern1 = /铜产品销售收入[\s\t]+([\d,，]+\.?\d*)[\s\t]+亿元[，,]*[\s\t]*铜产品销售成本[\s\t]+([\d,，]+\.?\d*)[\s\t]+亿元[，,]*[\s\t]*毛利[\s\t]+([\d,，]+\.?\d*)[\s\t]*亿/g;
  let match1 = pattern1.exec(text);
  if (match1) {
    result.copperRevenue = extractNumber(match1[1] + '亿元');
    result.copperCost = extractNumber(match1[2] + '亿元');
    result.grossProfit = extractNumber(match1[3] + '亿元');
    return result;
  }
  
  // 匹配格式：铜产品销售收入 \tXX \t亿元，铜产品销售成本 \tXX \t亿元
  const pattern2 = /铜产品销售收入[\s\t]+([\d,，]+\.?\d*)[\s\t]+亿元[，,]*[\s\t]*铜产品销售成本[\s\t]+([\d,，]+\.?\d*)[\s\t]+亿元/g;
  let match2 = pattern2.exec(text);
  if (match2) {
    result.copperRevenue = extractNumber(match2[1] + '亿元');
    result.copperCost = extractNumber(match2[2] + '亿元');
    if (result.copperRevenue && result.copperCost) {
      result.grossProfit = result.copperRevenue - result.copperCost;
    }
    return result;
  }
  
  // 格式3：其中铜产品销售收入 XX 亿元（半年报格式）
  if (!result.copperRevenue) {
    const pattern5 = /(?:其中)?铜产品销售收入[\s\t]+([\d,，]+\.?\d*)[\s\t]*亿元/g;
    let match5;
    while ((match5 = pattern5.exec(text)) !== null) {
      const value = extractNumber(match5[1] + '亿元');
      if (value && value > 10000000) {
        result.copperRevenue = value;
        break;
      }
    }
  }
  
  // 格式4：铜产品销售成本 XX 亿元（半年报格式）
  if (!result.copperCost) {
    const pattern6 = /(?:其中)?铜产品销售成本[\s\t]+([\d,，]+\.?\d*)[\s\t]*亿元/g;
    let match6;
    while ((match6 = pattern6.exec(text)) !== null) {
      const value = extractNumber(match6[1] + '亿元');
      if (value && value > 10000000) {
        result.copperCost = value;
        break;
      }
    }
  }
  
  // 格式5：从"分产品"表格中提取铜产品的营业收入、营业成本和毛利率
  // 格式：分产品 \t铜产品 \t营业收入 \t营业成本 \t毛利率
  // 或者：铜产品 \t63,736,262,956.68 \t60,291,314,387.94 \t5.41%
  if (!result.copperRevenue || !result.copperCost || !result.grossMargin) {
    // 匹配"分产品"表格中的铜产品行
    const productTablePattern = /分产品[^\d]*铜产品[^\d]*([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)\s*%/g;
    let productMatch;
    while ((productMatch = productTablePattern.exec(text)) !== null) {
      // 第一个数字是营业收入（元），第二个是营业成本（元），第三个是毛利率（%）
      const revenueValue = extractNumber(productMatch[1] + '元');
      const costValue = extractNumber(productMatch[2] + '元');
      const marginStr = productMatch[3].replace(/[,，]/g, '');
      const marginValue = parseFloat(marginStr);
      
      if (revenueValue && revenueValue > 1000000000 && costValue && costValue > 1000000000) {
        if (!result.copperRevenue) result.copperRevenue = revenueValue;
        if (!result.copperCost) result.copperCost = costValue;
        if (!result.grossMargin && !isNaN(marginValue) && marginValue >= 0 && marginValue <= 100) {
          result.grossMargin = marginValue;
        }
        break;
      }
    }
  }
  
  // 格式6：铜产品销售收入（万元） XX,XXX.XX（表格格式）
  if (!result.copperRevenue) {
    const pattern7a = /铜产品销售收入\s*[（(]万元[）)]\s+([\d,，]+\.?\d*)/g;
    let match7a;
    while ((match7a = pattern7a.exec(text)) !== null) {
      const value = extractNumber(match7a[1] + '万元');
      if (value && value > 1000000) {
        result.copperRevenue = value;
        break;
      }
    }
    if (!result.copperRevenue) {
      const pattern7 = /铜产品销售收入[\s\t]+([\d,，]+\.?\d*)[\s\t]*万元/g;
      let match7;
      while ((match7 = pattern7.exec(text)) !== null) {
        const value = extractNumber(match7[1] + '万元');
        if (value && value > 1000000) {
          result.copperRevenue = value;
          break;
        }
      }
    }
  }
  
  // 格式7：铜产品销售成本（万元） XX,XXX.XX（表格格式）
  if (!result.copperCost) {
    const pattern8a = /铜产品销售成本\s*[（(]万元[）)]\s+([\d,，]+\.?\d*)/g;
    let match8a;
    while ((match8a = pattern8a.exec(text)) !== null) {
      const value = extractNumber(match8a[1] + '万元');
      if (value && value > 1000000) {
        result.copperCost = value;
        break;
      }
    }
    if (!result.copperCost) {
      const pattern8 = /铜产品销售成本[\s\t]+([\d,，]+\.?\d*)[\s\t]*万元/g;
      let match8;
      while ((match8 = pattern8.exec(text)) !== null) {
        const value = extractNumber(match8[1] + '万元');
        if (value && value > 1000000) {
          result.copperCost = value;
          break;
        }
      }
    }
  }
  
  // 单独匹配铜产品销售收入（兜底，亿元）
  if (!result.copperRevenue) {
    const pattern3 = /铜产品销售收入[\s\t]+([\d,，]+\.?\d*)[\s\t]*亿元/g;
    let match3 = pattern3.exec(text);
    if (match3) {
      const value = extractNumber(match3[1] + '亿元');
      if (value && value > 10000000) {
        result.copperRevenue = value;
      }
    }
  }
  
  // 单独匹配铜产品销售成本（兜底，亿元）
  if (!result.copperCost) {
    const pattern4 = /铜产品销售成本[\s\t]+([\d,，]+\.?\d*)[\s\t]*亿元/g;
    let match4 = pattern4.exec(text);
    if (match4) {
      const value = extractNumber(match4[1] + '亿元');
      if (value && value > 10000000) {
        result.copperCost = value;
      }
    }
  }
  
  // 如果都有，计算毛利
  if (result.copperRevenue && result.copperCost && !result.grossProfit) {
    result.grossProfit = result.copperRevenue - result.copperCost;
  }
  
  // 提取毛利率（从分产品表格中）
  // 格式：铜产品 \t营业收入 \t营业成本 \t毛利率
  // 或者：铜产品 营业收入 63,736,262,956.68 营业成本 60,291,314,387.94 毛利率 5.41%
  const grossMarginPatterns = [
    // 格式1：铜产品[\s\t]+[\d,，]+\.?\d*[\s\t]+[\d,，]+\.?\d*[\s\t]+([\d,，]+\.?\d*)%
    /铜产品[^\d]*[\d,，]+\.?\d*[^\d]*[\d,，]+\.?\d*[^\d]*([\d,，]+\.?\d*)\s*%/g,
    // 格式2：毛利率[\s\t]+([\d,，]+\.?\d*)%[\s\t]*铜产品
    /毛利率[\s\t]+([\d,，]+\.?\d*)\s*%[^\d]*铜产品/g,
    // 格式3：铜产品.*毛利率[\s\t]+([\d,，]+\.?\d*)\s*%
    /铜产品[^\d]*毛利率[\s\t]+([\d,，]+\.?\d*)\s*%/g,
    // 格式4：分产品.*铜产品[\s\S]{0,500}毛利率[\s\t]+([\d,，]+\.?\d*)\s*%
    /分产品[^\d]*铜产品[\s\S]{0,500}毛利率[\s\t]+([\d,，]+\.?\d*)\s*%/g
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
  
  // 如果提取到营收和成本但没有毛利率，计算毛利率
  if (result.copperRevenue && result.copperCost && result.grossMargin === null) {
    const grossProfit = result.copperRevenue - result.copperCost;
    result.grossMargin = (grossProfit / result.copperRevenue) * 100;
  }
  
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
        cathodeCopper: [],        // 阴极铜
        copperConcentrate: [],     // 铜精矿含铜
        copperMaterial: []         // 铜材
      },
      otherProducts: {
        goldByproduct: { revenue: null, cost: null, grossMargin: null },  // 黄金等副产品
        chemical: { revenue: null, cost: null, grossMargin: null }        // 化工及其他产品
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
    
    // 提取分产品销量数据
    extractProductSales(data.text, extractedData);
    
    // 提取铜产品财务数据（销售收入、成本、毛利率）
    const copperFinancials = extractCopperFinancials(data.text);
    if (copperFinancials.copperRevenue) {
      extractedData.revenue.push({
        keyword: '铜产品销售收入',
        line: '从extractCopperFinancials提取',
        context: '从extractCopperFinancials提取',
        value: copperFinancials.copperRevenue,
        allValues: [copperFinancials.copperRevenue]
      });
    }
    if (copperFinancials.copperCost) {
      extractedData.cost.push({
        keyword: '铜产品销售成本',
        line: '从extractCopperFinancials提取',
        context: '从extractCopperFinancials提取',
        value: copperFinancials.copperCost,
        allValues: [copperFinancials.copperCost]
      });
    }
    if (copperFinancials.grossMargin !== null) {
      extractedData.grossMargin = copperFinancials.grossMargin;
    }
    
    // 提取所有产品的财务数据（包括黄金等副产品和化工及其他产品）
    const allProductFinancials = extractAllProductFinancials(data.text);
    if (allProductFinancials.goldByproduct.revenue) {
      extractedData.otherProducts.goldByproduct = allProductFinancials.goldByproduct;
    }
    if (allProductFinancials.chemical.revenue) {
      extractedData.otherProducts.chemical = allProductFinancials.chemical;
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
  const reportDir = path.join(__dirname, '../stock/report_analysis/铜陵有色');
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
    
    // 优先从已提取的数据中查找"铜产品销售收入"和"铜产品销售成本"
    let copperRevenue = null;
    let copperCost = null;
    let grossProfit = null;
    
    // 从revenue中查找"铜产品销售收入"
    for (const rev of data.revenue) {
      if (rev.line === '从extractCopperFinancials提取') {
        copperRevenue = rev.value;
        break;
      }
    }
    if (!copperRevenue) {
      for (const rev of data.revenue) {
        if (rev.keyword === '铜产品销售收入' || rev.line.includes('铜产品销售收入')) {
          copperRevenue = rev.value;
          break;
        }
        if (rev.line.includes('铜产品销售收入')) {
          let match = rev.line.match(/铜产品销售收入[\s\t]+([\d,，]+\.?\d*)[\s\t]*万元/);
          if (match) {
            const value = extractNumber(match[1] + '万元');
            if (value && value > 1000000) {
              copperRevenue = value;
              break;
            }
          }
          match = rev.line.match(/铜产品销售收入[\s\t]+([\d,，]+\.?\d*)[\s\t]*亿元/);
          if (match) {
            const value = extractNumber(match[1] + '亿元');
            if (value && value > 10000000) {
              copperRevenue = value;
              break;
            }
          }
        }
      }
    }
    
    // 从cost中查找"铜产品销售成本"
    for (const c of data.cost) {
      if (c.keyword === '铜产品销售成本' && c.line.includes('从extractCopperFinancials提取')) {
        copperCost = c.value;
        break;
      }
    }
    if (!copperCost) {
      for (const c of data.cost) {
        if (c.keyword === '铜产品销售成本') {
          copperCost = c.value;
          break;
        }
      }
    }
    if (!copperCost) {
      for (const c of data.cost) {
        if (c.line.includes('铜产品销售成本')) {
          let match = c.line.match(/铜产品销售成本[\s\t]+([\d,，]+\.?\d*)[\s\t]*万元/);
          if (match) {
            const value = extractNumber(match[1] + '万元');
            if (value && value > 1000000) {
              copperCost = value;
              break;
            }
          }
          match = c.line.match(/铜产品销售成本[\s\t]+([\d,，]+\.?\d*)[\s\t]*亿元/);
          if (match) {
            const value = extractNumber(match[1] + '亿元');
            if (value && value > 10000000) {
              copperCost = value;
              break;
            }
          }
        }
      }
    }
    
    // 如果还没找到，使用默认值
    if (!copperRevenue) {
      copperRevenue = getMainValue(data.revenue);
    }
    if (!copperCost) {
      copperCost = getMainValue(data.cost);
    }
    if (!grossProfit && copperRevenue && copperCost) {
      grossProfit = copperRevenue - copperCost;
    }
    
    // 优先从"主要产品"表格中提取产量和销量
    let production = null;
    let sales = null;
    let inventory = getMainValue(data.inventory, '主要产品');
    
    // 从production中查找"主要产品"相关的数据
    const productionItems = data.production.filter(p => 
      p.keyword && p.keyword.includes('主要产品') && 
      p.line && p.line.includes('万吨') &&
      !p.line.includes('%') && 
      p.value && p.value >= 0.5  // 过滤掉太小的值（可能是百分比）
    );
    if (productionItems.length > 0) {
      production = Math.max(...productionItems.map(p => p.value));
    }
    
    // 从sales中查找"主要产品"相关的数据
    const salesItems = data.sales.filter(s => 
      s.keyword && s.keyword.includes('主要产品') && 
      s.line && s.line.includes('万吨') &&
      !s.line.includes('%') && 
      s.value && s.value >= 0.5  // 过滤掉太小的值（可能是百分比）
    );
    if (salesItems.length > 0) {
      sales = Math.max(...salesItems.map(s => s.value));
    }
    
    // 如果没找到"主要产品"的数据，再尝试其他来源，但必须包含"万吨"且不是百分比
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
    
    if (copperRevenue && copperRevenue > 50000000000) {
      console.log(`  ⚠️  营收数据异常 (${(copperRevenue/100000000).toFixed(2)}亿元)，可能是总营收而非铜产品营收`);
    }
    
    // 提取分产品销量
    const cathodeCopper = getMainValue(data.productSales.cathodeCopper);
    const copperConcentrate = getMainValue(data.productSales.copperConcentrate);
    const copperMaterial = getMainValue(data.productSales.copperMaterial);
    
    summary.push({
      year: year,
      filename: data.filename,
      cost: copperCost,
      revenue: copperRevenue,
      production: production,
      sales: sales,
      inventory: inventory,
      grossMargin: data.grossMargin !== null ? data.grossMargin : null,
      productSales: {
        cathodeCopper: cathodeCopper,
        copperConcentrate: copperConcentrate,
        copperMaterial: copperMaterial
      },
      otherProducts: data.otherProducts || {
        goldByproduct: { revenue: null, cost: null, grossMargin: null },
        chemical: { revenue: null, cost: null, grossMargin: null }
      }
    });
  }
  
  return summary;
}

/**
 * 主函数
 */
async function main() {
  console.log('开始解析铜陵有色年报PDF文件...\n');
  
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
      console.log(`    阴极铜: ${item.productSales.cathodeCopper ? item.productSales.cathodeCopper.toFixed(2) + '万吨' : '未找到'}`);
      console.log(`    铜精矿含铜: ${item.productSales.copperConcentrate ? item.productSales.copperConcentrate.toFixed(2) + '万吨' : '未找到'}`);
      console.log(`    铜材: ${item.productSales.copperMaterial ? item.productSales.copperMaterial.toFixed(2) + '万吨' : '未找到'}`);
    }
  });
  
  // 保存为JSON文件
  const outputPath = path.join(__dirname, '../stock/report_analysis/铜陵有色/tongling_data.json');
  fs.writeFileSync(outputPath, JSON.stringify({ allData, summary }, null, 2), 'utf8');
  console.log(`\n数据已保存到: ${outputPath}`);
  
  return { allData, summary };
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { parsePDF, processAllPDFs, generateSummary };

