const { PDFParse } = require('pdf-parse');
const fs = require('fs');
const path = require('path');

/**
 * 紫金矿业年报数据提取脚本
 * 提取铜和金相关的成本、营收、产量、销量数据
 */

// 需要提取的关键词
const keywords = {
  copper: {
    cost: ['铜成本', '铜销售成本', '铜产品销售成本', '铜产品营业成本'],
    revenue: ['铜营收', '铜收入', '铜销售收入', '铜产品销售收入', '铜产品营业收入'],
    production: ['矿产铜产量', '铜产量', '矿产铜', '铜精矿产量', '阴极铜产量'],
    sales: ['矿产铜销量', '铜销量', '销售铜', '铜精矿销量', '阴极铜销量'],
    inventory: ['铜库存', '铜库存量']
  },
  gold: {
    cost: ['金成本', '金销售成本', '金产品销售成本', '金产品营业成本'],
    revenue: ['金营收', '金收入', '金销售收入', '金产品销售收入', '金产品营业收入'],
    production: ['矿产金产量', '金产量', '矿产金', '黄金产量'],
    sales: ['矿产金销量', '金销量', '销售金', '黄金销量'],
    inventory: ['金库存', '金库存量']
  }
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
 * 从文本中提取数值（保持万盎司单位，用于黄金）
 */
function extractNumberInWanOunces(text) {
  if (!text) return null;
  
  // 移除逗号和空格
  let cleaned = text.replace(/[,，\s]/g, '');
  
  // 移除"万盎司"、"盎司"、"千克"、"公斤"等单位
  cleaned = cleaned.replace(/万盎司|盎司|千克|公斤|kg/g, '');
  
  // 提取数字
  const match = cleaned.match(/[\d.]+/);
  if (match) {
    const num = parseFloat(match[0]);
    return isNaN(num) ? null : num;
  }
  
  return null;
}

/**
 * 从"主要产品"表格中提取铜和金产品的库存量（仅年报有此数据）
 * 格式示例：
 * 主要产品    单位    生产量    销售量    库存量
 * 矿山产金    千克    68,275    67,786    1,734
 * 矿山产铜    吨      837,570   824,317   18,105
 */
function extractInventoryFromMainProducts(text, extractedData) {
  // 匹配"主要产品"表格中的铜产品库存量
  const copperPatterns = [
    // 矿山产铜 吨 生产量 销售量 库存量（年报格式）
    /矿[山产]*铜[\s\t]+吨[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g,
    // 矿产铜（带单位）
    /矿产铜[\(（][^）)]*吨[\)）][\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g,
    // 主要产品表格中的矿产铜
    /主要产品[^\d]*矿[山产]*铜[^\d]*([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g,
    // 矿产铜（直接匹配三列数据）
    /矿[山产]*铜[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)(?![\d,，])/g
  ];
  
  for (const pattern of copperPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (!match[0].includes('主要产品') && (match[0].includes('产量') || match[0].includes('销量') || match[0].includes('销售量'))) {
        continue;
      }
      
      const productionStr = match[1].replace(/[,，]/g, '');
      const salesStr = match[2].replace(/[,，]/g, '');
      const inventoryStr = match[3].replace(/[,，]/g, '');
      
      const production = parseFloat(productionStr);
      const sales = parseFloat(salesStr);
      const inventory = parseFloat(inventoryStr);
      
      if (!isNaN(production) && production > 0 && production < 100000 && production >= 0.1) {
        if (production >= 0.5 || (production >= 0.1 && production < 0.5 && match[0].includes('主要产品'))) {
          extractedData.copper.production.push({
            keyword: '主要产品-产量',
            line: match[0],
            context: match[0],
            value: production,
            allValues: [production]
          });
        }
      }
      
      if (!isNaN(sales) && sales > 0 && sales < 100000 && sales >= 0.1) {
        if (sales >= 0.5 || (sales >= 0.1 && sales < 0.5 && match[0].includes('主要产品'))) {
          extractedData.copper.sales.push({
            keyword: '主要产品-销量',
            line: match[0],
            context: match[0],
            value: sales,
            allValues: [sales]
          });
        }
      }
      
      // 库存量（第三列）- 单位：吨
      if (!isNaN(inventory) && inventory > 0 && inventory < 1000000) {
        extractedData.copper.inventory.push({
          keyword: '主要产品-库存量',
          line: match[0],
          context: match[0],
          value: inventory,  // 单位：吨
          allValues: [inventory]
        });
      }
    }
  }
  
  // 匹配"主要产品"表格中的金产品库存量
  const goldPatterns = [
    // 矿山产金 千克 生产量 销售量 库存量（年报格式）
    /矿[山产]*金[\s\t]+千克[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g,
    // 矿产金（带单位，千克）
    /矿产金[\(（][^）)]*千克[\)）][\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g,
    // 主要产品表格中的矿产金
    /主要产品[^\d]*矿[山产]*金[^\d]*([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g,
    // 矿产金（直接匹配三列数据）
    /矿[山产]*金[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)(?![\d,，])/g
  ];
  
  for (const pattern of goldPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (!match[0].includes('主要产品') && (match[0].includes('产量') || match[0].includes('销量') || match[0].includes('销售量'))) {
        continue;
      }
      
      const productionStr = match[1].replace(/[,，]/g, '');
      const salesStr = match[2].replace(/[,，]/g, '');
      const inventoryStr = match[3].replace(/[,，]/g, '');
      
      const production = parseFloat(productionStr);
      const sales = parseFloat(salesStr);
      const inventory = parseFloat(inventoryStr);
      
      if (!isNaN(production) && production > 0 && production < 100000 && production >= 0.1) {
        if (production >= 0.5 || (production >= 0.1 && production < 0.5 && match[0].includes('主要产品'))) {
          extractedData.gold.production.push({
            keyword: '主要产品-产量',
            line: match[0],
            context: match[0],
            value: production,
            allValues: [production]
          });
        }
      }
      
      if (!isNaN(sales) && sales > 0 && sales < 100000 && sales >= 0.1) {
        if (sales >= 0.5 || (sales >= 0.1 && sales < 0.5 && match[0].includes('主要产品'))) {
          extractedData.gold.sales.push({
            keyword: '主要产品-销量',
            line: match[0],
            context: match[0],
            value: sales,
            allValues: [sales]
          });
        }
      }
      
      // 库存量（第三列）- 单位：千克
      if (!isNaN(inventory) && inventory > 0 && inventory < 1000000) {
        extractedData.gold.inventory.push({
          keyword: '主要产品-库存量',
          line: match[0],
          context: match[0],
          value: inventory,  // 单位：千克
          allValues: [inventory]
        });
      }
    }
  }
}

/**
 * 从表格中提取矿山产金的数据（产量、销量、成本、毛利率）
 * 销量 = 金锭 + 金精矿
 * 营收 = 金锭销量 × 金锭单价 + 金精矿销量 × 金精矿单价
 * 成本 = 金锭销量 × 金锭单位销售成本 + 金精矿销量 × 金精矿单位销售成本
 */
function extractMineGoldData(text, extractedData) {
  // 首先尝试提取年报"主营业务分产品"表格数据
  // 格式1（2024年）：矿山产金锭 2,031,559 1,093,733 46.16 39.30 13.53 增加 12.22 个百分点
  //                  矿山产金精矿 1,497,718 469,679 68.64 19.75 -10.48 增加 10.59 个百分点
  // 格式2（2023年）：矿山产金 金锭 营收 成本 毛利率 ...
  //                  金精矿 营收 成本 毛利率 ...
  // 字段：产品名称 营业收入(万元) 营业成本(万元) 毛利率(%) ...
  
  // 尝试格式1（2024年）
  const goldIngotBusinessPattern1 = /矿山产金锭[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g;
  const goldConcentrateBusinessPattern1 = /矿山产金精矿[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g;
  
  let ingotBusinessMatch = goldIngotBusinessPattern1.exec(text);
  let concentrateBusinessMatch = goldConcentrateBusinessPattern1.exec(text);
  
  // 如果格式1没找到，尝试格式2（2023年）
  // 格式2可能是：矿山产金 2,709,056 1,488,018 45.07（只有一行，汇总数据）
  if (!ingotBusinessMatch || !concentrateBusinessMatch) {
    // 先尝试查找"矿山产金"的汇总数据（单行）
    const goldSummaryBusinessPattern = /矿山产金[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g;
    const summaryMatch = goldSummaryBusinessPattern.exec(text);
    
    if (summaryMatch) {
      // 找到了汇总数据，直接使用
      const totalRevenue = parseFloat(summaryMatch[1].replace(/[,，]/g, '')) * 10000; // 万元转元
      const totalCost = parseFloat(summaryMatch[2].replace(/[,，]/g, '')) * 10000; // 万元转元
      const totalGrossMargin = parseFloat(summaryMatch[3].replace(/[,，]/g, ''));
      
      console.log(`  找到金产品主营业务数据（汇总）: 营收=${(totalRevenue/100000000).toFixed(2)}亿元, 成本=${(totalCost/100000000).toFixed(2)}亿元, 毛利率=${totalGrossMargin.toFixed(2)}%`);
      
      extractedData.gold.revenue.push({
        keyword: '矿山产金-营收(主营业务)',
        line: '汇总',
        context: summaryMatch[0],
        value: totalRevenue,
        allValues: [totalRevenue]
      });
      
      extractedData.gold.cost.push({
        keyword: '矿山产金-成本(主营业务)',
        line: '汇总',
        context: summaryMatch[0],
        value: totalCost,
        allValues: [totalCost]
      });
      
      extractedData.gold.grossMargin = totalGrossMargin;
      extractedData.gold._hasBusinessData = true;
    }
  }
  
  if (ingotBusinessMatch && concentrateBusinessMatch) {
    // 提取金锭的营业收入、成本和毛利率
    const ingotRevenue = parseFloat(ingotBusinessMatch[1].replace(/[,，]/g, '')) * 10000; // 万元转元
    const ingotCost = parseFloat(ingotBusinessMatch[2].replace(/[,，]/g, '')) * 10000; // 万元转元
    const ingotGrossMargin = parseFloat(ingotBusinessMatch[3].replace(/[,，]/g, ''));
    
    // 提取金精矿的营业收入、成本和毛利率
    const concentrateRevenue = parseFloat(concentrateBusinessMatch[1].replace(/[,，]/g, '')) * 10000; // 万元转元
    const concentrateCost = parseFloat(concentrateBusinessMatch[2].replace(/[,，]/g, '')) * 10000; // 万元转元
    const concentrateGrossMargin = parseFloat(concentrateBusinessMatch[3].replace(/[,，]/g, ''));
    
    // 计算总营收和总成本
    const totalRevenue = ingotRevenue + concentrateRevenue;
    const totalCost = ingotCost + concentrateCost;
    const totalGrossMargin = ((totalRevenue - totalCost) / totalRevenue) * 100;
    
    console.log(`  找到金产品主营业务数据: 金锭营收=${(ingotRevenue/100000000).toFixed(2)}亿元, 金精矿营收=${(concentrateRevenue/100000000).toFixed(2)}亿元`);
    console.log(`  总营收=${(totalRevenue/100000000).toFixed(2)}亿元, 总成本=${(totalCost/100000000).toFixed(2)}亿元, 毛利率=${totalGrossMargin.toFixed(2)}%`);
    
    extractedData.gold.revenue.push({
      keyword: '矿山产金-营收(主营业务)',
      line: '金锭+金精矿',
      context: ingotBusinessMatch[0] + ' | ' + concentrateBusinessMatch[0],
      value: totalRevenue,
      allValues: [totalRevenue]
    });
    
    extractedData.gold.cost.push({
      keyword: '矿山产金-成本(主营业务)',
      line: '金锭+金精矿',
      context: ingotBusinessMatch[0] + ' | ' + concentrateBusinessMatch[0],
      value: totalCost,
      allValues: [totalCost]
    });
    
    extractedData.gold.grossMargin = totalGrossMargin;
    
    // 标记已找到主营业务数据
    extractedData.gold._hasBusinessData = true;
  }
  
  // 然后尝试提取半年度报告中的"单位销售成本"表格数据
  // 格式1（2025年）：矿山产金 金锭 元/克 326.32 284.78 289.54 14.59 12.70 54.39 42.83 49.07
  //                  金精矿 元/克 181.93 151.50 164.53 20.08 10.57 72.59 67.75 69.39
  // 格式2（2024年）：矿山产金 金锭 元/克 284.78 271.48 297.85 4.90 -4.39 42.83 35.92 32.42
  //                  金精矿 元/克 151.50 155.38 162.43 -2.50 -6.73 67.75 58.37 57.73
  // 格式3（2023年）：矿山产金 元/克 210.02 176.09 206.25 19.27 1.86 47.09 51.02 45.30
  //                  (只有汇总数据，没有金锭和金精矿分开)
  // 格式4（2022年）：矿山产金 元/克 176.09 182.67 -3.60 51.02 48.13
  //                  (只有汇总数据，格式更简单：单位成本 对比单位成本 同比 毛利率 对比毛利率)
  
  // 先尝试格式1和2（有金锭和金精矿分开）
  const goldIngotCostPattern = /(?:矿山产金[\s\t]+)?金锭[\s\t]+元\/克[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+[-\d,，]+\.?\d*[\s\t]+[-\d,，]+\.?\d*[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g;
  const goldConcentrateCostPattern = /金精矿[\s\t]+元\/克[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+[-\d,，]+\.?\d*[\s\t]+[-\d,，]+\.?\d*[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g;
  
  let ingotCostMatch = goldIngotCostPattern.exec(text);
  let concentrateCostMatch = goldConcentrateCostPattern.exec(text);
  
  // 如果没有找到金锭和金精矿分开的数据，尝试查找汇总的矿山产金数据（2023年格式）
  if (!ingotCostMatch || !concentrateCostMatch) {
    // 格式3（2023年）：矿山产金 元/克 210.02 176.09 206.25 19.27 1.86 47.09 51.02 45.30
    const goldSummaryPattern = /矿山产金[\s\t]+元\/克[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+[-\d,，]+\.?\d*[\s\t]+[-\d,，]+\.?\d*[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g;
    const summaryMatch = goldSummaryPattern.exec(text);
    
    if (summaryMatch) {
      const unitCost = parseFloat(summaryMatch[1].replace(/[,，]/g, ''));
      const grossMargin = parseFloat(summaryMatch[4].replace(/[,，]/g, ''));
      
      console.log(`  找到金产品单位销售成本（汇总-2023格式）: ${unitCost}元/克, 毛利率${grossMargin}%`);
      
      extractedData.gold.unitCost = unitCost;
      extractedData.gold.grossMargin = grossMargin;
      extractedData.gold._hasUnitCostData = true;
      extractedData.gold._summaryUnitCost = unitCost;
      extractedData.gold._summaryGrossMargin = grossMargin;
    } else {
      // 格式4（2022年）：矿山产金 元/克 176.09 182.67 -3.60 51.02 48.13
      const goldSummaryPattern2022 = /矿山产金[\s\t]+元\/克[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+[-\d,，]+\.?\d*[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g;
      const summaryMatch2022 = goldSummaryPattern2022.exec(text);
      
      if (summaryMatch2022) {
        const unitCost = parseFloat(summaryMatch2022[1].replace(/[,，]/g, ''));
        const grossMargin = parseFloat(summaryMatch2022[3].replace(/[,，]/g, ''));
        
        console.log(`  找到金产品单位销售成本（汇总-2022格式）: ${unitCost}元/克, 毛利率${grossMargin}%`);
        
        extractedData.gold.unitCost = unitCost;
        extractedData.gold.grossMargin = grossMargin;
        extractedData.gold._hasUnitCostData = true;
        extractedData.gold._summaryUnitCost = unitCost;
        extractedData.gold._summaryGrossMargin = grossMargin;
      }
    }
  }
  
  if (ingotCostMatch && concentrateCostMatch) {
    // 提取金锭的单位成本和毛利率
    const ingotUnitCost = parseFloat(ingotCostMatch[1].replace(/[,，]/g, ''));
    const ingotGrossMargin = parseFloat(ingotCostMatch[4].replace(/[,，]/g, ''));
    
    // 提取金精矿的单位成本和毛利率
    const concentrateUnitCost = parseFloat(concentrateCostMatch[1].replace(/[,，]/g, ''));
    const concentrateGrossMargin = parseFloat(concentrateCostMatch[4].replace(/[,，]/g, ''));
    
    // 保存单位成本数据（用于后续计算）
    extractedData.gold.unitCost = ingotUnitCost; // 暂时保存金锭的单位成本
    extractedData.gold.grossMargin = ingotGrossMargin; // 暂时保存金锭的毛利率
    
    console.log(`  找到金产品单位销售成本: 金锭=${ingotUnitCost}元/克, 金精矿=${concentrateUnitCost}元/克`);
    
    // 注意：这里只提取了单位成本，总成本需要在有销量数据后计算
    // 标记已找到单位成本数据
    extractedData.gold._hasUnitCostData = true;
    extractedData.gold._ingotUnitCost = ingotUnitCost;
    extractedData.gold._concentrateUnitCost = concentrateUnitCost;
    extractedData.gold._ingotGrossMargin = ingotGrossMargin;
    extractedData.gold._concentrateGrossMargin = concentrateGrossMargin;
  }
  
  // 匹配格式：产品名称 单位 2025年1-9月 2024年1-9月 2025年Q3 2025年Q2
  //       矿山产金 千克 64,945 54,265 23,758 22,121
  
  // 匹配矿山产金的产量
  // 格式1（文本描述）：报告期，公司矿山产金 41,186 千克（1,324,171 盎司）
  // 格式2（其中描述）：其中：矿产金 32,338 千克【1,039,690 盎司】
  // 格式3（表格）：矿山产金 千克 64,945 54,265 23,758 22,121
  
  // 优先匹配文本描述中的产量（更准确）
  // 支持"矿山产金"和"矿产金"两种写法
  const productionTextPattern1 = /(?:报告期|公司)?矿山产金[\s\t]+([\d,，]+\.?\d*)[\s\t]+千克/g;
  const productionTextPattern2 = /(?:其中[:：][\s\t]*)?矿产金[\s\t]+([\d,，]+\.?\d*)[\s\t]+千克/g;
  const productionTablePattern = /矿山产金[\s\t]+千克[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)?[\s\t]+([\d,，]+\.?\d*)?[\s\t]+([\d,，]+\.?\d*)?/g;
  
  let prodMatch;
  let foundProduction = false;
  
  // 先尝试匹配"矿山产金"（更常见）
  prodMatch = productionTextPattern1.exec(text);
  if (prodMatch) {
    const productionStr = prodMatch[1].replace(/[,，]/g, '');
    const production = parseFloat(productionStr);
    
    if (production && production > 0 && production < 1000000) {
      extractedData.gold.production.push({
        keyword: '矿山产金-产量(文本)',
        line: prodMatch[0],
        context: prodMatch[0],
        value: production, // 千克
        allValues: [production]
      });
      foundProduction = true;
    }
  }
  
  // 如果没找到，尝试匹配"矿产金"（半年度报告中的"其中：矿产金"）
  if (!foundProduction) {
    prodMatch = productionTextPattern2.exec(text);
    if (prodMatch) {
      const productionStr = prodMatch[1].replace(/[,，]/g, '');
      const production = parseFloat(productionStr);
      
      if (production && production > 0 && production < 1000000) {
        extractedData.gold.production.push({
          keyword: '矿山产金-产量(文本-矿产金)',
          line: prodMatch[0],
          context: prodMatch[0],
          value: production, // 千克
          allValues: [production]
        });
        foundProduction = true;
      }
    }
  }
  
  // 如果文本描述中没有找到，再尝试表格格式
  if (!foundProduction) {
    while ((prodMatch = productionTablePattern.exec(text)) !== null) {
      // 跳过包含"销售数量"、"单价"等字段的行
      const matchText = prodMatch[0];
      if (matchText.includes('销售数量') || matchText.includes('单价') || matchText.includes('单位销售成本') || matchText.includes('毛利率')) {
        continue;
      }
      
      // 提取产量（第一个数字）
      const productionStr = prodMatch[1].replace(/[,，]/g, '');
      const production = parseFloat(productionStr);
      
      if (production && production > 0 && production < 1000000) {
        extractedData.gold.production.push({
          keyword: '矿山产金-产量(表格)',
          line: matchText.substring(0, 200),
          context: matchText.substring(0, 500),
          value: production, // 千克
          allValues: [production]
        });
        break; // 只取第一个匹配
      }
    }
  }
  
  // 首先尝试匹配简化格式：矿山产金直接在一行中（不分金锭和金精矿）
  // 格式1（2023Q3等）：矿山产金 千克 49,252 44,992 元/克 400.97 355.71 元/克 216.98 182.10 45.89 48.81
  // 格式2（2023Q1等）：矿山产金 千克 15,952 13,100 千克 16,499 13,726 元/克 387.39 350.20 元/克 200.03 172.85 48.37 50.64
  // 这种格式通常出现在2022-2023年的季度报告中
  
  // 先尝试格式1（更常见）：矿山产金 千克 销量2023 销量2022 元/克 单价2023 单价2022 元/克 成本2023 成本2022 毛利率2023 毛利率2022
  const simplifiedGoldPattern1 = /矿山产金[\s\t]+千克[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+元\/克[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+元\/克[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g;
  
  let simplifiedMatch1 = simplifiedGoldPattern1.exec(text);
  if (simplifiedMatch1) {
    const salesStr = simplifiedMatch1[1].replace(/[,，]/g, '');
    const unitPriceStr = simplifiedMatch1[3].replace(/[,，]/g, '');
    const unitCostStr = simplifiedMatch1[5].replace(/[,，]/g, '');
    const grossMarginStr = simplifiedMatch1[7].replace(/[,，]/g, '');
    
    const sales = parseFloat(salesStr);
    const unitPrice = parseFloat(unitPriceStr);
    const unitCost = parseFloat(unitCostStr);
    const grossMargin = parseFloat(grossMarginStr);
    
    if (sales && sales > 0 && sales < 1000000) {
      extractedData.gold.sales.push({
        keyword: '矿山产金-销量(简化格式1)',
        line: simplifiedMatch1[0],
        context: simplifiedMatch1[0],
        value: sales, // 千克
        allValues: [sales]
      });
      
      // 计算营收和成本
      // 注意：sales是千克，unitPrice和unitCost是元/克
      // 需要先将千克转换为克：sales * 1000
      const salesInGrams = sales * 1000; // 转换为克
      const revenue = salesInGrams * unitPrice; // 元
      const cost = salesInGrams * unitCost; // 元
      
      extractedData.gold.revenue.push({
        keyword: '矿山产金-营收(简化格式1计算)',
        line: simplifiedMatch1[0],
        context: simplifiedMatch1[0],
        value: revenue, // 元
        allValues: [revenue]
      });
      
      extractedData.gold.cost.push({
        keyword: '矿山产金-成本(简化格式1计算)',
        line: simplifiedMatch1[0],
        context: simplifiedMatch1[0],
        value: cost, // 元
        allValues: [cost]
      });
      
      // 保存单价、单位成本、毛利率
      extractedData.gold.unitPrice = unitPrice;
      extractedData.gold.unitCost = unitCost;
      extractedData.gold.grossMargin = grossMargin;
      extractedData.gold.salesVolume = sales; // 千克
    }
    
    return; // 找到简化格式1，直接返回
  }
  
  // 再尝试格式2：矿山产金 千克 销量1 销量2 千克 销量3 销量4 元/克 单价1 单价2 元/克 成本1 成本2 毛利率1 毛利率2
  const simplifiedGoldPattern = /矿山产金[\s\t]+千克[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+千克[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+元\/克[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+元\/克[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g;
  
  let simplifiedMatch = simplifiedGoldPattern.exec(text);
  if (simplifiedMatch) {
    // 提取产量（第一个数字，千克）
    const productionStr = simplifiedMatch[1].replace(/[,，]/g, '');
    const production = parseFloat(productionStr);
    
    // 提取销量（第三个数字，千克）
    const salesStr = simplifiedMatch[3].replace(/[,，]/g, '');
    const sales = parseFloat(salesStr);
    
    // 提取单价（第五个数字，元/克）
    const priceStr = simplifiedMatch[5].replace(/[,，]/g, '');
    const price = parseFloat(priceStr);
    
    // 提取单位成本（第七个数字，元/克）
    const costStr = simplifiedMatch[7].replace(/[,，]/g, '');
    const cost = parseFloat(costStr);
    
    // 提取毛利率（第九个数字，%）
    const marginStr = simplifiedMatch[9].replace(/[,，]/g, '');
    const margin = parseFloat(marginStr);
    
    if (production && production > 0 && production < 1000000) {
      extractedData.gold.production.push({
        keyword: '矿山产金-产量(简化格式)',
        line: simplifiedMatch[0],
        context: simplifiedMatch[0],
        value: production, // 千克
        allValues: [production]
      });
    }
    
    if (sales && sales > 0 && sales < 1000000) {
      extractedData.gold.sales.push({
        keyword: '矿山产金-销量(简化格式)',
        line: simplifiedMatch[0],
        context: simplifiedMatch[0],
        value: sales, // 千克
        allValues: [sales]
      });
      
      // 计算营收和成本
      if (price > 0 && sales > 0) {
        const revenue = sales * price * 1000; // 千克 × 元/克 × 1000 = 元
        extractedData.gold.revenue.push({
          keyword: '矿山产金-营收(简化格式)',
          line: '从销量和单价计算',
          context: `销量: ${sales}千克, 单价: ${price}元/克`,
          value: revenue,
          allValues: [revenue]
        });
      }
      
      if (cost > 0 && sales > 0) {
        const totalCost = sales * cost * 1000; // 千克 × 元/克 × 1000 = 元
        extractedData.gold.cost.push({
          keyword: '矿山产金-成本(简化格式)',
          line: '从销量和单位成本计算',
          context: `销量: ${sales}千克, 单位成本: ${cost}元/克`,
          value: totalCost,
          allValues: [totalCost]
        });
      }
    }
    
    if (price > 0 && price < 10000) {
      extractedData.gold.calculatedUnitPrice = price; // 元/克
    }
    
    if (cost > 0 && cost < 10000) {
      extractedData.gold.calculatedUnitCost = cost; // 元/克
    }
    
    if (margin >= 0 && margin <= 100) {
      extractedData.gold.calculatedGrossMargin = margin; // %
    }
    
    // 如果找到了简化格式的数据，就不需要再查找金锭+金精矿的分产品数据了
    return;
  }
  
  // 如果没有找到简化格式，继续查找金锭+金精矿的分产品数据
  // 提取金锭的数据：销量、单价、单位销售成本
  // 格式1（季度报告）：矿山产金 金锭 千克 34,431 28,721 元/克 746.43 516.83 元/克 330.00 286.46 55.79 44.57
  // 格式2（半年度/年度报告）：矿山产金 金锭 715.47 元/克 21,178 千克 1,515,266
  // 格式3（年度报告有空格）：矿山产金 金锭 533.39 元 / 克 38,087 千克 2,031,559
  
  // 匹配格式1：季度报告的完整行数据（销量、单价、单位成本都在同一行）
  const goldIngotFullPattern = /(?:矿山产金[\s\t]+)?金锭[\s\t]+千克[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+元\/克[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+元\/克[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g;
  
  // 匹配格式2和3：半年度/年度报告
  // 格式2a（2024-2025）：金锭 715.47 元/克 21,178 千克 1,515,266（单价在前，销量在后）
  // 格式2b（2022-2023）：金锭 387 元/克 13,400 千克 518,674（单价在前，销量在后，但可能是"其中："开头）
  const goldIngotSalesPattern = /(?:其中[:：][\s\t]*)?金锭[\s\t]+([\d,，]+\.?\d*)[\s\t]+元[\s\/]*克[\s\t]+([\d,，]+\.?\d*)[\s\t]+千克[\s\t]+([\d,，]+\.?\d*)/g;
  
  let goldIngotSales = null;
  let goldIngotPrice = null;
  let goldIngotUnitCost = null;
  let goldIngotRevenue = null; // 销售金额（万元）
  
  // 先尝试匹配格式1（季度报告）
  let match;
  match = goldIngotFullPattern.exec(text);
  if (match) {
    // match[1] = 2025年销量, match[2] = 2024年销量
    // match[3] = 2025年单价, match[4] = 2024年单价
    // match[5] = 2025年单位成本, match[6] = 2024年单位成本
    // match[7] = 2025年毛利率, match[8] = 2024年毛利率
    
    const salesStr = match[1].replace(/[,，]/g, '');
    const sales = parseFloat(salesStr);
    if (sales && sales > 0 && sales < 1000000) {
      goldIngotSales = sales; // 千克
    }
    
    const priceStr = match[3].replace(/[,，]/g, '');
    const price = parseFloat(priceStr);
    if (price && price > 0 && price < 10000) {
      goldIngotPrice = price; // 元/克
    }
    
    const costStr = match[5].replace(/[,，]/g, '');
    const cost = parseFloat(costStr);
    if (cost && cost > 0 && cost < 10000) {
      goldIngotUnitCost = cost; // 元/克
    }
  }
  
  // 如果格式1没有匹配到，尝试格式2和3（半年度/年度报告）
  if (!goldIngotSales) {
    match = goldIngotSalesPattern.exec(text);
    if (match) {
      // match[1] = 单价, match[2] = 销量, match[3] = 金额（万元）
      const priceStr = match[1].replace(/[,，]/g, '');
      const price = parseFloat(priceStr);
      if (price && price > 0 && price < 10000) {
        goldIngotPrice = price; // 元/克
      }
      
      const salesStr = match[2].replace(/[,，]/g, '');
      const sales = parseFloat(salesStr);
      if (sales && sales > 0 && sales < 1000000) {
        goldIngotSales = sales; // 千克
      }
      
      const revenueStr = match[3].replace(/[,，]/g, '');
      const revenue = parseFloat(revenueStr);
      if (revenue && revenue > 0) {
        goldIngotRevenue = revenue * 10000; // 万元转换为元
      }
    }
  }
  
  // 提取金精矿的数据：销量、单价、单位销售成本
  // 格式1（季度报告）：金精矿 千克 25,814 22,197 元/克 685.21 485.88 元/克 186.36 155.06 72.80 68.09
  // 格式2（半年度/年度报告）：金精矿 663.72 元/克 17,028 千克 1,130,209 或 金精矿 336 元/克 15,724 千克 528,406
  const goldConcentrateFullPattern = /金精矿[\s\t]+千克[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+元\/克[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+元\/克[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g;
  
  const goldConcentrateSalesPattern = /(?:其中[:：][\s\t]*)?金精矿[\s\t]+([\d,，]+\.?\d*)[\s\t]+元[\s\/]*克[\s\t]+([\d,，]+\.?\d*)[\s\t]+千克[\s\t]+([\d,，]+\.?\d*)/g;
  
  let goldConcentrateSales = null;
  let goldConcentratePrice = null;
  let goldConcentrateUnitCost = null;
  let goldConcentrateRevenue = null; // 销售金额（万元）
  
  // 先尝试匹配格式1（季度报告）
  match = goldConcentrateFullPattern.exec(text);
  if (match) {
    // match[1] = 2025年销量, match[2] = 2024年销量
    // match[3] = 2025年单价, match[4] = 2024年单价
    // match[5] = 2025年单位成本, match[6] = 2024年单位成本
    // match[7] = 2025年毛利率, match[8] = 2024年毛利率
    
    const salesStr = match[1].replace(/[,，]/g, '');
    const sales = parseFloat(salesStr);
    if (sales && sales > 0 && sales < 1000000) {
      goldConcentrateSales = sales; // 千克
    }
    
    const priceStr = match[3].replace(/[,，]/g, '');
    const price = parseFloat(priceStr);
    if (price && price > 0 && price < 10000) {
      goldConcentratePrice = price; // 元/克
    }
    
    const costStr = match[5].replace(/[,，]/g, '');
    const cost = parseFloat(costStr);
    if (cost && cost > 0 && cost < 10000) {
      goldConcentrateUnitCost = cost; // 元/克
    }
  }
  
  // 如果格式1没有匹配到，尝试格式2（半年度/年度报告）
  if (!goldConcentrateSales) {
    match = goldConcentrateSalesPattern.exec(text);
    if (match) {
      // match[1] = 单价, match[2] = 销量, match[3] = 金额（万元）
      const priceStr = match[1].replace(/[,，]/g, '');
      const price = parseFloat(priceStr);
      if (price && price > 0 && price < 10000) {
        goldConcentratePrice = price; // 元/克
      }
      
      const salesStr = match[2].replace(/[,，]/g, '');
      const sales = parseFloat(salesStr);
      if (sales && sales > 0 && sales < 1000000) {
        goldConcentrateSales = sales; // 千克
      }
      
      const revenueStr = match[3].replace(/[,，]/g, '');
      const revenue = parseFloat(revenueStr);
      if (revenue && revenue > 0) {
        goldConcentrateRevenue = revenue * 10000; // 万元转换为元
      }
    }
  }
  
  // 计算总销量、总营收和总成本（单位：元）
  let totalSales = 0;
  let totalRevenue = 0;
  let totalCost = 0;
  let avgUnitPrice = null;
  let avgUnitCost = null;
  let grossMargin = null;
  
  // 只有当金锭和金精矿都有数据时，才计算汇总
  if (goldIngotSales && goldConcentrateSales) {
    totalSales = goldIngotSales + goldConcentrateSales;
    
    // 如果有销售金额（半年度/年度报告），直接使用
    if (goldIngotRevenue && goldConcentrateRevenue) {
      totalRevenue = goldIngotRevenue + goldConcentrateRevenue;
    }
    // 否则从单价和销量计算（季度报告）
    else if (goldIngotPrice && goldConcentratePrice) {
      // 营收 = 金锭销量(千克) × 金锭单价(元/克) × 1000 + 金精矿销量(千克) × 金精矿单价(元/克) × 1000
      totalRevenue = goldIngotSales * goldIngotPrice * 1000 + goldConcentrateSales * goldConcentratePrice * 1000;
    }
    
    // 成本 = 金锭销量(千克) × 金锭单位销售成本(元/克) × 1000 + 金精矿销量(千克) × 金精矿单位销售成本(元/克) × 1000
    // 只有季度报告有单位成本数据
    if (goldIngotUnitCost && goldConcentrateUnitCost) {
      totalCost = goldIngotSales * goldIngotUnitCost * 1000 + goldConcentrateSales * goldConcentrateUnitCost * 1000;
    }
    
    // 计算平均单价和单位成本
    if (totalRevenue > 0 && totalSales > 0) {
      avgUnitPrice = totalRevenue / (totalSales * 1000); // 元/克
    }
    if (totalCost > 0 && totalSales > 0) {
      avgUnitCost = totalCost / (totalSales * 1000); // 元/克
    }
    if (totalRevenue > 0 && totalCost > 0) {
      grossMargin = ((totalRevenue - totalCost) / totalRevenue) * 100; // %
    }
  }
  
  // 只有当金锭和金精矿都有数据时，才保存汇总数据
  if (totalSales > 0) {
    extractedData.gold.sales.push({
      keyword: '矿山产金-销量(金锭+金精矿)',
      line: `金锭: ${goldIngotSales || 0}, 金精矿: ${goldConcentrateSales || 0}`,
      context: `金锭销量: ${goldIngotSales || 0} 千克, 金精矿销量: ${goldConcentrateSales || 0} 千克`,
      value: totalSales, // 千克
      allValues: [totalSales]
    });
    
    if (totalRevenue > 0) {
      extractedData.gold.revenue.push({
        keyword: '矿山产金-营收(金锭+金精矿)',
        line: `总营收: ${totalRevenue}`,
        context: `总营收: ${totalRevenue}元`,
        value: totalRevenue, // 元
        allValues: [totalRevenue]
      });
    }
    
    if (totalCost > 0) {
      extractedData.gold.cost.push({
        keyword: '矿山产金-成本(金锭+金精矿)',
        line: `总成本: ${totalCost}`,
        context: `总成本: ${totalCost}元`,
        value: totalCost, // 元
        allValues: [totalCost]
      });
    }
    
    // 保存计算出的单价、单位成本和毛利率
    if (avgUnitPrice !== null) {
      extractedData.gold.calculatedUnitPrice = avgUnitPrice; // 元/克
    }
    if (avgUnitCost !== null) {
      extractedData.gold.calculatedUnitCost = avgUnitCost; // 元/克
    }
    if (grossMargin !== null) {
      extractedData.gold.calculatedGrossMargin = grossMargin; // %
    }
  } else {
    // 如果没有找到金锭+金精矿的分产品数据，尝试提取矿山产金的汇总数据
    // 这种情况通常出现在半年度/年度报告中，只有一行汇总数据
    // 格式：矿山产金 397 元/克 31,915 千克 1,266,825
    const mineGoldSummaryPattern = /矿山产金[\s\t]+([\d,，]+\.?\d*)[\s\t]+元[\s\/]*克[\s\t]+([\d,，]+\.?\d*)[\s\t]+千克[\s\t]+([\d,，]+\.?\d*)/g;
    const summaryMatch = mineGoldSummaryPattern.exec(text);
    if (summaryMatch) {
      const priceStr = summaryMatch[1].replace(/[,，]/g, '');
      const price = parseFloat(priceStr);
      
      const salesStr = summaryMatch[2].replace(/[,，]/g, '');
      const sales = parseFloat(salesStr);
      
      const revenueStr = summaryMatch[3].replace(/[,，]/g, '');
      const revenue = parseFloat(revenueStr);
      
      if (sales && sales > 0 && sales < 1000000) {
        extractedData.gold.sales.push({
          keyword: '矿山产金-销量(汇总)',
          line: `矿山产金汇总`,
          context: `总销量: ${sales} 千克`,
          value: sales, // 千克
          allValues: [sales]
        });
        
        if (revenue > 0) {
          extractedData.gold.revenue.push({
            keyword: '矿山产金-营收(汇总)',
            line: `总营收: ${revenue * 10000}`,
            context: `总营收: ${revenue * 10000}元`,
            value: revenue * 10000, // 万元转换为元
            allValues: [revenue * 10000]
          });
        }
        
        if (price > 0) {
          extractedData.gold.calculatedUnitPrice = price; // 元/克
        }
      }
    }
  }
}

/**
 * 提取矿山产铜的数据（铜精矿、电积铜、电解铜）
 * 类似于extractMineGoldData，从三个子产品汇总计算
 */
function extractMineCopperData(text, extractedData) {
  // 首先尝试提取年报"主营业务分产品"表格数据
  // 格式：矿山产铜精矿 3,495,483 1,187,417 66.03 10.39 -7.35 增加 6.51 个百分点
  //       矿山产电积铜 511,247 263,810 48.40 -5.50 -7.97 增加 1.39 个百分点
  //       矿山产电解铜 810,438 438,743 45.86 84.17 37.85 增加 18.18 个百分点
  // 字段：产品名称 营业收入(万元) 营业成本(万元) 毛利率(%) ...
  const copperConcentrateBusinessPattern = /矿山产铜精矿[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g;
  const electrowinCopperBusinessPattern = /矿山产电积铜[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g;
  const electrolyticCopperBusinessPattern = /矿山产电解铜[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g;
  
  let concentrateBusinessMatch = copperConcentrateBusinessPattern.exec(text);
  let electrowinBusinessMatch = electrowinCopperBusinessPattern.exec(text);
  let electrolyticBusinessMatch = electrolyticCopperBusinessPattern.exec(text);
  
  if (concentrateBusinessMatch && electrowinBusinessMatch && electrolyticBusinessMatch) {
    // 提取各子产品的营业收入、成本和毛利率
    const concentrateRevenue = parseFloat(concentrateBusinessMatch[1].replace(/[,，]/g, '')) * 10000; // 万元转元
    const concentrateCost = parseFloat(concentrateBusinessMatch[2].replace(/[,，]/g, '')) * 10000;
    const concentrateGrossMargin = parseFloat(concentrateBusinessMatch[3].replace(/[,，]/g, ''));
    
    const electrowinRevenue = parseFloat(electrowinBusinessMatch[1].replace(/[,，]/g, '')) * 10000;
    const electrowinCost = parseFloat(electrowinBusinessMatch[2].replace(/[,，]/g, '')) * 10000;
    const electrowinGrossMargin = parseFloat(electrowinBusinessMatch[3].replace(/[,，]/g, ''));
    
    const electrolyticRevenue = parseFloat(electrolyticBusinessMatch[1].replace(/[,，]/g, '')) * 10000;
    const electrolyticCost = parseFloat(electrolyticBusinessMatch[2].replace(/[,，]/g, '')) * 10000;
    const electrolyticGrossMargin = parseFloat(electrolyticBusinessMatch[3].replace(/[,，]/g, ''));
    
    // 计算总营收和总成本
    const totalRevenue = concentrateRevenue + electrowinRevenue + electrolyticRevenue;
    const totalCost = concentrateCost + electrowinCost + electrolyticCost;
    const totalGrossMargin = ((totalRevenue - totalCost) / totalRevenue) * 100;
    
    console.log(`  找到铜产品主营业务数据: 铜精矿营收=${(concentrateRevenue/100000000).toFixed(2)}亿元, 电积铜营收=${(electrowinRevenue/100000000).toFixed(2)}亿元, 电解铜营收=${(electrolyticRevenue/100000000).toFixed(2)}亿元`);
    console.log(`  总营收=${(totalRevenue/100000000).toFixed(2)}亿元, 总成本=${(totalCost/100000000).toFixed(2)}亿元, 毛利率=${totalGrossMargin.toFixed(2)}%`);
    
    extractedData.copper.revenue.push({
      keyword: '矿山产铜-营收(主营业务)',
      line: '铜精矿+电积铜+电解铜',
      context: concentrateBusinessMatch[0] + ' | ' + electrowinBusinessMatch[0] + ' | ' + electrolyticBusinessMatch[0],
      value: totalRevenue,
      allValues: [totalRevenue]
    });
    
    extractedData.copper.cost.push({
      keyword: '矿山产铜-成本(主营业务)',
      line: '铜精矿+电积铜+电解铜',
      context: concentrateBusinessMatch[0] + ' | ' + electrowinBusinessMatch[0] + ' | ' + electrolyticBusinessMatch[0],
      value: totalCost,
      allValues: [totalCost]
    });
    
    extractedData.copper.grossMargin = totalGrossMargin;
    
    // 标记已找到主营业务数据
    extractedData.copper._hasBusinessData = true;
  }
  
  // 然后尝试提取半年度报告中的"单位销售成本"表格数据
  // 格式：铜精矿 元/吨 21,104 18,578 19,719 13.59 7.02 65.03 66.97 65.06
  //       电积铜 元/吨 31,113 33,072 32,172 -5.92 -3.29 53.49 49.09 47.73
  //       电解铜 元/吨 36,004 35,778 35,573 0.63 1.21 46.80 45.67 46.04
  const copperConcentrateCostPattern = /铜精矿[\s\t]+元\/吨[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+[-\d,，]+\.?\d*[\s\t]+[-\d,，]+\.?\d*[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g;
  const electrowinCopperCostPattern = /电积铜[\s\t]+元\/吨[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+[-\d,，]+\.?\d*[\s\t]+[-\d,，]+\.?\d*[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g;
  const electrolyticCopperCostPattern = /电解铜[\s\t]+元\/吨[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+[-\d,，]+\.?\d*[\s\t]+[-\d,，]+\.?\d*[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g;
  
  let concentrateCostMatch = copperConcentrateCostPattern.exec(text);
  let electrowinCostMatch = electrowinCopperCostPattern.exec(text);
  let electrolyticCostMatch = electrolyticCopperCostPattern.exec(text);
  
  // 如果没有找到三种铜产品分开的数据，尝试查找汇总的矿山产铜数据（2023年格式）
  if (!concentrateCostMatch || !electrowinCostMatch || !electrolyticCostMatch) {
    // 格式（2023年）：矿山产铜 元/吨 21,653 18,873 20,769 14.73 4.26 57.54 65.78 52.10
    const copperSummaryPattern = /矿山产铜[\s\t]+元\/吨[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+[-\d,，]+\.?\d*[\s\t]+[-\d,，]+\.?\d*[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g;
    const summaryMatch = copperSummaryPattern.exec(text);
    
    if (summaryMatch) {
      const unitCost = parseFloat(summaryMatch[1].replace(/[,，]/g, ''));
      const grossMargin = parseFloat(summaryMatch[4].replace(/[,，]/g, ''));
      
      console.log(`  找到铜产品单位销售成本（汇总-2023格式）: ${unitCost}元/吨, 毛利率${grossMargin}%`);
      
      extractedData.copper.unitCost = unitCost;
      extractedData.copper.grossMargin = grossMargin;
      extractedData.copper._hasUnitCostData = true;
      extractedData.copper._summaryUnitCost = unitCost;
      extractedData.copper._summaryGrossMargin = grossMargin;
    } else {
      // 格式（2022年）：矿山产铜 元/吨 18,873 18,462 2.23 65.78 65.31
      const copperSummaryPattern2022 = /矿山产铜[\s\t]+元\/吨[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+[-\d,，]+\.?\d*[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g;
      const summaryMatch2022 = copperSummaryPattern2022.exec(text);
      
      if (summaryMatch2022) {
        const unitCost = parseFloat(summaryMatch2022[1].replace(/[,，]/g, ''));
        const grossMargin = parseFloat(summaryMatch2022[3].replace(/[,，]/g, ''));
        
        console.log(`  找到铜产品单位销售成本（汇总-2022格式）: ${unitCost}元/吨, 毛利率${grossMargin}%`);
        
        extractedData.copper.unitCost = unitCost;
        extractedData.copper.grossMargin = grossMargin;
        extractedData.copper._hasUnitCostData = true;
        extractedData.copper._summaryUnitCost = unitCost;
        extractedData.copper._summaryGrossMargin = grossMargin;
      }
    }
  }
  
  if (concentrateCostMatch && electrowinCostMatch && electrolyticCostMatch) {
    // 提取各子产品的单位成本和毛利率
    const concentrateUnitCost = parseFloat(concentrateCostMatch[1].replace(/[,，]/g, ''));
    const concentrateGrossMargin = parseFloat(concentrateCostMatch[4].replace(/[,，]/g, ''));
    
    const electrowinUnitCost = parseFloat(electrowinCostMatch[1].replace(/[,，]/g, ''));
    const electrowinGrossMargin = parseFloat(electrowinCostMatch[4].replace(/[,，]/g, ''));
    
    const electrolyticUnitCost = parseFloat(electrolyticCostMatch[1].replace(/[,，]/g, ''));
    const electrolyticGrossMargin = parseFloat(electrolyticCostMatch[4].replace(/[,，]/g, ''));
    
    console.log(`  找到铜产品单位销售成本: 铜精矿=${concentrateUnitCost}元/吨, 电积铜=${electrowinUnitCost}元/吨, 电解铜=${electrolyticUnitCost}元/吨`);
    
    // 保存单位成本数据（用于后续计算）
    extractedData.copper._hasUnitCostData = true;
    extractedData.copper._concentrateUnitCost = concentrateUnitCost;
    extractedData.copper._electrowinUnitCost = electrowinUnitCost;
    extractedData.copper._electrolyticUnitCost = electrolyticUnitCost;
    extractedData.copper._concentrateGrossMargin = concentrateGrossMargin;
    extractedData.copper._electrowinGrossMargin = electrowinGrossMargin;
    extractedData.copper._electrolyticGrossMargin = electrolyticGrossMargin;
  }
  
  // 首先尝试从描述性文本或表格中提取铜产量
  // 格式1："2023 年公司矿山产铜超过 100 万吨"（描述性文本）
  // 格式2："矿产铜 / 万吨 	101 	107 	115 	150-160"（年度报告表格，取倒数第二个数字）
  // 格式3："矿山产铜 	吨 	287,571 	262,649 	278,996"（季度报告表格，取第一个数字）
  // 注意：只在前1500行查找，避免匹配到规划数据
  const textLines = text.split('\n');
  const relevantText = textLines.slice(0, 1500).join('\n');
  
  // 方式1：描述性文本
  const copperProductionTextPattern = /(?<![有预])([2０]\d{3})\s*年[^，。]{0,30}?(?:公司)?矿山?产铜(?:超过|约)?[\s\t]*([\d,，]+\.?\d*)\s*万吨/g;
  let prodMatch;
  let foundProduction = false;
  
  while ((prodMatch = copperProductionTextPattern.exec(relevantText)) !== null && !foundProduction) {
    const matchYear = parseInt(prodMatch[1]);
    const valueStr = prodMatch[2].replace(/[,，]/g, '');
    const value = parseFloat(valueStr);
    
    // 排除未来年份和规划数据（通常会包含"有望"、"预计"等词）
    const context = relevantText.substring(Math.max(0, prodMatch.index - 50), prodMatch.index + prodMatch[0].length);
    if (value && value > 0 && value < 200 && !context.includes('有望') && !context.includes('预计') && !context.includes('计划')) {
      extractedData.copper.production.push({
        keyword: '矿山产铜-产量(描述)',
        line: prodMatch[0],
        context: context,
        value: value * 10000, // 万吨转为吨
        allValues: [value * 10000]
      });
      foundProduction = true;
    }
  }
  
  // 方式2：如果描述性文本没找到，尝试从年度报告表格中提取（万吨单位）
  if (!foundProduction) {
    const copperProductionTablePattern = /矿产铜\s*[\/／]\s*万吨[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g;
    prodMatch = copperProductionTablePattern.exec(relevantText);
    if (prodMatch) {
      // 取第三个数字（通常是最近一年的实际值）
      const valueStr = prodMatch[3].replace(/[,，]/g, '');
      const value = parseFloat(valueStr);
      if (value && value > 0 && value < 200) {
        extractedData.copper.production.push({
          keyword: '矿山产铜-产量(表格-万吨)',
          line: prodMatch[0],
          context: prodMatch[0],
          value: value, // 保持万吨单位
          allValues: [value]
        });
        foundProduction = true;
      }
    }
  }
  
  // 方式3：如果还没找到，尝试从描述性文本中提取（吨单位）
  if (!foundProduction) {
    // 格式："报告期，矿山产铜 518,570 吨"或"其中：矿产铜 492,241 吨"
    const copperProductionDescPattern = /(?:报告期|其中)[:：，、]?\s*矿[山产]+铜[\s\t]+([\d,，]+\.?\d*)\s*吨/g;
    prodMatch = copperProductionDescPattern.exec(relevantText);
    if (prodMatch) {
      const valueStr = prodMatch[1].replace(/[,，]/g, '');
      const value = parseFloat(valueStr);
      // 半年度报告中的产量通常在30万-60万吨之间
      if (value && value > 100000 && value < 1000000) {
        extractedData.copper.production.push({
          keyword: '矿山产铜-产量(描述-吨)',
          line: prodMatch[0],
          context: prodMatch[0],
          value: value, // 已经是吨
          allValues: [value]
        });
        foundProduction = true;
      }
    }
  }
  
  // 方式4：如果还没找到，尝试从季度报告表格中提取（吨单位）
  if (!foundProduction) {
    // 格式：矿山产铜 	吨 	287,571 	262,649 	278,996
    // 或：矿山产铜 吨 789,459 754,248 270,889 255,921
    const copperProductionTonsPattern = /矿山产铜[\s\t]+吨[\s\t]+([\d,，]+\.?\d*)/g;
    prodMatch = copperProductionTonsPattern.exec(relevantText);
    if (prodMatch) {
      const valueStr = prodMatch[1].replace(/[,，]/g, '');
      const value = parseFloat(valueStr);
      // 季度报告中的产量通常在10万-100万吨之间
      if (value && value > 10000 && value < 2000000) {
        extractedData.copper.production.push({
          keyword: '矿山产铜-产量(表格-吨)',
          line: prodMatch[0],
          context: prodMatch[0],
          value: value, // 已经是吨
          allValues: [value]
        });
        foundProduction = true;
      }
    }
  }
  
  // 提取铜精矿的数据：销量、单价、单位销售成本
  // 格式1（季度报告）：铜精矿 吨 496,788 469,623 元/吨 60,878 56,113 元/吨 21,446 18,751 64.77 66.58
  // 格式2（半年度/年度）：铜精矿 60,354 元/吨 330,599 吨 1,995,309
  
  const copperConcentrateFullPattern = /铜精矿[\s\t]+吨[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+元\/吨[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+元\/吨[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g;
  const copperConcentrateSalesPattern = /铜精矿[\s\t]+([\d,，]+\.?\d*)[\s\t]+元[\s\/]*吨[\s\t]+([\d,，]+\.?\d*)[\s\t]+吨[\s\t]+([\d,，]+\.?\d*)/g;
  
  let copperConcentrateSales = null;
  let copperConcentratePrice = null;
  let copperConcentrateUnitCost = null;
  let copperConcentrateRevenue = null;
  
  // 先尝试匹配格式1（季度报告）
  let match = copperConcentrateFullPattern.exec(text);
  if (match) {
    const salesStr = match[1].replace(/[,，]/g, '');
    const sales = parseFloat(salesStr);
    if (sales && sales > 0) {
      copperConcentrateSales = sales; // 吨
    }
    
    const priceStr = match[3].replace(/[,，]/g, '');
    const price = parseFloat(priceStr);
    if (price && price > 0) {
      copperConcentratePrice = price; // 元/吨
    }
    
    const costStr = match[5].replace(/[,，]/g, '');
    const cost = parseFloat(costStr);
    if (cost && cost > 0) {
      copperConcentrateUnitCost = cost; // 元/吨
    }
  }
  
  // 如果格式1没有匹配到，尝试格式2（半年度/年度）
  if (!copperConcentrateSales) {
    match = copperConcentrateSalesPattern.exec(text);
    if (match) {
      const priceStr = match[1].replace(/[,，]/g, '');
      const price = parseFloat(priceStr);
      if (price && price > 0) {
        copperConcentratePrice = price; // 元/吨
      }
      
      const salesStr = match[2].replace(/[,，]/g, '');
      const sales = parseFloat(salesStr);
      if (sales && sales > 0) {
        copperConcentrateSales = sales; // 吨
      }
      
      const revenueStr = match[3].replace(/[,，]/g, '');
      const revenue = parseFloat(revenueStr);
      if (revenue && revenue > 0) {
        copperConcentrateRevenue = revenue * 10000; // 万元转换为元
      }
    }
  }
  
  // 提取电积铜的数据
  const electrowinCopperFullPattern = /电积铜[\s\t]+吨[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+元\/吨[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+元\/吨[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g;
  const electrowinCopperSalesPattern = /电积铜[\s\t]+([\d,，]+\.?\d*)[\s\t]+元[\s\/]*吨[\s\t]+([\d,，]+\.?\d*)[\s\t]+吨[\s\t]+([\d,，]+\.?\d*)/g;
  
  let electrowinCopperSales = null;
  let electrowinCopperPrice = null;
  let electrowinCopperUnitCost = null;
  let electrowinCopperRevenue = null;
  
  match = electrowinCopperFullPattern.exec(text);
  if (match) {
    const salesStr = match[1].replace(/[,，]/g, '');
    const sales = parseFloat(salesStr);
    if (sales && sales > 0) {
      electrowinCopperSales = sales;
    }
    
    const priceStr = match[3].replace(/[,，]/g, '');
    const price = parseFloat(priceStr);
    if (price && price > 0) {
      electrowinCopperPrice = price;
    }
    
    const costStr = match[5].replace(/[,，]/g, '');
    const cost = parseFloat(costStr);
    if (cost && cost > 0) {
      electrowinCopperUnitCost = cost;
    }
  }
  
  if (!electrowinCopperSales) {
    match = electrowinCopperSalesPattern.exec(text);
    if (match) {
      const priceStr = match[1].replace(/[,，]/g, '');
      const price = parseFloat(priceStr);
      if (price && price > 0) {
        electrowinCopperPrice = price;
      }
      
      const salesStr = match[2].replace(/[,，]/g, '');
      const sales = parseFloat(salesStr);
      if (sales && sales > 0) {
        electrowinCopperSales = sales;
      }
      
      const revenueStr = match[3].replace(/[,，]/g, '');
      const revenue = parseFloat(revenueStr);
      if (revenue && revenue > 0) {
        electrowinCopperRevenue = revenue * 10000;
      }
    }
  }
  
  // 提取电解铜的数据
  const electrolyticCopperFullPattern = /电解铜[\s\t]+吨[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+元\/吨[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+元\/吨[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g;
  const electrolyticCopperSalesPattern = /电解铜[\s\t]+([\d,，]+\.?\d*)[\s\t]+元[\s\/]*吨[\s\t]+([\d,，]+\.?\d*)[\s\t]+吨[\s\t]+([\d,，]+\.?\d*)/g;
  
  let electrolyticCopperSales = null;
  let electrolyticCopperPrice = null;
  let electrolyticCopperUnitCost = null;
  let electrolyticCopperRevenue = null;
  
  match = electrolyticCopperFullPattern.exec(text);
  if (match) {
    const salesStr = match[1].replace(/[,，]/g, '');
    const sales = parseFloat(salesStr);
    if (sales && sales > 0) {
      electrolyticCopperSales = sales;
    }
    
    const priceStr = match[3].replace(/[,，]/g, '');
    const price = parseFloat(priceStr);
    if (price && price > 0) {
      electrolyticCopperPrice = price;
    }
    
    const costStr = match[5].replace(/[,，]/g, '');
    const cost = parseFloat(costStr);
    if (cost && cost > 0) {
      electrolyticCopperUnitCost = cost;
    }
  }
  
  if (!electrolyticCopperSales) {
    match = electrolyticCopperSalesPattern.exec(text);
    if (match) {
      const priceStr = match[1].replace(/[,，]/g, '');
      const price = parseFloat(priceStr);
      if (price && price > 0) {
        electrolyticCopperPrice = price;
      }
      
      const salesStr = match[2].replace(/[,，]/g, '');
      const sales = parseFloat(salesStr);
      if (sales && sales > 0) {
        electrolyticCopperSales = sales;
      }
      
      const revenueStr = match[3].replace(/[,，]/g, '');
      const revenue = parseFloat(revenueStr);
      if (revenue && revenue > 0) {
        electrolyticCopperRevenue = revenue * 10000;
      }
    }
  }
  
  // 计算总销量、总营收和总成本（单位：元）
  let totalSales = 0;
  let totalRevenue = 0;
  let totalCost = 0;
  let avgUnitPrice = null;
  let avgUnitCost = null;
  let grossMargin = null;
  
  // 只有当三个子产品都有数据时，才计算汇总
  if (copperConcentrateSales && electrowinCopperSales && electrolyticCopperSales) {
    totalSales = copperConcentrateSales + electrowinCopperSales + electrolyticCopperSales; // 吨
    
    // 如果有销售金额（半年度/年度报告），直接使用
    if (copperConcentrateRevenue && electrowinCopperRevenue && electrolyticCopperRevenue) {
      totalRevenue = copperConcentrateRevenue + electrowinCopperRevenue + electrolyticCopperRevenue;
    }
    // 否则从单价和销量计算（季度报告）
    else if (copperConcentratePrice && electrowinCopperPrice && electrolyticCopperPrice) {
      totalRevenue = copperConcentrateSales * copperConcentratePrice + 
                     electrowinCopperSales * electrowinCopperPrice + 
                     electrolyticCopperSales * electrolyticCopperPrice;
    }
    
    // 成本（只有季度报告有单位成本数据）
    if (copperConcentrateUnitCost && electrowinCopperUnitCost && electrolyticCopperUnitCost) {
      totalCost = copperConcentrateSales * copperConcentrateUnitCost + 
                  electrowinCopperSales * electrowinCopperUnitCost + 
                  electrolyticCopperSales * electrolyticCopperUnitCost;
    }
    
    // 计算平均单价和单位成本
    if (totalRevenue > 0 && totalSales > 0) {
      avgUnitPrice = totalRevenue / totalSales; // 元/吨
    }
    if (totalCost > 0 && totalSales > 0) {
      avgUnitCost = totalCost / totalSales; // 元/吨
    }
    if (totalRevenue > 0 && totalCost > 0) {
      grossMargin = ((totalRevenue - totalCost) / totalRevenue) * 100; // %
    }
  }
  
  // 如果没有找到三个子产品的数据，尝试提取矿山产铜的汇总数据
  // 格式1（2023年Q1）：矿山产铜 吨 244,471 196,576 吨 235,521 197,629 元/吨 52,448 55,348 元/吨 21,640 18,305 58.74 66.93
  //                    (产量 产量对比 销量 销量对比 单价 单价对比 单位成本 单位成本对比 毛利率 毛利率对比)
  if (!totalSales || totalSales === 0) {
    const copperSummaryPattern1 = /矿山产铜[\s\t]+吨[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+吨[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+元\/吨[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+元\/吨[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g;
    const summaryMatch1 = copperSummaryPattern1.exec(text);
    
    if (summaryMatch1) {
      // 提取产量和销量
      const production = parseFloat(summaryMatch1[1].replace(/[,，]/g, ''));
      totalSales = parseFloat(summaryMatch1[3].replace(/[,，]/g, ''));
      avgUnitPrice = parseFloat(summaryMatch1[5].replace(/[,，]/g, ''));
      avgUnitCost = parseFloat(summaryMatch1[7].replace(/[,，]/g, ''));
      grossMargin = parseFloat(summaryMatch1[9].replace(/[,，]/g, ''));
      
      if (totalSales && avgUnitPrice) {
        totalRevenue = totalSales * avgUnitPrice; // 吨 × 元/吨 = 元
      }
      if (totalSales && avgUnitCost) {
        totalCost = totalSales * avgUnitCost; // 吨 × 元/吨 = 元
      }
      
      console.log(`  找到铜产品汇总数据（2023Q1格式）: 产量=${production}吨, 销量=${totalSales}吨, 单价=${avgUnitPrice}元/吨, 单位成本=${avgUnitCost}元/吨, 毛利率=${grossMargin}%`);
      
      // 保存产量数据
      if (production > 0) {
        extractedData.copper.production.push({
          keyword: '矿山产铜-产量(Q1格式)',
          line: '从汇总表格提取',
          context: summaryMatch1[0],
          value: production / 10000, // 吨转万吨
          allValues: [production / 10000]
        });
      }
    }
  }
  
  // 格式2（2023年Q3）：矿山产铜 吨 605,572 549,226 元/吨 51,147 50,924 元/吨 22,483 19,397 56.04 61.91
  if (!totalSales || totalSales === 0) {
    const copperSummaryPattern2 = /矿山产铜[\s\t]+吨[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+元\/吨[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+元\/吨[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g;
    const summaryMatch2 = copperSummaryPattern2.exec(text);
    
    if (summaryMatch2) {
      totalSales = parseFloat(summaryMatch2[1].replace(/[,，]/g, ''));
      avgUnitPrice = parseFloat(summaryMatch2[3].replace(/[,，]/g, ''));
      avgUnitCost = parseFloat(summaryMatch2[5].replace(/[,，]/g, ''));
      grossMargin = parseFloat(summaryMatch2[7].replace(/[,，]/g, ''));
      
      if (totalSales && avgUnitPrice) {
        totalRevenue = totalSales * avgUnitPrice; // 吨 × 元/吨 = 元
      }
      if (totalSales && avgUnitCost) {
        totalCost = totalSales * avgUnitCost; // 吨 × 元/吨 = 元
      }
      
      console.log(`  找到铜产品汇总数据（2023Q3格式）: 销量=${totalSales}吨, 单价=${avgUnitPrice}元/吨, 单位成本=${avgUnitCost}元/吨, 毛利率=${grossMargin}%`);
    }
  }
  
  // 格式2：尝试提取矿山产铜的汇总数据
  if (totalSales === 0) {
    // 格式：矿山产铜 51,000 元/吨 390,041 吨 1,989,222
    const mineCopperPattern = /矿山产铜[\s\t]+([\d,，]+\.?\d*)[\s\t]+元[\s\/]*吨[\s\t]+([\d,，]+\.?\d*)[\s\t]+吨[\s\t]+([\d,，]+\.?\d*)/g;
    const mineMatch = mineCopperPattern.exec(text);
    if (mineMatch) {
      const priceStr = mineMatch[1].replace(/[,，]/g, '');
      const price = parseFloat(priceStr);
      
      const salesStr = mineMatch[2].replace(/[,，]/g, '');
      const sales = parseFloat(salesStr);
      
      const revenueStr = mineMatch[3].replace(/[,，]/g, '');
      const revenue = parseFloat(revenueStr);
      
      if (sales && sales > 0) {
        totalSales = sales; // 吨
        totalRevenue = revenue * 10000; // 万元转换为元
        avgUnitPrice = price; // 元/吨
        
        extractedData.copper.sales.push({
          keyword: '矿山产铜-销量(汇总)',
          line: `矿山产铜汇总`,
          context: `总销量: ${totalSales} 吨`,
          value: totalSales / 10000, // 吨转换为万吨
          allValues: [totalSales / 10000]
        });
        
        if (totalRevenue > 0) {
          extractedData.copper.revenue.push({
            keyword: '矿山产铜-营收(汇总)',
            line: `总营收: ${totalRevenue}`,
            context: `总营收: ${totalRevenue}元`,
            value: totalRevenue,
            allValues: [totalRevenue]
          });
        }
        
        if (avgUnitPrice !== null) {
          extractedData.copper.calculatedUnitPrice = avgUnitPrice;
        }
      }
    }
  }
  
  // 只有当有销量数据时，才保存汇总数据
  if (totalSales > 0) {
    extractedData.copper.sales.push({
      keyword: '矿山产铜-销量(铜精矿+电积铜+电解铜)',
      line: `铜精矿: ${copperConcentrateSales || 0}, 电积铜: ${electrowinCopperSales || 0}, 电解铜: ${electrolyticCopperSales || 0}`,
      context: `总销量: ${totalSales} 吨`,
      value: totalSales / 10000, // 吨转换为万吨
      allValues: [totalSales / 10000]
    });
    
    if (totalRevenue > 0) {
      extractedData.copper.revenue.push({
        keyword: '矿山产铜-营收(铜精矿+电积铜+电解铜)',
        line: `总营收: ${totalRevenue}`,
        context: `总营收: ${totalRevenue}元`,
        value: totalRevenue, // 元
        allValues: [totalRevenue]
      });
    }
    
    if (totalCost > 0) {
      extractedData.copper.cost.push({
        keyword: '矿山产铜-成本(铜精矿+电积铜+电解铜)',
        line: `总成本: ${totalCost}`,
        context: `总成本: ${totalCost}元`,
        value: totalCost, // 元
        allValues: [totalCost]
      });
    }
    
    // 保存计算出的单价、单位成本和毛利率
    if (avgUnitPrice !== null) {
      extractedData.copper.calculatedUnitPrice = avgUnitPrice; // 元/吨
    }
    if (avgUnitCost !== null) {
      extractedData.copper.calculatedUnitCost = avgUnitCost; // 元/吨
    }
    if (grossMargin !== null) {
      extractedData.copper.calculatedGrossMargin = grossMargin; // %
    }
  }
}

/**
 * 在文本中搜索关键词并提取相关数据
 */
function extractDataByKeyword(text, keyword, contextLines = 3, isGold = false) {
  const results = [];
  const lines = text.split('\n');
  
  // 判断是否是需要保持万吨/万盎司单位的关键词
  const isWanTonKeyword = keyword.includes('产量') || keyword.includes('销量') || keyword.includes('库存');
  
  // 对于营收和成本关键词，需要更严格的匹配，避免匹配到公司总营业收入
  const isRevenueKeyword = keyword.includes('收入') || keyword.includes('营收');
  const isCostKeyword = keyword.includes('成本');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 对于营收关键词，必须包含"产品"或"销售"，排除"营业收入"
    if (isRevenueKeyword) {
      if (!line.includes('产品') && !line.includes('销售')) {
        continue; // 跳过不包含"产品"或"销售"的行
      }
      if (line.includes('营业收入') && !line.includes('金产品') && !line.includes('铜产品')) {
        continue; // 跳过公司总营业收入
      }
    }
    
    if (line.includes(keyword)) {
      const context = [];
      for (let j = Math.max(0, i - contextLines); j < Math.min(lines.length, i + contextLines + 1); j++) {
        context.push(lines[j]);
      }
      
      let extractedValue = null;
      
      // 特殊处理：产量、销量关键词
      if (keyword.includes('产量') || keyword.includes('销量')) {
        let patternStr = keyword;
        if (keyword.includes('铜')) {
          patternStr = isGold ? '矿产金产量' : '矿产铜产量';
        }
        let pattern = new RegExp(patternStr + '\\s*[（(](?:万吨|万盎司|千克|公斤)[）)]\\s+([\\d,，]+\\.?\\d*)', 'g');
        let match = pattern.exec(line);
        if (match) {
          if (isGold) {
            extractedValue = extractNumberInWanOunces(match[1] + (match[0].includes('万盎司') ? '万盎司' : '千克'));
          } else {
            extractedValue = extractNumberInWanTons(match[1] + '万吨');
          }
        } else {
          pattern = new RegExp(keyword + '[^\\d]*([\\d,，]+\\.?\\d*)\\s*(?:万吨|万盎司|千克|公斤)', 'g');
          match = pattern.exec(line);
          if (match) {
            if (isGold) {
              extractedValue = extractNumberInWanOunces(match[1] + (match[0].includes('万盎司') ? '万盎司' : '千克'));
            } else {
              extractedValue = extractNumberInWanTons(match[1] + '万吨');
            }
          }
        }
      }
      
      // 如果没有精确匹配，使用通用方法
      if (!extractedValue) {
        const lineNumbers = line.match(patterns.number);
        
        if (lineNumbers && lineNumbers.length > 0) {
          const extractFunc = isWanTonKeyword 
            ? (isGold ? extractNumberInWanOunces : extractNumberInWanTons)
            : extractNumber;
          const values = lineNumbers.map(n => extractFunc(n)).filter(n => n !== null);
          if (values.length > 0) {
            extractedValue = Math.max(...values);
          }
        } else {
          const contextText = context.join(' ');
          const numbers = contextText.match(patterns.number);
          
          if (numbers && numbers.length > 0) {
            const extractFunc = isWanTonKeyword 
              ? (isGold ? extractNumberInWanOunces : extractNumberInWanTons)
              : extractNumber;
            const values = numbers.map(n => extractFunc(n)).filter(n => n !== null);
            if (values.length > 0) {
              extractedValue = Math.max(...values);
            }
          }
        }
      }
      
      if (extractedValue) {
        const lineNumbers = line.match(patterns.number);
        const extractFunc = isWanTonKeyword 
          ? (isGold ? extractNumberInWanOunces : extractNumberInWanTons)
          : extractNumber;
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
 * 从文本中提取铜产品销售收入、成本、单价、单位成本和毛利率
 */
function extractCopperFinancials(text) {
  const result = {
    copperRevenue: null,
    copperCost: null,
    grossProfit: null,
    grossMargin: null,
    unitPrice: null,      // 单价（元/吨）
    unitCost: null,        // 单位成本（元/吨）
    salesVolume: null      // 销量（吨）
  };
  
  // 匹配格式：矿山产铜 销售数量 单位 吨 2025年 Q1 219,826
  // 单价 单位 元/吨 2025年 Q1 62,030
  // 单位销售成本 单位 元/吨 2025年 Q1 24,107
  // 毛利率 2025年 Q1 61.14
  
  // 匹配矿山产铜的完整表格数据
  const copperPattern = /矿山产铜[\s\S]{0,2000}?销售数量[\s\S]{0,500}?([\d,，]+\.?\d*)[\s\S]{0,500}?单价[\s\S]{0,500}?([\d,，]+\.?\d*)[\s\S]{0,500}?单位销售成本[\s\S]{0,500}?([\d,，]+\.?\d*)[\s\S]{0,500}?毛利率[\s\S]{0,500}?([\d,，]+\.?\d*)\s*%/g;
  let copperMatch;
  while ((copperMatch = copperPattern.exec(text)) !== null) {
    // 提取销量（吨）
    const salesStr = copperMatch[1].replace(/[,，]/g, '');
    const sales = parseFloat(salesStr);
    if (sales && sales > 0 && sales < 10000000) {
      result.salesVolume = sales; // 吨
    }
    
    // 提取单价（元/吨）
    const priceStr = copperMatch[2].replace(/[,，]/g, '');
    const price = parseFloat(priceStr);
    if (price && price > 0 && price < 1000000) {
      result.unitPrice = price; // 元/吨
    }
    
    // 提取单位成本（元/吨）
    const costStr = copperMatch[3].replace(/[,，]/g, '');
    const cost = parseFloat(costStr);
    if (cost && cost > 0 && cost < 1000000) {
      result.unitCost = cost; // 元/吨
    }
    
    // 提取毛利率（%）
    const marginStr = copperMatch[4].replace(/[,，]/g, '');
    const margin = parseFloat(marginStr);
    if (margin && margin >= 0 && margin <= 100) {
      result.grossMargin = margin;
    }
    
    break; // 只取第一个匹配
  }
  
  // 如果没有匹配到完整表格，尝试单独匹配各个字段
  if (!result.salesVolume) {
    const salesPattern = /矿山产铜[\s\S]{0,1000}?销售数量[\s\S]{0,200}?([\d,，]+\.?\d*)\s*吨/g;
    const salesMatch = salesPattern.exec(text);
    if (salesMatch) {
      const salesStr = salesMatch[1].replace(/[,，]/g, '');
      const sales = parseFloat(salesStr);
      if (sales && sales > 0 && sales < 10000000) {
        result.salesVolume = sales;
      }
    }
  }
  
  if (!result.unitPrice) {
    const pricePattern = /矿山产铜[\s\S]{0,1000}?单价[\s\S]{0,200}?([\d,，]+\.?\d*)\s*元\/吨/g;
    const priceMatch = pricePattern.exec(text);
    if (priceMatch) {
      const priceStr = priceMatch[1].replace(/[,，]/g, '');
      const price = parseFloat(priceStr);
      if (price && price > 0 && price < 1000000) {
        result.unitPrice = price;
      }
    }
  }
  
  if (!result.unitCost) {
    const costPattern = /矿山产铜[\s\S]{0,1000}?单位销售成本[\s\S]{0,200}?([\d,，]+\.?\d*)\s*元\/吨/g;
    const costMatch = costPattern.exec(text);
    if (costMatch) {
      const costStr = costMatch[1].replace(/[,，]/g, '');
      const cost = parseFloat(costStr);
      if (cost && cost > 0 && cost < 1000000) {
        result.unitCost = cost;
      }
    }
  }
  
  if (!result.grossMargin) {
    const marginPattern = /矿山产铜[\s\S]{0,1000}?毛利率[\s\S]{0,200}?([\d,，]+\.?\d*)\s*%/g;
    const marginMatch = marginPattern.exec(text);
    if (marginMatch) {
      const marginStr = marginMatch[1].replace(/[,，]/g, '');
      const margin = parseFloat(marginStr);
      if (margin && margin >= 0 && margin <= 100) {
        result.grossMargin = margin;
      }
    }
  }
  
  // 匹配格式：铜产品销售收入 \tXX \t亿元，铜产品销售成本 \tXX \t亿元
  const pattern1 = /铜产品销售收入[\s\t]+([\d,，]+\.?\d*)[\s\t]+亿元[，,]*[\s\t]*铜产品销售成本[\s\t]+([\d,，]+\.?\d*)[\s\t]+亿元/g;
  let match1 = pattern1.exec(text);
  if (match1) {
    result.copperRevenue = extractNumber(match1[1] + '亿元');
    result.copperCost = extractNumber(match1[2] + '亿元');
    if (result.copperRevenue && result.copperCost) {
      result.grossProfit = result.copperRevenue - result.copperCost;
    }
    return result;
  }
  
  // 从"分产品"表格中提取铜产品的营业收入、营业成本和毛利率
  if (!result.copperRevenue || !result.copperCost || !result.grossMargin) {
    const productTablePattern = /分产品[^\d]*铜产品[^\d]*([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)\s*%/g;
    let productMatch;
    while ((productMatch = productTablePattern.exec(text)) !== null) {
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
  
  // 格式：其中铜产品销售收入 XX 亿元
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
  
  // 格式：铜产品销售成本 XX 亿元
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
  
  // 如果都有，计算毛利和毛利率
  if (result.copperRevenue && result.copperCost && !result.grossProfit) {
    result.grossProfit = result.copperRevenue - result.copperCost;
  }
  if (result.copperRevenue && result.copperCost && result.grossMargin === null) {
    const grossProfit = result.copperRevenue - result.copperCost;
    result.grossMargin = (grossProfit / result.copperRevenue) * 100;
  }
  
  return result;
}

/**
 * 从文本中提取金产品销售收入、成本、单价、单位成本和毛利率
 */
function extractGoldFinancials(text) {
  const result = {
    goldRevenue: null,
    goldCost: null,
    grossProfit: null,
    grossMargin: null,
    unitPrice: null,      // 单价（元/克）
    unitCost: null,       // 单位成本（元/克）
    salesVolume: null     // 销量（千克）
  };
  
  // 匹配格式：矿山产金 销售数量 单位 千克 2025年 Q1 18,035
  // 单价 单位 元/克 2025年 Q1 641.51
  // 单位销售成本 单位 元/克 2025年 Q1 251.08
  // 毛利率 2025年 Q1 60.86
  
  // 匹配矿山产金的完整表格数据
  const goldPattern = /矿山产金[\s\S]{0,2000}?销售数量[\s\S]{0,500}?([\d,，]+\.?\d*)[\s\S]{0,500}?单价[\s\S]{0,500}?([\d,，]+\.?\d*)[\s\S]{0,500}?单位销售成本[\s\S]{0,500}?([\d,，]+\.?\d*)[\s\S]{0,500}?毛利率[\s\S]{0,500}?([\d,，]+\.?\d*)\s*%/g;
  let goldMatch;
  while ((goldMatch = goldPattern.exec(text)) !== null) {
    // 提取销量（千克）
    const salesStr = goldMatch[1].replace(/[,，]/g, '');
    const sales = parseFloat(salesStr);
    if (sales && sales > 0 && sales < 1000000) {
      result.salesVolume = sales; // 千克
    }
    
    // 提取单价（元/克）
    const priceStr = goldMatch[2].replace(/[,，]/g, '');
    const price = parseFloat(priceStr);
    if (price && price > 0 && price < 10000) {
      result.unitPrice = price; // 元/克
    }
    
    // 提取单位成本（元/克）
    const costStr = goldMatch[3].replace(/[,，]/g, '');
    const cost = parseFloat(costStr);
    if (cost && cost > 0 && cost < 10000) {
      result.unitCost = cost; // 元/克
    }
    
    // 提取毛利率（%）
    const marginStr = goldMatch[4].replace(/[,，]/g, '');
    const margin = parseFloat(marginStr);
    if (margin && margin >= 0 && margin <= 100) {
      result.grossMargin = margin;
    }
    
    break; // 只取第一个匹配
  }
  
  // 如果没有匹配到完整表格，尝试单独匹配各个字段
  if (!result.salesVolume) {
    const salesPattern = /矿山产金[\s\S]{0,1000}?销售数量[\s\S]{0,200}?([\d,，]+\.?\d*)\s*千克/g;
    const salesMatch = salesPattern.exec(text);
    if (salesMatch) {
      const salesStr = salesMatch[1].replace(/[,，]/g, '');
      const sales = parseFloat(salesStr);
      if (sales && sales > 0 && sales < 1000000) {
        result.salesVolume = sales;
      }
    }
  }
  
  if (!result.unitPrice) {
    const pricePattern = /矿山产金[\s\S]{0,1000}?单价[\s\S]{0,200}?([\d,，]+\.?\d*)\s*元\/克/g;
    const priceMatch = pricePattern.exec(text);
    if (priceMatch) {
      const priceStr = priceMatch[1].replace(/[,，]/g, '');
      const price = parseFloat(priceStr);
      if (price && price > 0 && price < 10000) {
        result.unitPrice = price;
      }
    }
  }
  
  if (!result.unitCost) {
    const costPattern = /矿山产金[\s\S]{0,1000}?单位销售成本[\s\S]{0,200}?([\d,，]+\.?\d*)\s*元\/克/g;
    const costMatch = costPattern.exec(text);
    if (costMatch) {
      const costStr = costMatch[1].replace(/[,，]/g, '');
      const cost = parseFloat(costStr);
      if (cost && cost > 0 && cost < 10000) {
        result.unitCost = cost;
      }
    }
  }
  
  if (!result.grossMargin) {
    const marginPattern = /矿山产金[\s\S]{0,1000}?毛利率[\s\S]{0,200}?([\d,，]+\.?\d*)\s*%/g;
    const marginMatch = marginPattern.exec(text);
    if (marginMatch) {
      const marginStr = marginMatch[1].replace(/[,，]/g, '');
      const margin = parseFloat(marginStr);
      if (margin && margin >= 0 && margin <= 100) {
        result.grossMargin = margin;
      }
    }
  }
  
  // 匹配格式：金产品销售收入 \tXX \t亿元，金产品销售成本 \tXX \t亿元
  // 注意：必须明确包含"金产品"关键词，避免匹配到公司总营业收入
  const pattern1 = /金产品销售收入[\s\t]+([\d,，]+\.?\d*)[\s\t]+亿元[，,]*[\s\t]*金产品销售成本[\s\t]+([\d,，]+\.?\d*)[\s\t]+亿元/g;
  let match1 = pattern1.exec(text);
  if (match1) {
    const revenue = extractNumber(match1[1] + '亿元');
    const cost = extractNumber(match1[2] + '亿元');
    // 验证数据合理性：金产品营收通常不会超过500亿元
    if (revenue && revenue < 50000000000) {
      result.goldRevenue = revenue;
      result.goldCost = cost;
      if (result.goldRevenue && result.goldCost) {
        result.grossProfit = result.goldRevenue - result.goldCost;
      }
    }
    return result;
  }
  
  // 从"分产品"表格中提取金产品的营业收入、营业成本和毛利率
  if (!result.goldRevenue || !result.goldCost || !result.grossMargin) {
    const productTablePattern = /分产品[^\d]*金产品[^\d]*([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)\s*%/g;
    let productMatch;
    while ((productMatch = productTablePattern.exec(text)) !== null) {
      const revenueValue = extractNumber(productMatch[1] + '元');
      const costValue = extractNumber(productMatch[2] + '元');
      const marginStr = productMatch[3].replace(/[,，]/g, '');
      const marginValue = parseFloat(marginStr);
      
      if (revenueValue && revenueValue > 1000000000 && costValue && costValue > 1000000000) {
        if (!result.goldRevenue) result.goldRevenue = revenueValue;
        if (!result.goldCost) result.goldCost = costValue;
        if (!result.grossMargin && !isNaN(marginValue) && marginValue >= 0 && marginValue <= 100) {
          result.grossMargin = marginValue;
        }
        break;
      }
    }
  }
  
  // 格式：其中金产品销售收入 XX 亿元
  if (!result.goldRevenue) {
    const pattern5 = /(?:其中)?金产品销售收入[\s\t]+([\d,，]+\.?\d*)[\s\t]*亿元/g;
    let match5;
    while ((match5 = pattern5.exec(text)) !== null) {
      const value = extractNumber(match5[1] + '亿元');
      if (value && value > 10000000) {
        result.goldRevenue = value;
        break;
      }
    }
  }
  
  // 格式：金产品销售成本 XX 亿元
  if (!result.goldCost) {
    const pattern6 = /(?:其中)?金产品销售成本[\s\t]+([\d,，]+\.?\d*)[\s\t]*亿元/g;
    let match6;
    while ((match6 = pattern6.exec(text)) !== null) {
      const value = extractNumber(match6[1] + '亿元');
      if (value && value > 10000000) {
        result.goldCost = value;
        break;
      }
    }
  }
  
  // 如果都有，计算毛利和毛利率
  if (result.goldRevenue && result.goldCost && !result.grossProfit) {
    result.grossProfit = result.goldRevenue - result.goldCost;
  }
  if (result.goldRevenue && result.goldCost && result.grossMargin === null) {
    const grossProfit = result.goldRevenue - result.goldCost;
    result.grossMargin = (grossProfit / result.goldRevenue) * 100;
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
      copper: {
        cost: [],
        revenue: [],
        production: [],
        sales: [],
        inventory: [],
        unitPrice: null,    // 单价（元/吨）
        unitCost: null,     // 单位成本（元/吨）
        grossMargin: null,  // 毛利率（%）
        salesVolume: null,  // 销量（吨）
        calculatedUnitPrice: null,  // 计算出的单价（元/吨）
        calculatedUnitCost: null,   // 计算出的单位成本（元/吨）
        calculatedGrossMargin: null // 计算出的毛利率（%）
      },
      gold: {
        cost: [],
        revenue: [],
        production: [],
        sales: [],
        inventory: [],
        unitPrice: null,    // 单价（元/克）
        unitCost: null,     // 单位成本（元/克）
        grossMargin: null,  // 毛利率（%）
        salesVolume: null,  // 销量（吨，从千克转换）
        calculatedUnitPrice: null,  // 计算出的单价（元/克）
        calculatedUnitCost: null,   // 计算出的单位成本（元/克）
        calculatedGrossMargin: null // 计算出的毛利率（%）
      }
    };
    
    // 提取铜相关数据
    for (const keyword of keywords.copper.cost) {
      const results = extractDataByKeyword(data.text, keyword, 3, false);
      extractedData.copper.cost.push(...results);
    }
    
    for (const keyword of keywords.copper.revenue) {
      const results = extractDataByKeyword(data.text, keyword, 3, false);
      extractedData.copper.revenue.push(...results);
    }
    
    for (const keyword of keywords.copper.production) {
      const results = extractDataByKeyword(data.text, keyword, 3, false);
      extractedData.copper.production.push(...results);
    }
    
    for (const keyword of keywords.copper.sales) {
      const results = extractDataByKeyword(data.text, keyword, 3, false);
      extractedData.copper.sales.push(...results);
    }
    
    // 提取金相关数据
    for (const keyword of keywords.gold.cost) {
      const results = extractDataByKeyword(data.text, keyword, 3, true);
      extractedData.gold.cost.push(...results);
    }
    
    for (const keyword of keywords.gold.revenue) {
      const results = extractDataByKeyword(data.text, keyword, 3, true);
      extractedData.gold.revenue.push(...results);
    }
    
    for (const keyword of keywords.gold.production) {
      const results = extractDataByKeyword(data.text, keyword, 3, true);
      extractedData.gold.production.push(...results);
    }
    
    for (const keyword of keywords.gold.sales) {
      const results = extractDataByKeyword(data.text, keyword, 3, true);
      extractedData.gold.sales.push(...results);
    }
    
    // 提取库存相关数据（仅年报有此数据，不包括半年度报告和季度报告）
    const isAnnualReport = extractedData.filename && extractedData.filename.match(/\d{4}年年度报告/);
    if (isAnnualReport) {
      extractInventoryFromMainProducts(data.text, extractedData);
    }
    
    // 从表格中提取矿山产金的数据（产量、销量=金锭+金精矿）
    extractMineGoldData(data.text, extractedData);
    
    // 从表格中提取矿山产铜的数据（销量=铜精矿+电积铜+电解铜）
    extractMineCopperData(data.text, extractedData);
    
    // 调试输出
    if (data.filename && data.filename.includes('2025年第三季度')) {
      console.log('\n=== 调试：2025年第三季度报告 ===');
      console.log('金产品销量数据:', extractedData.gold.sales);
      console.log('金产品营收数据:', extractedData.gold.revenue);
      console.log('金产品成本数据:', extractedData.gold.cost);
      console.log('计算出的单价:', extractedData.gold.calculatedUnitPrice);
      console.log('计算出的单位成本:', extractedData.gold.calculatedUnitCost);
      console.log('计算出的毛利率:', extractedData.gold.calculatedGrossMargin);
    }
    
    // 提取铜财务数据（销售收入、成本、单价、单位成本、毛利率）
    const copperFinancials = extractCopperFinancials(data.text);
    if (copperFinancials.copperRevenue) {
      extractedData.copper.revenue.push({
        keyword: '铜产品销售收入',
        line: '从extractCopperFinancials提取',
        context: '从extractCopperFinancials提取',
        value: copperFinancials.copperRevenue,
        allValues: [copperFinancials.copperRevenue]
      });
    }
    if (copperFinancials.copperCost) {
      extractedData.copper.cost.push({
        keyword: '铜产品销售成本',
        line: '从extractCopperFinancials提取',
        context: '从extractCopperFinancials提取',
        value: copperFinancials.copperCost,
        allValues: [copperFinancials.copperCost]
      });
    }
    // 优先使用从铜精矿+电积铜+电解铜计算出的数据
    if (extractedData.copper.calculatedUnitPrice !== undefined && extractedData.copper.calculatedUnitPrice !== null) {
      extractedData.copper.unitPrice = extractedData.copper.calculatedUnitPrice;
    } else if (copperFinancials.unitPrice) {
      extractedData.copper.unitPrice = copperFinancials.unitPrice;
    } else {
      extractedData.copper.unitPrice = null;
    }
    
    if (extractedData.copper.calculatedUnitCost !== undefined && extractedData.copper.calculatedUnitCost !== null) {
      extractedData.copper.unitCost = extractedData.copper.calculatedUnitCost;
    } else if (copperFinancials.unitCost) {
      extractedData.copper.unitCost = copperFinancials.unitCost;
    } else {
      extractedData.copper.unitCost = null;
    }
    
    // 优先使用主营业务表格中的毛利率（最准确）
    if (!extractedData.copper.grossMargin) {
      if (extractedData.copper.calculatedGrossMargin !== undefined && extractedData.copper.calculatedGrossMargin !== null) {
        extractedData.copper.grossMargin = extractedData.copper.calculatedGrossMargin;
      } else if (copperFinancials.grossMargin) {
        extractedData.copper.grossMargin = copperFinancials.grossMargin;
      } else {
        extractedData.copper.grossMargin = null;
      }
    }
    
    // 优先使用从铜精矿+电积铜+电解铜计算出的销量
    const calculatedCopperSales = getMainValue(extractedData.copper.sales, '矿山产铜-销量');
    extractedData.copper.salesVolume = calculatedCopperSales ? calculatedCopperSales : copperFinancials.salesVolume;
    
    // 提取金财务数据（销售收入、成本、单价、单位成本、毛利率）
    const goldFinancials = extractGoldFinancials(data.text);
    
    // 检查是否有从金锭+金精矿计算出的数据
    const hasCalculatedGoldData = extractedData.gold.calculatedUnitPrice !== null || 
                                   getMainValue(extractedData.gold.revenue, '矿山产金-营收') !== null;
    
    // 优先使用从矿山产金（金锭+金精矿）计算出的数据
    if (hasCalculatedGoldData) {
      // 有分产品数据，使用计算出的数据
      if (extractedData.gold.calculatedUnitPrice !== undefined && extractedData.gold.calculatedUnitPrice !== null) {
        extractedData.gold.unitPrice = extractedData.gold.calculatedUnitPrice;
      }
      
      if (extractedData.gold.calculatedUnitCost !== undefined && extractedData.gold.calculatedUnitCost !== null) {
        extractedData.gold.unitCost = extractedData.gold.calculatedUnitCost;
      }
      
      if (extractedData.gold.calculatedGrossMargin !== undefined && extractedData.gold.calculatedGrossMargin !== null) {
        extractedData.gold.grossMargin = extractedData.gold.calculatedGrossMargin;
      }
      
      // 优先使用从矿山产金计算出的销量
      const calculatedSales = getMainValue(extractedData.gold.sales, '矿山产金-销量');
      extractedData.gold.salesVolume = calculatedSales ? calculatedSales / 1000 : null;
    } else {
      // 没有分产品数据，使用汇总的金产品财务数据（适用于2023年及之前）
      console.log('  使用金产品汇总财务数据（没有分产品数据）');
      
      // 使用extractGoldFinancials提取的汇总数据
      if (goldFinancials.goldRevenue) {
        extractedData.gold.revenue.push({
          keyword: '金产品销售收入(汇总)',
          line: '从财务数据提取',
          context: '从财务数据提取',
          value: goldFinancials.goldRevenue,
          allValues: [goldFinancials.goldRevenue]
        });
      }
      
      if (goldFinancials.goldCost) {
        extractedData.gold.cost.push({
          keyword: '金产品销售成本(汇总)',
          line: '从财务数据提取',
          context: '从财务数据提取',
          value: goldFinancials.goldCost,
          allValues: [goldFinancials.goldCost]
        });
      }
      
      if (goldFinancials.unitPrice) {
        extractedData.gold.unitPrice = goldFinancials.unitPrice;
      }
      
      if (goldFinancials.unitCost) {
        extractedData.gold.unitCost = goldFinancials.unitCost;
      }
      
      if (goldFinancials.grossMargin) {
        extractedData.gold.grossMargin = goldFinancials.grossMargin;
      }
      
      if (goldFinancials.salesVolume) {
        extractedData.gold.salesVolume = goldFinancials.salesVolume / 1000; // 千克转吨
      }
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
  const reportDir = path.join(__dirname, '../../stock/report_analysis/紫金矿业');
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
 * 提取主要数据值（优先使用特定关键词，而不是取最大值）
 */
function getMainValue(results, preferKeyword = null) {
  if (!results || results.length === 0) return null;
  
  // 如果指定了优先关键词，则只返回该关键词匹配的值
  if (preferKeyword) {
    const preferredItems = results.filter(r => r.keyword && r.keyword.includes(preferKeyword));
    if (preferredItems.length > 0) {
      const preferredValues = preferredItems.map(r => r.value).filter(v => v !== null && v > 0);
      if (preferredValues.length > 0) {
        // 对于优先关键词，取第一个值（通常是最相关的）而不是最大值
        return preferredValues[0];
      }
    }
  }
  
  // 如果没有优先关键词或没有匹配，取所有值中的最大值
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
    
    // 提取铜相关数据
    // 优先使用矿山产铜计算出的营收和成本
    let copperRevenue = getMainValue(data.copper.revenue, '矿山产铜-营收');
    if (!copperRevenue) {
      copperRevenue = getMainValue(data.copper.revenue, '铜产品销售收入');
    }
    let copperCost = getMainValue(data.copper.cost, '矿山产铜-成本');
    if (!copperCost) {
      copperCost = getMainValue(data.copper.cost, '铜产品销售成本');
    }
    // 如果成本为0，设为null（用户要求：值为0.0不录入）
    if (copperCost === 0) {
      copperCost = null;
    }
    // 优先使用矿山产铜的产量和销量
    // 优先级：矿山产铜-产量(描述) > 矿山产铜-产量(表格-万吨) > 主要产品-产量
    let copperProduction = null;
    let copperProductionSource = null;
    
    // 尝试从描述性文本提取（单位：吨，需要转换）
    const descProduction = getMainValue(data.copper.production, '矿山产铜-产量(描述');
    if (descProduction && descProduction < 10000000) {
      copperProduction = descProduction / 10000; // 吨转万吨
      copperProductionSource = '描述-吨';
    } else if (descProduction && descProduction >= 10000000) {
      console.log(`  警告: 铜产量异常 (${descProduction})，尝试其他数据源`);
    }
    
    // 尝试从表格提取（单位：万吨，不需要转换）
    if (!copperProduction) {
      const tableProduction = getMainValue(data.copper.production, '矿山产铜-产量(表格');
      if (tableProduction) {
        copperProduction = tableProduction; // 已经是万吨
        copperProductionSource = '表格-万吨';
      }
    }
    
    // 尝试从主要产品表格提取（单位：吨，需要转换）
    if (!copperProduction) {
      const mainProductProduction = getMainValue(data.copper.production, '主要产品');
      if (mainProductProduction) {
        copperProduction = mainProductProduction / 10000; // 吨转万吨
        copperProductionSource = '主要产品-吨';
      }
    }
    // 铜销量（矿山产铜-销量已经是万吨，主要产品是吨）
    let copperSales = getMainValue(data.copper.sales, '矿山产铜-销量');
    if (!copperSales) {
      // 主要产品表格的单位是吨，需要转换为万吨
      const mainProductSales = getMainValue(data.copper.sales, '主要产品');
      copperSales = mainProductSales ? mainProductSales / 10000 : null;
    }
    
    // 铜库存（主要产品表格的单位是吨，需要转换为万吨）
    const mainProductInventory = getMainValue(data.copper.inventory, '主要产品');
    let copperInventory = mainProductInventory ? mainProductInventory / 10000 : null;
    
    // 如果没有找到总成本，或成本值异常小（< 1000万元），但有单位成本和销量数据，则计算总成本
    // 对于半年度报告，通常只有单位成本表格，需要用单位成本×销量来计算
    if ((!copperCost || copperCost < 10000000) && data.copper._hasUnitCostData && copperSales) {
      let avgUnitCost;
      
      // 优先使用汇总的单位成本（2023年格式）
      if (data.copper._summaryUnitCost) {
        avgUnitCost = data.copper._summaryUnitCost;
        console.log(`  使用汇总单位成本计算铜成本: ${copperSales.toFixed(2)}万吨 × ${avgUnitCost.toFixed(2)}元/吨 = ${(copperSales * 10000 * avgUnitCost / 100000000).toFixed(2)}亿元`);
      } else if (data.copper._concentrateUnitCost && data.copper._electrowinUnitCost && data.copper._electrolyticUnitCost) {
        // 使用三种铜产品的平均单位成本（2024年格式）
        avgUnitCost = (data.copper._concentrateUnitCost + data.copper._electrowinUnitCost + data.copper._electrolyticUnitCost) / 3;
        console.log(`  使用平均单位成本计算铜成本: ${copperSales.toFixed(2)}万吨 × ${avgUnitCost.toFixed(2)}元/吨 = ${(copperSales * 10000 * avgUnitCost / 100000000).toFixed(2)}亿元`);
      }
      
      if (avgUnitCost) {
        copperCost = copperSales * 10000 * avgUnitCost; // 万吨 × 10000 × 元/吨 = 元
      }
    }
    
    // 提取金相关数据（优先使用矿山产金的数据）
    // 优先使用矿山产金计算出的营收和成本
    let goldRevenue = getMainValue(data.gold.revenue, '矿山产金-营收');
    if (!goldRevenue) {
      goldRevenue = getMainValue(data.gold.revenue, '金产品销售收入');
    }
    // 验证金营收数据的合理性（金产品营收通常在几十到几百亿之间）
    // 如果超过500亿元，很可能是错误地匹配到了公司总营业收入
    if (goldRevenue && goldRevenue > 50000000000) {
      console.log(`  警告: 金营收疑似异常 (${(goldRevenue / 100000000).toFixed(2)}亿元)，已过滤`);
      goldRevenue = null;
    }
    
    let goldCost = getMainValue(data.gold.cost, '矿山产金-成本');
    if (!goldCost) {
      goldCost = getMainValue(data.gold.cost, '金产品销售成本');
    }
    // 如果成本为0，设为null（用户要求：值为0.0不录入）
    if (goldCost === 0) {
      goldCost = null;
    }
    // 优先使用矿山产金的产量
    let goldProduction = getMainValue(data.gold.production, '矿山产金-产量');
    if (!goldProduction) {
      goldProduction = getMainValue(data.gold.production, '主要产品');
    }
    // 优先使用矿山产金的销量（金锭+金精矿）
    let goldSales = getMainValue(data.gold.sales, '矿山产金-销量');
    let goldSalesInTons = false; // 标记goldSales是否已经是吨单位
    
    if (!goldSales) {
      goldSales = getMainValue(data.gold.sales, '主要产品');
    }
    
    // 检查goldSales的单位：如果值很大（>1000），说明是千克，需要转换为吨
    if (goldSales && goldSales > 1000) {
      console.log(`  金销量单位转换: ${goldSales}千克 → ${(goldSales / 1000).toFixed(2)}吨`);
      goldSales = goldSales / 1000; // 千克转吨
      goldSalesInTons = true;
    }
    let goldInventory = getMainValue(data.gold.inventory, '主要产品');
    
    // 如果没有找到总成本，或成本值异常小（< 1000万元），但有单位成本和销量数据，则计算总成本
    // 对于半年度报告，通常只有单位成本表格，需要用单位成本×销量来计算
    if ((!goldCost || goldCost < 10000000) && data.gold._hasUnitCostData && goldSales) {
      let avgUnitCost;
      
      // 优先使用汇总的单位成本（2023年格式）
      if (data.gold._summaryUnitCost) {
        avgUnitCost = data.gold._summaryUnitCost;
        const salesInGrams = goldSales * 1000 * 1000; // 吨转千克转克
        goldCost = salesInGrams * avgUnitCost; // 元
        console.log(`  使用汇总单位成本计算金成本: ${goldSales}吨 × ${avgUnitCost.toFixed(2)}元/克 = ${(goldCost / 100000000).toFixed(2)}亿元`);
      } else if (data.gold._ingotUnitCost && data.gold._concentrateUnitCost) {
        // 使用金锭和金精矿的平均单位成本（2024年格式）
        avgUnitCost = (data.gold._ingotUnitCost + data.gold._concentrateUnitCost) / 2;
        const salesInGrams = goldSales * 1000 * 1000; // 吨转千克转克
        goldCost = salesInGrams * avgUnitCost; // 元
        console.log(`  使用平均单位成本计算金成本: ${goldSales}吨 × ${avgUnitCost.toFixed(2)}元/克 = ${(goldCost / 100000000).toFixed(2)}亿元`);
      }
    }
    
    // 提取单价、单位成本和毛利率
    // 铜的单位售价和成本转换为万元/吨（原单位：元/吨）
    const copperUnitPrice = data.copper.unitPrice ? data.copper.unitPrice / 10000 : null;
    let copperUnitCost = data.copper.unitCost ? data.copper.unitCost / 10000 : null;
    // 如果没有单位成本，但有总成本和销量，则计算单位成本
    if (!copperUnitCost && copperCost && copperSales) {
      copperUnitCost = (copperCost / (copperSales * 10000)) / 10000; // (元 / 吨) / 10000 = 万元/吨
    }
    // 铜毛利率：优先使用计算值（更准确）
    let copperGrossMargin = data.copper.grossMargin;
    if (copperRevenue && copperCost) {
      copperGrossMargin = ((copperRevenue - copperCost) / copperRevenue) * 100;
    }
    const copperSalesVolume = data.copper.salesVolume;
    
    const goldUnitPrice = data.gold.unitPrice;
    let goldUnitCost = data.gold.unitCost;
    // 如果没有单位成本，但有总成本和销量，则计算单位成本
    // 注意：goldSales 的单位是吨，需要转换为克
    if (!goldUnitCost && goldCost && goldSales) {
      goldUnitCost = goldCost / (goldSales * 1000 * 1000); // 元 / (吨 * 1000 * 1000) = 元/克
    }
    // 金毛利率：优先使用计算值（更准确）
    let goldGrossMargin = data.gold.grossMargin;
    if (goldRevenue && goldCost) {
      goldGrossMargin = ((goldRevenue - goldCost) / goldRevenue) * 100;
    }
    const goldSalesVolume = data.gold.salesVolume;
    
    summary.push({
      year: year,
      filename: data.filename,
      copper: {
        cost: copperCost,
        revenue: copperRevenue,
        production: copperProduction,
        sales: copperSales,
        inventory: copperInventory,
        unitPrice: copperUnitPrice,      // 万元/吨
        unitCost: copperUnitCost,        // 万元/吨
        grossMargin: copperGrossMargin,   // %
        salesVolume: copperSalesVolume    // 吨
      },
      gold: {
        cost: goldCost,
        revenue: goldRevenue,
        production: goldProduction ? goldProduction / 1000 : null,  // 从千克转换为吨
        sales: goldSales ? (goldSalesInTons ? goldSales : goldSales / 1000) : null, // 如果已经是吨则直接使用，否则从千克转换为吨
        inventory: goldInventory ? goldInventory / 1000 : null,     // 从千克转换为吨
        unitPrice: goldUnitPrice,        // 元/克
        unitCost: goldUnitCost,          // 元/克
        grossMargin: goldGrossMargin,     // %
        salesVolume: goldSalesVolume      // 吨（已转换）
      }
    });
  }
  
  return summary;
}

/**
 * 主函数
 */
async function main() {
  console.log('开始解析紫金矿业年报PDF文件...\n');
  
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
    console.log(`  铜产品:`);
    console.log(`    成本: ${item.copper.cost ? (item.copper.cost / 100000000).toFixed(2) + '亿元' : '未找到'}`);
    console.log(`    营收: ${item.copper.revenue ? (item.copper.revenue / 100000000).toFixed(2) + '亿元' : '未找到'}`);
    console.log(`    产量: ${item.copper.production ? item.copper.production.toFixed(2) + '万吨' : '未找到'}`);
    console.log(`    销量: ${item.copper.sales ? item.copper.sales.toFixed(2) + '万吨' : '未找到'}`);
    console.log(`    库存: ${item.copper.inventory ? item.copper.inventory.toFixed(2) + '万吨' : '未找到'}`);
    console.log(`  金产品:`);
    console.log(`    成本: ${item.gold.cost ? (item.gold.cost / 100000000).toFixed(2) + '亿元' : '未找到'}`);
    console.log(`    营收: ${item.gold.revenue ? (item.gold.revenue / 100000000).toFixed(2) + '亿元' : '未找到'}`);
    console.log(`    产量: ${item.gold.production ? item.gold.production.toFixed(2) + '万盎司' : '未找到'}`);
    console.log(`    销量: ${item.gold.sales ? item.gold.sales.toFixed(2) + '万盎司' : '未找到'}`);
    console.log(`    库存: ${item.gold.inventory ? item.gold.inventory.toFixed(2) + '万盎司' : '未找到'}`);
  });
  
  // 保存为JSON文件
  const outputPath = path.join(__dirname, '../../stock/report_analysis/紫金矿业/zijin_data.json');
  fs.writeFileSync(outputPath, JSON.stringify({ allData, summary }, null, 2), 'utf8');
  console.log(`\n数据已保存到: ${outputPath}`);
  
  // 自动更新修正数据文件
  await updateCorrectedData();
  
  return { allData, summary };
}

/**
 * 自动更新修正数据文件（增量更新，不覆盖已有数据）
 */
async function updateCorrectedData() {
  console.log('\n' + '='.repeat(60));
  console.log('开始更新修正数据文件...');
  
  const correctedPath = path.join(__dirname, '../../stock/report_analysis/紫金矿业/zijin_data_corrected.json');
  const rawPath = path.join(__dirname, '../../stock/report_analysis/紫金矿业/zijin_data.json');
  
  // 读取原始数据
  const rawData = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
  
  // 读取或创建修正数据
  let correctedData;
  if (fs.existsSync(correctedPath)) {
    correctedData = JSON.parse(fs.readFileSync(correctedPath, 'utf8'));
    console.log(`找到现有修正数据文件，包含 ${correctedData.summary.length} 条记录`);
  } else {
    console.log('未找到修正数据文件，创建新文件');
    correctedData = {
      _metadata: {
        stockName: '紫金矿业',
        stockCode: '601899',
        description: '此文件包含修正后的数据，用于页面展示。手动修正的数据会被标记。',
        dataSource: 'zijin_data.json',
        lastUpdated: new Date().toISOString().split('T')[0],
        products: ['copper', 'gold'],
        dataFlow: 'PDF报告 → 自动提取(zijin_data.json) → 手动修正(本文件) → 页面展示'
      },
      summary: []
    };
  }
  
  // 创建现有数据的索引
  const existingIndex = new Map();
  correctedData.summary.forEach(item => {
    const key = `${item.year}-${item.period}`;
    existingIndex.set(key, item);
  });
  
  // 处理原始数据
  let newCount = 0;
  let skippedCount = 0;
  
  rawData.summary.forEach(item => {
    // 确定报告期
    let period = '';
    if (item.filename.includes('第一季度')) {
      period = `${item.year}年1-3月`;
    } else if (item.filename.includes('半年度') || item.filename.includes('半年')) {
      period = `${item.year}年上半年`;
    } else if (item.filename.includes('第三季度')) {
      period = `${item.year}年1-9月`;
    } else if (item.filename.includes('年度报告') && !item.filename.includes('半年度')) {
      period = `${item.year}年全年`;
    }
    
    if (!period) return;
    
    const key = `${item.year}-${period}`;
    
    // 检查是否已存在
    if (existingIndex.has(key)) {
      skippedCount++;
      return;
    }
    
    // 创建新数据项
    const newItem = {
      period: period,
      year: item.year,
      filename: item.filename,
      copper: {
        production: item.copper.production || null,
        sales: item.copper.sales || null,
        inventory: item.copper.inventory || null,
        revenue: item.copper.revenue ? item.copper.revenue / 100000000 : null,
        cost: item.copper.cost ? item.copper.cost / 100000000 : null,
        unitPrice: item.copper.unitPrice || null,
        unitCost: item.copper.unitCost || null,
        unitGrossProfit: null,
        grossMargin: item.copper.grossMargin || null,
        _corrected: false,
        _verified: false,
        _notes: null
      },
      gold: {
        production: item.gold.production || null,
        sales: item.gold.sales || null,
        inventory: item.gold.inventory || null,
        revenue: item.gold.revenue ? item.gold.revenue / 100000000 : null,
        cost: item.gold.cost ? item.gold.cost / 100000000 : null,
        unitPrice: item.gold.unitPrice || null,
        unitCost: item.gold.unitCost || null,
        unitGrossProfit: null,
        grossMargin: item.gold.grossMargin || null,
        _corrected: false,
        _verified: false,
        _notes: null
      }
    };
    
    // 计算单位毛利
    if (newItem.copper.unitPrice && newItem.copper.unitCost) {
      newItem.copper.unitGrossProfit = newItem.copper.unitPrice - newItem.copper.unitCost;
    }
    if (newItem.gold.unitPrice && newItem.gold.unitCost) {
      newItem.gold.unitGrossProfit = newItem.gold.unitPrice - newItem.gold.unitCost;
    }
    
    correctedData.summary.push(newItem);
    newCount++;
    console.log(`✅ 添加新数据: ${period}`);
  });
  
  // 按时间排序（最新的在前）
  correctedData.summary.sort((a, b) => {
    if (a.year !== b.year) return b.year.localeCompare(a.year);
    const monthOrder = { '1-3月': 3, '上半年': 6, '1-9月': 9, '全年': 12 };
    const aMonth = monthOrder[a.period.replace(/\d{4}年/, '')] || 0;
    const bMonth = monthOrder[b.period.replace(/\d{4}年/, '')] || 0;
    return bMonth - aMonth;
  });
  
  // 更新元数据
  correctedData._metadata.lastUpdated = new Date().toISOString().split('T')[0];
  
  // 保存文件
  fs.writeFileSync(correctedPath, JSON.stringify(correctedData, null, 2), 'utf8');
  
  console.log('✅ 修正数据文件更新完成！');
  console.log(`   总记录数: ${correctedData.summary.length}`);
  console.log(`   新增记录: ${newCount} 条`);
  console.log(`   跳过记录: ${skippedCount} 条（已存在）`);
  if (newCount > 0) {
    console.log('\n📝 提示: 请检查并手动修正新增的数据');
  }
  console.log('='.repeat(60));
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { parsePDF, processAllPDFs, generateSummary };

