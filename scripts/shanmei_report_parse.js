const { PDFParse } = require('pdf-parse');
const fs = require('fs');
const path = require('path');

/**
 * 山煤国际年报数据提取脚本
 * 提取冶金煤/动力煤和贸易煤相关的数据
 */

// 需要提取的关键词
const keywords = {
  // 冶金煤相关
  metallurgicalCoal: {
    revenue: ['冶金煤收入', '冶金煤营收', '冶金煤销售收入', '冶金煤营业收入'],
    cost: ['冶金煤成本', '冶金煤销售成本', '冶金煤营业成本'],
    sales: ['冶金煤销量', '冶金煤销售量', '冶金煤销售'],
    production: ['冶金煤产量', '冶金煤生产量']
  },
  // 动力煤相关
  thermalCoal: {
    revenue: ['动力煤收入', '动力煤营收', '动力煤销售收入', '动力煤营业收入'],
    cost: ['动力煤成本', '动力煤销售成本', '动力煤营业成本'],
    sales: ['动力煤销量', '动力煤销售量', '动力煤销售'],
    production: ['动力煤产量', '动力煤生产量']
  },
  // 贸易煤相关
  tradeCoal: {
    revenue: ['贸易煤收入', '贸易煤营收', '贸易煤销售收入', '贸易煤营业收入', '煤炭贸易收入', '煤炭贸易营收'],
    cost: ['贸易煤成本', '贸易煤销售成本', '贸易煤营业成本', '煤炭贸易成本'],
    sales: ['贸易煤销量', '贸易煤销售量', '贸易煤销售', '煤炭贸易销量'],
    volume: ['贸易煤量', '贸易量', '煤炭贸易量']
  }
};

/**
 * 从文本中提取数值（亿元）
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
 * 从文本中提取数值（万吨）
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
    return isNaN(num) ? null : num;
  }
  
  return null;
}

/**
 * 从文本中提取数据（根据关键词）
 */
function extractDataByKeyword(text, keyword, contextLines = 5) {
  const results = [];
  const lines = text.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes(keyword)) {
      // 获取上下文
      const start = Math.max(0, i - contextLines);
      const end = Math.min(lines.length, i + contextLines + 1);
      const context = lines.slice(start, end).join(' ');
      
      // 尝试提取数值
      const numberMatch = context.match(/([\d,，]+\.?\d*)\s*(?:万元|亿元|元|万|亿|万吨|吨)/g);
      if (numberMatch) {
        const values = numberMatch.map(m => {
          if (m.includes('万吨') || m.includes('吨')) {
            return extractNumberInWanTons(m);
          } else {
            return extractNumber(m);
          }
        }).filter(v => v !== null);
        
        if (values.length > 0) {
          results.push({
            keyword: keyword,
            line: line,
            context: context,
            value: values[0],
            allValues: values
          });
        }
      }
    }
  }
  
  return results;
}

/**
 * 提取冶金煤和动力煤的分产品数据
 */
function extractMetallurgicalAndThermalCoal(text) {
  const result = {
    metallurgicalCoal: {
      sales: null,
      revenue: null,
      cost: null
    },
    thermalCoal: {
      sales: null,
      revenue: null,
      cost: null
    },
    cokeCoal: {
      sales: null,
      revenue: null,
      cost: null
    },
    anthracite: {
      sales: null,
      revenue: null,
      cost: null
    },
    tradeCoal: {
      sales: null,
      revenue: null,
      cost: null
    }
  };

  // 年报格式：动力煤 	854,692.72 	473,504.98 	44.60 	-36.82 	-6.84 	减少 	17.83 	个百分点
  // 格式：产品名 \t 收入(万元) \t 成本(万元) \t 毛利率 \t 同比收入 \t 同比成本 ...
  // 需要提取"自产煤"部分，排除"煤炭品种"表格（单位是亿元）
  
  // 先找到"自产煤"或"主营业务"部分的文本
  const lines = text.split('\n');
  let inProductSection = false;
  let productSectionText = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 开始标记：自产煤、主营业务分行业
    if (line.includes('自产煤') || line.includes('主营业务分行业') || line.includes('主营业务分产品')) {
      inProductSection = true;
    }
    
    // 结束标记：煤炭品种、主营业务分地区、单位：亿元
    if (inProductSection && (line.includes('煤炭品种') || line.includes('主营业务分地区') || 
        line.includes('单位：亿元') || line.includes('产量（吨）'))) {
      break;
    }
    
    if (inProductSection) {
      productSectionText += line + '\n';
    }
  }
  
  // 如果没找到分产品部分，使用全文（向后兼容）
  const searchText = productSectionText || text;
  
  // 匹配动力煤数据行
  const thermalCoalPattern = /(?:动力煤|动力用煤)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g;
  let match = thermalCoalPattern.exec(searchText);
  if (match) {
    const revenueWan = parseFloat(match[1].replace(/[，,]/g, ''));
    const costWan = parseFloat(match[2].replace(/[，,]/g, ''));
    
    // 验证数据合理性（收入和成本应该在1000-10000000万元之间）
    if (!isNaN(revenueWan) && revenueWan >= 1000 && revenueWan < 10000000) {
      result.thermalCoal.revenue = revenueWan; // 保持万元单位
    }
    if (!isNaN(costWan) && costWan >= 1000 && costWan < 10000000) {
      result.thermalCoal.cost = costWan; // 保持万元单位
    }
  }
  
  // 匹配冶金煤数据行（2023年报中使用"冶金煤"而非"焦煤"）
  const metallurgicalCoalPattern = /(?:冶金煤)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g;
  match = metallurgicalCoalPattern.exec(searchText);
  if (match) {
    const revenueWan = parseFloat(match[1].replace(/[，,]/g, ''));
    const costWan = parseFloat(match[2].replace(/[，,]/g, ''));
    const grossMargin = parseFloat(match[3].replace(/[，,]/g, ''));
    
    // 验证数据合理性
    if (!isNaN(revenueWan) && revenueWan >= 1000 && revenueWan < 10000000 &&
        !isNaN(grossMargin) && grossMargin >= 0 && grossMargin <= 100) {
      result.metallurgicalCoal.revenue = revenueWan;
    }
    if (!isNaN(costWan) && costWan >= 1000 && costWan < 10000000 &&
        !isNaN(grossMargin) && grossMargin >= 0 && grossMargin <= 100) {
      result.metallurgicalCoal.cost = costWan;
    }
  }
  
  // 匹配焦煤数据行
  const cokeCoalPattern = /(?:焦煤|配焦用煤)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g;
  match = cokeCoalPattern.exec(searchText);
  if (match) {
    const revenueWan = parseFloat(match[1].replace(/[，,]/g, ''));
    const costWan = parseFloat(match[2].replace(/[，,]/g, ''));
    const grossMargin = parseFloat(match[3].replace(/[，,]/g, ''));
    
    // 验证：收入和成本应该在合理范围内，且毛利率应该在0-100之间
    if (!isNaN(revenueWan) && revenueWan >= 1000 && revenueWan < 10000000 &&
        !isNaN(grossMargin) && grossMargin >= 0 && grossMargin <= 100) {
      result.cokeCoal.revenue = revenueWan;
    }
    if (!isNaN(costWan) && costWan >= 1000 && costWan < 10000000 &&
        !isNaN(grossMargin) && grossMargin >= 0 && grossMargin <= 100) {
      result.cokeCoal.cost = costWan;
    }
  }
  
  // 匹配无烟煤数据行
  const anthracitePattern = /(?:无烟煤)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g;
  match = anthracitePattern.exec(searchText);
  if (match) {
    const revenueWan = parseFloat(match[1].replace(/[，,]/g, ''));
    const costWan = parseFloat(match[2].replace(/[，,]/g, ''));
    
    if (!isNaN(revenueWan) && revenueWan >= 1000 && revenueWan < 10000000) {
      result.anthracite.revenue = revenueWan;
    }
    if (!isNaN(costWan) && costWan >= 1000 && costWan < 10000000) {
      result.anthracite.cost = costWan;
    }
  }
  
  // 匹配贸易煤数据行
  const tradeCoalPattern = /(?:贸易煤)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g;
  match = tradeCoalPattern.exec(searchText);
  if (match) {
    const revenueWan = parseFloat(match[1].replace(/[，,]/g, ''));
    const costWan = parseFloat(match[2].replace(/[，,]/g, ''));
    
    if (!isNaN(revenueWan) && revenueWan >= 1000 && revenueWan < 10000000) {
      result.tradeCoal.revenue = revenueWan;
    }
    if (!isNaN(costWan) && costWan >= 1000 && costWan < 10000000) {
      result.tradeCoal.cost = costWan;
    }
  }
  
  // 冶金煤作为焦煤的别名
  if (result.cokeCoal.revenue || result.cokeCoal.cost) {
    result.metallurgicalCoal = result.cokeCoal;
  }

  return result;
}

/**
 * 提取分产品数据（煤炭生产业务、煤炭贸易业务）
 */
