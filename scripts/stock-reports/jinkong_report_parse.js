const { PDFParse } = require('pdf-parse');
const fs = require('fs');
const path = require('path');

/**
 * 晋控煤业年报数据提取脚本
 * 提取煤炭相关的成本、营收、产量、销量等数据
 */

// 需要提取的关键词
const keywords = {
  cost: ['成本', '营业成本', '煤炭成本', '生产成本', '煤炭销售成本'],
  revenue: ['营收', '营业收入', '煤炭营收', '煤炭收入', '主营业务收入', '煤炭销售收入'],
  external: ['外采', '外部采购', '外采煤炭'],
  production: ['原煤产量', '产量', '生产量', '煤炭产量'],
  sales: ['商品煤销量', '销量', '销售量', '销售煤炭'],
  inventory: ['库存量', '库存', '煤炭库存']
};

// 数据提取模式
const patterns = {
  number: /([\d,，]+\.?\d*)\s*(?:万元|亿元|元|万|亿)?/g,
  year: /(20\d{2})/g,
  percent: /([\d,，]+\.?\d*)\s*%/g
};

/**
 * 验证数值是否合理（避免误提取百分比、页码等）
 * @param {number} value - 要验证的数值
 * @param {string} type - 数据类型：'revenue'（营收，单位：元）、'cost'（成本，单位：元）、'production'（产量，单位：万吨）、'sales'（销量，单位：万吨）
 * @returns {boolean} 是否合理
 */
function isValidValue(value, type) {
  if (!value || isNaN(value) || value <= 0) {
    return false;
  }

  switch (type) {
    case 'revenue':
    case 'cost':
      // 营收/成本（元）：只验证最小值，避免误提取百分比等小数值
      // 最小值：100万元（1,000,000元），避免提取到百分比、页码等
      return value >= 1000000;

    case 'production':
    case 'sales':
      // 产量/销量（万吨）：只验证最小值，避免误提取百分比等小数值
      // 最小值：0.1万吨，避免提取到百分比等
      return value >= 0.1;

    default:
      // 默认只验证大于0
      return value > 0;
  }
}

/**
 * 从文本中提取数值
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
 * 从文本中提取数值（保持万吨单位，不转换为吨）
 */
function extractNumberInWanTons(text) {
  if (!text) return null;

  let cleaned = text.replace(/[,，\s]/g, '');
  cleaned = cleaned.replace(/万吨|吨/g, '');

  const match = cleaned.match(/[\d.]+/);
  if (match) {
    const num = parseFloat(match[0]);
    return isNaN(num) ? null : num;
  }

  return null;
}

/**
 * 从"主要产品"表格中提取库存数据
 * 支持两种格式：
 * 1. 旧格式：煤炭(万吨) 生产量 销售量 库存量
 * 2. 新格式（2024年报）：主要产品 | 单位 | 生产量 | 销售量 | 库存量 | ...
 */
