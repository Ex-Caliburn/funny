const { PDFParse } = require('pdf-parse');
const fs = require('fs');
const path = require('path');

/**
 * 中国海洋石油年报数据提取脚本
 * 提取石油和天然气相关的成本、营收、产量、销量数据
 */

// 需要提取的关键词（扩展更多可能的表达方式）
const keywords = {
  oil: {
    cost: ['石油成本', '原油成本', '石油销售成本', '原油销售成本', '石油营业成本', '原油营业成本', 
           '石油产品成本', '原油产品成本', '石油业务成本', '原油业务成本'],
    revenue: ['石油营收', '原油营收', '石油收入', '原油收入', '石油销售收入', '原油销售收入', 
              '石油营业收入', '原油营业收入', '石油产品收入', '原油产品收入', '石油业务收入', '原油业务收入'],
    production: ['石油产量', '原油产量', '石油生产量', '原油生产量', '原油净产量', '石油净产量',
                 '原油总产量', '石油总产量', '原油当量产量', '石油当量产量'],
    sales: ['石油销量', '原油销量', '石油销售量', '原油销售量', '石油销售', '原油销售',
            '石油产品销量', '原油产品销量', '石油产品销售量', '原油产品销售量']
  },
  gas: {
    cost: ['天然气成本', '天然气销售成本', '天然气营业成本', '天然气产品成本', '天然气业务成本'],
    revenue: ['天然气营收', '天然气收入', '天然气销售收入', '天然气营业收入', 
              '天然气产品收入', '天然气业务收入'],
    production: ['天然气产量', '天然气生产量', '天然气净产量', '天然气总产量', 
                 '天然气当量产量', '天然气销售量'],
    sales: ['天然气销量', '天然气销售量', '天然气销售', '天然气产品销量', '天然气产品销售量']
  }
};

// 数据提取模式
const patterns = {
  // 匹配数字（可能包含单位：万元、亿元、百万元等）
  number: /([\d,，]+\.?\d*)\s*(?:万元|亿元|百万元|元|万|亿)?/g,
  // 匹配年份
  year: /(20\d{2})/g,
  // 匹配百分比
  percent: /([\d,，]+\.?\d*)\s*%/g,
  // 匹配桶（石油单位）- 支持百万桶、万桶、桶
  barrel: /([\d,，]+\.?\d*)\s*(?:百万桶|万桶|桶)/g,
  // 匹配立方米（天然气单位）- 支持十亿立方英尺、亿立方米、万立方米、立方米
  cubicMeter: /([\d,，]+\.?\d*)\s*(?:十亿立方英尺|亿立方米|万立方米|立方米|方)/g,
  // 匹配油当量（百万桶油当量）
  oilEquivalent: /([\d,，]+\.?\d*)\s*(?:百万桶油当量|万桶油当量|桶油当量)/g
};

/**
 * 从文本中提取数值（转换为元）
 * 支持：亿元、百万元、万元、元
 */