function extractProductData(text) {
  const result = {
    // 煤炭生产业务（包含冶金煤和动力煤，财报中未明确区分）
    productionCoal: {
      revenue: null,
      cost: null,
      sales: null,
      production: null,
      price: null,
      unitCost: null
    },
    // 煤炭贸易业务
    tradeCoal: {
      revenue: null,
      cost: null,
      sales: null,
      volume: null,
      price: null,
      importVolume: null
    },
    // 冶金煤和动力煤分产品数据
    productBreakdown: {
      metallurgicalCoal: {
        sales: null,
        revenue: null,
        cost: null
      },
      thermalCoal: {
        sales: null,
        revenue: null,
        cost: null
      }
    },
    // 季度数据（从各报告表格中提取）
    quarterlyData: {
      q1: {
        revenue: null,
        cost: null,
        sales: null,
        production: null,
        price: null,
        unitCost: null
      },
      q2: {
        revenue: null,
        cost: null,
        sales: null,
        production: null,
        price: null,
        unitCost: null
      },
      q3: {
        revenue: null,
        cost: null,
        sales: null,
        production: null,
        price: null,
        unitCost: null
      },
      q4: {
        revenue: null,
        cost: null,
        sales: null,
        production: null,
        price: null,
        unitCost: null
      }
    }
  };
  
  // 提取煤炭生产业务数据
  // 匹配格式：公司实现煤炭生产业务收入 57.56 亿元，同比下降 29.59%，销量 1,034.56 万吨
  // 或者：报告期内，公司实现原煤产量1,782.12万吨，同比增加15.86%；公司实现煤炭生产业务收入57.56亿元
  const productionPatterns = [
    // 匹配：公司实现煤炭生产业务收 入 	57.56 	亿元（"收入"被分开的情况）
    /公司实现[\s\t]*煤炭生产业务[\s\t]*收[\s\t\n]*入[\s\t]+([\d,，]+\.?\d*)[\s\t]+(?:万元|亿元|元|万|亿)/g,
    /实现[\s\t]*煤炭生产业务[\s\t]*收[\s\t\n]*入[\s\t]+([\d,，]+\.?\d*)[\s\t]+(?:万元|亿元|元|万|亿)/g,
    /煤炭生产业务[\s\t]*收[\s\t\n]*入[\s\t]+([\d,，]+\.?\d*)[\s\t]+(?:万元|亿元|元|万|亿)/g,
    // 匹配：公司实现煤炭生产业务收入 57.56 亿元（正常情况）
    /公司实现[\s\t]*煤炭生产业务收入[\s\t]+([\d,，]+\.?\d*)[\s\t]+(?:万元|亿元|元|万|亿)/g,
    /实现[\s\t]*煤炭生产业务收入[\s\t]+([\d,，]+\.?\d*)[\s\t]+(?:万元|亿元|元|万|亿)/g,
    /煤炭生产业务收入[\s\t]+([\d,，]+\.?\d*)[\s\t]+(?:万元|亿元|元|万|亿)/g,
    /煤炭生产业务[\s\t]+收入[\s\t]+([\d,，]+\.?\d*)[\s\t]+(?:万元|亿元|元|万|亿)/g,
    /自产煤[\s\t]+营业收入[\s\t]+([\d,，]+\.?\d*)[\s\t]+(?:万元|亿元|元|万|亿)/g
  ];
  
  for (const pattern of productionPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      // 检查上下文是否包含"亿元"或"万元"
      const context = text.substring(Math.max(0, match.index - 100), Math.min(text.length, match.index + match[0].length + 100));
      let unit = '元';
      if (context.includes('亿元')) unit = '亿元';
      else if (context.includes('万元')) unit = '万元';
      
      const value = extractNumber(match[1].replace(/,，/g, '') + unit);
      if (value && value > 1000000) {
        result.productionCoal.revenue = value;
        break;
      }
    }
    if (result.productionCoal.revenue) break;
  }
  
  // 如果还没有提取到收入，尝试更宽松的模式：在"报告期内"或"本报告期"附近查找
  if (!result.productionCoal.revenue) {
    const relaxedPatterns = [
      /(?:报告期内|本报告期)[^。，；]*?煤炭生产业务[^。，；]*?收入[^。，；]*?([\d,，]+\.?\d*)[^。，；]*?(?:亿元|万元)/g,
      /(?:报告期内|本报告期)[^。，；]*?实现[^。，；]*?煤炭生产业务[^。，；]*?收入[^。，；]*?([\d,，]+\.?\d*)[^。，；]*?(?:亿元|万元)/g,
      /公司实现[^。，；]*?煤炭生产业务[^。，；]*?收入[^。，；]*?([\d,，]+\.?\d*)[^。，；]*?(?:亿元|万元)/g
    ];
    
    for (const pattern of relaxedPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const context = text.substring(Math.max(0, match.index - 50), Math.min(text.length, match.index + match[0].length + 50));
        let unit = '元';
        if (context.includes('亿元')) unit = '亿元';
        else if (context.includes('万元')) unit = '万元';
        
        const value = extractNumber(match[1].replace(/,，/g, '') + unit);
        if (value && value > 1000000 && value < 100000000000) { // 限制在合理范围内
          result.productionCoal.revenue = value;
          break;
        }
      }
      if (result.productionCoal.revenue) break;
    }
  }
  
  // 提取煤炭生产业务销量
  // 匹配格式：销量 1,034.56 万吨 或 销量1,034.56万吨
  const productionSalesPatterns = [
    /(?:煤炭生产业务|自产煤)[^。，；]*?销量[\s\t]*([\d,，]+\.?\d*)[\s\t]*(?:万吨|吨)/g,
    /销量[\s\t]*([\d,，]+\.?\d*)[\s\t]*(?:万吨|吨)[^。，；]*?(?:煤炭生产业务|自产煤)/g,
    // 匹配：公司实现煤炭生产业务收入57.56亿元，同比下降29.59%，销量1,034.56万吨
    /(?:公司实现|实现)[\s\t]*煤炭生产业务收入[^。，；]*?销量[\s\t]*([\d,，]+\.?\d*)[\s\t]*(?:万吨|吨)/g,
    /煤炭生产业务收入[^。，；]*?销量[\s\t]*([\d,，]+\.?\d*)[\s\t]*(?:万吨|吨)/g
  ];
  
  for (const pattern of productionSalesPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const value = extractNumberInWanTons(match[1] + '万吨');
      if (value && value > 0) {
        result.productionCoal.sales = value;
        break;
      }
    }
    if (result.productionCoal.sales) break;
  }
  
  // 提取原煤产量
  // 匹配格式：原煤产量 	2,664.14 	万吨
  // 优先匹配"原煤产量"，避免匹配到其他产量
  const productionVolumePatterns = [
    /原煤产量[\s\t]+([\d,，]+\.?\d*)[\s\t]+(?:万吨|吨)/g,
    /(?:报告期内|本报告期)[^。，；]*?原煤产量[\s\t]+([\d,，]+\.?\d*)[\s\t]+(?:万吨|吨)/g,
    /(?:公司实现|实现)[\s\t]*原煤产量[\s\t]+([\d,，]+\.?\d*)[\s\t]+(?:万吨|吨)/g
  ];
  
  for (const pattern of productionVolumePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const value = extractNumberInWanTons(match[1] + '万吨');
      // 验证产量值是否合理（应该在0-10000万吨之间）
      if (value && value > 0 && value < 10000) {
        result.productionCoal.production = value;
        break;
      }
    }
    if (result.productionCoal.production) break;
  }
  
  // 提取销售均价（在煤炭生产业务上下文中）
  // 匹配格式：销售均价556.34元/吨 或 销售均价 556.34 元/吨
  // 注意：PDF中可能是"销售均价 	556.34 	元/ 吨"（有制表符和空格）
  const pricePatterns = [
    // 匹配：销量 	1,034.56 	万吨，同比减少 	13.19%，销售均价 	556.34 	元/ 吨
    /销量[^。，；]*?销售均价[\s\t]+([\d,，]+\.?\d*)[\s\t]+(?:元\/[\s\t]*吨|元\/[\s\t]*t)/g,
    /(?:公司实现|实现)[\s\t]*煤炭生产业务[^。，；]*?销售均价[\s\t]+([\d,，]+\.?\d*)[\s\t]+(?:元\/[\s\t]*吨|元\/[\s\t]*t)/g,
    /(?:煤炭生产业务|自产煤)[^。，；]*?(?:销售均价|售价)[\s\t]+([\d,，]+\.?\d*)[\s\t]+(?:元\/[\s\t]*吨|元\/[\s\t]*t)/g,
    /(?:销售均价|售价)[\s\t]+([\d,，]+\.?\d*)[\s\t]+(?:元\/[\s\t]*吨|元\/[\s\t]*t)[^。，；]*?(?:煤炭生产业务|自产煤)/g
  ];
  
  for (const pattern of pricePatterns) {
    match = pattern.exec(text);
    if (match) {
      const value = parseFloat(match[1].replace(/,，/g, ''));
      if (!isNaN(value) && value > 0 && value < 10000) { // 售价应该在合理范围内
        result.productionCoal.price = value;
        break;
      }
    }
    // 重置正则表达式的lastIndex，以便下次匹配
    pattern.lastIndex = 0;
  }
  
  // 如果还没有提取到售价，尝试更简单的模式
  if (!result.productionCoal.price) {
    const simplePricePattern = /销售均价[\s\t]+([\d,，]+\.?\d*)[\s\t]+元/g;
    match = simplePricePattern.exec(text);
    if (match) {
      const value = parseFloat(match[1].replace(/,，/g, ''));
      if (!isNaN(value) && value > 0 && value < 10000) {
        result.productionCoal.price = value;
      }
    }
  }
  
  // 提取吨煤成本（在煤炭生产业务上下文中）
  // 匹配格式：吨煤成本 	253.83 	元 或 吨煤成本 253.83 元/吨
  const costPatterns = [
    // 匹配：销售均价 	509.31 	元/吨， 吨煤成本 	253.83 	元
    /吨煤成本[\s\t]+([\d,，]+\.?\d*)[\s\t]+(?:元|元\/[\s\t]*吨|元\/[\s\t]*t)/g,
    // 匹配：在煤炭生产业务上下文中
    /(?:煤炭生产业务|自产煤)[^。，；]*?吨煤成本[\s\t]+([\d,，]+\.?\d*)[\s\t]+(?:元|元\/[\s\t]*吨|元\/[\s\t]*t)/g,
    /(?:煤炭生产业务|自产煤)[^。，；]*?(?:吨煤成本|成本)[\s\t]+([\d,，]+\.?\d*)[\s\t]*(?:元\/[\s\t]*吨|元\/[\s\t]*t)/g,
    /(?:吨煤成本|成本)[\s\t]+([\d,，]+\.?\d*)[\s\t]*(?:元\/[\s\t]*吨|元\/[\s\t]*t)[^。，；]*?(?:煤炭生产业务|自产煤)/g
  ];
  
  for (const pattern of costPatterns) {
    match = pattern.exec(text);
    if (match) {
      const value = parseFloat(match[1].replace(/,，/g, ''));
      if (!isNaN(value) && value > 0 && value < 10000) { // 成本应该在合理范围内
        result.productionCoal.unitCost = value;
        break;
      }
    }
    // 重置正则表达式的lastIndex
    pattern.lastIndex = 0;
  }
  
  // 如果还没有提取到成本，尝试更简单的模式：吨煤成本 	253.83 	元
  if (!result.productionCoal.unitCost) {
    const simpleCostPattern = /吨煤成本[\s\t]+([\d,，]+\.?\d*)[\s\t]+元/g;
    match = simpleCostPattern.exec(text);
    if (match) {
      const value = parseFloat(match[1].replace(/,，/g, ''));
      if (!isNaN(value) && value > 0 && value < 10000) {
        result.productionCoal.unitCost = value;
      }
    }
  }
  
  // 如果没有提取到单位成本，尝试从营业成本计算
  if (!result.productionCoal.unitCost && result.productionCoal.revenue && result.productionCoal.sales) {
    // 尝试提取营业成本
    const costPattern = /(?:煤炭生产业务|自产煤)[^。]*?营业成本[\s\t]+([\d,，]+\.?\d*)[\s\t]*(?:万元|亿元|元|万|亿)/g;
    match = costPattern.exec(text);
    if (match) {
      const context = text.substring(Math.max(0, match.index - 50), Math.min(text.length, match.index + match[0].length + 50));
      let unit = '元';
      if (context.includes('亿元')) unit = '亿元';
      else if (context.includes('万元')) unit = '万元';
      const costValue = extractNumber(match[1] + unit);
      if (costValue && result.productionCoal.sales) {
        result.productionCoal.cost = costValue / 100000000; // 转换为亿元
        result.productionCoal.unitCost = (costValue / result.productionCoal.sales) / 10000; // 转换为元/吨
      }
    }
  }
  
  // 计算成本（如果有收入和销量）
  if (result.productionCoal.revenue && result.productionCoal.sales && result.productionCoal.unitCost) {
    result.productionCoal.cost = result.productionCoal.sales * result.productionCoal.unitCost / 10000; // 转换为亿元
  }
  
  // 提取煤炭贸易业务数据
  // 匹配格式：公司实现煤炭贸易业务收入 35.43 亿元，同比下降 36.51%，贸易量 753.79 万吨
  const tradePatterns = [
    /煤炭贸易业务收入[\s\t]+([\d,，]+\.?\d*)[\s\t]*(?:万元|亿元|元|万|亿)/g,
    /煤炭贸易业务[\s\t]+收入[\s\t]+([\d,，]+\.?\d*)[\s\t]*(?:万元|亿元|元|万|亿)/g,
    /贸易煤[\s\t]+营业收入[\s\t]+([\d,，]+\.?\d*)[\s\t]*(?:万元|亿元|元|万|亿)/g
  ];
  
  for (const pattern of tradePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const value = extractNumber(match[1] + (match[0].includes('亿') ? '亿元' : match[0].includes('万') ? '万元' : '元'));
      if (value && value > 1000000) {
        result.tradeCoal.revenue = value;
        break;
      }
    }
    if (result.tradeCoal.revenue) break;
  }
  
  // 提取贸易量
  const tradeVolumePatterns = [
    /(?:贸易量|贸易煤销量)[\s\t]+([\d,，]+\.?\d*)[\s\t]*(?:万吨|吨)/g,
    /贸易煤[\s\t]+销量[\s\t]+([\d,，]+\.?\d*)[\s\t]*(?:万吨|吨)/g
  ];
  
  for (const pattern of tradeVolumePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const value = extractNumberInWanTons(match[1] + '万吨');
      if (value && value > 0) {
        result.tradeCoal.sales = value;
        result.tradeCoal.volume = value;
        break;
      }
    }
    if (result.tradeCoal.sales) break;
  }
  
  // 提取进口量
  const importPattern = /(?:进口量|进口煤)[\s\t]+([\d,，]+\.?\d*)[\s\t]*(?:万吨|吨)/g;
  match = importPattern.exec(text);
  if (match) {
    const value = extractNumberInWanTons(match[1] + '万吨');
    if (value && value > 0) {
      result.tradeCoal.importVolume = value;
    }
  }
  
  // 提取贸易煤售价
  const tradePricePattern = /(?:贸易煤|煤炭贸易)[^。]*?(?:销售均价|售价)[\s\t]+([\d,，]+\.?\d*)[\s\t]*(?:元\/吨|元\/t)/g;
  match = tradePricePattern.exec(text);
  if (match) {
    const value = parseFloat(match[1].replace(/,，/g, ''));
    if (!isNaN(value) && value > 0) {
      result.tradeCoal.price = value;
    }
  }
  
  // 计算贸易煤成本（如果有收入和销量、售价）
  if (result.tradeCoal.revenue && result.tradeCoal.sales && result.tradeCoal.price) {
    // 毛利率通常很低，可以从文本中提取或估算
    const grossMarginPattern = /(?:贸易煤|煤炭贸易)[^。]*?毛利率[^。]*?([\d,，]+\.?\d*)[\s\t]*%/g;
    let marginMatch = grossMarginPattern.exec(text);
    if (marginMatch) {
      const margin = parseFloat(marginMatch[1].replace(/,，/g, ''));
      if (!isNaN(margin)) {
        result.tradeCoal.cost = result.tradeCoal.revenue * (1 - margin / 100) / 100000000; // 转换为亿元
      }
    }
  }
  
  // 提取煤种分产品数据
  const productBreakdown = extractMetallurgicalAndThermalCoal(text);
  if (productBreakdown) {
    result.productBreakdown.metallurgicalCoal = productBreakdown.metallurgicalCoal;
    result.productBreakdown.thermalCoal = productBreakdown.thermalCoal;
    result.productBreakdown.cokeCoal = productBreakdown.cokeCoal;
    result.productBreakdown.anthracite = productBreakdown.anthracite;
    result.productBreakdown.tradeCoal = productBreakdown.tradeCoal;
  }
  
  // 提取季度数据（从报告的表格中）
  // 根据报告类型提取不同的季度数据
  const filename = arguments[1] || ''; // 从调用处传入文件名
  extractQuarterlyDataFromTable(text, result, filename);

  return result;
}