function extractInventoryFromMainProducts(text, extractedData) {
  const lines = text.split('\n');
  let inMainProductTable = false;
  let foundHeader = false;

  // 查找"主要产品"表格
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 找到表格开始（包含"主要产品"和"生产量"、"销售量"、"库存量"）
    if ((line.includes('主要产品') || line.includes('主要产品名称')) &&
        (line.includes('生产量') || line.includes('产量')) &&
        (line.includes('销售量') || line.includes('销量')) &&
        (line.includes('库存量') || line.includes('库存'))) {
      inMainProductTable = true;
      foundHeader = true;
      continue;
    }

    // 在表格范围内查找数据行
    if (inMainProductTable && foundHeader) {
      // 匹配数据行：动力煤 万吨 3,466.64 2,996.65 81.27 ...
      // 或者：动力煤 3,466.64 2,996.65 81.27（单位在表头）
      const dataMatch = line.match(/(?:动力煤|煤炭|主要产品)[\s\t]+(?:万吨)?[\s\t]*([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/);
      if (dataMatch) {
        const productionStr = dataMatch[1].replace(/[,，]/g, '');
        const salesStr = dataMatch[2].replace(/[,，]/g, '');
        const inventoryStr = dataMatch[3].replace(/[,，]/g, '');

        const production = parseFloat(productionStr);
        const sales = parseFloat(salesStr);
        const inventory = parseFloat(inventoryStr);

        if (!isNaN(production) && isValidValue(production, 'production')) {
          extractedData.production.push({
            keyword: '主要产品表格-产量',
            line: line,
            context: line,
            value: production,
            allValues: [production]
          });
          console.log(`    从主要产品表格提取产量: ${production}万吨`);
        }

        if (!isNaN(sales) && isValidValue(sales, 'sales')) {
          extractedData.sales.push({
            keyword: '主要产品表格-销量',
            line: line,
            context: line,
            value: sales,
            allValues: [sales]
          });
          console.log(`    从主要产品表格提取销量: ${sales}万吨`);
        }

        if (!isNaN(inventory) && inventory > 0) {
          extractedData.inventory.push({
            keyword: '主要产品表格-库存',
            line: line,
            context: line,
            value: inventory,
            allValues: [inventory]
          });
          console.log(`    从主要产品表格提取库存: ${inventory}万吨`);
        }

        // 找到数据后退出表格范围
        inMainProductTable = false;
        foundHeader = false;
        continue;
      }
    }

    // 如果遇到其他表格或章节，退出
    if (inMainProductTable && (line.includes('煤炭业务经营情况') || line.includes('分行业') || line.includes('分产品'))) {
      inMainProductTable = false;
      foundHeader = false;
    }
  }

  // 旧格式：匹配 煤炭(万吨) 生产量 销售量 库存量
  const patterns = [
    /煤炭[\(（][^）)]*万吨[\)）][\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[0].includes('产量') || match[0].includes('销量') || match[0].includes('销售量')) {
        continue;
      }

      const productionStr = match[1].replace(/[,，]/g, '');
      const salesStr = match[2].replace(/[,，]/g, '');
      const inventoryStr = match[3].replace(/[,，]/g, '');

      const production = parseFloat(productionStr);
      const sales = parseFloat(salesStr);
      const inventory = parseFloat(inventoryStr);

      if (!isNaN(production) && isValidValue(production, 'production')) {
        extractedData.production.push({
          keyword: '主要产品-产量',
          line: match[0],
          context: match[0],
          value: production,
          allValues: [production]
        });
      }

      if (!isNaN(sales) && isValidValue(sales, 'sales')) {
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
 * 从"主营业务分行业情况"表格中提取数据（年报专用）
 * 表格格式：分行业 | 营业收入(元) | 营业成本(元) | 毛利率(%) | ...
 */
function extractMainBusinessByIndustryTable(text, extractedData) {
  const lines = text.split('\n');
  let inTable = false;
  let foundHeader = false;

  // 查找"主营业务分行业情况"表格
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 找到表格开始（包含"主营业务分行业"或"分行业"和"营业收入"、"营业成本"）
    if ((line.includes('主营业务分行业') || (line.includes('分行业') && line.includes('营业收入'))) &&
        line.includes('营业收入') &&
        line.includes('营业成本')) {
      inTable = true;
      foundHeader = true;
      continue;
    }

    // 在表格范围内查找"煤炭"数据行
    if (inTable && foundHeader) {
      // 匹配数据行：煤炭 14,918,007,772.68 7,337,766,004.83 50.81 ...
      // 或者：煤炭 149.18 73.38 50.81（单位是亿元）
      if (line.includes('煤炭') && !line.includes('分行业') && !line.includes('营业收入') && !line.includes('合计')) {
        // 提取数值（可能是元或亿元）
        const numbers = line.match(/[\d,，]+\.?\d+/g);
        if (numbers && numbers.length >= 2) {
          const revenueStr = numbers[0].replace(/[,，]/g, '');
          const costStr = numbers[1].replace(/[,，]/g, '');

          let revenue = parseFloat(revenueStr);
          let cost = parseFloat(costStr);

          // 判断单位：如果数值很大（>100亿），说明是元；否则可能是亿元
          // 如果数值 > 10000000000（100亿），说明是元；否则可能是亿元
          if (revenue > 10000000000) {
            // 已经是元，直接使用
          } else if (revenue > 1 && revenue < 10000) {
            // 可能是亿元，转换为元
            revenue = revenue * 100000000;
          }

          if (cost > 10000000000) {
            // 已经是元，直接使用
          } else if (cost > 1 && cost < 10000) {
            // 可能是亿元，转换为元
            cost = cost * 100000000;
          }

          if (!isNaN(revenue) && isValidValue(revenue, 'revenue')) {
            extractedData.revenue.push({
              keyword: '主营业务分行业表格-营业收入',
              line: line,
              context: line,
              value: revenue,
              allValues: [revenue]
            });
            console.log(`    从主营业务分行业表格提取营业收入: ${(revenue / 100000000).toFixed(2)}亿元`);
          }

          if (!isNaN(cost) && isValidValue(cost, 'cost')) {
            extractedData.cost.push({
              keyword: '主营业务分行业表格-营业成本',
              line: line,
              context: line,
              value: cost,
              allValues: [cost]
            });
            console.log(`    从主营业务分行业表格提取营业成本: ${(cost / 100000000).toFixed(2)}亿元`);
          }

          // 找到数据后退出表格范围
          inTable = false;
          foundHeader = false;
          continue;
        }
      }
    }

    // 如果遇到其他表格或章节，退出
    if (inTable && (line.includes('主营业务分产品') || line.includes('主营业务分地区') || line.includes('产销量情况'))) {
      inTable = false;
      foundHeader = false;
    }
  }
}

/**
 * 从"产销量情况分析表"中提取数据（年报专用）
 * 表格格式：主要产品 | 单位 | 生产量 | 销售量 | 库存量 | ...
 */
function extractProductionSalesAnalysisTable(text, extractedData) {
  const lines = text.split('\n');
  let inTable = false;
  let foundHeader = false;

  // 查找"产销量情况分析表"
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 找到表格开始（包含"产销量情况分析表"或"产销量情况"和"生产量"、"销售量"、"库存量"）
    if ((line.includes('产销量情况分析表') || line.includes('产销量情况')) &&
        (line.includes('生产量') || line.includes('产量')) &&
        (line.includes('销售量') || line.includes('销量')) &&
        (line.includes('库存量') || line.includes('库存'))) {
      inTable = true;
      foundHeader = true;
      continue;
    }

    // 在表格范围内查找数据行
    if (inTable && foundHeader) {
      // 匹配数据行：动力煤 万吨 3,468.76 3,009.57 31.97 ...
      // 或者：动力煤 3,468.76 3,009.57 31.97（单位在表头）
      const dataMatch = line.match(/(?:动力煤|煤炭)[\s\t]+(?:万吨)?[\s\t]*([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/);
      if (dataMatch) {
        const productionStr = dataMatch[1].replace(/[,，]/g, '');
        const salesStr = dataMatch[2].replace(/[,，]/g, '');
        const inventoryStr = dataMatch[3].replace(/[,，]/g, '');

        const production = parseFloat(productionStr);
        const sales = parseFloat(salesStr);
        const inventory = parseFloat(inventoryStr);

        if (!isNaN(production) && isValidValue(production, 'production')) {
          extractedData.production.push({
            keyword: '产销量情况分析表-产量',
            line: line,
            context: line,
            value: production,
            allValues: [production]
          });
          console.log(`    从产销量情况分析表提取产量: ${production}万吨`);
        }

        if (!isNaN(sales) && isValidValue(sales, 'sales')) {
          extractedData.sales.push({
            keyword: '产销量情况分析表-销量',
            line: line,
            context: line,
            value: sales,
            allValues: [sales]
          });
          console.log(`    从产销量情况分析表提取销量: ${sales}万吨`);
        }

        if (!isNaN(inventory) && inventory > 0) {
          extractedData.inventory.push({
            keyword: '产销量情况分析表-库存',
            line: line,
            context: line,
            value: inventory,
            allValues: [inventory]
          });
          console.log(`    从产销量情况分析表提取库存: ${inventory}万吨`);
        }

        // 找到数据后退出表格范围
        inTable = false;
        foundHeader = false;
        continue;
      }
    }

    // 如果遇到其他表格或章节，退出
    if (inTable && (line.includes('主营业务分行业') || line.includes('煤炭业务经营情况') || line.includes('主要产品'))) {
      inTable = false;
      foundHeader = false;
    }
  }
}

/**
 * 从"煤炭业务经营情况"表格中提取数据（年报专用）
 * 表格格式：煤炭品种 | 产量(吨) | 销量(吨) | 销售收入(亿元) | 销售成本(亿元) | 毛利(亿元)
 */
function extractCoalBusinessTable(text, extractedData) {
  const lines = text.split('\n');
  let inCoalBusinessTable = false;
  let foundHeader = false;

  // 查找"煤炭业务经营情况"表格
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 找到表格开始（包含"煤炭业务经营情况"或"煤炭品种"和"产量"、"销量"、"销售收入"）
    if ((line.includes('煤炭业务经营情况') || (line.includes('煤炭品种') && line.includes('产量'))) &&
        (line.includes('产量') || line.includes('销量')) &&
        (line.includes('销售收入') || line.includes('收入'))) {
      inCoalBusinessTable = true;
      foundHeader = true;
      continue;
    }

    // 在表格范围内查找数据行
    if (inCoalBusinessTable && foundHeader) {
      // 匹配数据行：动力煤 34,666,352.25 29,966,492.28 147.00 73.81 73.19
      // 或者：动力煤 34,666,352.25吨 29,966,492.28吨 147.00亿元 73.81亿元 73.19亿元
      const dataMatch = line.match(/(?:动力煤|煤炭)[\s\t]+([\d,，]+\.?\d*)[\s\t]*(?:吨)?[\s\t]+([\d,，]+\.?\d*)[\s\t]*(?:吨)?[\s\t]+([\d,，]+\.?\d*)[\s\t]*(?:亿元)?[\s\t]+([\d,，]+\.?\d*)[\s\t]*(?:亿元)?/);
      if (dataMatch) {
        // 产量和销量是吨，需要转换为万吨
        const productionTons = parseFloat(dataMatch[1].replace(/[,，]/g, ''));
        const salesTons = parseFloat(dataMatch[2].replace(/[,，]/g, ''));
        // 销售收入和销售成本是亿元，需要转换为元
        const revenueYi = parseFloat(dataMatch[3].replace(/[,，]/g, ''));
        const costYi = parseFloat(dataMatch[4].replace(/[,，]/g, ''));

        const production = productionTons / 10000; // 吨转万吨
        const sales = salesTons / 10000; // 吨转万吨
        const revenue = revenueYi * 100000000; // 亿元转元
        const cost = costYi * 100000000; // 亿元转元

        if (!isNaN(production) && isValidValue(production, 'production')) {
          extractedData.production.push({
            keyword: '煤炭业务经营情况表格-产量',
            line: line,
            context: line,
            value: production,
            allValues: [production]
          });
          console.log(`    从煤炭业务经营情况表格提取产量: ${production.toFixed(2)}万吨`);
        }

        if (!isNaN(sales) && isValidValue(sales, 'sales')) {
          extractedData.sales.push({
            keyword: '煤炭业务经营情况表格-销量',
            line: line,
            context: line,
            value: sales,
            allValues: [sales]
          });
          console.log(`    从煤炭业务经营情况表格提取销量: ${sales.toFixed(2)}万吨`);
        }

        if (!isNaN(revenue) && isValidValue(revenue, 'revenue')) {
          extractedData.revenue.push({
            keyword: '煤炭业务经营情况表格-销售收入',
            line: line,
            context: line,
            value: revenue,
            allValues: [revenue]
          });
          console.log(`    从煤炭业务经营情况表格提取销售收入: ${(revenue / 100000000).toFixed(2)}亿元`);
        }

        if (!isNaN(cost) && isValidValue(cost, 'cost')) {
          extractedData.cost.push({
            keyword: '煤炭业务经营情况表格-销售成本',
            line: line,
            context: line,
            value: cost,
            allValues: [cost]
          });
          console.log(`    从煤炭业务经营情况表格提取销售成本: ${(cost / 100000000).toFixed(2)}亿元`);
        }

        // 找到数据后退出表格范围
        inCoalBusinessTable = false;
        foundHeader = false;
        continue;
      }
    }

    // 如果遇到其他表格或章节，退出
    if (inCoalBusinessTable && (line.includes('主要产品') || line.includes('分行业') || line.includes('分产品'))) {
      inCoalBusinessTable = false;
      foundHeader = false;
    }
  }
}

/**
 * 在文本中搜索关键词并提取相关数据
 */
function extractDataByKeyword(text, keyword, contextLines = 3) {
  const results = [];
  const lines = text.split('\n');

  const isWanTonKeyword = keyword.includes('产量') || keyword.includes('销量') ||
                          keyword.includes('库存');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes(keyword)) {
      const context = [];
      for (let j = Math.max(0, i - contextLines); j < Math.min(lines.length, i + contextLines + 1); j++) {
        context.push(lines[j]);
      }

      let extractedValue = null;

      if (keyword.includes('产量') || keyword.includes('销量')) {
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
          pattern = new RegExp(keyword + '[^\\d]*([\\d,，]+\\.?\\d*)\\s*万吨', 'g');
          match = pattern.exec(line);
          if (match) {
            extractedValue = extractNumberInWanTons(match[1] + '万吨');
          }
        }
      }

      if (!extractedValue) {
        const lineNumbers = line.match(patterns.number);

        if (lineNumbers && lineNumbers.length > 0) {
          const extractFunc = isWanTonKeyword ? extractNumberInWanTons : extractNumber;
          const values = lineNumbers.map(n => extractFunc(n)).filter(n => n !== null);
          if (values.length > 0) {
            extractedValue = Math.max(...values);
          }
        } else {
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
 * 从文字段落中提取经营指标数据
 * 支持两种格式：
 * 1. 公司 2025 年 1-9 月份经营指标情况：煤炭产量 2618.51 万吨，商品煤销量 2085.64 万吨，销售收入 88.19 亿元，销售成本 54.69 亿元。
 * 2. 报告期末，公司完成煤炭产量 1721.91 万吨，同比增长 1.72%；商品煤销量 1329.49 万吨，同比下降 8.01%，销售收入 56.07 亿元。
 */
function extractOperatingIndicators(text) {
  const result = {
    production: null,
    sales: null,
    revenue: null,
    cost: null
  };

  // 匹配格式1：公司 YYYY 年 X 月份经营指标情况：原煤产量/煤炭产量 X 万吨，商品煤销量 X 万吨，销售收入 X 万元/亿元，销售成本 X 万元/亿元（可选）。
  // 注意：文本中可能有换行，所以使用[\s\S]*?来匹配任意字符（包括换行）
  // 特别处理"销售收入"可能被换行分割的情况（"销\n售收入"）
  // 注意：可能使用"原煤产量"而不是"煤炭产量"
  // 注意：可能使用"万元"而不是"亿元"（需要转换）
  // 注意：销售成本是可选的（2023-2025年第一季度没有销售成本，只有销售收入）
  // 注意：没有销售成本时，销售收入后面可能是句号"。"或逗号"，"（后面可能跟"其中"等文字）
  const patterns1 = [
    // 完整格式（包含销售成本）：允许换行，包括"销售收入"被分割的情况，支持"原煤产量"和"万元"单位
    /公司\s+(\d{4})\s+年\s+([^：]+)月份经营指标情况[：:][\s\S]*?(?:原煤|煤炭)产量\s+([\d,，]+\.?\d*)\s*万吨[，,][\s\S]*?商品煤销量\s+([\d,，]+\.?\d*)\s*万吨[，,][\s\S]*?销[\s]*售收入\s+([\d,，]+\.?\d*)\s*(?:万元|亿元)[，,][\s\S]*?销售成本\s+([\d,，]+\.?\d*)\s*(?:万元|亿元)/g,
    // 紧凑格式（包含销售成本）：同一行，支持"原煤产量"和"万元"单位
    /公司\s+(\d{4})\s+年\s+([^：]+)月份经营指标情况[：:]\s*(?:原煤|煤炭)产量\s+([\d,，]+\.?\d*)\s*万吨[，,]\s*商品煤销量\s+([\d,，]+\.?\d*)\s*万吨[，,]\s*销售收入\s+([\d,，]+\.?\d*)\s*(?:万元|亿元)[，,]\s*销售成本\s+([\d,，]+\.?\d*)\s*(?:万元|亿元)/g,
    // 格式1b（没有销售成本）：只有产量、销量、销售收入，销售收入后面可能是句号或逗号（后面可能跟"其中"等文字）
    /公司\s+(\d{4})\s+年\s+([^：]+)月份经营指标情况[：:][\s\S]*?(?:原煤|煤炭)产量\s+([\d,，]+\.?\d*)\s*万吨[，,][\s\S]*?商品煤销量\s+([\d,，]+\.?\d*)\s*万吨[，,][\s\S]*?销[\s]*售收入\s+([\d,，]+\.?\d*)\s*(?:万元|亿元)[。，,]/g,
    // 紧凑格式（没有销售成本）：销售收入后面可能是句号或逗号
    /公司\s+(\d{4})\s+年\s+([^：]+)月份经营指标情况[：:]\s*(?:原煤|煤炭)产量\s+([\d,，]+\.?\d*)\s*万吨[，,]\s*商品煤销量\s+([\d,，]+\.?\d*)\s*万吨[，,]\s*销售收入\s+([\d,，]+\.?\d*)\s*(?:万元|亿元)[。，,]/g
  ];

  // 匹配格式2：报告期末，公司完成煤炭产量 X 万吨，同比增长 X%；商品煤销量 X 万吨，同比下降 X%，销售收入 X 亿元。
  // 注意：这个格式可能没有销售成本，只有销售收入
  // 注意：文本中"销售收入"和"亿元"可能被换行分割（"销\n售收入"、"亿\n元"）
  // 注意：也可能使用"原煤产量"而不是"煤炭产量"
  // 注意："万吨"可能被换行分割成"万"和"吨"（"1448.41 万"在一行，"吨"在下一行）
  // 注意：中间可能插入页码等无关文本（如"-- 7 of 184 --"）
  const patterns2 = [
    // 更宽松的匹配：允许"万"和"吨"之间有更多内容（包括页码、换行等）
    // 匹配：报告期末...原煤产量 1700.68 万[任意内容]吨...商品煤销量 1448.41 万[任意内容]吨...销售收入 73.07 亿[任意内容]元
    /报告期末[，,][\s\S]*?公司完成(?:原煤|煤炭)产量\s+([\d,，]+\.?\d*)\s*万[\s\S]{0,200}?吨[，,；;][\s\S]*?商品煤销量\s+([\d,，]+\.?\d*)\s*万[\s\S]{0,200}?吨[，,；;][\s\S]*?销[\s\S]*?售收入\s+([\d,，]+\.?\d*)\s*亿[\s\S]{0,200}?元/g,
    // 允许换行，包括"销售收入"和"亿元"可能被分割的情况，支持"原煤产量"或"煤炭产量"
    // 支持"万吨"被分割成"万"和"吨"
    /报告期末[，,][\s\S]*?公司完成(?:原煤|煤炭)产量\s+([\d,，]+\.?\d*)\s*万[\s]*吨[，,；;][\s\S]*?商品煤销量\s+([\d,，]+\.?\d*)\s*万[\s]*吨[，,；;][\s\S]*?销[\s]*售收入\s+([\d,，]+\.?\d*)\s*亿[\s]*元/g,
    // 紧凑格式（同一行），支持"原煤产量"或"煤炭产量"
    /报告期末[，,]\s*公司完成(?:原煤|煤炭)产量\s+([\d,，]+\.?\d*)\s*万吨[，,；;]\s*[^，；]*商品煤销量\s+([\d,，]+\.?\d*)\s*万吨[，,；;]\s*[^，；]*销[\s]*售收入\s+([\d,，]+\.?\d*)\s*亿[\s]*元/g
  ];

  // 先尝试格式1（可能包含销售成本，也可能没有）
  for (let i = 0; i < patterns1.length; i++) {
    const pattern = patterns1[i];
    let match;
    // 重置lastIndex，避免全局匹配的问题
    pattern.lastIndex = 0;
    while ((match = pattern.exec(text)) !== null) {
      const year = match[1];
      const period = match[2];
      const production = extractNumberInWanTons(match[3] + '万吨');
      const sales = extractNumberInWanTons(match[4] + '万吨');

      // 判断单位：检查匹配文本中"销售收入"和"销售成本"后面的单位
      const fullMatch = match[0]; // 获取完整匹配文本
      // 查找"销售收入"后面的单位
      const revenueMatch = fullMatch.match(/销[\s]*售收入\s+[\d,，]+\.?\d*\s*(万元|亿元)/);
      const revenueUnit = revenueMatch ? revenueMatch[1] : '亿元';
      const revenue = extractNumber(match[5] + revenueUnit);

      // 检查是否有销售成本（前两个pattern有，后两个没有）
      let cost = null;
      if (i < 2 && match[6]) {
        // 有销售成本
        const costMatch = fullMatch.match(/销售成本\s+[\d,，]+\.?\d*\s*(万元|亿元)/);
        const costUnit = costMatch ? costMatch[1] : '亿元';
        cost = extractNumber(match[6] + costUnit);
      }

      // 验证数据合理性（只验证最小值，避免误判历史数据）
      if (isValidValue(production, 'production')) {
        result.production = production;
        console.log(`    extractOperatingIndicators: 提取到产量 ${production}万吨 (格式1${i < 2 ? '有成本' : '无成本'})`);
      }
      if (isValidValue(sales, 'sales')) {
        result.sales = sales;
        console.log(`    extractOperatingIndicators: 提取到销量 ${sales}万吨 (格式1${i < 2 ? '有成本' : '无成本'})`);
      }
      if (isValidValue(revenue, 'revenue')) {
        result.revenue = revenue;
        console.log(`    extractOperatingIndicators: 提取到营收 ${(revenue / 100000000).toFixed(2)}亿元 (格式1${i < 2 ? '有成本' : '无成本'})`);
      }
      if (cost && isValidValue(cost, 'cost')) {
        result.cost = cost;
        console.log(`    extractOperatingIndicators: 提取到成本 ${(cost / 100000000).toFixed(2)}亿元 (格式1)`);
      }

      // 如果提取到了主要数据（产量、销量、营收），返回（即使没有成本）
      if (result.production && result.sales && result.revenue) {
        return result;
      }
    }
  }

  // 如果格式1没有提取到完整数据，尝试格式2（可能没有销售成本）
  for (const pattern of patterns2) {
    let match;
    // 重置lastIndex，避免全局匹配的问题
    pattern.lastIndex = 0;
    while ((match = pattern.exec(text)) !== null) {
      const production = extractNumberInWanTons(match[1] + '万吨');
      const sales = extractNumberInWanTons(match[2] + '万吨');
      const revenue = extractNumber(match[3] + '亿元');

      // 验证数据合理性（只验证最小值，避免误判历史数据）
      if (isValidValue(production, 'production')) {
        result.production = production;
        console.log(`    extractOperatingIndicators: 提取到产量 ${production}万吨 (格式2)`);
      }
      if (isValidValue(sales, 'sales')) {
        result.sales = sales;
        console.log(`    extractOperatingIndicators: 提取到销量 ${sales}万吨 (格式2)`);
      }
      if (isValidValue(revenue, 'revenue')) {
        result.revenue = revenue;
        console.log(`    extractOperatingIndicators: 提取到营收 ${(revenue / 100000000).toFixed(2)}亿元 (格式2)`);
      }
      // 格式2没有销售成本，cost保持为null

      // 如果提取到了主要数据，返回（即使没有成本）
      if (result.production && result.sales && result.revenue) {
        return result;
      }
    }
  }

  return result;
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

  const pattern1 = /煤炭销售收入[\s\t]+([\d,，]+\.?\d*)[\s\t]+亿元[，,]*[\s\t]*煤炭销售成本[\s\t]+([\d,，]+\.?\d*)[\s\t]+亿元[，,]*[\s\t]*毛利[\s\t]+([\d,，]+\.?\d*)[\s\t]*亿/g;
  let match1 = pattern1.exec(text);
  if (match1) {
    result.coalRevenue = extractNumber(match1[1] + '亿元');
    result.coalCost = extractNumber(match1[2] + '亿元');
    result.grossProfit = extractNumber(match1[3] + '亿元');
    return result;
  }

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

  if (!result.coalRevenue) {
    const pattern5 = /(?:其中)?煤炭产品销售收入[\s\t]+([\d,，]+\.?\d*)[\s\t]*亿元/g;
    let match5;
    while ((match5 = pattern5.exec(text)) !== null) {
      const value = extractNumber(match5[1] + '亿元');
      if (isValidValue(value, 'revenue')) {
        result.coalRevenue = value;
        break;
      }
    }
  }

  if (!result.coalCost) {
    const pattern6 = /(?:其中)?煤炭产品销售成本[\s\t]+([\d,，]+\.?\d*)[\s\t]*亿元/g;
    let match6;
    while ((match6 = pattern6.exec(text)) !== null) {
      const value = extractNumber(match6[1] + '亿元');
      if (isValidValue(value, 'cost')) {
        result.coalCost = value;
        break;
      }
    }
  }

  if (!result.coalRevenue) {
    const pattern7a = /煤\s*炭\s*销售收入\s*[（(]万元[）)]\s+([\d,，]+\.?\d*)/g;
    let match7a;
    while ((match7a = pattern7a.exec(text)) !== null) {
      const value = extractNumber(match7a[1] + '万元');
      if (isValidValue(value, 'revenue')) {
        result.coalRevenue = value;
        break;
      }
    }
    if (!result.coalRevenue) {
      const pattern7 = /煤\s*炭\s*销售收入[\s\t]+([\d,，]+\.?\d*)[\s\t]*万元/g;
      let match7;
      while ((match7 = pattern7.exec(text)) !== null) {
        const value = extractNumber(match7[1] + '万元');
        if (isValidValue(value, 'revenue')) {
          result.coalRevenue = value;
          break;
        }
      }
    }
  }

  if (!result.coalCost) {
    const pattern8a = /煤\s*炭\s*销售成本\s*[（(]万元[）)]\s+([\d,，]+\.?\d*)/g;
    let match8a;
    while ((match8a = pattern8a.exec(text)) !== null) {
      const value = extractNumber(match8a[1] + '万元');
      if (isValidValue(value, 'cost')) {
        result.coalCost = value;
        break;
      }
    }
    if (!result.coalCost) {
      const pattern8 = /煤\s*炭\s*销售成本[\s\t]+([\d,，]+\.?\d*)[\s\t]*万元/g;
      let match8;
      while ((match8 = pattern8.exec(text)) !== null) {
        const value = extractNumber(match8[1] + '万元');
        if (isValidValue(value, 'cost')) {
          result.coalCost = value;
          break;
        }
      }
    }
  }

  // 匹配"公司 YYYY 年 1-3 月份经营指标情况...销售收入 X 万元，销售成本 X 万元"格式（2021年第一季度报告格式）
  // 格式：公司 2021 年 1-3 月份经营指标情况：原煤产量 X 万吨，商品煤销量 X 万吨，销售收入 X 万元，销售成本 X 万元
  if (!result.coalRevenue || !result.coalCost) {
    const patternCompanyYearPeriod = /公司\s+(\d{4})\s+年\s+1[—\-]\d+\s+月份经营指标情况[：:][\s\S]*?销售收入\s+([\d,，]+\.?\d*)\s*万元[，,][\s\S]*?销售成本\s+([\d,，]+\.?\d*)\s*万元/g;
    let matchCompanyYearPeriod = patternCompanyYearPeriod.exec(text);
    if (matchCompanyYearPeriod) {
      const revenueValue = extractNumber(matchCompanyYearPeriod[2] + '万元');
      const costValue = extractNumber(matchCompanyYearPeriod[3] + '万元');
      if (isValidValue(revenueValue, 'revenue')) {
        result.coalRevenue = revenueValue;
      }
      if (isValidValue(costValue, 'cost')) {
        result.coalCost = costValue;
      }
    }
  }

  // 匹配"公司 1—9 月...销售收入 X 万元，销售成本 X 万元"格式（2021年第三季度报告格式）
  // 格式：公司 1—9 月原煤产量 X 万吨，商品煤销量 X 万吨，销售收入 X 万元，销售成本 X 万元，毛利 X 万元
  if (!result.coalRevenue || !result.coalCost) {
    const patternCompanyPeriod = /公司\s+1[—\-]\d+\s+月[\s\S]*?销售收入\s+([\d,，]+\.?\d*)\s*万元[，,][\s\S]*?销售成本\s+([\d,，]+\.?\d*)\s*万元/g;
    let matchCompanyPeriod = patternCompanyPeriod.exec(text);
    if (matchCompanyPeriod) {
      const revenueValue = extractNumber(matchCompanyPeriod[1] + '万元');
      const costValue = extractNumber(matchCompanyPeriod[2] + '万元');
      if (isValidValue(revenueValue, 'revenue')) {
        result.coalRevenue = revenueValue;
      }
      if (isValidValue(costValue, 'cost')) {
        result.coalCost = costValue;
      }
    }
  }

  // 匹配"销售收入 X 亿元，销售成本 X 亿元"格式（文字段落中的格式，允许换行）
  if (!result.coalRevenue || !result.coalCost) {
    const patternSales = /销[\s]*售收入\s+([\d,，]+\.?\d*)\s*亿元[，,]\s*销售成本\s+([\d,，]+\.?\d*)\s*亿元/g;
    let matchSales = patternSales.exec(text);
    if (matchSales) {
      const revenueValue = extractNumber(matchSales[1] + '亿元');
      const costValue = extractNumber(matchSales[2] + '亿元');
      if (isValidValue(revenueValue, 'revenue')) {
        result.coalRevenue = revenueValue;
      }
      if (isValidValue(costValue, 'cost')) {
        result.coalCost = costValue;
      }
    }
  }

  // 匹配"销售收入 X 万元，销售成本 X 万元"格式（支持万元单位）
  if (!result.coalRevenue || !result.coalCost) {
    const patternSalesWan = /销[\s]*售收入\s+([\d,，]+\.?\d*)\s*万元[，,]\s*销售成本\s+([\d,，]+\.?\d*)\s*万元/g;
    let matchSalesWan = patternSalesWan.exec(text);
    if (matchSalesWan) {
      const revenueValue = extractNumber(matchSalesWan[1] + '万元');
      const costValue = extractNumber(matchSalesWan[2] + '万元');
      if (isValidValue(revenueValue, 'revenue')) {
        result.coalRevenue = revenueValue;
      }
      if (isValidValue(costValue, 'cost')) {
        result.coalCost = costValue;
      }
    }
  }

  if (!result.coalRevenue) {
    const pattern3 = /煤炭销售收入[\s\t]+([\d,，]+\.?\d*)[\s\t]*亿元/g;
    let match3 = pattern3.exec(text);
    if (match3) {
      const value = extractNumber(match3[1] + '亿元');
      if (isValidValue(value, 'revenue')) {
        result.coalRevenue = value;
      }
    }
  }

  if (!result.coalCost) {
    const pattern4 = /煤炭销售成本[\s\t]+([\d,，]+\.?\d*)[\s\t]*亿元/g;
    let match4 = pattern4.exec(text);
    if (match4) {
      const value = extractNumber(match4[1] + '亿元');
      if (isValidValue(value, 'cost')) {
        result.coalCost = value;
      }
    }
  }

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
      revenue: [],
      external: [],
      production: [],
      sales: [],
      inventory: []
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

    // 判断是否为年报
    const isAnnualReport = path.basename(filePath).includes('年度报告') || path.basename(filePath).includes('年报');

    // 年报优先从表格提取数据
    if (isAnnualReport) {
      console.log(`    年报文件，优先从表格提取数据...`);
      // 从"主营业务分行业情况"表格中提取营收和成本（优先级最高）
      extractMainBusinessByIndustryTable(data.text, extractedData);
      // 从"产销量情况分析表"中提取产销量和库存
      extractProductionSalesAnalysisTable(data.text, extractedData);
      // 从"主要产品"表格中提取数据
      extractInventoryFromMainProducts(data.text, extractedData);
      // 从"煤炭业务经营情况"表格中提取数据
      extractCoalBusinessTable(data.text, extractedData);
    } else {
      // 非年报：提取库存相关数据（从"主要产品"表格中提取）
      extractInventoryFromMainProducts(data.text, extractedData);
    }

    // 优先从文字段落中提取经营指标数据（更准确，但表格数据优先级更高）
    const operatingIndicators = extractOperatingIndicators(data.text);
    if (operatingIndicators.production) {
      extractedData.production.push({
        keyword: '经营指标-产量',
        line: '从extractOperatingIndicators提取',
        context: '从extractOperatingIndicators提取',
        value: operatingIndicators.production,
        allValues: [operatingIndicators.production]
      });
    }
    if (operatingIndicators.sales) {
      extractedData.sales.push({
        keyword: '经营指标-销量',
        line: '从extractOperatingIndicators提取',
        context: '从extractOperatingIndicators提取',
        value: operatingIndicators.sales,
        allValues: [operatingIndicators.sales]
      });
    }
    if (operatingIndicators.revenue) {
      extractedData.revenue.push({
        keyword: '经营指标-销售收入',
        line: '从extractOperatingIndicators提取',
        context: '从extractOperatingIndicators提取',
        value: operatingIndicators.revenue,
        allValues: [operatingIndicators.revenue]
      });
    }
    if (operatingIndicators.cost) {
      extractedData.cost.push({
        keyword: '经营指标-销售成本',
        line: '从extractOperatingIndicators提取',
        context: '从extractOperatingIndicators提取',
        value: operatingIndicators.cost,
        allValues: [operatingIndicators.cost]
      });
    }

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
  const reportDir = path.join(__dirname, '../../stock/report_analysis/晋控煤业');
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
      // 从优先的结果中选择合理的值（排除明显错误的年份、页码等）
      const preferredValues = preferredItems.map(r => r.value).filter(v => {
        if (v === null || v <= 0) return false;
        // 排除明显错误的年份值（1900-2100之间，且接近整数）
        if (v >= 1900 && v <= 2100 && Math.abs(v - Math.round(v)) < 0.01) return false;
        // 排除明显错误的页码值（1-1000之间的小整数）
        if (v >= 1 && v <= 1000 && Math.abs(v - Math.round(v)) < 0.01 && v < 10) return false;
        return true;
      });
      if (preferredValues.length > 0) {
        // 对于产量和销量，选择合理的值（通常应该在100-10000万吨之间）
        const reasonableValues = preferredValues.filter(v => v >= 100 && v <= 10000);
        if (reasonableValues.length > 0) {
          return Math.max(...reasonableValues);
        }
        // 如果没有合理范围内的值，返回最大值
        return Math.max(...preferredValues);
      }
    }
  }

  // 如果没有找到优先的，或没有指定优先关键词，取所有结果中的最大值（排除明显错误的值）
  const values = results.map(r => r.value).filter(v => {
    if (v === null || v <= 0) return false;
    // 排除明显错误的年份值
    if (v >= 1900 && v <= 2100 && Math.abs(v - Math.round(v)) < 0.01) return false;
    // 排除明显错误的页码值
    if (v >= 1 && v <= 1000 && Math.abs(v - Math.round(v)) < 0.01 && v < 10) return false;
    return true;
  });
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
    // 优先使用从表格提取的数据（年报表格数据最准确）
    // 1. 优先使用"主营业务分行业表格"数据（最准确）
    for (const rev of data.revenue) {
      if (rev.keyword === '主营业务分行业表格-营业收入') {
        coalRevenue = rev.value;
        break;
      }
    }
    // 2. 其次使用"煤炭业务经营情况表格"数据
    if (!coalRevenue) {
      for (const rev of data.revenue) {
        if (rev.keyword === '煤炭业务经营情况表格-销售收入') {
          coalRevenue = rev.value;
          break;
        }
      }
    }
    // 其次使用从extractOperatingIndicators提取的数据
    if (!coalRevenue) {
      for (const rev of data.revenue) {
        if (rev.line === '从extractOperatingIndicators提取') {
          coalRevenue = rev.value;
          break;
        }
      }
    }
    // 再次使用从extractCoalFinancials提取的数据
    if (!coalRevenue) {
      for (const rev of data.revenue) {
        if (rev.line === '从extractCoalFinancials提取') {
          coalRevenue = rev.value;
          break;
        }
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
            if (isValidValue(value, 'revenue')) {
              coalRevenue = value;
              break;
            }
          }
          // 再尝试匹配亿元
          match = rev.line.match(/煤炭产品销售收入[\s\t]+([\d,，]+\.?\d*)[\s\t]*亿元/);
          if (match) {
            const value = extractNumber(match[1] + '亿元');
            if (isValidValue(value, 'revenue')) {
              coalRevenue = value;
              break;
            }
          }
        }
      }
    }

    // 从cost中查找"煤炭销售成本"或"煤炭产品销售成本"
    // 优先使用从表格提取的数据（年报表格数据最准确）
    // 1. 优先使用"主营业务分行业表格"数据（最准确）
    for (const c of data.cost) {
      if (c.keyword === '主营业务分行业表格-营业成本') {
        coalCost = c.value;
        break;
      }
    }
    // 2. 其次使用"煤炭业务经营情况表格"数据
    if (!coalCost) {
      for (const c of data.cost) {
        if (c.keyword === '煤炭业务经营情况表格-销售成本') {
          coalCost = c.value;
          break;
        }
      }
    }
    // 其次选择从extractOperatingIndicators提取的数据
    if (!coalCost) {
      for (const c of data.cost) {
        if (c.keyword === '经营指标-销售成本' && c.line.includes('从extractOperatingIndicators提取')) {
          coalCost = c.value;
          break;
        }
      }
    }
    // 再次使用从extractCoalFinancials提取的数据
    if (!coalCost) {
      for (const c of data.cost) {
        if (c.keyword === '煤炭销售成本' && c.line.includes('从extractCoalFinancials提取')) {
          coalCost = c.value;
          break;
        }
      }
    }

    // 如果没有找到，再选择其他keyword='煤炭销售成本'的数据（排除行业数据）
    if (!coalCost) {
      for (const c of data.cost) {
        if (c.keyword === '煤炭销售成本') {
          // 排除行业数据（包含"全国"、"行业"等关键词）
          if (c.line && !c.line.includes('全国') && !c.line.includes('行业') &&
              !c.line.includes('规模以上') && !c.context.includes('全国') &&
              !c.context.includes('行业')) {
            coalCost = c.value;
            break;
          }
        }
      }
    }

    // 如果没有找到，再尝试从line中提取（排除行业数据）
    if (!coalCost) {
      for (const c of data.cost) {
        // 排除行业数据
        if (c.line && (c.line.includes('全国') || c.line.includes('行业') ||
            c.line.includes('规模以上') || c.context.includes('全国') ||
            c.context.includes('行业'))) {
          continue;
        }

        // 特殊处理：从line中提取"煤炭产品销售成本 XX 万元"或"XX 亿元"
        if (c.line.includes('煤炭产品销售成本')) {
          // 先尝试匹配万元
          let match = c.line.match(/煤炭产品销售成本[\s\t]+([\d,，]+\.?\d*)[\s\t]*万元/);
          if (match) {
            const value = extractNumber(match[1] + '万元');
            if (isValidValue(value, 'cost')) {
              coalCost = value;
              break;
            }
          }
          // 再尝试匹配亿元
          match = c.line.match(/煤炭产品销售成本[\s\t]+([\d,，]+\.?\d*)[\s\t]*亿元/);
          if (match) {
            const value = extractNumber(match[1] + '亿元');
            if (isValidValue(value, 'cost')) {
              coalCost = value;
              break;
            }
          }
        }
      }
    }

    // 如果还没找到，尝试从"营业成本"中提取（排除行业数据）
    if (!coalCost) {
      for (const c of data.cost) {
        // 排除行业数据
        if (c.line && (c.line.includes('全国') || c.line.includes('行业') ||
            c.line.includes('规模以上') || c.context.includes('全国') ||
            c.context.includes('行业'))) {
          continue;
        }

        // 如果keyword是"营业成本"，且line中包含"营业成本"和数字
        if (c.keyword === '营业成本' && c.line.includes('营业成本')) {
          // 检查是否是表格格式的营业成本（更可靠）
          const tableMatch = c.line.match(/营业成本[\s\t]+([\d,，]+\.?\d*)[\s\t]*(?:元|万元|亿元)/);
          if (tableMatch) {
            const value = extractNumber(tableMatch[1] + (c.line.includes('万元') ? '万元' :
                                        c.line.includes('亿元') ? '亿元' : '元'));
            if (isValidValue(value, 'cost')) {
              // 验证合理性：成本应该小于营收（如果营收存在）
              if (!coalRevenue || value < coalRevenue) {
                coalCost = value;
                break;
              }
            }
          }
        }
      }
    }

    // 如果还没找到，使用默认值（排除行业数据）
    if (!coalRevenue) {
      // 过滤行业数据
      const filteredRevenue = data.revenue.filter(r => {
        const lineText = r.line || '';
        const contextText = r.context || '';
        return !lineText.includes('全国') && !lineText.includes('行业') &&
               !lineText.includes('规模以上') && !contextText.includes('全国') &&
               !contextText.includes('行业');
      });
      coalRevenue = getMainValue(filteredRevenue);
    }
    if (!coalCost) {
      // 过滤行业数据
      const filteredCost = data.cost.filter(c => {
        const lineText = c.line || '';
        const contextText = c.context || '';
        return !lineText.includes('全国') && !lineText.includes('行业') &&
               !lineText.includes('规模以上') && !contextText.includes('全国') &&
               !contextText.includes('行业');
      });
      coalCost = getMainValue(filteredCost);
      // 如果成本大于营收，可能是误提取，清空
      // 注意：成本可能略大于营收（如果包含其他费用），但如果差异过大（超过20%），可能是误提取
      if (coalCost && coalRevenue && coalCost > coalRevenue * 1.2) {
        console.log(`  ⚠️  成本(${(coalCost/100000000).toFixed(2)}亿元)明显大于营收(${(coalRevenue/100000000).toFixed(2)}亿元)，可能是误提取，已清空`);
        coalCost = null;
      }
    }
    if (!grossProfit && coalRevenue && coalCost) {
      grossProfit = coalRevenue - coalCost;
    }

    // 获取原始数据
    // 优先使用从表格提取的数据（年报表格数据最准确）
    // 1. 产量：优先使用"产销量情况分析表"，其次"主要产品表格"，再次"经营指标"（半年度报告常用），最后"煤炭业务经营情况表格"（需要转换单位）
    let production = getMainValue(data.production, '产销量情况分析表');
    if (!production || production > 100000) {
      // 如果值异常大（>100000万吨），说明可能是误提取，尝试其他来源
      const productionFromMainProduct = getMainValue(data.production, '主要产品表格');
      if (productionFromMainProduct && productionFromMainProduct < 100000) {
        production = productionFromMainProduct;
      } else if (!production) {
        production = productionFromMainProduct;
      }
    }
    // 对于半年度报告，优先使用"经营指标"数据（从文字段落提取，更准确）
    if (!production || production > 100000) {
      const productionFromOperatingIndicators = getMainValue(data.production, '经营指标');
      if (productionFromOperatingIndicators && productionFromOperatingIndicators < 100000) {
        production = productionFromOperatingIndicators;
      } else if (!production) {
        production = productionFromOperatingIndicators;
      }
    }
    if (!production || production > 100000) {
      // 从"煤炭业务经营情况表格"提取的数据是吨，需要转换为万吨
      const productionFromCoalBusiness = getMainValue(data.production, '煤炭业务经营情况表格');
      if (productionFromCoalBusiness) {
        if (productionFromCoalBusiness > 10000) {
          // 如果值很大（>10000），说明是吨，需要转换为万吨
          production = productionFromCoalBusiness / 10000;
        } else {
          production = productionFromCoalBusiness;
        }
      }
    }
    if (!production) {
      production = getMainValue(data.production, '主要产品');
    }

    // 最终验证：如果产量异常大（>100000万吨），清空
    if (production && production > 100000) {
      console.log(`  ⚠️  产量数据异常 (${production.toFixed(2)}万吨)，可能是误提取，已清空`);
      production = null;
    }

    // 2. 销量：优先使用"产销量情况分析表"，其次"主要产品表格"，再次"经营指标"（半年度报告常用），最后"煤炭业务经营情况表格"（需要转换单位）
    let sales = getMainValue(data.sales, '产销量情况分析表');
    if (!sales || sales > 100000) {
      // 如果值异常大（>100000万吨），说明可能是误提取，尝试其他来源
      const salesFromMainProduct = getMainValue(data.sales, '主要产品表格');
      if (salesFromMainProduct && salesFromMainProduct < 100000) {
        sales = salesFromMainProduct;
      } else if (!sales) {
        sales = salesFromMainProduct;
      }
    }
    // 对于半年度报告，优先使用"经营指标"数据（从文字段落提取，更准确）
    if (!sales || sales > 100000) {
      const salesFromOperatingIndicators = getMainValue(data.sales, '经营指标');
      if (salesFromOperatingIndicators && salesFromOperatingIndicators < 100000) {
        sales = salesFromOperatingIndicators;
      } else if (!sales) {
        sales = salesFromOperatingIndicators;
      }
    }
    if (!sales || sales > 100000) {
      // 从"煤炭业务经营情况表格"提取的数据是吨，需要转换为万吨
      const salesFromCoalBusiness = getMainValue(data.sales, '煤炭业务经营情况表格');
      if (salesFromCoalBusiness) {
        if (salesFromCoalBusiness > 10000) {
          // 如果值很大（>10000），说明是吨，需要转换为万吨
          sales = salesFromCoalBusiness / 10000;
        } else {
          sales = salesFromCoalBusiness;
        }
      }
    }
    if (!sales) {
      sales = getMainValue(data.sales, '主要产品');
    }

    // 最终验证：如果销量异常大（>100000万吨），清空
    if (sales && sales > 100000) {
      console.log(`  ⚠️  销量数据异常 (${sales.toFixed(2)}万吨)，可能是误提取，已清空`);
      sales = null;
    }

    // 3. 库存：优先使用"产销量情况分析表"，其次"主要产品表格"
    let inventory = getMainValue(data.inventory, '产销量情况分析表');
    if (!inventory) {
      inventory = getMainValue(data.inventory, '主要产品表格');
    }
    if (!inventory) {
      inventory = getMainValue(data.inventory, '主要产品');
    }

    // 数据合理性验证（使用相对验证，避免硬编码上限）
    // 1. 产量数据：如果产量数据异常大（可能是误提取到发电量等），使用相对验证
    // 如果产量超过销量的10倍，可能是误提取
    if (production && sales && production > sales * 10) {
      console.log(`  ⚠️  产量数据异常 (${production.toFixed(2)}万吨)，可能是误提取，已清空`);
      production = null;
    }

    // 2. 销量数据：如果销量数据异常大，使用相对验证
    // 如果销量超过产量的10倍，可能是误提取
    if (sales && production && sales > production * 10) {
      console.log(`  ⚠️  销量数据异常 (${sales.toFixed(2)}万吨)，可能是误提取，已清空`);
      sales = null;
    }

    // 3. 成本和营收：如果成本≈营收（差异小于1%），说明可能没有正确提取煤炭销售成本
    if (coalCost && coalRevenue && coalRevenue > 0) {
      const diffRatio = Math.abs(coalCost - coalRevenue) / coalRevenue;
      if (diffRatio < 0.01) {
        console.log(`  ⚠️  成本≈营收 (${(coalCost/100000000).toFixed(2)}亿 ≈ ${(coalRevenue/100000000).toFixed(2)}亿)，成本数据可能不准确`);
      }
    }

    summary.push({
      year: year,
      filename: data.filename,
      cost: coalCost,
      revenue: coalRevenue,
      external: getMainValue(data.external),
      production: production,
      sales: sales,
      inventory: inventory
    });
  }

  return summary;
}

