const { PDFParse } = require('pdf-parse');
const fs = require('fs');
const path = require('path');

/**
 * 华阳年报数据提取脚本
 * 提取煤炭相关的成本、外购、营收、外采数据
 */

// 需要提取的关键词
const keywords = {
  cost: ['成本', '营业成本', '煤炭成本', '生产成本', '煤炭销售成本'],
  purchase: ['外购煤炭', '外购统销', '外购', '采购煤炭', '采购'],  // 优先使用"外购煤炭"，避免匹配到"采购集团"
  revenue: ['营收', '营业收入', '煤炭营收', '煤炭收入', '主营业务收入', '煤炭销售收入'],
  external: ['外采', '外部采购', '外采煤炭'],
  production: ['原煤产量', '产量', '生产量', '煤炭产量'],
  sales: ['商品煤销量', '销量', '销售量', '销售煤炭'],
  inventory: ['库存量', '库存', '煤炭库存']
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
 * 用于产量、销量、外购等数据
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
 * 从"主要产品"表格中提取库存数据
 * 格式：煤炭(万吨） \t生产量 \t销售量 \t库存量
 */
function extractInventoryFromMainProducts(text, extractedData) {
  // 匹配"主要产品"表格中的煤炭数据
  // 格式：煤炭(万吨） \t生产量 \t销售量 \t库存量
  // 支持多种格式：制表符、空格分隔
  // 注意：要避免匹配"煤炭产量（万吨）"或"煤炭销售量（万吨）"这样的单行格式
  const patterns = [
    // 只匹配"煤炭(万吨）"后面跟着三个数字的格式（主要产品表格格式）
    // 不匹配"煤炭产量（万吨）"或"煤炭销售量（万吨）"这样的格式
    /煤炭[\(（][^）)]*万吨[\)）][\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      // 检查匹配的文本是否包含"产量"或"销量"关键词，如果包含则跳过（避免误匹配）
      if (match[0].includes('产量') || match[0].includes('销量') || match[0].includes('销售量')) {
        continue; // 跳过包含"产量"或"销量"的匹配，这些是单行格式，不是表格格式
      }

      // 提取三个数值：生产量、销售量、库存量
      const productionStr = match[1].replace(/[,，]/g, '');
      const salesStr = match[2].replace(/[,，]/g, '');
      const inventoryStr = match[3].replace(/[,，]/g, '');

      const production = parseFloat(productionStr); // 已经是万吨
      const sales = parseFloat(salesStr);
      const inventory = parseFloat(inventoryStr);

      if (!isNaN(production) && production > 0) {
        extractedData.production.push({
          keyword: '主要产品-产量',
          line: match[0],
          context: match[0],
          value: production,
          allValues: [production]
        });
      }

      if (!isNaN(sales) && sales > 0) {
        extractedData.sales.push({
          keyword: '主要产品-销量',
          line: match[0],
          context: match[0],
          value: sales,
          allValues: [sales]
        });
      }

      if (!isNaN(inventory) && inventory > 0) {
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
 * 格式：其中洗块煤 184 万吨、洗末煤 95 万吨、末煤 1,390 万吨、煤泥销量 76 万吨
 */
function extractProductSales(text, extractedData) {
  // 洗块煤（单独提取）
  const washedLumpCoalPattern = /洗块煤[\s\t]+([\d,，]+\.?\d*)[\s\t]*万吨/g;
  let washedLumpMatch;
  while ((washedLumpMatch = washedLumpCoalPattern.exec(text)) !== null) {
    const value = extractNumberInWanTons(washedLumpMatch[1] + '万吨');
    if (value && value > 0) {
      extractedData.productSales.washedLumpCoal.push({
        keyword: '洗块煤销量',
        line: washedLumpMatch[0],
        context: washedLumpMatch[0],
        value: value,
        allValues: [value]
      });
      break; // 只取第一个匹配
    }
  }

  // 块煤（单独提取，注意不能匹配到"洗块煤"）
  let lumpSearchIndex = 0;
  while (true) {
    const index = text.indexOf('块煤', lumpSearchIndex);
    if (index === -1) break;

    // 检查前面是否是"洗"
    const beforeChar = index > 0 ? text[index - 1] : '';
    if (beforeChar !== '洗') {
      // 匹配"块煤 XXX 万吨"格式
      const afterText = text.substring(index);
      const lumpMatch = afterText.match(/^块煤[\s\t]+([\d,，]+\.?\d*)[\s\t]*万吨/);
      if (lumpMatch) {
        const value = extractNumberInWanTons(lumpMatch[1] + '万吨');
        if (value && value > 0) {
          extractedData.productSales.lumpCoal.push({
            keyword: '块煤销量',
            line: lumpMatch[0],
            context: lumpMatch[0],
            value: value,
            allValues: [value]
          });
          break; // 只取第一个匹配
        }
      }
    }
    lumpSearchIndex = index + 1;
  }

  // 洗粉煤（单独提取）
  const washedPulverizedCoalPattern = /洗粉煤[\s\t]+([\d,，]+\.?\d*)[\s\t]*万吨/g;
  let washedPulverizedMatch;
  while ((washedPulverizedMatch = washedPulverizedCoalPattern.exec(text)) !== null) {
    const value = extractNumberInWanTons(washedPulverizedMatch[1] + '万吨');
    if (value && value > 0) {
      extractedData.productSales.washedPulverizedCoal.push({
        keyword: '洗粉煤销量',
        line: washedPulverizedMatch[0],
        context: washedPulverizedMatch[0],
        value: value,
        allValues: [value]
      });
      break; // 只取第一个匹配
    }
  }

  // 喷粉煤（单独提取）
  const pulverizedCoalPattern = /喷粉煤[\s\t]+([\d,，]+\.?\d*)[\s\t]*万吨/g;
  let pulverizedMatch;
  while ((pulverizedMatch = pulverizedCoalPattern.exec(text)) !== null) {
    const value = extractNumberInWanTons(pulverizedMatch[1] + '万吨');
    if (value && value > 0) {
      extractedData.productSales.pulverizedCoal.push({
        keyword: '喷粉煤销量',
        line: pulverizedMatch[0],
        context: pulverizedMatch[0],
        value: value,
        allValues: [value]
      });
      break; // 只取第一个匹配
    }
  }

  // 选末煤（单独提取）
  const selectedFineCoalPattern = /选末煤[\s\t]+([\d,，]+\.?\d*)[\s\t]*万吨/g;
  let selectedMatch;
  while ((selectedMatch = selectedFineCoalPattern.exec(text)) !== null) {
    const value = extractNumberInWanTons(selectedMatch[1] + '万吨');
    if (value && value > 0) {
      extractedData.productSales.selectedFineCoal.push({
        keyword: '选末煤销量',
        line: selectedMatch[0],
        context: selectedMatch[0],
        value: value,
        allValues: [value]
      });
      break; // 只取第一个匹配
    }
  }

  // 洗末煤（单独提取，注意不能匹配到"选末煤"）
  const washedFineCoalPatterns = [
    /洗末煤[\s\t]+([\d,，]+\.?\d*)[\s\t]*万吨/g,
    /(?:其中|其中：)?洗末煤[\s\t]+([\d,，]+\.?\d*)[\s\t]*万吨/g
  ];

  for (const pattern of washedFineCoalPatterns) {
    let washedMatch;
    while ((washedMatch = pattern.exec(text)) !== null) {
      const value = extractNumberInWanTons(washedMatch[1] + '万吨');
      if (value && value > 0) {
        extractedData.productSales.washedFineCoal.push({
          keyword: '洗末煤销量',
          line: washedMatch[0],
          context: washedMatch[0],
          value: value,
          allValues: [value]
        });
        break;
      }
    }
    if (extractedData.productSales.washedFineCoal.length > 0) break;
  }

  // 末煤（单独提取，注意不能匹配到"选末煤"或"洗末煤"）
  // 使用正则表达式，确保前面不是"选"或"洗"
  // 匹配"末煤 XXX 万吨"格式，但前面不能是"选"或"洗"
  const fineCoalPattern = /(?<!选)(?<!洗)末煤[\s\t]+([\d,，]+\.?\d*)[\s\t]*万吨/g;

  // 如果浏览器不支持lookbehind，使用手动检查
  let fineMatch;
  let searchIndex = 0;
  while (true) {
    const index = text.indexOf('末煤', searchIndex);
    if (index === -1) break;

    // 检查前面是否是"选"或"洗"
    const beforeChar = index > 0 ? text[index - 1] : '';
    if (beforeChar !== '选' && beforeChar !== '洗') {
      // 匹配"末煤 XXX 万吨"格式
      const afterText = text.substring(index);
      fineMatch = afterText.match(/^末煤[\s\t]+([\d,，]+\.?\d*)[\s\t]*万吨/);
      if (fineMatch) {
        const value = extractNumberInWanTons(fineMatch[1] + '万吨');
        if (value && value > 0) {
          extractedData.productSales.fineCoal.push({
            keyword: '末煤销量',
            line: fineMatch[0],
            context: fineMatch[0],
            value: value,
            allValues: [value]
          });
          break; // 只取第一个匹配
        }
      }
    }
    searchIndex = index + 1;
  }

  // 煤泥
  const slimePattern = /煤泥(?:销量)?[\s\t]+([\d,，]+\.?\d*)[\s\t]*万吨/g;
  let slimeMatch;
  while ((slimeMatch = slimePattern.exec(text)) !== null) {
    const value = extractNumberInWanTons(slimeMatch[1] + '万吨');
    if (value && value > 0) {
      extractedData.productSales.slime.push({
        keyword: '煤泥销量',
        line: slimeMatch[0],
        context: slimeMatch[0],
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
                          keyword.includes('外购') || keyword.includes('采购') ||
                          keyword.includes('库存');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes(keyword)) {
      // 获取上下文（扩大范围以支持跨行匹配）
      const context = [];
      const expandedContextLines = keyword.includes('外购') ? 5 : contextLines; // 外购关键词需要更大的上下文范围
      for (let j = Math.max(0, i - expandedContextLines); j < Math.min(lines.length, i + expandedContextLines + 1); j++) {
        context.push(lines[j]);
      }

      // 尝试从关键词附近提取数字（更精确的匹配）
      let extractedValue = null;

      // 特殊处理：外购相关关键词，精确匹配"外购...数字"模式
      if (keyword.includes('外购') || keyword.includes('采购')) {
        // 先尝试在当前行匹配（允许"外购"和"煤炭"之间有空格）
        let purchasePattern = /外购\s*煤炭[\s\t，,]+([\d,，]+\.?\d*)[\s\t]*万吨/g;
        let match = purchasePattern.exec(line);
        if (match) {
          extractedValue = extractNumberInWanTons(match[1] + '万吨');
        } else {
          // 如果当前行没有匹配到，尝试在上下文中匹配（跨行匹配）
          // 合并上下文文本，移除换行符，但保留空格
          const contextText = context.join(' ').replace(/\n/g, ' ');
          // 先尝试匹配"外购 煤炭 XXX 万吨"（允许"外购"和"煤炭"之间有空格）
          purchasePattern = /外购\s+煤炭[\s\t，,]+([\d,，]+\.?\d*)[\s\t]*万吨/g;
          match = purchasePattern.exec(contextText);
          if (match) {
            const value = extractNumberInWanTons(match[1] + '万吨');
            // 验证提取的值是否合理（外购数据应该在0-10000万吨之间）
            if (value && value > 0 && value < 10000) {
              extractedValue = value;
            }
          } else {
            // 如果关键词是"外购"，尝试匹配"外购 XXX 万吨"（不包含"煤炭"，可能跨行）
            // 注意：要确保匹配的是"外购"后面直接跟着数字和"万吨"，避免匹配到百分比
            if (keyword === '外购' || keyword === '外购煤炭') {
              // 更精确的模式：外购后面跟着空格，然后是数字，然后是"万吨"，中间不能有"%"等符号
              purchasePattern = /外购\s+([\d,，]+\.?\d*)\s*万吨/g;
              match = purchasePattern.exec(contextText);
              if (match) {
                const value = extractNumberInWanTons(match[1] + '万吨');
                // 验证提取的值是否合理（外购数据应该在0-10000万吨之间）
                if (value && value > 0 && value < 10000) {
                  extractedValue = value;
                }
              }
            }
            // 如果还没匹配到，且不是"采购集团"相关，尝试通用模式（跨行）
            // 注意：要避免匹配到百分比等无关数字，确保匹配的是"外购...数字...万吨"格式
            if (!extractedValue && !contextText.includes('采购集团') && !contextText.includes('收购集团')) {
              // 更精确的模式：外购后面跟着数字，然后是"万吨"，中间不能有"%"等符号
              purchasePattern = new RegExp(keyword + '[^%]*?([\\d,，]+\\.?\\d*)\\s*万吨', 'g');
              match = purchasePattern.exec(contextText);
              if (match) {
                const value = extractNumberInWanTons(match[1] + '万吨');
                // 验证提取的值是否合理（外购数据应该在0-10000万吨之间）
                if (value && value > 0 && value < 10000) {
                  extractedValue = value;
                }
              }
            }
          }
        }
      }

      // 特殊处理：产量、销量关键词，精确匹配"关键词...数字"模式
      if (!extractedValue && (keyword.includes('产量') || keyword.includes('销量'))) {
        // 优先匹配表格格式：煤炭产量（万吨） 1,240 ... 或 煤炭销售量（万吨） 2,346 ...
        // 注意：销量关键词可能是"销量"或"销售量"
        let patternStr = keyword;
        if (keyword === '销量' || keyword === '销售量') {
          patternStr = '煤炭销售量';
        } else if (keyword === '产量' || keyword === '煤炭产量') {
          patternStr = '煤炭产量';
        }
        let pattern = new RegExp(patternStr + '\\s*[（(]万吨[）)]\\s+([\\d,，]+\\.?\\d*)', 'g');
        let match = pattern.exec(line);
        if (match) {
          extractedValue = extractNumberInWanTons(match[1] + '万吨');
        } else {
          // 如果没有匹配到表格格式，尝试普通格式
          pattern = new RegExp(keyword + '[^\\d]*([\\d,，]+\\.?\\d*)\\s*万吨', 'g');
          match = pattern.exec(line);
          if (match) {
            extractedValue = extractNumberInWanTons(match[1] + '万吨');
          }
        }
      }

      // 如果没有精确匹配，使用通用方法
      // 注意：对于外购关键词，避免使用通用方法，因为可能会误提取百分比等无关数据
      if (!extractedValue && !keyword.includes('外购')) {
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
 * 从文本中提取煤炭销售收入、成本和毛利
 */
function extractCoalFinancials(text) {
  const result = {
    coalRevenue: null,
    coalCost: null,
    grossProfit: null
  };

  // 匹配格式：煤炭销售收入 \t44.78 \t亿元，煤炭销售成本 \t25.58 \t亿元，毛利 \t19.20 \t亿
  const pattern1 = /煤炭销售收入[\s\t]+([\d,，]+\.?\d*)[\s\t]+亿元[，,]*[\s\t]*煤炭销售成本[\s\t]+([\d,，]+\.?\d*)[\s\t]+亿元[，,]*[\s\t]*毛利[\s\t]+([\d,，]+\.?\d*)[\s\t]*亿/g;
  let match1 = pattern1.exec(text);
  if (match1) {
    result.coalRevenue = extractNumber(match1[1] + '亿元');
    result.coalCost = extractNumber(match1[2] + '亿元');
    result.grossProfit = extractNumber(match1[3] + '亿元');
    return result;
  }

  // 匹配格式：煤炭销售收入 \t44.78 \t亿元，煤炭销售成本 \t25.58 \t亿元
  const pattern2 = /煤炭销售收入[\s\t]+([\d,，]+\.?\d*)[\s\t]+亿元[，,]*[\s\t]*煤炭销售成本[\s\t]+([\d,，]+\.?\d*)[\s\t]+亿元/g;
  let match2 = pattern2.exec(text);
  if (match2) {
    result.coalRevenue = extractNumber(match2[1] + '亿元');
    result.coalCost = extractNumber(match2[2] + '亿元');
    if (result.coalRevenue && result.coalCost) {
      result.grossProfit = result.coalRevenue - result.coalCost;
    }
    return result;
  }

  // 格式3：其中煤炭产品销售收入 97.88 亿元（半年报格式）
  if (!result.coalRevenue) {
    const pattern5 = /(?:其中)?煤炭产品销售收入[\s\t]+([\d,，]+\.?\d*)[\s\t]*亿元/g;
    let match5;
    while ((match5 = pattern5.exec(text)) !== null) {
      const value = extractNumber(match5[1] + '亿元');
      if (value && value > 10000000) { // 确保是合理的收入金额（大于1000万元）
        result.coalRevenue = value;
        break;
      }
    }
  }

  // 格式4：煤炭产品销售成本 60.53 亿元（半年报格式）
  if (!result.coalCost) {
    const pattern6 = /(?:其中)?煤炭产品销售成本[\s\t]+([\d,，]+\.?\d*)[\s\t]*亿元/g;
    let match6;
    while ((match6 = pattern6.exec(text)) !== null) {
      const value = extractNumber(match6[1] + '亿元');
      if (value && value > 10000000) { // 确保是合理的成本金额
        result.coalCost = value;
        break;
      }
    }
  }

  // 格式5：煤炭销售收入（万元） 1,019,311.85 785,641.21（表格格式，带括号，多个数值，取第一个）
  // 注意：煤和炭之间、炭和销售收入之间都可能有空格或换行
  if (!result.coalRevenue) {
    // 优先匹配表格格式：煤炭销售收入（万元） 1,019,311.85 ...
    const pattern7a = /煤\s*炭\s*销售收入\s*[（(]万元[）)]\s+([\d,，]+\.?\d*)/g;
    let match7a;
    while ((match7a = pattern7a.exec(text)) !== null) {
      const value = extractNumber(match7a[1] + '万元');
      if (value && value > 1000000) { // 大于100万元
        result.coalRevenue = value;
        break;
      }
    }
    // 如果没有匹配到表格格式，尝试普通格式
    if (!result.coalRevenue) {
      const pattern7 = /煤\s*炭\s*销售收入[\s\t]+([\d,，]+\.?\d*)[\s\t]*万元/g;
      let match7;
      while ((match7 = pattern7.exec(text)) !== null) {
        const value = extractNumber(match7[1] + '万元');
        if (value && value > 1000000) { // 大于100万元
          result.coalRevenue = value;
          break;
        }
      }
    }
  }

  // 格式6：煤炭销售成本（万元） 862,706.76 684,248.03（表格格式，带括号，多个数值，取第一个）
  // 注意：煤和炭之间、炭和销售成本之间都可能有空格或换行
  if (!result.coalCost) {
    // 优先匹配表格格式：煤炭销售成本（万元） 862,706.76 ...
    const pattern8a = /煤\s*炭\s*销售成本\s*[（(]万元[）)]\s+([\d,，]+\.?\d*)/g;
    let match8a;
    while ((match8a = pattern8a.exec(text)) !== null) {
      const value = extractNumber(match8a[1] + '万元');
      if (value && value > 1000000) { // 大于100万元
        result.coalCost = value;
        break;
      }
    }
    // 如果没有匹配到表格格式，尝试普通格式
    if (!result.coalCost) {
      const pattern8 = /煤\s*炭\s*销售成本[\s\t]+([\d,，]+\.?\d*)[\s\t]*万元/g;
      let match8;
      while ((match8 = pattern8.exec(text)) !== null) {
        const value = extractNumber(match8[1] + '万元');
        if (value && value > 1000000) { // 大于100万元
          result.coalCost = value;
          break;
        }
      }
    }
  }

  // 单独匹配煤炭销售收入（兜底，亿元）
  if (!result.coalRevenue) {
    const pattern3 = /煤炭销售收入[\s\t]+([\d,，]+\.?\d*)[\s\t]*亿元/g;
    let match3 = pattern3.exec(text);
    if (match3) {
      const value = extractNumber(match3[1] + '亿元');
      if (value && value > 10000000) {
        result.coalRevenue = value;
      }
    }
  }

  // 单独匹配煤炭销售成本（兜底，亿元）
  if (!result.coalCost) {
    const pattern4 = /煤炭销售成本[\s\t]+([\d,，]+\.?\d*)[\s\t]*亿元/g;
    let match4 = pattern4.exec(text);
    if (match4) {
      const value = extractNumber(match4[1] + '亿元');
      if (value && value > 10000000) {
        result.coalCost = value;
      }
    }
  }

  // 如果都有，计算毛利
  if (result.coalRevenue && result.coalCost && !result.grossProfit) {
    result.grossProfit = result.coalRevenue - result.coalCost;
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
      purchase: [],
      revenue: [],
      external: [],
  production: [],
  sales: [],
  inventory: [],
  productSales: {
    lumpCoal: [],              // 块煤（单独分类）
    washedLumpCoal: [],        // 洗块煤（单独分类）
    pulverizedCoal: [],        // 喷粉煤（单独分类）
    washedPulverizedCoal: [],  // 洗粉煤（单独分类）
    selectedFineCoal: [],      // 选末煤（单独分类）
    washedFineCoal: [],        // 洗末煤（单独分类）
    fineCoal: [],              // 末煤（单独分类，不包含选末煤和洗末煤）
    slime: []                  // 煤泥
  }
    };

    // 提取成本相关数据
    for (const keyword of keywords.cost) {
      const results = extractDataByKeyword(data.text, keyword);
      extractedData.cost.push(...results);
    }

    // 提取外购相关数据
    for (const keyword of keywords.purchase) {
      const results = extractDataByKeyword(data.text, keyword);
      extractedData.purchase.push(...results);
    }

    // 提取营收相关数据
    for (const keyword of keywords.revenue) {
      const results = extractDataByKeyword(data.text, keyword);
      extractedData.revenue.push(...results);
    }

    // 提取外采相关数据
    for (const keyword of keywords.external) {
      const results = extractDataByKeyword(data.text, keyword);
      extractedData.external.push(...results);
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

    // 提取煤炭财务数据（销售收入、成本）
    const coalFinancials = extractCoalFinancials(data.text);
    if (coalFinancials.coalRevenue) {
      extractedData.revenue.push({
        keyword: '煤炭销售收入',
        line: '从extractCoalFinancials提取',
        context: '从extractCoalFinancials提取',
        value: coalFinancials.coalRevenue,
        allValues: [coalFinancials.coalRevenue]
      });
    }
    if (coalFinancials.coalCost) {
      extractedData.cost.push({
        keyword: '煤炭销售成本',
        line: '从extractCoalFinancials提取',
        context: '从extractCoalFinancials提取',
        value: coalFinancials.coalCost,
        allValues: [coalFinancials.coalCost]
      });
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
  const reportDir = path.join(__dirname, '../../stock/report_analysis/华阳股份');
  const files = fs.readdirSync(reportDir)
    .filter(f => f.toLowerCase().endsWith('.pdf'))
    .filter(f => {
      // 只处理年报，排除季报
      const name = f.toLowerCase();
      return name.includes('年报') || (!name.includes('季报') && !name.includes('3季'));
    })
    .sort();

  console.log(`找到 ${files.length} 个年报PDF文件`);

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
      // 从优先的结果中选择最大值
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

    // 优先从已提取的数据中查找"煤炭销售收入"和"煤炭销售成本"
    let coalRevenue = null;
    let coalCost = null;
    let grossProfit = null;

    // 从revenue中查找"煤炭销售收入"或"煤炭产品销售收入"
    // 优先使用从extractCoalFinancials提取的数据
    for (const rev of data.revenue) {
      if (rev.line === '从extractCoalFinancials提取') {
        coalRevenue = rev.value;
        break;
      }
    }
    // 如果没有从extractCoalFinancials提取到，再查找其他来源
    if (!coalRevenue) {
      for (const rev of data.revenue) {
        if (rev.keyword === '煤炭销售收入' || rev.line.includes('煤炭销售收入')) {
          coalRevenue = rev.value;
          break;
        }
        // 特殊处理：从line中提取"煤炭产品销售收入 XX 亿元"或"XX 万元"
        if (rev.line.includes('煤炭产品销售收入')) {
          // 先尝试匹配万元
          let match = rev.line.match(/煤炭产品销售收入[\s\t]+([\d,，]+\.?\d*)[\s\t]*万元/);
          if (match) {
            const value = extractNumber(match[1] + '万元');
            if (value && value > 1000000) { // 大于100万元
              coalRevenue = value;
              break;
            }
          }
          // 再尝试匹配亿元
          match = rev.line.match(/煤炭产品销售收入[\s\t]+([\d,，]+\.?\d*)[\s\t]*亿元/);
          if (match) {
            const value = extractNumber(match[1] + '亿元');
            if (value && value > 10000000) {
              coalRevenue = value;
              break;
            }
          }
        }
      }
    }

    // 从cost中查找"煤炭销售成本"或"煤炭产品销售成本"
    // 优先选择从extractCoalFinancials提取的数据
    for (const c of data.cost) {
      if (c.keyword === '煤炭销售成本' && c.line.includes('从extractCoalFinancials提取')) {
        coalCost = c.value;
        break;
      }
    }

    // 如果没有找到，再选择其他keyword='煤炭销售成本'的数据
    if (!coalCost) {
      for (const c of data.cost) {
        if (c.keyword === '煤炭销售成本') {
          coalCost = c.value;
          break;
        }
      }
    }

    // 如果没有找到，再尝试从line中提取
    if (!coalCost) {
      for (const c of data.cost) {
        // 特殊处理：从line中提取"煤炭产品销售成本 XX 万元"或"XX 亿元"
        if (c.line.includes('煤炭产品销售成本')) {
          // 先尝试匹配万元
          let match = c.line.match(/煤炭产品销售成本[\s\t]+([\d,，]+\.?\d*)[\s\t]*万元/);
          if (match) {
            const value = extractNumber(match[1] + '万元');
            if (value && value > 1000000) { // 大于100万元
              coalCost = value;
              break;
            }
          }
          // 再尝试匹配亿元
          match = c.line.match(/煤炭产品销售成本[\s\t]+([\d,，]+\.?\d*)[\s\t]*亿元/);
          if (match) {
            const value = extractNumber(match[1] + '亿元');
            if (value && value > 10000000) {
              coalCost = value;
              break;
            }
          }
        }
      }
    }

    // 如果还没找到，使用默认值
    if (!coalRevenue) {
      coalRevenue = getMainValue(data.revenue);
    }
    if (!coalCost) {
      coalCost = getMainValue(data.cost);
    }
    if (!grossProfit && coalRevenue && coalCost) {
      grossProfit = coalRevenue - coalCost;
    }

    // 获取原始数据
    // 对于外购数据，优先选择包含"外购煤炭"关键词的数据，避免选择百分比等误提取的数据
    let purchase = null;
    if (data.purchase && data.purchase.length > 0) {
      // 优先选择包含"外购煤炭"关键词的数据（允许"外购"和"煤炭"之间有空格）
      const purchaseWithKeyword = data.purchase.find(p => {
        const lineText = p.line || '';
        const contextText = p.context || '';
        return /外购\s*煤炭/.test(lineText) || /外购\s*煤炭/.test(contextText);
      });
      if (purchaseWithKeyword) {
        // 从context中精确提取"外购 煤炭 XXX 万吨"格式的数据
        const contextText = purchaseWithKeyword.context || purchaseWithKeyword.line || '';
        const match = contextText.match(/外购\s+煤炭[\s\t，,]+([\d,，]+\.?\d*)[\s\t]*万吨/);
        if (match) {
          const value = extractNumberInWanTons(match[1] + '万吨');
          if (value && value > 0 && value < 10000) {
            // extractNumberInWanTons返回的是万吨，summary中purchase存储的也是万吨
            // 所以直接使用value
            purchase = value;
          } else {
            // 如果提取失败，使用原始值（但需要检查单位）
            purchase = purchaseWithKeyword.value;
            // 如果值太小（小于1万吨），说明可能是误提取，需要从context重新提取
            if (purchase && purchase < 1) {
              purchase = null;
            }
          }
        } else {
          // 如果没有匹配到，但purchaseWithKeyword.value是合理的（大于1万吨），使用它
          purchase = purchaseWithKeyword.value;
          // 如果值太小（小于1万吨），说明可能是误提取，需要从context重新提取
          if (purchase && purchase < 1) {
            purchase = null;
          }
        }
      } else {
        // 如果没有找到包含"外购煤炭"的数据，使用getMainValue，但需要验证合理性
        purchase = getMainValue(data.purchase);
        // 如果提取的值太小（小于1万吨），很可能是误提取，应该清空
        // 注意：purchase存储的是万吨，所以小于1就是小于1万吨
        if (purchase && purchase < 1) {
          purchase = null;
        }
      }
    }
    let production = getMainValue(data.production, '主要产品');
    let sales = getMainValue(data.sales, '主要产品');
    let inventory = getMainValue(data.inventory, '主要产品');

    // 数据合理性验证
    // 1. 外购数据：合理范围应该在 0-10000万吨之间（年度）
    // 如果外购数据等于产量数据，很可能是误提取，应该清空
    if (purchase && production && Math.abs(purchase - production) < 10) {
      console.log(`  ⚠️  外购数据异常 (${purchase.toFixed(2)}万吨)，与产量数据(${production.toFixed(2)}万吨)相同，可能是误提取，已清空`);
      purchase = null;
    } else if (purchase && purchase > 10000) {
      console.log(`  ⚠️  外购数据异常 (${purchase.toFixed(2)}万吨)，可能是发电量，已清空`);
      purchase = null;
    }

    // 2. 产量数据：合理范围应该在 0-10000万吨之间（年度）
    if (production && production > 100000) {
      console.log(`  ⚠️  产量数据异常 (${production.toFixed(2)}万吨)，已清空`);
      production = null;
    }

    // 3. 销量数据：合理范围应该在 0-10000万吨之间（年度）
    if (sales && sales > 100000) {
      console.log(`  ⚠️  销量数据异常 (${sales.toFixed(2)}万吨)，已清空`);
      sales = null;
    }

    // 4. 成本和营收：如果成本=营收，说明没有正确提取煤炭销售成本
    if (coalCost && coalRevenue && Math.abs(coalCost - coalRevenue) < 1000000) {
      console.log(`  ⚠️  成本≈营收 (${(coalCost/100000000).toFixed(2)}亿 ≈ ${(coalRevenue/100000000).toFixed(2)}亿)，成本数据可能不准确`);
      // 不清空，但标记为可疑
    }

    // 5. 营收合理性：煤炭营收一般不会超过500亿（年度）
    if (coalRevenue && coalRevenue > 50000000000) {
      console.log(`  ⚠️  营收数据异常 (${(coalRevenue/100000000).toFixed(2)}亿元)，可能是总营收而非煤炭营收`);
      // 不清空，但标记
    }

    // 提取分产品销量（所有分类都单独提取）
    const lumpCoal = getMainValue(data.productSales.lumpCoal);              // 块煤
    const washedLumpCoal = getMainValue(data.productSales.washedLumpCoal);  // 洗块煤
    const pulverizedCoal = getMainValue(data.productSales.pulverizedCoal);    // 喷粉煤
    const washedPulverizedCoal = getMainValue(data.productSales.washedPulverizedCoal);  // 洗粉煤
    const selectedFineCoal = getMainValue(data.productSales.selectedFineCoal);  // 选末煤
    const washedFineCoal = getMainValue(data.productSales.washedFineCoal);      // 洗末煤
    const fineCoal = getMainValue(data.productSales.fineCoal);                  // 末煤
    const slime = getMainValue(data.productSales.slime);

    summary.push({
      year: year,
      filename: data.filename,
      cost: coalCost,
      purchase: purchase,
      revenue: coalRevenue,
      external: getMainValue(data.external),
      production: production,
      sales: sales,
      inventory: inventory,
      productSales: {
        lumpCoal: lumpCoal,                    // 块煤（单独分类）
        washedLumpCoal: washedLumpCoal,        // 洗块煤（单独分类）
        pulverizedCoal: pulverizedCoal,        // 喷粉煤（单独分类）
        washedPulverizedCoal: washedPulverizedCoal,  // 洗粉煤（单独分类）
        selectedFineCoal: selectedFineCoal,     // 选末煤（单独分类）
        washedFineCoal: washedFineCoal,        // 洗末煤（单独分类）
        fineCoal: fineCoal,                    // 末煤（单独分类）
        slime: slime                           // 煤泥
      }
    });
  }

  return summary;
}

/**
 * 主函数
 */
async function main() {
  console.log('开始解析华阳年报PDF文件...\n');

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
    // purchase存储的是万吨，所以直接输出，不需要除以10000
    console.log(`  外购: ${item.purchase ? item.purchase.toFixed(2) + '万吨' : '未找到'}`);
    console.log(`  营收: ${item.revenue ? (item.revenue / 100000000).toFixed(2) + '亿元' : '未找到'}`);
    // 外采数据暂时不显示（所有数据都未找到）
    // console.log(`  外采: ${item.external ? (item.external / 100000000).toFixed(2) + '亿元' : '未找到'}`);
    console.log(`  产量: ${item.production ? item.production.toFixed(2) + '万吨' : '未找到'}`);
    console.log(`  销量: ${item.sales ? item.sales.toFixed(2) + '万吨' : '未找到'}`);
    console.log(`  库存: ${item.inventory ? item.inventory.toFixed(2) + '万吨' : '未找到'}`);
    if (item.productSales) {
      console.log(`  分产品销量:`);
      console.log(`    块煤: ${item.productSales.lumpCoal ? item.productSales.lumpCoal.toFixed(2) + '万吨' : '未找到'}`);
      console.log(`    洗块煤: ${item.productSales.washedLumpCoal ? item.productSales.washedLumpCoal.toFixed(2) + '万吨' : '未找到'}`);
      console.log(`    喷粉煤: ${item.productSales.pulverizedCoal ? item.productSales.pulverizedCoal.toFixed(2) + '万吨' : '未找到'}`);
      console.log(`    洗粉煤: ${item.productSales.washedPulverizedCoal ? item.productSales.washedPulverizedCoal.toFixed(2) + '万吨' : '未找到'}`);
      console.log(`    选末煤: ${item.productSales.selectedFineCoal ? item.productSales.selectedFineCoal.toFixed(2) + '万吨' : '未找到'}`);
      console.log(`    洗末煤: ${item.productSales.washedFineCoal ? item.productSales.washedFineCoal.toFixed(2) + '万吨' : '未找到'}`);
      console.log(`    末煤: ${item.productSales.fineCoal ? item.productSales.fineCoal.toFixed(2) + '万吨' : '未找到'}`);
      console.log(`    煤泥: ${item.productSales.slime ? item.productSales.slime.toFixed(2) + '万吨' : '未找到'}`);
    }
  });

  // 保存为JSON文件
  const outputPath = path.join(__dirname, '../../stock/report_analysis/华阳股份/huayang_data.json');
  fs.writeFileSync(outputPath, JSON.stringify({ allData, summary }, null, 2), 'utf8');
  console.log(`\n数据已保存到: ${outputPath}`);

  return { allData, summary };
}

/**
 * 从报告期字符串获取月份
 */
function getMonthFromPeriod(period) {
  if (period.includes('全年')) return 12;
  if (period.includes('1-9月')) return 9;
  if (period.includes('上半年')) return 6;
  if (period.includes('1-3月')) return 3;
  return 0;
}

/**
 * 将原始数据转换为新格式
 * 华阳股份的数据结构与山煤国际不同，需要适配
 */
function convertToNewFormat(rawItem) {
  // 辅助函数：添加修正标记
  const addCorrectionFlags = (obj) => ({
    ...obj,
    _corrected: false,
    _verified: false,
    _notes: null
  });

  // 辅助函数：计算毛利率
  const calcGrossMargin = (revenue, cost) => {
    if (revenue && cost && revenue > 0) {
      return parseFloat(((revenue - cost) / revenue * 100).toFixed(2));
    }
    return null;
  };

  // 华阳股份的数据结构比较简单，主要是煤炭整体数据
  // cost, revenue 单位是亿元，production, sales, purchase, inventory 单位是万吨
  const coalData = {
    production: rawItem.production || null,
    sales: rawItem.sales || null,
    inventory: rawItem.inventory || null,
    revenue: rawItem.revenue || null,  // 亿元
    cost: rawItem.cost || null,        // 亿元
    purchase: rawItem.purchase || null, // 万吨
    unitPrice: null,
    unitCost: null,
    unitGrossProfit: null,
    grossMargin: null
  };

  // 计算单价和单位成本（元/吨）
  // 营收(亿元) / 销量(万吨) × 10000 = 元/吨
  if (coalData.revenue && coalData.sales && coalData.sales > 0) {
    coalData.unitPrice = parseFloat((coalData.revenue / coalData.sales * 10000).toFixed(2));
  }
  if (coalData.cost && coalData.sales && coalData.sales > 0) {
    coalData.unitCost = parseFloat((coalData.cost / coalData.sales * 10000).toFixed(2));
  }
  // 计算单位毛利
  if (coalData.unitPrice && coalData.unitCost) {
    coalData.unitGrossProfit = parseFloat((coalData.unitPrice - coalData.unitCost).toFixed(2));
  }
  // 计算毛利率
  if (coalData.revenue && coalData.cost) {
    coalData.grossMargin = calcGrossMargin(coalData.revenue, coalData.cost);
  }

  // 分产品销量数据
  const productSales = rawItem.productSales || {};

  // 构建结果
  const result = {
    period: rawItem.period,
    year: rawItem.year,
    month: rawItem.month || getMonthFromPeriod(rawItem.period),
    type: rawItem.type || 'cumulative',
    coal: addCorrectionFlags(coalData),
    productSales: addCorrectionFlags({
      lumpCoal: productSales.lumpCoal || null,
      washedLumpCoal: productSales.washedLumpCoal || null,
      pulverizedCoal: productSales.pulverizedCoal || null,
      washedPulverizedCoal: productSales.washedPulverizedCoal || null,
      selectedFineCoal: productSales.selectedFineCoal || null,
      washedFineCoal: productSales.washedFineCoal || null,
      fineCoal: productSales.fineCoal || null,
      slime: productSales.slime || null
    })
  };

  return result;
}

/**
 * 智能合并数据：保留已有值（特别是手动修正的），只更新空值
 * @param {Object} existing 已有数据（可能包含手动修正）
 * @param {Object} newData 新提取的数据
 * @returns {boolean} 是否有更新
 */
function smartMergeData(existing, newData) {
  let updated = false;

  // 合并coal数据
  if (newData.coal && existing.coal) {
    // 如果已被手动修正，跳过
    if (!existing.coal._corrected) {
      const fields = ['production', 'sales', 'inventory', 'revenue', 'cost', 'purchase', 'unitPrice', 'unitCost', 'unitGrossProfit', 'grossMargin'];
      fields.forEach(field => {
        if (existing.coal[field] == null && newData.coal[field] != null) {
          existing.coal[field] = newData.coal[field];
          updated = true;
        }
      });
    }
  }

  // 合并productSales数据
  if (newData.productSales && existing.productSales) {
    if (!existing.productSales._corrected) {
      const fields = ['lumpCoal', 'washedLumpCoal', 'pulverizedCoal', 'washedPulverizedCoal', 'selectedFineCoal', 'washedFineCoal', 'fineCoal', 'slime'];
      fields.forEach(field => {
        if (existing.productSales[field] == null && newData.productSales[field] != null) {
          existing.productSales[field] = newData.productSales[field];
          updated = true;
        }
      });
    }
  }

  return updated;
}

/**
 * 生成/更新增量修正文件
 * 工作流程：PDF报告 → 自动提取(huayang_data.json) → 增量更新(huayang_data_corrected.json) → 手动修正 → 页面展示
 *
 * 特点：
 * 1. 新报告期的数据会自动添加
 * 2. 已存在的报告期只更新空值字段
 * 3. 手动修正的字段会被保留，不会被自动提取的数据覆盖
 */
function generateCorrectedDataFile() {
  console.log('\n📝 生成/更新增量修正文件...\n');

  const baseDir = path.join(__dirname, '../../stock/report_analysis/华阳股份');
  const rawDataPath = path.join(baseDir, 'huayang_data.json');
  const correctedDataPath = path.join(baseDir, 'huayang_data_corrected.json');

  if (!fs.existsSync(rawDataPath)) {
    console.error('❌ huayang_data.json 不存在，请先运行 parse 命令');
    return false;
  }

  const rawDataFile = JSON.parse(fs.readFileSync(rawDataPath, 'utf-8'));
  const rawData = rawDataFile.summary || [];
  console.log(`  - 原始数据: ${rawData.length} 条记录`);

  // 初始化修正文件结构
  let correctedFile = {
    _metadata: {
      stockName: '华阳股份',
      stockCode: '600348',
      description: '此文件包含修正后的数据，用于页面展示。手动修正的数据会被标记。',
      dataSource: 'huayang_data.json',
      lastUpdated: new Date().toISOString().split('T')[0],
      dataFlow: 'PDF报告 → 自动提取(huayang_data.json) → 手动修正(本文件) → 页面展示',
      correctionRules: {
        manual: '手动填入或修改的数据，标记 _corrected: true',
        verified: '经过人工验证确认正确的数据，标记 _verified: true'
      }
    },
    summary: []
  };

  let existingPeriods = new Map(); // period -> index in summary

  // 如果修正文件已存在，加载它
  if (fs.existsSync(correctedDataPath)) {
    const existingFile = JSON.parse(fs.readFileSync(correctedDataPath, 'utf-8'));

    // 兼容旧格式（rawData数组）和新格式（_metadata + summary）
    if (existingFile.rawData && Array.isArray(existingFile.rawData)) {
      // 旧格式，需要转换（旧格式中revenue/cost已经是亿元单位）
      console.log('  - 检测到旧格式，将转换为新格式');
      // 将旧格式数据转换为新格式
      existingFile.rawData.forEach(item => {
        // 旧格式数据已经是亿元单位，直接转换
        const newItem = convertToNewFormat(item);
        correctedFile.summary.push(newItem);
      });
    } else if (existingFile._metadata && existingFile.summary) {
      // 新格式，保留
      correctedFile._metadata = existingFile._metadata;
      correctedFile.summary = existingFile.summary;
      console.log(`  - 已有修正数据: ${correctedFile.summary.length} 条记录`);
    }

    // 记录已有的报告期
    correctedFile.summary.forEach((item, index) => {
      existingPeriods.set(item.period, index);
    });
  }

  // 增量更新：只添加新的报告期
  let addedCount = 0;
  let updatedCount = 0;

  rawData.forEach(rawItem => {
    // 从summary中提取period
    const period = getPeriodFromFilename(rawItem.filename, rawItem.year);
    if (!period) return;

    // 构建标准化的数据项（原始数据中revenue/cost是元单位，需要转换为亿元）
    const standardItem = {
      period: period,
      year: parseInt(rawItem.year),
      month: getMonthFromPeriod(period),
      type: 'cumulative',
      production: rawItem.production,
      sales: rawItem.sales,
      inventory: rawItem.inventory,
      revenue: rawItem.revenue ? rawItem.revenue / 100000000 : null, // 元转换为亿元
      cost: rawItem.cost ? rawItem.cost / 100000000 : null,          // 元转换为亿元
      purchase: rawItem.purchase,
      productSales: rawItem.productSales
    };

    // 转换为新格式的数据项
    const newItem = convertToNewFormat(standardItem);

    if (!existingPeriods.has(period)) {
      // 新报告期，直接添加
      correctedFile.summary.push(newItem);
      addedCount++;
      console.log(`  + 新增: ${period}`);
    } else {
      // 已存在的报告期，智能合并（保留手动修正，更新空值）
      const existingIndex = existingPeriods.get(period);
      const existingItem = correctedFile.summary[existingIndex];

      const updated = smartMergeData(existingItem, newItem);
      if (updated) {
        updatedCount++;
        console.log(`  ↻ 更新: ${period} (补充空值字段)`);
      }
    }
  });

  // 按年份和月份排序（升序，从旧到新）
  correctedFile.summary.sort((a, b) => {
    const yearA = parseInt(a.year);
    const yearB = parseInt(b.year);
    if (yearA !== yearB) return yearA - yearB; // 升序

    // 同年按月份升序
    const monthA = a.month || getMonthFromPeriod(a.period);
    const monthB = b.month || getMonthFromPeriod(b.period);
    return monthA - monthB;
  });

  // 更新最后修改时间
  correctedFile._metadata.lastUpdated = new Date().toISOString().split('T')[0];

  // 保存修正文件
  fs.writeFileSync(correctedDataPath, JSON.stringify(correctedFile, null, 2), 'utf-8');

  console.log(`\n✅ 增量更新完成:`);
  console.log(`   - 新增: ${addedCount} 条`);
  console.log(`   - 更新: ${updatedCount} 条`);
  console.log(`   - 总计: ${correctedFile.summary.length} 条`);
  console.log(`\n💾 已保存到: huayang_data_corrected.json`);
  console.log(`\n📌 提示: 可以手动编辑 huayang_data_corrected.json 修正数据，再次运行不会覆盖手动修正`);

  return true;
}

/**
 * 从文件名获取报告期
 */
function getPeriodFromFilename(filename, year) {
  if (!filename) return null;

  if (filename.includes('第一季度')) {
    return `${year}年1-3月`;
  } else if (filename.includes('半年度') || filename.includes('半年')) {
    return `${year}年上半年`;
  } else if (filename.includes('第三季度')) {
    return `${year}年1-9月`;
  } else if ((filename.includes('年度报告') || filename.includes('年报')) && !filename.includes('半年度')) {
    return `${year}年全年`;
  }
  return null;
}

/**
 * 验证修正后的数据
 */
function validateCorrectedData() {
  console.log('\n🔍 验证修正后的数据...\n');

  const baseDir = path.join(__dirname, '../../stock/report_analysis/华阳股份');
  const correctedDataPath = path.join(baseDir, 'huayang_data_corrected.json');

  if (!fs.existsSync(correctedDataPath)) {
    console.error('❌ huayang_data_corrected.json 不存在');
    return false;
  }

  const correctedFile = JSON.parse(fs.readFileSync(correctedDataPath, 'utf-8'));
  const summary = correctedFile.summary || [];

  let errors = [];
  let warnings = [];

  summary.forEach(item => {
    const period = item.period;
    const coal = item.coal || {};

    // 检查必要字段
    if (!coal.production && !coal.sales && !coal.revenue) {
      warnings.push(`${period}: 缺少主要数据（产量、销量、营收）`);
    }

    // 检查数据合理性
    if (coal.production && coal.production > 10000) {
      errors.push(`${period}: 产量异常 (${coal.production}万吨)`);
    }
    if (coal.sales && coal.sales > 10000) {
      errors.push(`${period}: 销量异常 (${coal.sales}万吨)`);
    }
    if (coal.grossMargin && (coal.grossMargin < 0 || coal.grossMargin > 100)) {
      warnings.push(`${period}: 毛利率异常 (${coal.grossMargin}%)`);
    }
  });

  if (errors.length > 0) {
    console.log('❌ 发现错误:');
    errors.forEach(e => console.log(`   - ${e}`));
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  警告:');
    warnings.forEach(w => console.log(`   - ${w}`));
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ 数据验证通过');
  }

  console.log(`\n📊 数据统计: ${summary.length} 条记录`);

  return errors.length === 0;
}

/**
 * 导出数据摘要
 */
function exportDataSummary() {
  console.log('\n📊 导出数据摘要...\n');

  const baseDir = path.join(__dirname, '../../stock/report_analysis/华阳股份');
  const correctedDataPath = path.join(baseDir, 'huayang_data_corrected.json');

  if (!fs.existsSync(correctedDataPath)) {
    console.error('❌ huayang_data_corrected.json 不存在');
    return;
  }

  const correctedFile = JSON.parse(fs.readFileSync(correctedDataPath, 'utf-8'));
  const summary = correctedFile.summary || [];

  console.log('华阳股份煤炭数据摘要');
  console.log('='.repeat(80));

  summary.forEach(item => {
    const coal = item.coal || {};
    console.log(`\n${item.period}:`);
    console.log(`  产量: ${coal.production ? coal.production.toFixed(2) + '万吨' : '-'}`);
    console.log(`  销量: ${coal.sales ? coal.sales.toFixed(2) + '万吨' : '-'}`);
    console.log(`  营收: ${coal.revenue ? coal.revenue.toFixed(2) + '亿元' : '-'}`);
    console.log(`  成本: ${coal.cost ? coal.cost.toFixed(2) + '亿元' : '-'}`);
    console.log(`  外购: ${coal.purchase ? coal.purchase.toFixed(2) + '万吨' : '-'}`);
    console.log(`  售价: ${coal.unitPrice ? coal.unitPrice.toFixed(2) + '元/吨' : '-'}`);
    console.log(`  单位成本: ${coal.unitCost ? coal.unitCost.toFixed(2) + '元/吨' : '-'}`);
    console.log(`  毛利率: ${coal.grossMargin ? coal.grossMargin.toFixed(2) + '%' : '-'}`);
    if (coal._corrected) {
      console.log(`  [已手动修正]`);
    }
  });
}

// 命令行参数处理
const args = process.argv.slice(2);
const command = args[0];

// 如果直接运行此脚本
if (require.main === module) {
  switch (command) {
    case 'parse':
      // 解析PDF并生成原始数据
      main().catch(console.error);
      break;
    case 'corrected':
      // 生成/更新增量修正文件
      generateCorrectedDataFile();
      break;
    case 'validate':
      // 验证修正后的数据
      validateCorrectedData();
      break;
    case 'export':
      // 导出数据摘要
      exportDataSummary();
      break;
    case 'all':
      // 执行完整流程
      main().then(() => {
        generateCorrectedDataFile();
        validateCorrectedData();
      }).catch(console.error);
      break;
    default:
      // 默认执行parse
      main().catch(console.error);
  }
}

module.exports = {
  parsePDF,
  processAllPDFs,
  generateSummary,
  generateCorrectedDataFile,
  validateCorrectedData,
  exportDataSummary
};