/**
 * 从半年度报告的表格中提取Q1和Q2的季度数据
 */
function extractQuarterlyDataFromTable(text, result, filename = '') {
  // 根据报告类型提取不同的季度数据
  // 业绩报只提取当前季度数据：半年报→Q2，三季报→Q3，年报→Q4
  const isFirstQuarter = filename.includes('第一季度');
  const isHalfYear = filename.includes('半年度') || filename.includes('半年');
  const isThirdQuarter = filename.includes('第三季度');
  const isAnnual = filename.includes('年度报告') || filename.includes('年报');
  
  // 提取年份
  const yearMatch = filename.match(/20\d{2}/);
  const year = yearMatch ? parseInt(yearMatch[0]) : null;
  
  // 半年度报告：只提取Q2数据
  if (isHalfYear) {
    extractQ2FromHalfYearReport(text, result, year);
  }
  // 第三季度报告：只提取Q3数据
  else if (isThirdQuarter) {
    extractQ3FromThirdQuarterReport(text, result, year);
  }
  // 年度报告：只提取Q4数据
  else if (isAnnual) {
    extractQ4FromAnnualReport(text, result, year);
  }
  // 第一季度报告：提取Q1数据（作为单季度数据）
  else if (isFirstQuarter) {
    extractQ1FromFirstQuarterReport(text, result);
  }
}

/**
 * 从半年度报告的表格中提取Q2的季度数据
 * 新策略：直接提取Q2单季数据
 * 
 * 2024年开始：新格式，表格列顺序为 Q1 | Q2（正序），Q2是第二列
 * 2023年及之前：旧格式，表格列顺序为 Q2 | Q1（倒序），Q2是第一列
 */
function extractQ2FromHalfYearReport(text, result, year = null) {
  console.log('  提取Q2单季数据...');
  
  // 判断是否使用新格式（2024年开始）
  const useNewFormat = year && year >= 2024;
  
  if (useNewFormat) {
    console.log('    使用2024年新格式（正序：Q1|Q2）');
    extractQ2FromHalfYearReport_NewFormat(text, result);
  } else {
    console.log('    使用旧格式（倒序：Q2|Q1）');
    extractQ2FromHalfYearReport_OldFormat(text, result);
  }
}

/**
 * 2024年新格式：提取Q2数据
 * 表格格式：2024年第一季度 | 2024年第二季度
 */
function extractQ2FromHalfYearReport_NewFormat(text, result) {
  // 新格式：Q2是第二列
  // 提取Q2营业收入（万元）- 第二列
  const revenuePattern = /营业收入[（(]万元[）)]\s+([\d,，]+\.?\d*)\s+([\d,，]+\.?\d*)/;
  let match = text.match(revenuePattern);
  if (match) {
    const q2RevenueWan = parseFloat(match[2].replace(/[，,]/g, '')); // 第二列是Q2
    if (!isNaN(q2RevenueWan) && q2RevenueWan >= 1000 && q2RevenueWan < 1000000) {
      result.quarterlyData.q2.revenue = q2RevenueWan / 10000;
      console.log(`    Q2营业收入: ${result.quarterlyData.q2.revenue.toFixed(2)} 亿元`);
    }
  }
  
  // 提取Q2营业成本（万元）- 第二列
  const costPattern = /营业成本[（(]万元[）)]\s+([\d,，]+\.?\d*)\s+([\d,，]+\.?\d*)/;
  match = text.match(costPattern);
  if (match) {
    const q2CostWan = parseFloat(match[2].replace(/[，,]/g, ''));
    if (!isNaN(q2CostWan) && q2CostWan >= 1000 && q2CostWan < 1000000) {
      result.quarterlyData.q2.cost = q2CostWan / 10000;
      console.log(`    Q2营业成本: ${result.quarterlyData.q2.cost.toFixed(2)} 亿元`);
    }
  }
  
  // 提取Q2销量（万吨）- 第二列
  const salesPattern = /销量[（(]万吨[）)]\s+([\d,，]+\.?\d*)\s+([\d,，]+\.?\d*)/;
  match = text.match(salesPattern);
  if (match) {
    const q2Sales = parseFloat(match[2].replace(/[，,]/g, ''));
    if (!isNaN(q2Sales) && q2Sales >= 100 && q2Sales < 10000) {
      result.quarterlyData.q2.sales = q2Sales;
      console.log(`    Q2销量: ${q2Sales} 万吨`);
    }
  }
  
  // 提取Q2产量（万吨）- 第二列
  const productionPattern = /产量[（(]万吨[）)]\s+([\d,，]+\.?\d*)\s+([\d,，]+\.?\d*)/;
  match = text.match(productionPattern);
  if (match) {
    const q2Production = parseFloat(match[2].replace(/[，,]/g, ''));
    if (!isNaN(q2Production) && q2Production >= 100 && q2Production < 10000) {
      result.quarterlyData.q2.production = q2Production;
      console.log(`    Q2产量: ${q2Production} 万吨`);
    }
  }
  
  // 提取Q2售价（元/吨）- 第二列
  const pricePattern = /售价[（(]元\/吨[）)]\s+([\d,，]+\.?\d*)\s+([\d,，]+\.?\d*)/;
  match = text.match(pricePattern);
  if (match) {
    const q2Price = parseFloat(match[2].replace(/[，,]/g, ''));
    if (!isNaN(q2Price) && q2Price >= 100 && q2Price < 2000) {
      result.quarterlyData.q2.price = q2Price;
      console.log(`    Q2售价: ${q2Price} 元/吨`);
    }
  }
  
  // 提取Q2吨煤成本（元/吨）- 第二列
  const unitCostPattern = /吨煤成本[（(]元\/吨[）)]\s+([\d,，]+\.?\d*)\s+([\d,，]+\.?\d*)/;
  match = text.match(unitCostPattern);
  if (match) {
    const q2UnitCost = parseFloat(match[2].replace(/[，,]/g, ''));
    if (!isNaN(q2UnitCost) && q2UnitCost >= 50 && q2UnitCost < 1000) {
      result.quarterlyData.q2.unitCost = q2UnitCost;
      console.log(`    Q2吨煤成本: ${q2UnitCost} 元/吨`);
    }
  }
  
  // 如果提取到了成本和销量，计算单位成本
  if (!result.quarterlyData.q2.unitCost && result.quarterlyData.q2.cost && result.quarterlyData.q2.sales) {
    result.quarterlyData.q2.unitCost = parseFloat(((result.quarterlyData.q2.cost * 10000) / result.quarterlyData.q2.sales).toFixed(2));
    console.log(`    Q2吨煤成本（计算）: ${result.quarterlyData.q2.unitCost} 元/吨`);
  }
}

/**
 * 旧格式：提取Q2数据
 * 表格格式：第二季度 | 第一季度
 */