/**
 * 主函数
 */
async function main() {
  console.log('开始解析晋控煤业年报PDF文件...\n');

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
  });

  // 保存为JSON文件
  const outputPath = path.join(__dirname, '../../stock/report_analysis/晋控煤业/jinkong_data.json');
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

  // cost, revenue 单位是亿元，production, sales, inventory 单位是万吨
  const coalData = {
    production: rawItem.production || null,
    sales: rawItem.sales || null,
    inventory: rawItem.inventory || null,
    revenue: rawItem.revenue || null,  // 亿元
    cost: rawItem.cost || null,        // 亿元
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

  // 构建结果
  const result = {
    period: rawItem.period,
    year: rawItem.year,
    month: rawItem.month || getMonthFromPeriod(rawItem.period),
    type: rawItem.type || 'cumulative',
    coal: addCorrectionFlags(coalData)
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
      const fields = ['production', 'sales', 'inventory', 'revenue', 'cost', 'unitPrice', 'unitCost', 'unitGrossProfit', 'grossMargin'];
      fields.forEach(field => {
        if (existing.coal[field] == null && newData.coal[field] != null) {
          existing.coal[field] = newData.coal[field];
          updated = true;
        }
      });
    }
  }

  return updated;
}

/**
 * 生成/更新增量修正文件
 * 工作流程：PDF报告 → 自动提取(jinkong_data.json) → 增量更新(jinkong_data_corrected.json) → 手动修正 → 页面展示
 */