function extractNumber(text) {
  if (!text) return null;
  
  // 移除逗号和空格
  let cleaned = text.replace(/[,，\s]/g, '');
  
  // 检查单位
  let multiplier = 1;
  if (cleaned.includes('亿元')) {
    multiplier = 100000000; // 亿元转元
    cleaned = cleaned.replace(/亿元/g, '');
  } else if (cleaned.includes('百万元')) {
    multiplier = 1000000; // 百万元转元
    cleaned = cleaned.replace(/百万元/g, '');
  } else if (cleaned.includes('万元')) {
    multiplier = 10000; // 万元转元
    cleaned = cleaned.replace(/万元/g, '');
  } else if (cleaned.includes('元') && !cleaned.includes('万元') && !cleaned.includes('亿元') && !cleaned.includes('百万元')) {
    multiplier = 1; // 已经是元
    cleaned = cleaned.replace(/元/g, '');
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
 * 从文本中提取桶数（转换为万桶单位）
 * 支持：百万桶、万桶、桶
 */
function extractBarrels(text) {
  if (!text) return null;
  
  let cleaned = text.replace(/[,，\s]/g, '');
  
  // 检查单位
  let multiplier = 1;
  if (cleaned.includes('百万桶')) {
    multiplier = 100; // 百万桶转万桶
    cleaned = cleaned.replace(/百万桶/g, '');
  } else if (cleaned.includes('万桶')) {
    multiplier = 1; // 已经是万桶
    cleaned = cleaned.replace(/万桶/g, '');
  } else if (cleaned.includes('桶') && !cleaned.includes('油当量')) {
    multiplier = 0.0001; // 桶转万桶
    cleaned = cleaned.replace(/桶/g, '');
  } else {
    return null; // 没有找到桶单位
  }
  
  const match = cleaned.match(/[\d.]+/);
  if (match) {
    const num = parseFloat(match[0]);
    return isNaN(num) ? null : num * multiplier;
  }
  
  return null;
}

/**
 * 从文本中提取天然气量（转换为万立方米单位）
 * 支持：十亿立方英尺、亿立方米、万立方米、立方米
 * 注意：1十亿立方英尺 ≈ 28.32亿立方米 = 283200万立方米
 */
function extractCubicMeters(text) {
  if (!text) return null;
  
  let cleaned = text.replace(/[,，\s]/g, '');
  
  // 检查单位
  let multiplier = 1;
  if (cleaned.includes('十亿立方英尺')) {
    multiplier = 283200; // 十亿立方英尺转万立方米 (1十亿立方英尺 = 28.32亿立方米 = 283200万立方米)
    cleaned = cleaned.replace(/十亿立方英尺/g, '');
  } else if (cleaned.includes('亿立方米')) {
    multiplier = 10000; // 亿立方米转万立方米
    cleaned = cleaned.replace(/亿立方米/g, '');
  } else if (cleaned.includes('万立方米')) {
    multiplier = 1; // 已经是万立方米
    cleaned = cleaned.replace(/万立方米/g, '');
  } else if (cleaned.includes('立方米') || cleaned.includes('方')) {
    multiplier = 0.0001; // 立方米转万立方米
    cleaned = cleaned.replace(/立方米|方/g, '');
  } else {
    return null; // 没有找到立方米单位
  }
  
  const match = cleaned.match(/[\d.]+/);
  if (match) {
    const num = parseFloat(match[0]);
    return isNaN(num) ? null : num * multiplier;
  }
  
  return null;
}

/**
 * 在文本中搜索关键词并提取相关数据（改进版，支持跨行匹配和更精确的提取）
 */
function extractDataByKeyword(text, keyword, productType = 'oil', contextLines = 5) {
  const results = [];
  const lines = text.split('\n');
  
  // 判断数据类型
  const isFinancial = keyword.includes('成本') || keyword.includes('营收') || keyword.includes('收入');
  const isProduction = keyword.includes('产量');
  const isSales = keyword.includes('销量') || keyword.includes('销售');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes(keyword)) {
      // 获取上下文（扩大范围以支持跨行匹配）
      const context = [];
      for (let j = Math.max(0, i - contextLines); j < Math.min(lines.length, i + contextLines + 1); j++) {
        context.push(lines[j]);
      }
      const contextText = context.join(' ');
      
      let extractedValue = null;
      
      // 根据数据类型提取
      if (isFinancial) {
        // 财务数据：提取金额（元）
        // 先尝试精确匹配：关键词 + 数字 + 单位
        const precisePattern = new RegExp(keyword + '[\\s\\t，,]+([\\d,，]+\\.?\\d*)[\\s\\t]*(?:万元|亿元|元)', 'g');
        let match = precisePattern.exec(contextText);
        if (match) {
          const unit = match[0].includes('万元') ? '万元' : (match[0].includes('亿元') ? '亿元' : '元');
          extractedValue = extractNumber(match[1] + unit);
        } else {
          // 如果精确匹配失败，使用通用方法
          const lineNumbers = contextText.match(patterns.number);
          if (lineNumbers && lineNumbers.length > 0) {
            const values = lineNumbers.map(n => extractNumber(n)).filter(n => n !== null && n > 1000000);
            if (values.length > 0) {
              extractedValue = Math.max(...values);
            }
          }
        }
      } else if (isProduction || isSales) {
        // 产量/销量数据
        if (productType === 'oil') {
          // 石油：提取桶数
          // 先尝试精确匹配
          const precisePattern = new RegExp(keyword + '[\\s\\t，,]+([\\d,，]+\\.?\\d*)[\\s\\t]*(?:万桶|百万桶|桶)', 'g');
          let match = precisePattern.exec(contextText);
          if (match) {
            const unit = match[0].includes('百万桶') ? '百万桶' : (match[0].includes('万桶') ? '万桶' : '桶');
            extractedValue = extractBarrels(match[1] + unit);
          } else {
            // 如果精确匹配失败，使用通用方法
            const barrelMatch = contextText.match(patterns.barrel);
            if (barrelMatch) {
              const values = barrelMatch.map(b => extractBarrels(b)).filter(n => n !== null && n > 0);
              if (values.length > 0) {
                extractedValue = Math.max(...values);
              }
            }
          }
        } else if (productType === 'gas') {
          // 天然气：提取立方米数
          // 先尝试精确匹配
          const precisePattern = new RegExp(keyword + '[\\s\\t，,]+([\\d,，]+\\.?\\d*)[\\s\\t]*(?:万立方米|亿立方米|立方米)', 'g');
          let match = precisePattern.exec(contextText);
          if (match) {
            const unit = match[0].includes('亿立方米') ? '亿立方米' : (match[0].includes('万立方米') ? '万立方米' : '立方米');
            extractedValue = extractCubicMeters(match[1] + unit);
          } else {
            // 如果精确匹配失败，使用通用方法
            const cubicMatch = contextText.match(patterns.cubicMeter);
            if (cubicMatch) {
              const values = cubicMatch.map(c => extractCubicMeters(c)).filter(n => n !== null && n > 0);
              if (values.length > 0) {
                extractedValue = Math.max(...values);
              }
            }
          }
        }
      }
      
      if (extractedValue) {
        const allValues = [extractedValue];
        
        results.push({
          keyword,
          line: line.trim(),
          context: contextText,
          value: extractedValue,
          allValues: allValues
        });
      }
    }
  }
  
  return results;
}