function extractQ2FromHalfYearReport_OldFormat(text, result) {
  console.log('  提取Q2单季数据（旧格式）...');
  
  // 半年报表格格式：
  // 项目          第二季度    第一季度    增减比例
  // 营业收入      xxx        xxx         xx%
  // 第一列是Q2数据，第二列是Q1数据
  
  // 提取Q2营业收入（万元）- 第一列数据
  const revenueRowPattern = /营业收入[（(]万元[）)][\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+[\d,，\-]+\.?\d*/;
  let match = text.match(revenueRowPattern);
  if (match) {
    const q2RevenueWan = parseFloat(match[1].replace(/[，,]/g, ''));
    if (!isNaN(q2RevenueWan) && q2RevenueWan >= 1000 && q2RevenueWan < 1000000) {
      result.quarterlyData.q2.revenue = q2RevenueWan / 10000; // 转换为亿元
      console.log(`    Q2营业收入: ${result.quarterlyData.q2.revenue.toFixed(2)} 亿元`);
    }
  }
  
  // 提取Q2营业成本（万元）- 第一列数据
  const costRowPattern = /营业成本[（(]万元[）)][\s\t]+([\d,，]+\.?\d+)[\s\t]+([\d,，]+\.?\d+)[\s\t]+[\d,，\-]+\.?\d*/;
  match = text.match(costRowPattern);
  if (match) {
    const q2CostWan = parseFloat(match[1].replace(/[，,]/g, ''));
    if (!isNaN(q2CostWan) && q2CostWan >= 1000 && q2CostWan < 1000000) {
      result.quarterlyData.q2.cost = q2CostWan / 10000; // 转换为亿元
      console.log(`    Q2营业成本: ${result.quarterlyData.q2.cost.toFixed(2)} 亿元`);
    }
  }
  
  // 提取Q2销量（万吨）- 第一列数据
  const salesRowPattern = /销量[（(]万吨[）)][\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+[\d,，\-]+\.?\d*/;
  match = text.match(salesRowPattern);
  if (match) {
    const q2Sales = parseFloat(match[1].replace(/[,，]/g, ''));
    if (!isNaN(q2Sales) && q2Sales >= 100 && q2Sales < 10000) {
      result.quarterlyData.q2.sales = q2Sales;
      console.log(`    Q2销量: ${q2Sales} 万吨`);
    }
  }
  
  // 提取Q2产量（万吨）- 第一列数据
  const productionRowPattern = /产量[（(]万吨[）)][\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+[\d,，\-]+\.?\d*/;
  match = text.match(productionRowPattern);
  if (match) {
    const q2Production = parseFloat(match[1].replace(/[,，]/g, ''));
    if (!isNaN(q2Production) && q2Production >= 100 && q2Production < 10000) {
      result.quarterlyData.q2.production = q2Production;
      console.log(`    Q2产量: ${q2Production} 万吨`);
    }
  }
  
  // 提取Q2售价（元/吨）- 第一列数据
  const priceRowPattern = /售价[（(]元\/吨[）)][\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+[\d,，\-]+\.?\d*/;
  match = text.match(priceRowPattern);
  if (match) {
    const q2Price = parseFloat(match[1].replace(/[,，]/g, ''));
    if (!isNaN(q2Price) && q2Price >= 100 && q2Price < 2000) {
      result.quarterlyData.q2.price = q2Price;
      console.log(`    Q2售价: ${q2Price} 元/吨`);
    }
  }
  
  // 提取Q2吨煤成本（元/吨）- 第一列数据
  const unitCostRowPattern = /吨煤成本[（(]元\/吨[）)][\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+[\d,，\-]+\.?\d*/;
  match = text.match(unitCostRowPattern);
  if (match) {
    const q2UnitCost = parseFloat(match[1].replace(/[,，]/g, ''));
    if (!isNaN(q2UnitCost) && q2UnitCost >= 50 && q2UnitCost < 1000) {
      result.quarterlyData.q2.unitCost = q2UnitCost;
      console.log(`    Q2吨煤成本: ${q2UnitCost} 元/吨`);
    }
  }
  
  // 如果提取到了成本和销量，计算单位成本
  if (!result.quarterlyData.q2.unitCost && result.quarterlyData.q2.cost && result.quarterlyData.q2.sales) {
    result.quarterlyData.q2.unitCost = parseFloat(((result.quarterlyData.q2.cost * 10000) / result.quarterlyData.q2.sales).toFixed(2));
    console.log(`    Q2吨煤成本（计算）: ${result.quarterlyData.q2.unitCost} 元/吨`);
  }
}

/**
 * 从第三季度报告的表格中提取Q3的季度数据
 * 新策略：直接提取Q3单季数据
 * 
 * 2024年开始：新格式，表格列顺序为 Q1 | Q2 | Q3（正序），Q3是第三列
 * 2023年及之前：旧格式，表格列顺序为 Q3 | Q2 | Q1（倒序），Q3是第一列
 */
function extractQ3FromThirdQuarterReport(text, result, year = null) {
  console.log('  提取Q3单季数据...');
  
  // 判断是否使用新格式（2024年开始）
  const useNewFormat = year && year >= 2024;
  
  if (useNewFormat) {
    console.log('    使用2024年新格式（正序：Q1|Q2|Q3）');
    extractQ3FromThirdQuarterReport_NewFormat(text, result);
  } else {
    console.log('    使用旧格式（倒序：Q3|Q2|Q1）');
    extractQ3FromThirdQuarterReport_OldFormat(text, result);
  }
}

/**
 * 2024年新格式：提取Q3数据
 * 表格格式：2024年第一季度 | 2024年第二季度 | 2024年第三季度
 */
function extractQ3FromThirdQuarterReport_NewFormat(text, result) {
  // 初始化q3对象
  if (!result.quarterlyData.q3) result.quarterlyData.q3 = {};
  
  // 新格式：Q3是第三列
  // 提取Q3营业收入（万元）- 第三列
  const revenuePattern = /营业收入[（(]万元[）)]\s+([\d,，]+\.?\d*)\s+([\d,，]+\.?\d*)\s+([\d,，]+\.?\d*)/;
  let match = text.match(revenuePattern);
  if (match) {
    const q3RevenueWan = parseFloat(match[3].replace(/[，,]/g, '')); // 第三列是Q3
    if (!isNaN(q3RevenueWan) && q3RevenueWan >= 1000 && q3RevenueWan < 1000000) {
      result.quarterlyData.q3.revenue = q3RevenueWan / 10000;
      console.log(`    Q3营业收入: ${result.quarterlyData.q3.revenue.toFixed(2)} 亿元`);
    }
  }
  
  // 提取Q3营业成本（万元）- 第三列
  const costPattern = /营业成本[（(]万元[）)]\s+([\d,，]+\.?\d*)\s+([\d,，]+\.?\d*)\s+([\d,，]+\.?\d*)/;
  match = text.match(costPattern);
  if (match) {
    const q3CostWan = parseFloat(match[3].replace(/[，,]/g, ''));
    if (!isNaN(q3CostWan) && q3CostWan >= 1000 && q3CostWan < 1000000) {
      result.quarterlyData.q3.cost = q3CostWan / 10000;
      console.log(`    Q3营业成本: ${result.quarterlyData.q3.cost.toFixed(2)} 亿元`);
    }
  }
  
  // 提取Q3销量（万吨）- 第三列
  const salesPattern = /销量[（(]万吨[）)]\s+([\d,，]+\.?\d*)\s+([\d,，]+\.?\d*)\s+([\d,，]+\.?\d*)/;
  match = text.match(salesPattern);
  if (match) {
    const q3Sales = parseFloat(match[3].replace(/[，,]/g, ''));
    if (!isNaN(q3Sales) && q3Sales >= 100 && q3Sales < 10000) {
      result.quarterlyData.q3.sales = q3Sales;
      console.log(`    Q3销量: ${q3Sales} 万吨`);
    }
  }
  
  // 提取Q3产量（万吨）- 第三列
  const productionPattern = /产量[（(]万吨[）)]\s+([\d,，]+\.?\d*)\s+([\d,，]+\.?\d*)\s+([\d,，]+\.?\d*)/;
  match = text.match(productionPattern);
  if (match) {
    const q3Production = parseFloat(match[3].replace(/[，,]/g, ''));
    if (!isNaN(q3Production) && q3Production >= 100 && q3Production < 10000) {
      result.quarterlyData.q3.production = q3Production;
      console.log(`    Q3产量: ${q3Production} 万吨`);
    }
  }
  
  // 提取Q3售价（元/吨）- 第三列
  const pricePattern = /售价[（(]元\/吨[）)]\s+([\d,，]+\.?\d*)\s+([\d,，]+\.?\d*)\s+([\d,，]+\.?\d*)/;
  match = text.match(pricePattern);
  if (match) {
    const q3Price = parseFloat(match[3].replace(/[，,]/g, ''));
    if (!isNaN(q3Price) && q3Price >= 100 && q3Price < 2000) {
      result.quarterlyData.q3.price = q3Price;
      console.log(`    Q3售价: ${q3Price} 元/吨`);
    }
  }
  
  // 提取Q3吨煤成本（元/吨）- 第三列
  const unitCostPattern = /吨煤成本[（(]元\/吨[）)]\s+([\d,，]+\.?\d*)\s+([\d,，]+\.?\d*)\s+([\d,，]+\.?\d*)/;
  match = text.match(unitCostPattern);
  if (match) {
    const q3UnitCost = parseFloat(match[3].replace(/[，,]/g, ''));
    if (!isNaN(q3UnitCost) && q3UnitCost >= 50 && q3UnitCost < 1000) {
      result.quarterlyData.q3.unitCost = q3UnitCost;
      console.log(`    Q3吨煤成本: ${q3UnitCost} 元/吨`);
    }
  }
  
  // 如果提取到了成本和销量，计算单位成本
  if (!result.quarterlyData.q3.unitCost && result.quarterlyData.q3.cost && result.quarterlyData.q3.sales) {
    result.quarterlyData.q3.unitCost = parseFloat(((result.quarterlyData.q3.cost * 10000) / result.quarterlyData.q3.sales).toFixed(2));
    console.log(`    Q3吨煤成本（计算）: ${result.quarterlyData.q3.unitCost} 元/吨`);
  }
}

/**
 * 旧格式：提取Q3数据
 * 表格格式：第三季度 | 第二季度 | 第一季度
 */
function extractQ3FromThirdQuarterReport_OldFormat(text, result) {
  console.log('  提取Q3单季数据（旧格式）...');
  
  // 三季报表格格式：
  // 项目          第三季度    第二季度    第一季度    增减比例
  // 营业收入      xxx        xxx         xxx         xx%
  // 第一列是Q3数据，第二列是Q2数据，第三列是Q1数据
  
  // 初始化q3对象
  if (!result.quarterlyData.q3) result.quarterlyData.q3 = {};
  
  // 提取Q3营业收入（万元）- 第一列数据
  const revenueRowPattern = /营业收入[（(]万元[）)][\s\t]+([\d,，]+\.?\d+)[\s\t]+([\d,，]+\.?\d+)[\s\t]+([\d,，]+\.?\d+)[\s\t]+[\d,，\-]+\.?\d*/;
  let match = text.match(revenueRowPattern);
  if (match) {
    const q3RevenueWan = parseFloat(match[1].replace(/[，,]/g, ''));
    if (!isNaN(q3RevenueWan) && q3RevenueWan >= 1000 && q3RevenueWan < 1000000) {
      result.quarterlyData.q3.revenue = q3RevenueWan / 10000;
      console.log(`    Q3营业收入: ${result.quarterlyData.q3.revenue.toFixed(2)} 亿元`);
    }
  }
  
  // 提取Q3营业成本（万元）- 第一列数据
  const costRowPattern = /营业成本[（(]万元[）)][\s\t]+([\d,，]+\.?\d+)[\s\t]+([\d,，]+\.?\d+)[\s\t]+([\d,，]+\.?\d+)[\s\t]+[\d,，\-]+\.?\d*/;
  match = text.match(costRowPattern);
  if (match) {
    const q3CostWan = parseFloat(match[1].replace(/[，,]/g, ''));
    if (!isNaN(q3CostWan) && q3CostWan >= 1000 && q3CostWan < 1000000) {
      result.quarterlyData.q3.cost = q3CostWan / 10000;
      console.log(`    Q3营业成本: ${result.quarterlyData.q3.cost.toFixed(2)} 亿元`);
    }
  }
  
  // 提取Q3销量（万吨）- 第一列数据
  const salesRowPattern = /销量[（(]万吨[）)][\s\t]+([\d,，]+\.?\d+)[\s\t]+([\d,，]+\.?\d+)[\s\t]+([\d,，]+\.?\d+)[\s\t]+[\d,，\-]+\.?\d*/;
  match = text.match(salesRowPattern);
  if (match) {
    const q3Sales = parseFloat(match[1].replace(/[，,]/g, ''));
    if (!isNaN(q3Sales) && q3Sales >= 100 && q3Sales < 10000) {
      result.quarterlyData.q3.sales = q3Sales;
      console.log(`    Q3销量: ${q3Sales} 万吨`);
    }
  }
  
  // 提取Q3产量（万吨）- 第一列数据
  const productionRowPattern = /产量[（(]万吨[）)][\s\t]+([\d,，]+\.?\d+)[\s\t]+([\d,，]+\.?\d+)[\s\t]+([\d,，]+\.?\d+)[\s\t]+[\d,，\-]+\.?\d*/;
  match = text.match(productionRowPattern);
  if (match) {
    const q3Production = parseFloat(match[1].replace(/[，,]/g, ''));
    if (!isNaN(q3Production) && q3Production >= 100 && q3Production < 10000) {
      result.quarterlyData.q3.production = q3Production;
      console.log(`    Q3产量: ${q3Production} 万吨`);
    }
  }
  
  // 提取Q3售价（元/吨）- 第一列数据
  const priceRowPattern = /售价[（(]元\/吨[）)][\s\t]+([\d,，]+\.?\d+)[\s\t]+([\d,，]+\.?\d+)[\s\t]+([\d,，]+\.?\d+)[\s\t]+[\d,，\-]+\.?\d*/;
  match = text.match(priceRowPattern);
  if (match) {
    const q3Price = parseFloat(match[1].replace(/[，,]/g, ''));
    if (!isNaN(q3Price) && q3Price >= 100 && q3Price < 2000) {
      result.quarterlyData.q3.price = q3Price;
      console.log(`    Q3售价: ${q3Price} 元/吨`);
    }
  }
  
  // 提取Q3吨煤成本（元/吨）- 第一列数据
  const unitCostRowPattern = /吨煤成本[（(]元\/吨[）)][\s\t]+([\d,，]+\.?\d+)[\s\t]+([\d,，]+\.?\d+)[\s\t]+([\d,，]+\.?\d+)[\s\t]+[\d,，\-]+\.?\d*/;
  match = text.match(unitCostRowPattern);
  if (match) {
    const q3UnitCost = parseFloat(match[1].replace(/[，,]/g, ''));
    if (!isNaN(q3UnitCost) && q3UnitCost >= 50 && q3UnitCost < 1000) {
      result.quarterlyData.q3.unitCost = q3UnitCost;
      console.log(`    Q3吨煤成本: ${q3UnitCost} 元/吨`);
    }
  }
  
  // 如果提取到了成本和销量，计算单位成本
  if (!result.quarterlyData.q3.unitCost && result.quarterlyData.q3.cost && result.quarterlyData.q3.sales) {
    result.quarterlyData.q3.unitCost = parseFloat(((result.quarterlyData.q3.cost * 10000) / result.quarterlyData.q3.sales).toFixed(2));
    console.log(`    Q3吨煤成本（计算）: ${result.quarterlyData.q3.unitCost} 元/吨`);
  }
}

/**
 * 从年度报告的表格中提取Q4的季度数据 + 全年累计数据
 * 新策略：
 * 1. 提取Q4单季数据（表格第一列）
 * 2. 提取全年累计数据（用于2021年）
 * 
 * 2024年开始：新格式，表格列顺序为 Q1 | Q2 | Q3 | Q4（正序）
 * 2023年及之前：旧格式，表格列顺序为 Q4 | Q3 | Q2 | Q1（倒序）
 */
function extractQ4FromAnnualReport(text, result, year = null) {
  console.log('  提取Q4单季数据...');
  
  // 判断是否使用新格式（2024年开始）
  const useNewFormat = year && year >= 2024;
  
  if (useNewFormat) {
    console.log('    使用2024年新格式（正序：Q1|Q2|Q3|Q4）');
    extractQ4FromAnnualReport_NewFormat(text, result, year);
  } else {
    console.log('    使用旧格式（倒序：Q4|Q3|Q2|Q1）');
    extractQ4FromAnnualReport_OldFormat(text, result);
  }
}

/**
 * 2024年新格式：提取Q4数据
 * 表格格式：2024年第一季度 | 2024年第二季度 | 2024年第三季度 | 2024年第四季度
 */
function extractQ4FromAnnualReport_NewFormat(text, result, year) {
  // 初始化q4对象
  if (!result.quarterlyData.q4) result.quarterlyData.q4 = {};
  
  // 新格式：匹配 "2024年第X季度"
  // 表格有4列，Q4是第四列
  const yearStr = year.toString();
  
  // 提取Q4营业收入（万元）- 第四列
  const revenuePattern = new RegExp(`营业收入[（(]万元[）)]\\s+([\\d,，]+\\.?\\d*)\\s+([\\d,，]+\\.?\\d*)\\s+([\\d,，]+\\.?\\d*)\\s+([\\d,，]+\\.?\\d*)`);
  let match = text.match(revenuePattern);
  if (match) {
    const q4RevenueWan = parseFloat(match[4].replace(/[，,]/g, '')); // 第四列是Q4
    if (!isNaN(q4RevenueWan) && q4RevenueWan >= 1000 && q4RevenueWan < 1000000) {
      result.quarterlyData.q4.revenue = q4RevenueWan / 10000;
      console.log(`    Q4营业收入: ${result.quarterlyData.q4.revenue.toFixed(2)} 亿元`);
    }
  }
  
  // 提取Q4销量（万吨）- 第四列
  const salesPattern = /销量[（(]万吨[）)]\s+([\d,，]+\.?\d*)\s+([\d,，]+\.?\d*)\s+([\d,，]+\.?\d*)\s+([\d,，]+\.?\d*)/;
  match = text.match(salesPattern);
  if (match) {
    const q4Sales = parseFloat(match[4].replace(/[，,]/g, ''));
    if (!isNaN(q4Sales) && q4Sales >= 100 && q4Sales < 10000) {
      result.quarterlyData.q4.sales = q4Sales;
      console.log(`    Q4销量: ${q4Sales} 万吨`);
    }
  }
  
  // 提取Q4售价（元/吨）- 第四列
  const pricePattern = /售价[（(]元\/吨[）)]\s+([\d,，]+\.?\d*)\s+([\d,，]+\.?\d*)\s+([\d,，]+\.?\d*)\s+([\d,，]+\.?\d*)/;
  match = text.match(pricePattern);
  if (match) {
    const q4Price = parseFloat(match[4].replace(/[，,]/g, ''));
    if (!isNaN(q4Price) && q4Price >= 100 && q4Price < 2000) {
      result.quarterlyData.q4.price = q4Price;
      console.log(`    Q4售价: ${q4Price} 元/吨`);
    }
  }
  
  // 提取Q4产量（万吨）- 第四列
  const productionPattern = /产量[（(]万吨[）)]\s+([\d,，]+\.?\d*)\s+([\d,，]+\.?\d*)\s+([\d,，]+\.?\d*)\s+([\d,，]+\.?\d*)/;
  match = text.match(productionPattern);
  if (match) {
    const q4Production = parseFloat(match[4].replace(/[，,]/g, ''));
    if (!isNaN(q4Production) && q4Production >= 100 && q4Production < 10000) {
      result.quarterlyData.q4.production = q4Production;
      console.log(`    Q4产量: ${q4Production} 万吨`);
    }
  }
  
  // 提取Q4营业成本（万元）- 第四列
  const costPattern = /营业成本[（(]万元[）)]\s+([\d,，]+\.?\d*)\s+([\d,，]+\.?\d*)\s+([\d,，]+\.?\d*)\s+([\d,，]+\.?\d*)/;
  match = text.match(costPattern);
  if (match) {
    const q4CostWan = parseFloat(match[4].replace(/[，,]/g, ''));
    if (!isNaN(q4CostWan) && q4CostWan >= 1000 && q4CostWan < 1000000) {
      result.quarterlyData.q4.cost = q4CostWan / 10000;
      console.log(`    Q4营业成本: ${result.quarterlyData.q4.cost.toFixed(2)} 亿元`);
    }
  }
  
  // 提取Q4吨煤成本（元/吨）- 第四列
  const unitCostPattern = /吨煤成本[（(]元\/吨[）)]\s+([\d,，]+\.?\d*)\s+([\d,，]+\.?\d*)\s+([\d,，]+\.?\d*)\s+([\d,，]+\.?\d*)/;
  match = text.match(unitCostPattern);
  if (match) {
    const q4UnitCost = parseFloat(match[4].replace(/[，,]/g, ''));
    if (!isNaN(q4UnitCost) && q4UnitCost >= 50 && q4UnitCost < 1000) {
      result.quarterlyData.q4.unitCost = q4UnitCost;
      console.log(`    Q4吨煤成本: ${q4UnitCost} 元/吨`);
    }
  }
  
  // 如果提取到了成本和销量，计算单位成本
  if (!result.quarterlyData.q4.unitCost && result.quarterlyData.q4.cost && result.quarterlyData.q4.sales) {
    result.quarterlyData.q4.unitCost = parseFloat(((result.quarterlyData.q4.cost * 10000) / result.quarterlyData.q4.sales).toFixed(2));
    console.log(`    Q4吨煤成本（计算）: ${result.quarterlyData.q4.unitCost} 元/吨`);
  }
}

/**
 * 旧格式：提取Q4数据
 * 表格格式：第四季度 | 第三季度 | 第二季度 | 第一季度
 */
function extractQ4FromAnnualReport_OldFormat(text, result) {
  console.log('  提取Q4单季数据（旧格式）...');
  
  // 年报表格格式：
  // 项目          第四季度    第三季度    第二季度    第一季度    增减比例
  // 营业收入      xxx        xxx         xxx         xxx         xx%
  // 第一列是Q4数据
  
  // 初始化q4对象
  if (!result.quarterlyData.q4) result.quarterlyData.q4 = {};
  
  // 提取Q4营业收入（万元）- 第一列数据
  const revenueRowPattern = /营业收入[（(]万元[）)][\s\t]+([\d,，]+\.?\d+)[\s\t]+([\d,，]+\.?\d+)[\s\t]+([\d,，]+\.?\d+)[\s\t]+([\d,，]+\.?\d+)[\s\t]+[\d,，\-]+\.?\d*/;
  let match = text.match(revenueRowPattern);
  if (match) {
    const q4RevenueWan = parseFloat(match[1].replace(/[，,]/g, ''));
    if (!isNaN(q4RevenueWan) && q4RevenueWan >= 1000 && q4RevenueWan < 1000000) {
      result.quarterlyData.q4.revenue = q4RevenueWan / 10000;
      console.log(`    Q4营业收入: ${result.quarterlyData.q4.revenue.toFixed(2)} 亿元`);
    }
  }
  
  // 提取Q4营业成本（万元）- 第一列数据
  const costRowPattern = /营业成本[（(]万元[）)][\s\t]+([\d,，]+\.?\d+)[\s\t]+([\d,，]+\.?\d+)[\s\t]+([\d,，]+\.?\d+)[\s\t]+([\d,，]+\.?\d+)[\s\t]+[\d,，\-]+\.?\d*/;
  match = text.match(costRowPattern);
  if (match) {
    const q4CostWan = parseFloat(match[1].replace(/[，,]/g, ''));
    if (!isNaN(q4CostWan) && q4CostWan >= 1000 && q4CostWan < 1000000) {
      result.quarterlyData.q4.cost = q4CostWan / 10000;
      console.log(`    Q4营业成本: ${result.quarterlyData.q4.cost.toFixed(2)} 亿元`);
    }
  }
  
  // 提取Q4销量（万吨）- 第一列数据
  const salesRowPattern = /销量[（(]万吨[）)][\s\t]+([\d,，]+\.?\d+)[\s\t]+([\d,，]+\.?\d+)[\s\t]+([\d,，]+\.?\d+)[\s\t]+([\d,，]+\.?\d+)[\s\t]+[\d,，\-]+\.?\d*/;
  match = text.match(salesRowPattern);
  if (match) {
    const q4Sales = parseFloat(match[1].replace(/[，,]/g, ''));
    if (!isNaN(q4Sales) && q4Sales >= 100 && q4Sales < 10000) {
      result.quarterlyData.q4.sales = q4Sales;
      console.log(`    Q4销量: ${q4Sales} 万吨`);
    }
  }
  
  // 提取Q4产量（万吨）- 第一列数据
  const productionRowPattern = /产量[（(]万吨[）)][\s\t]+([\d,，]+\.?\d+)[\s\t]+([\d,，]+\.?\d+)[\s\t]+([\d,，]+\.?\d+)[\s\t]+([\d,，]+\.?\d+)[\s\t]+[\d,，\-]+\.?\d*/;
  match = text.match(productionRowPattern);
  if (match) {
    const q4Production = parseFloat(match[1].replace(/[，,]/g, ''));
    if (!isNaN(q4Production) && q4Production >= 100 && q4Production < 10000) {
      result.quarterlyData.q4.production = q4Production;
      console.log(`    Q4产量: ${q4Production} 万吨`);
    }
  }
  
  // 提取Q4售价（元/吨）- 第一列数据
  const priceRowPattern = /售价[（(]元\/吨[）)][\s\t]+([\d,，]+\.?\d+)[\s\t]+([\d,，]+\.?\d+)[\s\t]+([\d,，]+\.?\d+)[\s\t]+([\d,，]+\.?\d+)[\s\t]+[\d,，\-]+\.?\d*/;
  match = text.match(priceRowPattern);
  if (match) {
    const q4Price = parseFloat(match[1].replace(/[，,]/g, ''));
    if (!isNaN(q4Price) && q4Price >= 100 && q4Price < 2000) {
      result.quarterlyData.q4.price = q4Price;
      console.log(`    Q4售价: ${q4Price} 元/吨`);
    }
  }
  
  // 提取Q4吨煤成本（元/吨）- 第一列数据
  const unitCostRowPattern = /吨煤成本[（(]元\/吨[）)][\s\t]+([\d,，]+\.?\d+)[\s\t]+([\d,，]+\.?\d+)[\s\t]+([\d,，]+\.?\d+)[\s\t]+([\d,，]+\.?\d+)[\s\t]+[\d,，\-]+\.?\d*/;
  match = text.match(unitCostRowPattern);
  if (match) {
    const q4UnitCost = parseFloat(match[1].replace(/[，,]/g, ''));
    if (!isNaN(q4UnitCost) && q4UnitCost >= 50 && q4UnitCost < 1000) {
      result.quarterlyData.q4.unitCost = q4UnitCost;
      console.log(`    Q4吨煤成本: ${q4UnitCost} 元/吨`);
    }
  }
  
  // 如果提取到了成本和销量，计算单位成本
  if (!result.quarterlyData.q4.unitCost && result.quarterlyData.q4.cost && result.quarterlyData.q4.sales) {
    result.quarterlyData.q4.unitCost = parseFloat(((result.quarterlyData.q4.cost * 10000) / result.quarterlyData.q4.sales).toFixed(2));
    console.log(`    Q4吨煤成本（计算）: ${result.quarterlyData.q4.unitCost} 元/吨`);
  }
  
  // ========== 提取全年累计数据（用于2021年） ==========
  console.log('  提取全年累计数据（用于2021年）...');
  
  // 从"本期发生额"部分提取全年累计数据
  // 财务报表格式：
  //              本期发生额    上期发生额
  // 营业收入     xxx          xxx
  
  // 提取全年营业收入（单位：元）
  const annualRevenuePattern = /营业收入\s+([\d,，]+\.?\d*)/;
  const annualRevenueMatch = text.match(annualRevenuePattern);
  if (annualRevenueMatch) {
    const annualRevenueYuan = parseFloat(annualRevenueMatch[1].replace(/[，,]/g, ''));
    if (!isNaN(annualRevenueYuan) && annualRevenueYuan > 1000000000) {
      // 存储全年累计数据
      if (!result.quarterlyData.annualCumulative) {
        result.quarterlyData.annualCumulative = {};
      }
      result.quarterlyData.annualCumulative.revenue = annualRevenueYuan / 100000000; // 转换为亿元
      console.log(`    全年营业收入: ${result.quarterlyData.annualCumulative.revenue.toFixed(2)} 亿元`);
    }
  }
  
  // 提取全年营业成本（单位：元）
  const annualCostPattern = /营业成本\s+([\d,，]+\.?\d*)/;
  const annualCostMatch = text.match(annualCostPattern);
  if (annualCostMatch) {
    const annualCostYuan = parseFloat(annualCostMatch[1].replace(/[，,]/g, ''));
    if (!isNaN(annualCostYuan) && annualCostYuan > 1000000000) {
      // 存储全年累计数据
      if (!result.quarterlyData.annualCumulative) {
        result.quarterlyData.annualCumulative = {};
      }
      result.quarterlyData.annualCumulative.cost = annualCostYuan / 100000000; // 转换为亿元
      console.log(`    全年营业成本: ${result.quarterlyData.annualCumulative.cost.toFixed(2)} 亿元`);
    }
  }
}

/**
 * 从第一季度报告中提取Q1数据（作为单季度数据）
 */
function extractQ1FromFirstQuarterReport(text, result) {
  console.log('  提取Q1单季数据...');
  
  // 第一季度报告本身就是Q1的数据
  // 优先从表格中提取数据（表格格式更准确）
  
  let revenue = null;
  let cost = null;
  let sales = null;
  let production = null;
  let price = null;
  let unitCost = null;
  let grossMargin = null;
  
  // 尝试从表格提取数据
  // 表格格式：营业收入（万元） 	262,447.78 	361,722.30 	-27.44
  const revenueRowPattern = /营业收入[（(]万元[）)][\s\t]+([\d,，]+\.?\d*)[\s\t]+[\d,，]+\.?\d*[\s\t]+[\d,，\-]+\.?\d*/g;
  let match = revenueRowPattern.exec(text);
  if (match) {
    const revenueWan = parseFloat(match[1].replace(/[，,]/g, ''));
    if (!isNaN(revenueWan) && revenueWan >= 1000 && revenueWan < 10000000) {
      revenue = revenueWan / 10000; // 万元转亿元
      console.log(`    Q1营业收入: ${revenue.toFixed(2)} 亿元`);
    }
  }
  
  // 提取营业成本（万元）
  const costRowPattern = /营业成本[（(]万元[）)][\s\t]+([\d,，]+\.?\d*)[\s\t]+[\d,，]+\.?\d*[\s\t]+[\d,，\-]+\.?\d*/g;
  match = costRowPattern.exec(text);
  if (match) {
    const costWan = parseFloat(match[1].replace(/[，,]/g, ''));
    if (!isNaN(costWan) && costWan >= 1000 && costWan < 10000000) {
      cost = costWan / 10000; // 万元转亿元
      console.log(`    Q1营业成本: ${cost.toFixed(2)} 亿元`);
    }
  }
  
  // 提取销量（万吨）
  const salesRowPattern = /销量[（(]万吨[）)][\s\t]+([\d,，]+\.?\d*)[\s\t]+[\d,，]+\.?\d*[\s\t]+[\d,，\-]+\.?\d*/g;
  match = salesRowPattern.exec(text);
  if (match) {
    sales = parseFloat(match[1].replace(/[，,]/g, ''));
    if (isNaN(sales) || sales < 0 || sales > 10000) {
      sales = null;
    } else {
      console.log(`    Q1销量: ${sales} 万吨`);
    }
  }
  
  // 提取产量（万吨）
  const productionRowPattern = /产量[（(]万吨[）)][\s\t]+([\d,，]+\.?\d*)[\s\t]+[\d,，]+\.?\d*[\s\t]+[\d,，\-]+\.?\d*/g;
  match = productionRowPattern.exec(text);
  if (match) {
    production = parseFloat(match[1].replace(/[，,]/g, ''));
    if (isNaN(production) || production < 0 || production > 10000) {
      production = null;
    }
  }
  
  // 提取售价（元/吨）
  const priceRowPattern = /售价[（(]元\/吨[）)][\s\t]+([\d,，]+\.?\d*)[\s\t]+[\d,，]+\.?\d*[\s\t]+[\d,，\-]+\.?\d*/g;
  match = priceRowPattern.exec(text);
  if (match) {
    price = parseFloat(match[1].replace(/[，,]/g, ''));
    if (isNaN(price) || price < 0 || price > 10000) {
      price = null;
    }
  }
  
  // 提取吨煤成本（元）
  const unitCostRowPattern = /吨煤成本[（(]元[）)][\s\t]+([\d,，]+\.?\d*)[\s\t]+[\d,，]+\.?\d*[\s\t]+[\d,，\-]+\.?\d*/g;
  match = unitCostRowPattern.exec(text);
  if (match) {
    unitCost = parseFloat(match[1].replace(/[，,]/g, ''));
    if (isNaN(unitCost) || unitCost < 0 || unitCost > 10000) {
      unitCost = null;
    }
  }
  
  // 提取毛利率（%）
  const grossMarginRowPattern = /毛利率[（(]%[）)][\s\t]+([\d,，]+\.?\d*)[\s\t]+[\d,，]+\.?\d*[\s\t]+/g;
  match = grossMarginRowPattern.exec(text);
  if (match) {
    grossMargin = parseFloat(match[1].replace(/[，,]/g, ''));
    if (isNaN(grossMargin) || grossMargin < 0 || grossMargin > 100) {
      grossMargin = null;
    }
  }
  
  // 如果表格提取失败，尝试从财务报表提取营业收入和营业成本（单位：元）
  if (!revenue) {
    const revenuePattern = /营业收入\s+([\d,，]+\.?\d*)/;
    const revenueMatch = revenuePattern.exec(text);
    if (revenueMatch) {
      const revenueYuan = parseFloat(revenueMatch[1].replace(/[，,]/g, ''));
      if (!isNaN(revenueYuan) && revenueYuan > 1000000000) {
        revenue = revenueYuan / 100000000; // 元转亿元
      }
    }
  }
  
  if (!cost) {
    const costPattern = /营业成本\s+([\d,，]+\.?\d*)/;
    const costMatch = costPattern.exec(text);
    if (costMatch) {
      const costYuan = parseFloat(costMatch[1].replace(/[，,]/g, ''));
      if (!isNaN(costYuan) && costYuan > 1000000000) {
        cost = costYuan / 100000000; // 元转亿元
      }
    }
  }
  
  // 如果还没有提取到，尝试使用productionCoal的数据
  if (!revenue && result.productionCoal && result.productionCoal.revenue) {
    revenue = result.productionCoal.revenue;
    if (revenue > 1000000000) {
      revenue = revenue / 100000000; // 元转亿元
    }
  }
  
  if (!sales && result.productionCoal && result.productionCoal.sales) {
    sales = result.productionCoal.sales;
  }
  
  if (!production && result.productionCoal && result.productionCoal.production) {
    production = result.productionCoal.production;
  }
  
  if (!price && result.productionCoal && result.productionCoal.price) {
    price = result.productionCoal.price;
  }
  
  if (!unitCost && result.productionCoal && result.productionCoal.unitCost) {
    unitCost = result.productionCoal.unitCost;
  }
  
  result.quarterlyData.q1 = {
    revenue: revenue,
    cost: cost,
    sales: sales,
    production: production,
    price: price,
    unitCost: unitCost,
    grossMargin: grossMargin
  };
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
    
    // 确定报告期
    let period = '';
    let month = 0;
    const filename = path.basename(filePath);
    
    // 提取分产品数据
    const productData = extractProductData(text);
    
    // 提取季度数据（根据报告类型）
    extractQuarterlyDataFromTable(text, productData, filename);
    
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
    
    // 将productData.quarterlyData转换为quarterData格式
    let quarterData = null;
    if (productData.quarterlyData) {
      // 确定当前是哪个季度
      let currentQuarter = null;
      let quarterlyValue = null;
      
      if (filename.includes('第一季度')) {
        currentQuarter = 'Q1';
        quarterlyValue = productData.quarterlyData.q1;
      } else if (filename.includes('半年度') || filename.includes('半年')) {
        currentQuarter = 'Q2';
        quarterlyValue = productData.quarterlyData.q2;
      } else if (filename.includes('第三季度')) {
        currentQuarter = 'Q3';
        quarterlyValue = productData.quarterlyData.q3;
      } else if (filename.includes('年度报告') || filename.includes('年报')) {
        currentQuarter = 'Q4';
        quarterlyValue = productData.quarterlyData.q4;
      }
      
      // 如果提取到了季度数据，创建quarterData
      if (quarterlyValue && quarterlyValue.revenue) {
        quarterData = {
          quarter: currentQuarter,
          quarterly: quarterlyValue,
          cumulative: null // 累计数据后续通过calculateCumulativeData计算
        };
        
        // 如果有annualCumulative（2021年报），保留它
        if (productData.quarterlyData.annualCumulative) {
          quarterData.annualCumulative = productData.quarterlyData.annualCumulative;
        }
      }
    }
    
    return {
      year: year,
      period: period,
      month: month,
      filename: filename,
      productData: productData,
      quarterData: quarterData, // 添加quarterData
      rawText: text.substring(0, 5000) // 保存前5000字符用于调试
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
  const reportDir = path.join(__dirname, '../stock/report_analysis/山煤国际');
  const files = fs.readdirSync(reportDir).filter(f => f.endsWith('.pdf'));
  
  // 处理所有PDF文件
  console.log(`找到 ${files.length} 个PDF文件`);
  
  const allData = [];
  
  // 按文件名排序，确保按时间顺序处理
  files.sort();
  
  for (const file of files) {
    const filePath = path.join(reportDir, file);
    const result = await parsePDF(filePath);
    if (result) {
      allData.push(result);
    }
  }
  
  // 保存结果
  const outputPath = path.join(reportDir, 'shanmei_data.json');
  fs.writeFileSync(outputPath, JSON.stringify(allData, null, 2), 'utf8');
  console.log(`\n数据已保存到: ${outputPath}`);
  
  // 按年份和月份排序
  allData.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });
  
  // 打印摘要
  console.log('\n=== 数据摘要 ===');
  allData.forEach(item => {
    console.log(`\n${item.period} (${item.filename}):`);
    console.log('  生产煤:', JSON.stringify(item.productData.productionCoal, null, 2));
    console.log('  贸易煤:', JSON.stringify(item.productData.tradeCoal, null, 2));
    if (item.quarterData) {
      console.log('  季度数据:', JSON.stringify(item.quarterData, null, 2));
    }
  });
  
  // 统计信息
  console.log(`\n=== 处理统计 ===`);
  console.log(`总共处理: ${allData.length} 个报告`);
  const years = [...new Set(allData.map(d => d.year))].sort();
  console.log(`年份范围: ${years[0]} - ${years[years.length - 1]}`);
  console.log(`包含年份: ${years.join(', ')}`);
}

// ==================== 从HTML提取季度数据 ====================

/**
 * 从HTML文件提取2021-2024年季度数据
 */
function extractQuarterlyDataFromHTML() {
  console.log('\n📊 从HTML提取季度数据...\n');
  
  const htmlPath = path.join(__dirname, '../stock/report_analysis/山煤国际/shanmei_coal_analysis.html');
  
  if (!fs.existsSync(htmlPath)) {
    console.error('❌ HTML文件不存在');
    return null;
  }
  
  const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
  
  // 提取tempRawData数组
  const dataMatch = htmlContent.match(/const tempRawData = \[([\s\S]*?)\];/);
  if (!dataMatch) {
    console.error('❌ 无法找到数据');
    return null;
  }
  
  // 解析数据
  const dataString = '[' + dataMatch[1] + ']';
  const rawData = eval(dataString);
  
  // 筛选2021-2024年的数据
  const filteredData = rawData.filter(item => 
    item.year >= 2021 && item.year <= 2024
  );
  
  // 计算季度数据
  const quarterlyData = [];
  const dataByYear = {};
  
  filteredData.forEach(item => {
    if (!dataByYear[item.year]) {
      dataByYear[item.year] = [];
    }
    dataByYear[item.year].push(item);
  });
  
  Object.keys(dataByYear).sort().forEach(year => {
    const yearData = dataByYear[year].sort((a, b) => a.month - b.month);
    
    yearData.forEach((current) => {
      let quarterData = {
        year: current.year,
        quarter: null,
        period: current.period,
        cumulative: {
          cost: current.cost,
          revenue: current.revenue,
          production: current.production,
          sales: current.sales,
          inventory: current.inventory
        },
        quarterly: {
          cost: null,
          revenue: null,
          production: null,
          sales: null
        }
      };

      if (current.month === 3) {
        quarterData.quarter = 'Q1';
        quarterData.quarterly = {
          cost: current.cost,
          revenue: current.revenue,
          production: current.production,
          sales: current.sales
        };
      } else if (current.month === 6) {
        quarterData.quarter = 'Q2';
        const q1 = yearData.find(d => d.month === 3);
        if (q1) {
          quarterData.quarterly = {
            cost: current.cost !== null && q1.cost !== null ? 
              parseFloat((current.cost - q1.cost).toFixed(2)) : null,
            revenue: current.revenue !== null && q1.revenue !== null ? 
              parseFloat((current.revenue - q1.revenue).toFixed(2)) : null,
            production: current.production !== null && q1.production !== null ? 
              parseFloat((current.production - q1.production).toFixed(2)) : null,
            sales: current.sales !== null && q1.sales !== null ? 
              parseFloat((current.sales - q1.sales).toFixed(2)) : null
          };
        }
      } else if (current.month === 9) {
        quarterData.quarter = 'Q3';
        const h1 = yearData.find(d => d.month === 6);
        if (h1) {
          quarterData.quarterly = {
            cost: current.cost !== null && h1.cost !== null ? 
              parseFloat((current.cost - h1.cost).toFixed(2)) : null,
            revenue: current.revenue !== null && h1.revenue !== null ? 
              parseFloat((current.revenue - h1.revenue).toFixed(2)) : null,
            production: current.production !== null && h1.production !== null ? 
              parseFloat((current.production - h1.production).toFixed(2)) : null,
            sales: current.sales !== null && h1.sales !== null ? 
              parseFloat((current.sales - h1.sales).toFixed(2)) : null
          };
        }
      } else if (current.month === 12) {
        quarterData.quarter = 'Q4';
        const q3 = yearData.find(d => d.month === 9);
        if (q3) {
          quarterData.quarterly = {
            cost: current.cost !== null && q3.cost !== null ? 
              parseFloat((current.cost - q3.cost).toFixed(2)) : null,
            revenue: current.revenue !== null && q3.revenue !== null ? 
              parseFloat((current.revenue - q3.revenue).toFixed(2)) : null,
            production: current.production !== null && q3.production !== null ? 
              parseFloat((current.production - q3.production).toFixed(2)) : null,
            sales: current.sales !== null && q3.sales !== null ? 
              parseFloat((current.sales - q3.sales).toFixed(2)) : null
          };
        }
      }

      quarterlyData.push(quarterData);
    });
  });
  
  console.log(`✓ 提取了 ${quarterlyData.length} 个季度的数据`);
  return quarterlyData;
}

// ==================== 累计数据计算 ====================

/**
 * 计算累计数据
 * 新策略：通过季度数据累加得到累计数据
 * 特殊处理：2021年全年数据直接从PDF提取
 */
function calculateCumulativeData(data) {
  console.log('\n📊 计算累计数据...\n');
  
  // 按年份分组
  const yearGroups = {};
  data.forEach(item => {
    if (!yearGroups[item.year]) {
      yearGroups[item.year] = {};
    }
    
    if (item.quarterData && item.quarterData.quarterly) {
      const quarter = item.quarterData.quarter;
      yearGroups[item.year][quarter] = item.quarterData.quarterly;
    }
  });
  
  // 计算每年的累计数据
  Object.keys(yearGroups).sort().forEach(year => {
    const quarters = yearGroups[year];
    
    console.log(`处理 ${year}年...`);
    
    if (year === '2021') {
      // 2021年特殊处理
      handle2021Data(data, quarters);
    } else {
      // 其他年份正常处理
      handleNormalYearData(data, year, quarters);
    }
  });
  
  console.log('\n✅ 累计数据计算完成\n');
}

/**
 * 处理2021年数据
 * 特殊处理：Q3数据有问题，Q3累计也不处理
 */
function handle2021Data(data, quarters) {
  // Q1累计 = Q1
  if (quarters.Q1) {
    updateCumulativeData(data, '2021', '1-3月', quarters.Q1);
    console.log('  ✓ Q1累计 = Q1');
  }
  
  // H1 = Q1 + Q2
  if (quarters.Q1 && quarters.Q2) {
    const h1 = calculateSum([quarters.Q1, quarters.Q2]);
    updateCumulativeData(data, '2021', '上半年', h1);
    console.log('  ✓ H1累计 = Q1 + Q2');
  }
  
  // Q3累计 = 不处理（因为Q3数据有问题，计算的Q1+Q2不准确）
  console.log('  ⊘ Q3累计跳过（Q3数据有问题，不处理累计数据）');
  
  // 全年 = 直接从PDF提取（不累加）
  const annualItem = data.find(d => d.year === '2021' && d.period.includes('全年'));
  if (annualItem) {
    // 检查productData.quarterlyData.annualCumulative（PDF提取的全年数据）
    const pdfAnnualData = annualItem.productData?.quarterlyData?.annualCumulative;
    
    if (pdfAnnualData && pdfAnnualData.revenue) {
      // 使用PDF提取的全年累计数据
      if (!annualItem.quarterData) {
        annualItem.quarterData = { quarter: 'Q4' };
      }
      annualItem.quarterData.cumulative = pdfAnnualData;
      console.log(`  ✓ 全年数据直接从PDF提取 (营收: ${pdfAnnualData.revenue.toFixed(2)} 亿元)`);
    } else if (quarters.Q1 && quarters.Q2 && quarters.Q4) {
      // 如果PDF没有提取到，则用Q1+Q2+Q4计算
      const annual = calculateSum([quarters.Q1, quarters.Q2, quarters.Q4]);
      updateCumulativeData(data, '2021', '全年', annual);
      console.log('  ✓ 全年累计 = Q1 + Q2 + Q4（计算）');
    }
  }
}

/**
 * 处理正常年份数据
 */
function handleNormalYearData(data, year, quarters) {
  // Q1累计 = Q1
  if (quarters.Q1) {
    updateCumulativeData(data, year, '1-3月', quarters.Q1);
    console.log('  ✓ Q1累计 = Q1');
  }
  
  // H1 = Q1 + Q2
  if (quarters.Q1 && quarters.Q2) {
    const h1 = calculateSum([quarters.Q1, quarters.Q2]);
    updateCumulativeData(data, year, '上半年', h1);
    console.log('  ✓ H1累计 = Q1 + Q2');
  }
  
  // Q3累计 = Q1 + Q2 + Q3
  if (quarters.Q1 && quarters.Q2 && quarters.Q3) {
    const q3cum = calculateSum([quarters.Q1, quarters.Q2, quarters.Q3]);
    updateCumulativeData(data, year, '1-9月', q3cum);
    console.log('  ✓ Q3累计 = Q1 + Q2 + Q3');
  }
  
  // 全年 = Q1 + Q2 + Q3 + Q4
  if (quarters.Q1 && quarters.Q2 && quarters.Q3 && quarters.Q4) {
    const annual = calculateSum([quarters.Q1, quarters.Q2, quarters.Q3, quarters.Q4]);
    updateCumulativeData(data, year, '全年', annual);
    console.log('  ✓ 全年累计 = Q1 + Q2 + Q3 + Q4');
  }
}

/**
 * 计算多个季度数据的和
 */
function calculateSum(quarters) {
  const result = {
    revenue: 0,
    cost: 0,
    sales: 0,
    production: 0
  };
  
  quarters.forEach(q => {
    result.revenue += q.revenue || 0;
    result.cost += q.cost || 0;
    result.sales += q.sales || 0;
    result.production += q.production || 0;
  });
  
  // 保留2位小数
  Object.keys(result).forEach(key => {
    result[key] = parseFloat(result[key].toFixed(2));
  });
  
  return result;
}

/**
 * 更新累计数据
 */
function updateCumulativeData(data, year, periodKeyword, cumulativeData) {
  const item = data.find(d => d.year === year && d.period.includes(periodKeyword));
  if (item) {
    if (!item.quarterData) {
      item.quarterData = {};
    }
    item.quarterData.cumulative = cumulativeData;
  }
}

/**
 * 加载生产经营数据PDF的数据（2024年之前优先使用）
 */
function loadProductionDataPDF() {
  const baseDir = path.join(__dirname, '../stock/report_analysis/山煤国际');
  const productionDataPath = path.join(baseDir, 'production_data_extracted.json');
  
  if (!fs.existsSync(productionDataPath)) {
    console.log('  ⚠️  生产经营数据PDF未找到，将跳过');
    return null;
  }
  
  const productionData = JSON.parse(fs.readFileSync(productionDataPath, 'utf-8'));
  console.log(`  - 生产经营数据PDF: ${productionData.length} 条记录`);
  
  // 转换为Map，key为 year-quarter
  const productionMap = new Map();
  productionData.forEach(item => {
    const key = `${item.year}-${item.quarter}`;
    productionMap.set(key, item.data);
  });
  
  return productionMap;
}

/**
 * 整合季度数据到主数据文件
 * 2024年之前：优先使用生产经营数据PDF，然后结合年报
 * 2024年及以后：使用季度报告/年报PDF
 */
function mergeQuarterlyData() {
  console.log('\n🔄 整合季度数据到主数据文件...\n');
  
  const baseDir = path.join(__dirname, '../stock/report_analysis/山煤国际');
  const shanmeiDataPath = path.join(baseDir, 'shanmei_data.json');
  
  if (!fs.existsSync(shanmeiDataPath)) {
    console.error('❌ shanmei_data.json 不存在');
    return false;
  }
  
  // 加载生产经营数据PDF（2024年之前优先使用）
  const productionDataMap = loadProductionDataPDF();
  
  // 加载HTML数据（作为补充）
  const quarterlyData = extractQuarterlyDataFromHTML();
  if (!quarterlyData) {
    console.error('❌ 季度数据提取失败');
    return false;
  }
  
  const shanmeiData = JSON.parse(fs.readFileSync(shanmeiDataPath, 'utf-8'));
  console.log(`  - 主数据: ${shanmeiData.length} 条记录`);
  
  const quarterlyMap = new Map();
  quarterlyData.forEach(item => {
    const key = `${item.year}-${item.period}`;
    quarterlyMap.set(key, item);
  });
  
  let updatedCount = 0;
  let productionDataUsed = 0;
  
  shanmeiData.forEach(item => {
    const year = parseInt(item.year);
    const key = `${item.year}-${item.period}`;
    const quarterInfo = quarterlyMap.get(key);
    
    // 确定季度标识（Q1, Q2, Q3, Q4）
    let quarter = null;
    if (item.period.includes('1-3月')) quarter = 'Q1';
    else if (item.period.includes('上半年')) quarter = 'Q2';
    else if (item.period.includes('1-9月')) quarter = 'Q3';
    else if (item.period.includes('全年')) quarter = 'Q4';
    
    // 2024年之前：优先使用生产经营数据PDF
    if (year < 2024 && productionDataMap && quarter) {
      const productionKey = `${item.year}-${quarter}`;
      const productionData = productionDataMap.get(productionKey);
      
      if (productionData) {
        // 使用生产经营数据PDF
        if (!item.quarterData) {
          item.quarterData = {};
        }
        if (!item.quarterData.quarterly) {
          item.quarterData.quarterly = {};
        }
        
        // 更新数据（生产经营数据PDF优先）
        if (productionData.production) {
          item.quarterData.quarterly.production = productionData.production;
        }
        if (productionData.sales) {
          item.quarterData.quarterly.sales = productionData.sales;
        }
        if (productionData.revenue) {
          item.quarterData.quarterly.revenue = productionData.revenue;
        }
        if (productionData.cost) {
          item.quarterData.quarterly.cost = productionData.cost;
        }
        if (productionData.price) {
          item.quarterData.quarterly.price = productionData.price;
        }
        if (productionData.unitCost) {
          item.quarterData.quarterly.unitCost = productionData.unitCost;
        }
        
        item.quarterData.quarter = quarter;
        productionDataUsed++;
        console.log(`    ${item.period}: 使用生产经营数据PDF`);
      }
    }
    
    // 补充或合并其他数据源（年报PDF、HTML等）
    if (quarterInfo) {
      // 如果没有quarterData，创建新的
      if (!item.quarterData) {
        updatedCount++;
        item.quarterData = {
          quarter: quarterInfo.quarter,
          cumulative: quarterInfo.cumulative,
          quarterly: quarterInfo.quarterly
        };
      } else {
        // 如果已经有quarterData，只补充缺失的字段
        if (!item.quarterData.quarter) {
          item.quarterData.quarter = quarterInfo.quarter;
        }
        
        // 补充quarterly字段（如果PDF没有提取到）
        if (!item.quarterData.quarterly) {
          item.quarterData.quarterly = {};
        }
        
        // 只补充缺失的字段，不覆盖已有数据
        const q = item.quarterData.quarterly;
        const qInfo = quarterInfo.quarterly;
        
        if (qInfo) {
          if (!q.production && qInfo.production) q.production = qInfo.production;
          if (!q.sales && qInfo.sales) q.sales = qInfo.sales;
          if (!q.revenue && qInfo.revenue) q.revenue = qInfo.revenue;
          if (!q.cost && qInfo.cost) q.cost = qInfo.cost;
          if (!q.price && qInfo.price) q.price = qInfo.price;
          if (!q.unitCost && qInfo.unitCost) q.unitCost = qInfo.unitCost;
        }
        
        // cumulative字段暂时使用HTML数据（后续会被calculateCumulativeData重新计算）
        if (!item.quarterData.cumulative) {
          item.quarterData.cumulative = quarterInfo.cumulative;
        }
      }
      
      // 更新productData（如果缺失）
      if (!item.productData.productionCoal.revenue && quarterInfo.cumulative.revenue) {
        item.productData.productionCoal.revenue = quarterInfo.cumulative.revenue * 10000;
        item.productData.productionCoal.cost = quarterInfo.cumulative.cost * 10000;
        item.productData.productionCoal.sales = quarterInfo.cumulative.sales;
        item.productData.productionCoal.production = quarterInfo.cumulative.production;
      }
    }
  });
  
  console.log(`  ✓ 更新了 ${updatedCount} 条记录`);
  if (productionDataUsed > 0) {
    console.log(`  ✓ 使用了 ${productionDataUsed} 条生产经营数据PDF记录（2024年之前优先）`);
  }
  
  shanmeiData.sort((a, b) => {
    const yearA = parseInt(a.year);
    const yearB = parseInt(b.year);
    if (yearA !== yearB) return yearA - yearB;
    return (a.month || 0) - (b.month || 0);
  });
  
  // 计算累计数据（新策略）
  calculateCumulativeData(shanmeiData);
  
  fs.writeFileSync(shanmeiDataPath, JSON.stringify(shanmeiData, null, 2), 'utf-8');
  console.log(`\n💾 数据已保存: shanmei_data.json (${shanmeiData.length}条)`);
  
  return true;
}

/**
 * 测试数据完整性
 */
function testDataIntegrity() {
  console.log('\n🧪 测试数据完整性...\n');
  
  const dataPath = path.join(__dirname, '../stock/report_analysis/山煤国际/shanmei_data.json');
  
  if (!fs.existsSync(dataPath)) {
    console.error('❌ shanmei_data.json 不存在');
    return false;
  }
  
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  
  console.log(`✓ 总记录数: ${data.length}`);
  
  let withQuarterData = 0;
  let withProductBreakdown = 0;
  
  data.forEach(item => {
    if (item.quarterData) withQuarterData++;
    
    if (item.productData?.productBreakdown) {
      const breakdown = item.productData.productBreakdown;
      const hasAnyData = 
        breakdown.metallurgicalCoal?.revenue ||
        breakdown.thermalCoal?.revenue ||
        breakdown.cokeCoal?.revenue ||
        breakdown.anthracite?.revenue ||
        breakdown.tradeCoal?.revenue;
      
      if (hasAnyData) withProductBreakdown++;
    }
  });
  
  console.log(`✓ 包含quarterData: ${withQuarterData}/${data.length}`);
  console.log(`✓ 包含分产品数据: ${withProductBreakdown}/${data.length}`);
  
  console.log('\n📈 按年份统计:');
  const yearStats = {};
  
  data.forEach(item => {
    const year = item.year;
    if (!yearStats[year]) {
      yearStats[year] = { total: 0, withQuarter: 0, quarters: [] };
    }
    yearStats[year].total++;
    if (item.quarterData) {
      yearStats[year].withQuarter++;
      yearStats[year].quarters.push(item.quarterData.quarter);
    }
  });
  
  Object.keys(yearStats).sort().forEach(year => {
    const stats = yearStats[year];
    console.log(`  ${year}年: ${stats.total}条, 季度${stats.withQuarter}个 (${stats.quarters.join(', ')})`);
  });
  
  console.log('\n📅 2021-2024年完整性:');
  const targetYears = ['2021', '2022', '2023', '2024'];
  const expectedQuarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  
  targetYears.forEach(year => {
    const yearData = data.filter(d => d.year == year && d.quarterData);
    const quarters = yearData.map(d => d.quarterData.quarter).sort();
    const missing = expectedQuarters.filter(q => !quarters.includes(q));
    
    if (missing.length === 0) {
      console.log(`  ✓ ${year}年: 完整 (${quarters.join(', ')})`);
    } else {
      console.log(`  ⚠ ${year}年: 缺少 ${missing.join(', ')})`);
    }
  });
  
  console.log('\n✅ 测试完成！');
  return true;
}

// ==================== 主函数 ====================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'parse';
  
  console.log('🚀 山煤国际数据处理统一脚本');
  console.log('='.repeat(60));
  
  switch (command) {
    case 'parse':
    case 'pdf':
      // 解析PDF文件
      await processAllPDFs();
      break;
      
    case 'extract':
      // 提取季度数据（已废弃，请使用 merge）
      console.log('⚠️  extract 命令已废弃，请使用 merge 命令');
      console.log('   merge 命令会自动提取HTML中的季度数据并合并到主数据文件\n');
      const quarterlyData = extractQuarterlyDataFromHTML();
      if (quarterlyData) {
        console.log('\n✅ 季度数据提取完成！');
      }
      break;
      
    case 'merge':
      // 整合数据（一步到位：提取 + 合并）
      if (mergeQuarterlyData()) {
        console.log('\n✅ 数据整合完成！');
      }
      break;
      
    case 'test':
      // 测试数据
      testDataIntegrity();
      break;
      
    case 'all':
      // 执行所有操作：解析PDF → 修复2025数据 → 合并季度数据 → 测试
      console.log('\n📋 执行完整流程...\n');
      await processAllPDFs();
      console.log('\n' + '='.repeat(60));
      
      // 2025年数据现在通过新策略自动处理（累加计算）
      
      console.log('\n' + '='.repeat(60));
      if (mergeQuarterlyData()) {
        console.log('\n' + '='.repeat(60));
        testDataIntegrity();
        console.log('\n✅ 所有操作完成！');
      }
      break;
      
    case 'help':
    case '--help':
    case '-h':
      console.log(`
使用方法:
  node shanmei_report_parse.js [command]

命令:
  parse/pdf   - 解析所有PDF文件，提取数据到 shanmei_data.json
  merge       - 从HTML提取季度数据并合并到主文件（一步到位）
  test        - 测试数据完整性
  all         - 执行完整流程：parse → merge → test
  extract     - [已废弃] 使用 merge 代替
  help        - 显示帮助信息

常用流程:
  1. 首次使用或添加新PDF:
     node shanmei_report_parse.js all
     
  2. 只更新季度数据:
     node shanmei_report_parse.js merge
     
  3. 只测试数据:
     node shanmei_report_parse.js test

说明:
  - merge 命令会自动提取HTML中的季度数据并合并，无需单独运行 extract
  - all 命令会依次执行 parse、merge、test，适合完整更新数据
      `);
      break;
      
    default:
      console.log(`未知命令: ${command}`);
      console.log('使用 "help" 查看帮助信息');
      break;
  }
}

// 运行脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { 
  parsePDF, 
  extractProductData,
  extractQuarterlyDataFromHTML,
  mergeQuarterlyData,
  testDataIntegrity
};