function generateCorrectedDataFile() {
  console.log('\n📝 生成/更新增量修正文件...\n');

  const baseDir = path.join(__dirname, '../../stock/report_analysis/晋控煤业');
  const rawDataPath = path.join(baseDir, 'jinkong_data.json');
  const correctedDataPath = path.join(baseDir, 'jinkong_data_corrected.json');

  if (!fs.existsSync(rawDataPath)) {
    console.error('❌ jinkong_data.json 不存在，请先运行 parse 命令');
    return false;
  }

  const rawDataFile = JSON.parse(fs.readFileSync(rawDataPath, 'utf-8'));
  const rawData = rawDataFile.summary || [];
  console.log(`  - 原始数据: ${rawData.length} 条记录`);

  // 初始化修正文件结构
  let correctedFile = {
    _metadata: {
      stockName: '晋控煤业',
      stockCode: '601001',
      description: '此文件包含修正后的数据，用于页面展示。手动修正的数据会被标记。',
      dataSource: 'jinkong_data.json',
      lastUpdated: new Date().toISOString().split('T')[0],
      dataFlow: 'PDF报告 → 自动提取(jinkong_data.json) → 手动修正(本文件) → 页面展示',
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
      existingFile.rawData.forEach(item => {
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
      cost: rawItem.cost ? rawItem.cost / 100000000 : null          // 元转换为亿元
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
  console.log(`\n💾 已保存到: jinkong_data_corrected.json`);
  console.log(`\n📌 提示: 可以手动编辑 jinkong_data_corrected.json 修正数据，再次运行不会覆盖手动修正`);

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

  const baseDir = path.join(__dirname, '../../stock/report_analysis/晋控煤业');
  const correctedDataPath = path.join(baseDir, 'jinkong_data_corrected.json');

  if (!fs.existsSync(correctedDataPath)) {
    console.error('❌ jinkong_data_corrected.json 不存在');
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

  const baseDir = path.join(__dirname, '../../stock/report_analysis/晋控煤业');
  const correctedDataPath = path.join(baseDir, 'jinkong_data_corrected.json');

  if (!fs.existsSync(correctedDataPath)) {
    console.error('❌ jinkong_data_corrected.json 不存在');
    return;
  }

  const correctedFile = JSON.parse(fs.readFileSync(correctedDataPath, 'utf-8'));
  const summary = correctedFile.summary || [];

  console.log('晋控煤业煤炭数据摘要');
  console.log('='.repeat(80));

  summary.forEach(item => {
    const coal = item.coal || {};
    console.log(`\n${item.period}:`);
    console.log(`  产量: ${coal.production ? coal.production.toFixed(2) + '万吨' : '-'}`);
    console.log(`  销量: ${coal.sales ? coal.sales.toFixed(2) + '万吨' : '-'}`);
    console.log(`  营收: ${coal.revenue ? coal.revenue.toFixed(2) + '亿元' : '-'}`);
    console.log(`  成本: ${coal.cost ? coal.cost.toFixed(2) + '亿元' : '-'}`);
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