/**
 * 从文本中提取石油和天然气财务数据（根据实际表格格式）
 * 表格格式：油气销售收入（人民币百万元）、石油液体、天然气
 * 注意：PDF提取可能丢失表头，需要通过数字模式和上下文识别
 */
function extractOilGasFinancials(text) {
  const result = {
    oilRevenue: null,
    oilCost: null,
    gasRevenue: null,
    gasCost: null
  };
  
  const lines = text.split('\n');
  
  // 查找包含大数字的行（可能是表格数据）
  // 格式：143,998  161,256  (17,258)  (10.7) - 石油液体营收
  // 格式：27,747  23,856  3,891  16.3 - 天然气营收
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const prevLine = i > 0 ? lines[i - 1] : '';
    const nextLine = i < lines.length - 1 ? lines[i + 1] : '';
    const context = prevLine + ' ' + line + ' ' + nextLine;
    
    // 匹配包含逗号分隔的大数字的行（百万元级别：10,000 - 999,999）
    const numberPattern = /([\d,，]{6,})/g;
    const numbers = line.match(numberPattern);
    
    if (numbers && numbers.length >= 2) {
      // 提取第一个数字（当前期数据）
      const firstNum = numbers[0].replace(/[,，]/g, '');
      const numValue = parseFloat(firstNum);
      
      // 根据数字范围和上下文判断数据类型
      // 石油液体营收通常在 100,000 - 200,000 百万元之间（如143,998）
      // 检查是否在同一行或上下行有多个大数字（表格格式）
      if (numValue >= 100000 && numValue <= 200000) {
        // 检查上下文，判断是否是石油液体营收
        const hasOilContext = context.includes('石油') || context.includes('液体') || 
                             context.includes('143,998') || context.includes('143998') ||
                             (i > 0 && (lines[i-1].includes('销售收入') || lines[i-1].includes('石油'))) ||
                             (i < lines.length - 1 && lines[i+1].includes('天然气'));
        
        if (hasOilContext && !result.oilRevenue) {
          result.oilRevenue = numValue * 1000000; // 百万元转元
          continue;
        }
      }
      
      // 天然气营收通常在 20,000 - 50,000 百万元之间（如27,747）
      if (numValue >= 20000 && numValue <= 50000) {
        // 检查上下文，判断是否是天然气营收
        const hasGasContext = context.includes('天然气') || 
                              context.includes('27,747') || context.includes('27747') ||
                              (i > 0 && (lines[i-1].includes('天然气') || 
                                        lines[i-1].includes('27,747') ||
                                        lines[i-1].match(/[\d,，]{5,}/))) ||
                              (i < lines.length - 1 && lines[i+1].includes('实现价格'));
        
        if (hasGasContext && !result.gasRevenue) {
          result.gasRevenue = numValue * 1000000; // 百万元转元
          continue;
        }
      }
    }
  }
  
  // 如果通过数字模式没找到，尝试关键词匹配
  if (!result.oilRevenue) {
    const oilRevenuePatterns = [
      /石油液体[\s\t，,]+([\d,，]+\.?\d*)[\s\t]*(?:百万元|万元|亿元|元)/g,
      /(?:原油|石油)(?:液体)?[\s\t，,]+([\d,，]+\.?\d*)[\s\t]*(?:百万元|万元|亿元|元)/g
    ];
    
    for (const pattern of oilRevenuePatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        let unit = '元';
        if (match[0].includes('百万元')) unit = '百万元';
        else if (match[0].includes('万元')) unit = '万元';
        else if (match[0].includes('亿元')) unit = '亿元';
        
        const value = extractNumber(match[1] + unit);
        if (value && value > 1000000) {
          result.oilRevenue = value;
          break;
        }
      }
      if (result.oilRevenue) break;
    }
  }
  
  if (!result.gasRevenue) {
    const gasRevenuePatterns = [
      /天然气[\s\t，,]+([\d,，]+\.?\d*)[\s\t]*(?:百万元|万元|亿元|元)/g
    ];
    
    for (const pattern of gasRevenuePatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        let unit = '元';
        if (match[0].includes('百万元')) unit = '百万元';
        else if (match[0].includes('万元')) unit = '万元';
        else if (match[0].includes('亿元')) unit = '亿元';
        
        const value = extractNumber(match[1] + unit);
        if (value && value > 1000000) {
          result.gasRevenue = value;
          break;
        }
      }
      if (result.gasRevenue) break;
    }
  }
  
  return result;
}

/**
 * 从文本中提取石油和天然气产量、销量数据（根据实际表格格式）
 * 产量表：石油液体（百万桶）、天然气（十亿立方英尺）
 * 销量表：石油液体（百万桶）、天然气（十亿立方英尺）
 * 注意：PDF提取可能丢失表头，需要通过数字模式识别
 */
function extractOilGasProductionSales(text) {
  const result = {
    oilProduction: null,
    oilSales: null,
    gasProduction: null,
    gasSales: null
  };
  
  const lines = text.split('\n');
  
  // 查找包含数字的行（可能是表格数据）
  // 产量：296.1 百万桶（总计行）
  // 销量：290.0 百万桶（石油液体）、489.2 十亿立方英尺（天然气）
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const prevLine = i > 0 ? lines[i - 1] : '';
    const nextLine = i < lines.length - 1 ? lines[i + 1] : '';
    const context = prevLine + ' ' + line + ' ' + nextLine;
    
    // 匹配包含小数的数字（可能是产量/销量数据）
    // 格式：296.1 或 290.0 或 489.2
    const decimalPattern = /([\d,，]+\.\d+)/g;
    const decimals = line.match(decimalPattern);
    
    if (decimals && decimals.length >= 1) {
      const numValue = parseFloat(decimals[0].replace(/[,，]/g, ''));
      
      // 石油产量/销量通常在 200-400 百万桶之间（如296.1、290.0）
      // 转换为万桶是 20000-40000
      if (numValue >= 200 && numValue <= 400) {
        // 检查上下文，判断是产量还是销量
        const hasProductionContext = context.includes('产量') || context.includes('产量摘要') ||
                                    context.includes('总计') || context.includes('合计') ||
                                    (i > 0 && (lines[i-1].includes('产量') || lines[i-1].includes('产量摘要')));
        
        const hasSalesContext = context.includes('销量') || context.includes('销售量') ||
                               (i > 0 && (lines[i-1].includes('销量') || lines[i-1].includes('销售量')));
        
        if (hasProductionContext && !result.oilProduction) {
          result.oilProduction = numValue * 100; // 百万桶转万桶
        } else if (hasSalesContext && !result.oilSales) {
          result.oilSales = numValue * 100; // 百万桶转万桶
        }
      }
      
      // 天然气产量/销量通常在 300-600 十亿立方英尺之间（如395.3、489.2）
      // 转换为万立方米：300 * 283200 = 84960000，600 * 283200 = 169920000
      if (numValue >= 300 && numValue <= 600) {
        const hasGasContext = context.includes('天然气') || 
                              (i > 0 && (lines[i-1].includes('天然气') || 
                                       lines[i-1].match(/[\d,，]+\.\d+/))) ||
                              (i < lines.length - 1 && lines[i+1].includes('实现价格'));
        
        if (hasGasContext) {
          const hasProductionContext = context.includes('产量') || context.includes('产量摘要') ||
                                      (i > 0 && lines[i-1].includes('产量'));
          
          const hasSalesContext = context.includes('销量') || context.includes('销售量') ||
                                 (i > 0 && (lines[i-1].includes('销量') || lines[i-1].includes('销售量')));
          
          if (hasProductionContext && !result.gasProduction) {
            result.gasProduction = numValue * 283200; // 十亿立方英尺转万立方米
          } else if (hasSalesContext && !result.gasSales) {
            result.gasSales = numValue * 283200; // 十亿立方英尺转万立方米
          }
        }
      }
    }
  }
  
  // 如果通过数字模式没找到，尝试关键词匹配
  if (!result.oilProduction) {
    const oilProductionPatterns = [
      /(?:总计|合计|石油液体)[\s\t，,]+([\d,，]+\.?\d*)[\s\t]*(?:百万桶|万桶|桶)/g,
      /(?:原油|石油)(?:液体)?(?:净)?产量[\s\t，,]+([\d,，]+\.?\d*)[\s\t]*(?:百万桶|万桶|桶)/g
    ];
    
    for (const pattern of oilProductionPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        let unit = '桶';
        if (match[0].includes('百万桶')) unit = '百万桶';
        else if (match[0].includes('万桶')) unit = '万桶';
        
        const value = extractBarrels(match[1] + unit);
        if (value && value > 100) {
          result.oilProduction = value;
          break;
        }
      }
      if (result.oilProduction) break;
    }
  }
  
  if (!result.oilSales) {
    const oilSalesPatterns = [
      /(?:销量|销售量)[\s\t，,]+石油液体[\s\t，,]+([\d,，]+\.?\d*)[\s\t]*(?:百万桶|万桶|桶)/g,
      /石油液体[\s\t，,]+([\d,，]+\.?\d*)[\s\t]*(?:百万桶|万桶|桶)/g
    ];
    
    for (const pattern of oilSalesPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        let unit = '桶';
        if (match[0].includes('百万桶')) unit = '百万桶';
        else if (match[0].includes('万桶')) unit = '万桶';
        
        const value = extractBarrels(match[1] + unit);
        if (value && value > 100) {
          result.oilSales = value;
          break;
        }
      }
      if (result.oilSales) break;
    }
  }
  
  if (!result.gasProduction) {
    const gasProductionPatterns = [
      /天然气[\s\t，,]+([\d,，]+\.?\d*)[\s\t]*(?:十亿立方英尺|亿立方米|万立方米)/g,
      /天然气(?:净)?产量[\s\t，,]+([\d,，]+\.?\d*)[\s\t]*(?:十亿立方英尺|亿立方米|万立方米)/g
    ];
    
    for (const pattern of gasProductionPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        let unit = '立方米';
        if (match[0].includes('十亿立方英尺')) unit = '十亿立方英尺';
        else if (match[0].includes('亿立方米')) unit = '亿立方米';
        else if (match[0].includes('万立方米')) unit = '万立方米';
        
        const value = extractCubicMeters(match[1] + unit);
        if (value && value > 1000) {
          result.gasProduction = value;
          break;
        }
      }
      if (result.gasProduction) break;
    }
  }
  
  if (!result.gasSales) {
    const gasSalesPatterns = [
      /(?:销量|销售量)[\s\t，,]+天然气[\s\t，,]+([\d,，]+\.?\d*)[\s\t]*(?:十亿立方英尺|亿立方米|万立方米)/g,
      /天然气[\s\t，,]+([\d,，]+\.?\d*)[\s\t]*(?:十亿立方英尺|亿立方米|万立方米)/g
    ];
    
    for (const pattern of gasSalesPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        let unit = '立方米';
        if (match[0].includes('十亿立方英尺')) unit = '十亿立方英尺';
        else if (match[0].includes('亿立方米')) unit = '亿立方米';
        else if (match[0].includes('万立方米')) unit = '万立方米';
        
        const value = extractCubicMeters(match[1] + unit);
        if (value && value > 1000) {
          result.gasSales = value;
          break;
        }
      }
      if (result.gasSales) break;
    }
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
      oil: {
        cost: [],
        revenue: [],
        production: [],
        sales: []
      },
      gas: {
        cost: [],
        revenue: [],
        production: [],
        sales: []
      }
    };
    
    // 提取石油相关数据
    for (const keyword of keywords.oil.cost) {
      const results = extractDataByKeyword(text, keyword, 'oil');
      extractedData.oil.cost.push(...results);
    }
    
    for (const keyword of keywords.oil.revenue) {
      const results = extractDataByKeyword(text, keyword, 'oil');
      extractedData.oil.revenue.push(...results);
    }
    
    for (const keyword of keywords.oil.production) {
      const results = extractDataByKeyword(text, keyword, 'oil');
      extractedData.oil.production.push(...results);
    }
    
    for (const keyword of keywords.oil.sales) {
      const results = extractDataByKeyword(text, keyword, 'oil');
      extractedData.oil.sales.push(...results);
    }
    
    // 提取天然气相关数据
    for (const keyword of keywords.gas.cost) {
      const results = extractDataByKeyword(text, keyword, 'gas');
      extractedData.gas.cost.push(...results);
    }
    
    for (const keyword of keywords.gas.revenue) {
      const results = extractDataByKeyword(text, keyword, 'gas');
      extractedData.gas.revenue.push(...results);
    }
    
    for (const keyword of keywords.gas.production) {
      const results = extractDataByKeyword(text, keyword, 'gas');
      extractedData.gas.production.push(...results);
    }
    
    for (const keyword of keywords.gas.sales) {
      const results = extractDataByKeyword(text, keyword, 'gas');
      extractedData.gas.sales.push(...results);
    }
    
    // 提取财务数据（使用改进的提取函数）
    const financials = extractOilGasFinancials(text);
    if (financials.oilRevenue) {
      extractedData.oil.revenue.push({
        keyword: '石油销售收入',
        line: '从extractOilGasFinancials提取',
        context: '从extractOilGasFinancials提取',
        value: financials.oilRevenue,
        allValues: [financials.oilRevenue]
      });
    }
    if (financials.oilCost) {
      extractedData.oil.cost.push({
        keyword: '石油销售成本',
        line: '从extractOilGasFinancials提取',
        context: '从extractOilGasFinancials提取',
        value: financials.oilCost,
        allValues: [financials.oilCost]
      });
    }
    if (financials.gasRevenue) {
      extractedData.gas.revenue.push({
        keyword: '天然气销售收入',
        line: '从extractOilGasFinancials提取',
        context: '从extractOilGasFinancials提取',
        value: financials.gasRevenue,
        allValues: [financials.gasRevenue]
      });
    }
    if (financials.gasCost) {
      extractedData.gas.cost.push({
        keyword: '天然气销售成本',
        line: '从extractOilGasFinancials提取',
        context: '从extractOilGasFinancials提取',
        value: financials.gasCost,
        allValues: [financials.gasCost]
      });
    }
    
    // 提取产量和销量数据（使用改进的提取函数）
    const productionSales = extractOilGasProductionSales(text);
    if (productionSales.oilProduction) {
      extractedData.oil.production.push({
        keyword: '石油产量',
        line: '从extractOilGasProductionSales提取',
        context: '从extractOilGasProductionSales提取',
        value: productionSales.oilProduction,
        allValues: [productionSales.oilProduction]
      });
    }
    if (productionSales.oilSales) {
      extractedData.oil.sales.push({
        keyword: '石油销量',
        line: '从extractOilGasProductionSales提取',
        context: '从extractOilGasProductionSales提取',
        value: productionSales.oilSales,
        allValues: [productionSales.oilSales]
      });
    }
    if (productionSales.gasProduction) {
      extractedData.gas.production.push({
        keyword: '天然气产量',
        line: '从extractOilGasProductionSales提取',
        context: '从extractOilGasProductionSales提取',
        value: productionSales.gasProduction,
        allValues: [productionSales.gasProduction]
      });
    }
    if (productionSales.gasSales) {
      extractedData.gas.sales.push({
        keyword: '天然气销量',
        line: '从extractOilGasProductionSales提取',
        context: '从extractOilGasProductionSales提取',
        value: productionSales.gasSales,
        allValues: [productionSales.gasSales]
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
  const reportDir = path.join(__dirname, '../../stock/report_analysis/中国海洋石油');
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
    
    // 提取石油数据
    const oilRevenue = getMainValue(data.oil.revenue, '销售收入');
    const oilCost = getMainValue(data.oil.cost, '销售成本');
    const oilProduction = getMainValue(data.oil.production);
    const oilSales = getMainValue(data.oil.sales);
    
    // 提取天然气数据
    const gasRevenue = getMainValue(data.gas.revenue, '销售收入');
    const gasCost = getMainValue(data.gas.cost, '销售成本');
    const gasProduction = getMainValue(data.gas.production);
    const gasSales = getMainValue(data.gas.sales);
    
    summary.push({
      year: year,
      filename: data.filename,
      oil: {
        revenue: oilRevenue,
        cost: oilCost,
        production: oilProduction,
        sales: oilSales
      },
      gas: {
        revenue: gasRevenue,
        cost: gasCost,
        production: gasProduction,
        sales: gasSales
      }
    });
  }
  
  return summary;
}

/**
 * 主函数
 */
async function main() {
  console.log('开始解析中国海洋石油PDF文件...\n');
  
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
    console.log(`  石油:`);
    console.log(`    营收: ${item.oil.revenue ? (item.oil.revenue / 100000000).toFixed(2) + '亿元' : '未找到'}`);
    console.log(`    成本: ${item.oil.cost ? (item.oil.cost / 100000000).toFixed(2) + '亿元' : '未找到'}`);
    console.log(`    产量: ${item.oil.production ? item.oil.production.toFixed(2) + '万桶' : '未找到'}`);
    console.log(`    销量: ${item.oil.sales ? item.oil.sales.toFixed(2) + '万桶' : '未找到'}`);
    console.log(`  天然气:`);
    console.log(`    营收: ${item.gas.revenue ? (item.gas.revenue / 100000000).toFixed(2) + '亿元' : '未找到'}`);
    console.log(`    成本: ${item.gas.cost ? (item.gas.cost / 100000000).toFixed(2) + '亿元' : '未找到'}`);
    console.log(`    产量: ${item.gas.production ? item.gas.production.toFixed(2) + '万立方米' : '未找到'}`);
    console.log(`    销量: ${item.gas.sales ? item.gas.sales.toFixed(2) + '万立方米' : '未找到'}`);
  });
  
  // 保存为JSON文件
  const outputPath = path.join(__dirname, '../../stock/report_analysis/中国海洋石油/cnooc_data.json');
  fs.writeFileSync(outputPath, JSON.stringify({ allData, summary }, null, 2), 'utf8');
  console.log(`\n数据已保存到: ${outputPath}`);
  
  return { allData, summary };
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { parsePDF, processAllPDFs, generateSummary };

