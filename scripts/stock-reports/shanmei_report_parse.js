const { PDFParse } = require('pdf-parse');
const fs = require('fs');
const path = require('path');

/**
 * 山煤国际年报数据提取脚本
 * 提取冶金煤/动力煤和贸易煤相关的数据
 */

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
 * 提取冶金煤和动力煤的分产品数据
 */
function extractMetallurgicalAndThermalCoal(text, year) {
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

  // 先找到"自产煤"或"主营业务"部分的文本，以及"产销量情况分析表"
  const lines = text.split('\n');
  let inProductSection = false;
  let inProductSalesTable = false;
  let productSectionText = '';
  let productSalesTableText = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 开始标记：自产煤、主营业务分行业、产销量情况
    if (line.includes('自产煤') || line.includes('主营业务分行业') || line.includes('主营业务分产品')) {
      inProductSection = true;
    }
    if (line.includes('产销量情况') || (line.includes('主要产品') && line.includes('生产量'))) {
      inProductSalesTable = true;
    }

    // 结束标记：煤炭品种、主营业务分地区、单位：亿元
    if (inProductSection && (line.includes('煤炭品种') || line.includes('主营业务分地区') ||
        line.includes('单位：亿元'))) {
      inProductSection = false;
    }
    if (inProductSalesTable && (line.includes('合计') && i > 0 && lines[i-1].includes('贸易煤'))) {
      inProductSalesTable = false;
    }

    if (inProductSection) {
      productSectionText += line + '\n';
    }
    if (inProductSalesTable) {
      productSalesTableText += line + '\n';
    }
  }

  // 优先使用产销量情况分析表，其次使用分产品部分，最后使用全文
  const searchTextRaw = productSalesTableText || productSectionText || text;
  // 规范化数字格式，去除逗号后的空格，便于正则匹配
  const searchText = searchTextRaw.replace(/,\s+/g, ',');

  // 匹配动力煤数据行（带产量/销量）
  // 格式：动力煤 28,109,145.75 25,832,344.25 1,461,444.70 383,330.63
  let match;
  const thermalCoalPatternFull = /(?:动力煤|动力用煤)[\s\t]+([\d,，\s]+\.?\d+)[\s\t]+([\d,，\s]+\.?\d+)[\s\t]+([\d,，\s]+\.?\d+)[\s\t]+([\d,，\s]+\.?\d+)/g;
  match = thermalCoalPatternFull.exec(searchText);
  if (match) {
    const productionTon = parseFloat(match[1].replace(/[，,\s]/g, ''));
    const salesTon = parseFloat(match[2].replace(/[，,\s]/g, ''));
    const revenueWan = parseFloat(match[3].replace(/[，,\s]/g, ''));
    const costWan = parseFloat(match[4].replace(/[，,\s]/g, ''));
    // 验证：收入应该在10万以上（万元单位），产量应该在100万吨以上（吨单位）
    if (!isNaN(productionTon) && productionTon > 1000000) {
      result.thermalCoal.production = parseFloat((productionTon / 10000).toFixed(2));
      console.log(`    提取动力煤产量: ${result.thermalCoal.production}万吨`);
    }
    if (!isNaN(salesTon) && salesTon > 1000000) {
      result.thermalCoal.sales = parseFloat((salesTon / 10000).toFixed(2));
      console.log(`    提取动力煤销量: ${result.thermalCoal.sales}万吨`);
    }
    if (!isNaN(revenueWan) && revenueWan >= 100000) {
      result.thermalCoal.revenue = revenueWan;
      console.log(`    提取动力煤收入: ${(revenueWan / 10000).toFixed(2)}亿元`);
    }
    if (!isNaN(costWan) && costWan >= 100000) {
      result.thermalCoal.cost = costWan;
      console.log(`    提取动力煤成本: ${(costWan / 10000).toFixed(2)}亿元`);
    }
  } else {
    // 仅收入/成本/毛利率
    const thermalCoalPattern = /(?:动力煤|动力用煤)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g;
    match = thermalCoalPattern.exec(searchText);
    if (match) {
      const revenueWan = parseFloat(match[1].replace(/[，,]/g, ''));
      const costWan = parseFloat(match[2].replace(/[，,]/g, ''));
      const grossMargin = parseFloat(match[3].replace(/[，,]/g, ''));
      if (!isNaN(revenueWan) && revenueWan >= 1000 && revenueWan < 10000000) {
        result.thermalCoal.revenue = revenueWan;
      }
      if (!isNaN(costWan) && costWan >= 1000 && costWan < 10000000) {
        result.thermalCoal.cost = costWan;
      }
      if (!isNaN(grossMargin) && grossMargin >= 0 && grossMargin <= 100) {
        result.thermalCoal.grossMargin = grossMargin;
      }
    }
  }

  // 匹配冶金煤数据行（带产量/销量）
  // 格式：冶金煤 12,465,725.99 11,125,652.58 1,264,321.20 339,601.61
  const metallurgicalCoalPatternFull = /(?:冶金煤)[\s\t]+([\d,，\s]+\.?\d+)[\s\t]+([\d,，\s]+\.?\d+)[\s\t]+([\d,，\s]+\.?\d+)[\s\t]+([\d,，\s]+\.?\d+)/g;
  match = metallurgicalCoalPatternFull.exec(searchText);
  if (match) {
    const productionTon = parseFloat(match[1].replace(/[，,\s]/g, ''));
    const salesTon = parseFloat(match[2].replace(/[，,\s]/g, ''));
    const revenueWan = parseFloat(match[3].replace(/[，,\s]/g, ''));
    const costWan = parseFloat(match[4].replace(/[，,\s]/g, ''));
    // 验证：收入应该在10万以上（万元单位），产量应该在100万吨以上（吨单位）
    if (!isNaN(productionTon) && productionTon > 1000000) {
      result.metallurgicalCoal.production = parseFloat((productionTon / 10000).toFixed(2));
      console.log(`    提取冶金煤产量: ${result.metallurgicalCoal.production}万吨`);
    }
    if (!isNaN(salesTon) && salesTon > 1000000) {
      result.metallurgicalCoal.sales = parseFloat((salesTon / 10000).toFixed(2));
      console.log(`    提取冶金煤销量: ${result.metallurgicalCoal.sales}万吨`);
    }
    if (!isNaN(revenueWan) && revenueWan >= 100000) {
      result.metallurgicalCoal.revenue = revenueWan;
      console.log(`    提取冶金煤收入: ${(revenueWan / 10000).toFixed(2)}亿元`);
    }
    if (!isNaN(costWan) && costWan >= 100000) {
      result.metallurgicalCoal.cost = costWan;
      console.log(`    提取冶金煤成本: ${(costWan / 10000).toFixed(2)}亿元`);
    }
  } else {
    const metallurgicalCoalPattern = /(?:冶金煤)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g;
    match = metallurgicalCoalPattern.exec(searchText);
    if (match) {
      const revenueWan = parseFloat(match[1].replace(/[，,]/g, ''));
      const costWan = parseFloat(match[2].replace(/[，,]/g, ''));
      const grossMargin = parseFloat(match[3].replace(/[，,]/g, ''));
      if (!isNaN(revenueWan) && revenueWan >= 1000 && revenueWan < 10000000 &&
          !isNaN(grossMargin) && grossMargin >= 0 && grossMargin <= 100) {
        result.metallurgicalCoal.revenue = revenueWan;
        result.metallurgicalCoal.grossMargin = grossMargin;
      }
      if (!isNaN(costWan) && costWan >= 1000 && costWan < 10000000 &&
          !isNaN(grossMargin) && grossMargin >= 0 && grossMargin <= 100) {
        result.metallurgicalCoal.cost = costWan;
      }
    }
  }

  // 匹配焦煤数据行（从分产品表格，格式：焦煤 收入 成本 毛利率）
  // 注意：焦煤数据通常在分产品表格中，而不是产销量情况分析表
  // 所以优先从productSectionText提取，如果没有再从全文提取
  const cokeCoalSearchText = productSectionText || text;
  const cokeCoalPattern = /(?:焦煤|配焦用煤)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g;
  match = cokeCoalPattern.exec(cokeCoalSearchText);
  if (match) {
    const val1 = parseFloat(match[1].replace(/[，,]/g, ''));
    const val2 = parseFloat(match[2].replace(/[，,]/g, ''));
    const val3 = parseFloat(match[3].replace(/[，,]/g, ''));

    // 判断是否是分产品表格：收入在10万-500万（万元）范围，毛利率在0-100之间
    // 排除产销量表格：产量/销量通常在100万-1000万（吨）
    const isRevenueTable = !isNaN(val1) && val1 >= 100000 && val1 < 5000000 &&
                           !isNaN(val3) && val3 >= 0 && val3 <= 100;

    if (isRevenueTable) {
      result.cokeCoal.revenue = val1;
      result.cokeCoal.cost = val2;
      result.cokeCoal.grossMargin = val3;
      console.log(`    提取焦煤数据: 收入=${(val1/10000).toFixed(2)}亿元, 成本=${(val2/10000).toFixed(2)}亿元`);
    }
  }

  // 匹配无烟煤数据行（从分产品表格提取，格式：无烟煤 收入 成本 毛利率）
  const anthraciteSearchText = productSectionText || text;
  const anthracitePattern = /(?:无烟煤)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g;
  match = anthracitePattern.exec(anthraciteSearchText);
  if (match) {
    const val1 = parseFloat(match[1].replace(/[，,]/g, ''));
    const val2 = parseFloat(match[2].replace(/[，,]/g, ''));
    const val3 = parseFloat(match[3].replace(/[，,]/g, ''));

    // 验证是分产品表格（收入万元）而不是产销量表格（产量吨）
    const isRevenueTable = !isNaN(val1) && val1 >= 100000 && val1 < 10000000 &&
                           !isNaN(val3) && val3 >= 0 && val3 <= 100;

    if (isRevenueTable) {
      result.anthracite.revenue = val1;
      result.anthracite.cost = val2;
      result.anthracite.grossMargin = val3;
      console.log(`    提取无烟煤数据: 收入=${(val1/10000).toFixed(2)}亿元, 成本=${(val2/10000).toFixed(2)}亿元`);
    }
  }

  // 1. 从产销量情况分析表提取贸易煤销量（格式：贸易煤 万吨 —— 销量 库存）
  const tradeSalesPattern = /贸易煤[\s\t]+万吨[\s\t]+[—\-]+[\s\t]+([\d,，\.]+)[\s\t]+([\d,，\.]+)/g;
  match = tradeSalesPattern.exec(searchText);
  if (match) {
    const salesWanTon = parseFloat(match[1].replace(/[，,]/g, ''));
    const inventoryWanTon = parseFloat(match[2].replace(/[，,]/g, ''));
    if (!isNaN(salesWanTon) && salesWanTon > 0) {
      result.tradeCoal.sales = salesWanTon; // 已经是万吨单位
      console.log(`    提取贸易煤销量: ${salesWanTon}万吨`);
    }
    if (!isNaN(inventoryWanTon) && inventoryWanTon > 0) {
      result.tradeCoal.inventory = inventoryWanTon;
      console.log(`    提取贸易煤库存: ${inventoryWanTon}万吨`);
    }
  }

  // 2. 从分产品表格提取贸易煤收入/成本（格式：[序号.]贸易煤 收入 成本 毛利率）
  const tradeRevenueSearchText = productSectionText || text;
  const tradeRevenuePattern = /(?:\d+\.)?贸易煤[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，\.]+)/g;
  match = tradeRevenuePattern.exec(tradeRevenueSearchText);
  if (match) {
    const revenueWan = parseFloat(match[1].replace(/[，,]/g, ''));
    const costWan = parseFloat(match[2].replace(/[，,]/g, ''));
    const grossMargin = parseFloat(match[3].replace(/[，,]/g, ''));

    // 验证是分产品表格（收入10万以上，毛利率0-100）
    if (!isNaN(revenueWan) && revenueWan >= 100000 && revenueWan < 10000000 &&
        !isNaN(grossMargin) && grossMargin >= 0 && grossMargin <= 100) {
      result.tradeCoal.revenue = revenueWan;
      result.tradeCoal.cost = costWan;
      result.tradeCoal.grossMargin = grossMargin;
      console.log(`    提取贸易煤收入: ${(revenueWan/10000).toFixed(2)}亿元, 成本=${(costWan/10000).toFixed(2)}亿元`);
    }
  }

  // 兜底：全局搜索包含产量/销量/收入/成本的表格行（不限定区段）
  // 只在确实没有数据时才使用，且验证数据合理性
  if ((!result.thermalCoal.revenue || result.thermalCoal.revenue < 100000) && (!result.thermalCoal.production || !result.thermalCoal.sales)) {
    const fullMatchThermal = /动力煤[\s\t]+([\d,，\s]+\.?\d+)[\s\t]+([\d,，\s]+\.?\d+)[\s\t]+([\d,，\s]+\.?\d+)[\s\t]+([\d,，\s]+\.?\d+)/g.exec(text);
    if (fullMatchThermal) {
      const productionTon = parseFloat(fullMatchThermal[1].replace(/[，,\s]/g, ''));
      const salesTon = parseFloat(fullMatchThermal[2].replace(/[，,\s]/g, ''));
      const revenueWan = parseFloat(fullMatchThermal[3].replace(/[，,\s]/g, ''));
      const costWan = parseFloat(fullMatchThermal[4].replace(/[，,\s]/g, ''));
      console.log(`    兜底提取动力煤: 产量=${productionTon}吨, 销量=${salesTon}吨, 收入=${revenueWan}万元, 成本=${costWan}万元`);
      // 验证：收入应该在10万以上（万元单位），产量应该在100万吨以上（吨单位）
      if (!isNaN(productionTon) && productionTon > 1000000) {
        result.thermalCoal.production = parseFloat((productionTon / 10000).toFixed(2));
        console.log(`    ✓ 动力煤产量: ${result.thermalCoal.production}万吨`);
      }
      if (!isNaN(salesTon) && salesTon > 1000000) {
        result.thermalCoal.sales = parseFloat((salesTon / 10000).toFixed(2));
        console.log(`    ✓ 动力煤销量: ${result.thermalCoal.sales}万吨`);
      }
      if (!isNaN(revenueWan) && revenueWan >= 100000) {
        result.thermalCoal.revenue = revenueWan;
        console.log(`    ✓ 动力煤收入: ${(revenueWan / 10000).toFixed(2)}亿元`);
      }
      if (!isNaN(costWan) && costWan >= 100000) {
        result.thermalCoal.cost = costWan;
        console.log(`    ✓ 动力煤成本: ${(costWan / 10000).toFixed(2)}亿元`);
      }
    }
  }

  if ((!result.metallurgicalCoal.revenue || result.metallurgicalCoal.revenue < 100000) && (!result.metallurgicalCoal.production || !result.metallurgicalCoal.sales)) {
    const fullMatchMet = /冶金煤[\s\t]+([\d,，\s]+\.?\d+)[\s\t]+([\d,，\s]+\.?\d+)[\s\t]+([\d,，\s]+\.?\d+)[\s\t]+([\d,，\s]+\.?\d+)/g.exec(text);
    if (fullMatchMet) {
      const productionTon = parseFloat(fullMatchMet[1].replace(/[，,\s]/g, ''));
      const salesTon = parseFloat(fullMatchMet[2].replace(/[，,\s]/g, ''));
      const revenueWan = parseFloat(fullMatchMet[3].replace(/[，,\s]/g, ''));
      const costWan = parseFloat(fullMatchMet[4].replace(/[，,\s]/g, ''));
      console.log(`    兜底提取冶金煤: 产量=${productionTon}吨, 销量=${salesTon}吨, 收入=${revenueWan}万元, 成本=${costWan}万元`);
      // 验证：收入应该在10万以上（万元单位），产量应该在100万吨以上（吨单位）
      if (!isNaN(productionTon) && productionTon > 1000000) {
        result.metallurgicalCoal.production = parseFloat((productionTon / 10000).toFixed(2));
        console.log(`    ✓ 冶金煤产量: ${result.metallurgicalCoal.production}万吨`);
      }
      if (!isNaN(salesTon) && salesTon > 1000000) {
        result.metallurgicalCoal.sales = parseFloat((salesTon / 10000).toFixed(2));
        console.log(`    ✓ 冶金煤销量: ${result.metallurgicalCoal.sales}万吨`);
      }
      if (!isNaN(revenueWan) && revenueWan >= 100000) {
        result.metallurgicalCoal.revenue = revenueWan;
        console.log(`    ✓ 冶金煤收入: ${(revenueWan / 10000).toFixed(2)}亿元`);
      }
      if (!isNaN(costWan) && costWan >= 100000) {
        result.metallurgicalCoal.cost = costWan;
        console.log(`    ✓ 冶金煤成本: ${(costWan / 10000).toFixed(2)}亿元`);
      }
    }
  }

  // 补充：如果动力煤有产量/销量但没有收入，从分产品表格提取收入/成本
  if (result.thermalCoal.production && !result.thermalCoal.revenue) {
    const thermalRevenueMatch = /(?:动力煤|动力用煤)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/.exec(productSectionText);
    if (thermalRevenueMatch) {
      const val1 = parseFloat(thermalRevenueMatch[1].replace(/[，,]/g, ''));
      const val2 = parseFloat(thermalRevenueMatch[2].replace(/[，,]/g, ''));
      const val3 = parseFloat(thermalRevenueMatch[3].replace(/[，,]/g, ''));
      // 验证是分产品表格（收入10万-500万万元，毛利率0-100）
      if (!isNaN(val1) && val1 >= 100000 && val1 < 5000000 &&
          !isNaN(val3) && val3 >= 0 && val3 <= 100) {
        result.thermalCoal.revenue = val1;
        result.thermalCoal.cost = val2;
        result.thermalCoal.grossMargin = val3;
        console.log(`    补充动力煤收入: 收入=${(val1/10000).toFixed(2)}亿元, 成本=${(val2/10000).toFixed(2)}亿元`);
      }
    }
  }

  // 2021年特殊：将焦煤（喷吹煤）并入冶金煤
  const yearStr = year ? String(year) : null;
  if (yearStr === '2021' && result.cokeCoal) {
    console.log('    2021年：将焦煤数据合并到冶金煤');
    ['revenue', 'cost', 'sales', 'production'].forEach(field => {
      const cokeVal = result.cokeCoal[field];
      if (cokeVal != null) {
        if (result.metallurgicalCoal[field] == null) {
          result.metallurgicalCoal[field] = cokeVal;
          console.log(`      冶金煤.${field} = 焦煤.${field} (${cokeVal})`);
        } else {
          // revenue/cost累加
          result.metallurgicalCoal[field] += cokeVal;
          console.log(`      冶金煤.${field} += 焦煤.${field} (${result.metallurgicalCoal[field]})`);
        }
      }
    });
  }

  // 不再合并焦煤和冶金煤，保持独立
  // 2021年报告使用"焦煤"
  // 2022-2024年报告使用"冶金煤"
  // 两者分开显示

  return result;
}

/**
 * 提取分产品数据（煤炭生产业务、煤炭贸易业务）
 */
function extractProductData(text, year) {
  const result = {
    // 煤炭生产业务（包含冶金煤和动力煤，财报中未明确区分）
    productionCoal: {
      revenue: null,
      cost: null,
      sales: null,
      production: null,
      price: null,
      unitCost: null,
      inventory: null  // 库存量（万吨）
    },
    // 煤炭贸易业务
    tradeCoal: {
      revenue: null,
      cost: null,
      sales: null,
      volume: null,
      price: null,
      importVolume: null,
      inventory: null  // 库存量（万吨）
    },
    // 库存数据（年报，金额）
    inventory: {
      periodEnd: null,    // 期末库存（亿元）
      periodStart: null   // 期初库存（亿元）
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

  // 优先从"主营业务分行业"表格中提取煤炭生产数据
  // 格式：煤炭生产 2,371,790.63 676,371.29 71.48 99.33 19.19
  const industryPattern = /煤炭生产[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g;
  let industryMatch = industryPattern.exec(text);
  if (industryMatch) {
    const revenueWan = parseFloat(industryMatch[1].replace(/[，,]/g, ''));
    const costWan = parseFloat(industryMatch[2].replace(/[，,]/g, ''));

    // 验证数据合理性（单位应该是万元）
    if (!isNaN(revenueWan) && revenueWan >= 100000 && revenueWan < 100000000) {
      result.productionCoal.revenue = revenueWan; // 万元
      result.productionCoal.cost = costWan; // 万元
      console.log(`    提取煤炭生产数据（从分行业表格）: 收入=${revenueWan}万元, 成本=${costWan}万元`);
    }
  }

  // 如果表格中没有提取到，再从文本描述中提取
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

  // 只有在表格中没有提取到时才从文本中提取
  if (!result.productionCoal.revenue) {
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
          console.log(`    提取煤炭生产收入（从文本描述）: ${value}万元`);
          break;
        }
      }
      if (result.productionCoal.revenue) break;
    }
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

  // 提取煤炭贸易业务数据（仅在productBreakdown未提取到时使用）
  // 匹配格式：公司实现煤炭贸易业务收入 35.43 亿元，同比下降 36.51%，贸易量 753.79 万吨
  // 注意：productBreakdown.tradeCoal的数据更准确，这里仅作补充
  if (!result.productBreakdown?.tradeCoal?.revenue) {
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
  const productBreakdown = extractMetallurgicalAndThermalCoal(text, year);
  if (productBreakdown) {
    result.productBreakdown.metallurgicalCoal = productBreakdown.metallurgicalCoal;
    result.productBreakdown.thermalCoal = productBreakdown.thermalCoal;
    result.productBreakdown.cokeCoal = productBreakdown.cokeCoal;
    result.productBreakdown.anthracite = productBreakdown.anthracite;
    result.productBreakdown.tradeCoal = productBreakdown.tradeCoal;
  }

  // 从"煤炭品种"表格或"产销量情况分析表"中提取总产销存数据（单位：吨或万吨）
  // 先找到表格，然后在该区域内查找自产煤和贸易煤的行
  const lines = text.split('\n');
  let inCoalTypesTable = false;
  let inProductSalesTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 找到煤炭品种表格的开始（包含产量和销量的表头）
    if (line.includes('煤炭品种') && line.includes('产量') && line.includes('销量')) {
      inCoalTypesTable = true;
    }

    // 找到产销量情况分析表（包含库存量）
    if (line.includes('产销量情况') || (line.includes('主要产品') && line.includes('库存量'))) {
      inProductSalesTable = true;
    }

    // 从产销量情况分析表提取自产煤和贸易煤的库存量
    if (inProductSalesTable) {
      // 匹配格式：自产煤 万吨 4,057.49 3,695.80 132.16
      const ownCoalMatch = /自产煤[\s\t]+万吨[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/.exec(line);
      if (ownCoalMatch) {
        const inventory = parseFloat(ownCoalMatch[3].replace(/[，,]/g, ''));
        if (!isNaN(inventory) && inventory > 0) {
          result.productionCoal.inventory = inventory; // 已经是万吨
          console.log(`    提取自产煤库存量: ${inventory}万吨`);
        }
      }

      // 匹配贸易煤库存量
      const tradeCoalMatch = /贸易煤[\s\t]+万吨[\s\t]+[-—]+[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/.exec(line);
      if (tradeCoalMatch) {
        const inventory = parseFloat(tradeCoalMatch[2].replace(/[，,]/g, ''));
        if (!isNaN(inventory) && inventory > 0) {
          result.tradeCoal.inventory = inventory; // 已经是万吨
          console.log(`    提取贸易煤库存量: ${inventory}万吨`);
        }
      }
    }

    // 在煤炭品种表格范围内查找合计行
    if (inCoalTypesTable && line.includes('合计')) {
      // 格式：合计 40,419,185.31 37,379,589.11 237.18 67.64 169.54
      const coalMatch = /合计[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/.exec(line);
      if (coalMatch) {
        const productionTons = parseFloat(coalMatch[1].replace(/[，,]/g, ''));
        const salesTons = parseFloat(coalMatch[2].replace(/[，,]/g, ''));

        if (!isNaN(productionTons) && productionTons > 1000000) {
          result.productionCoal.production = parseFloat((productionTons / 10000).toFixed(2)); // 吨转万吨
          console.log(`    提取总产量（从煤炭品种表格）: ${result.productionCoal.production}万吨`);
        }

        if (!isNaN(salesTons) && salesTons > 1000000) {
          result.productionCoal.sales = parseFloat((salesTons / 10000).toFixed(2)); // 吨转万吨
          console.log(`    提取总销量（从煤炭品种表格）: ${result.productionCoal.sales}万吨`);
        }
      }
      break; // 找到合计行后退出
    }

    // 超出表格范围
    if (inCoalTypesTable && (line.includes('煤炭储量') || line.includes('资源量') || line.includes('矿区'))) {
      break;
    }
  }

  // 从文本中提取自产煤销量和贸易煤销量（年报文字描述中）
  // 2023年开始的格式：公司实现自产煤销量 3,485.99 万吨，贸易煤销量 1,764.54 万吨
  const ownCoalSalesMatch = text.match(/自产煤销量\s+([\d,，.]+)\s*万吨/);
  if (ownCoalSalesMatch) {
    const ownSales = parseFloat(ownCoalSalesMatch[1].replace(/[，,]/g, ''));
    if (!isNaN(ownSales) && ownSales > 0) {
      // 如果有自产煤销量，覆盖之前的总销量
      result.productionCoal.sales = ownSales;
      result.productionCoal.salesType = 'ownCoal'; // 标记为自产煤
      console.log(`    提取自产煤销量（从文本）: ${ownSales}万吨`);

      // 同时提取贸易煤销量
      const tradeCoalSalesMatch = text.match(/贸易煤销量\s+([\d,，.]+)\s*万吨/);
      if (tradeCoalSalesMatch) {
        const tradeSales = parseFloat(tradeCoalSalesMatch[1].replace(/[，,]/g, ''));
        if (!isNaN(tradeSales) && tradeSales > 0) {
          result.tradeCoal.sales = tradeSales;
          console.log(`    提取贸易煤销量（从文本）: ${tradeSales}万吨`);
        }
      }
    }
  }

  // 提取季度数据（从报告的表格中）
  // 根据报告类型提取不同的季度数据
  const filename = arguments[1] || ''; // 从调用处传入文件名
  extractQuarterlyDataFromTable(text, result, filename);

  // 提取库存数据（仅年报）
  if (filename && filename.includes('年度报告')) {
    console.log(`    正在提取库存数据 (${filename})...`);
    const lines = text.split('\n');

    // 查找存货明细表中的库存商品行
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 匹配格式：库存商品 期末账面余额 减值准备 期末账面价值 期初账面余额 减值准备 期初账面价值
      // 确保是在存货明细表中（上文有"原材料"）
      if (line.match(/库存商品/) && i > 0 && lines[i-2].includes('原材料')) {
        // 提取数值：库存商品后面跟着多个数值，第一个是期末账面余额，第四个是期初账面余额
        const values = line.match(/[\d,，]+\.?\d+/g);

        if (values && values.length >= 4) {
          const periodEndValue = parseFloat(values[0].replace(/[,，]/g, ''));
          const periodStartValue = parseFloat(values[3].replace(/[,，]/g, ''));

          if (!isNaN(periodEndValue) && periodEndValue > 1000000) {
            result.inventory.periodEnd = parseFloat((periodEndValue / 100000000).toFixed(2)); // 元转亿元
            console.log(`    提取期末库存: ${result.inventory.periodEnd}亿元`);
          }

          if (!isNaN(periodStartValue) && periodStartValue > 1000000) {
            result.inventory.periodStart = parseFloat((periodStartValue / 100000000).toFixed(2)); // 元转亿元
            console.log(`    提取期初库存: ${result.inventory.periodStart}亿元`);
          }
        }
        break;
      }
    }
  }

  // 【新增】2024年之前：从分产品数据计算自产煤收入、成本、销量
  const yearNum = year ? parseInt(year) : null;
  if (yearNum && yearNum < 2024 && !result.productionCoal.salesType) {
    console.log(`    === 2024年之前业绩报：计算自产煤数据 ===`);

    // 1. 从productBreakdown计算自产煤收入和成本（焦煤+冶金煤+动力煤+无烟煤）
    let ownCoalRevenue = 0;
    let ownCoalCost = 0;
    let hasBreakdownData = false;

    const breakdown = result.productBreakdown || result;

    if (breakdown.cokeCoal && breakdown.cokeCoal.revenue) {
      ownCoalRevenue += breakdown.cokeCoal.revenue;
      ownCoalCost += breakdown.cokeCoal.cost || 0;
      hasBreakdownData = true;
      console.log(`    焦煤收入: ${(breakdown.cokeCoal.revenue / 10000).toFixed(2)}亿元`);
    }

    if (breakdown.metallurgicalCoal && breakdown.metallurgicalCoal.revenue) {
      ownCoalRevenue += breakdown.metallurgicalCoal.revenue;
      ownCoalCost += breakdown.metallurgicalCoal.cost || 0;
      hasBreakdownData = true;
      console.log(`    冶金煤收入: ${(breakdown.metallurgicalCoal.revenue / 10000).toFixed(2)}亿元`);
    }

    if (breakdown.thermalCoal && breakdown.thermalCoal.revenue) {
      ownCoalRevenue += breakdown.thermalCoal.revenue;
      ownCoalCost += breakdown.thermalCoal.cost || 0;
      hasBreakdownData = true;
      console.log(`    动力煤收入: ${(breakdown.thermalCoal.revenue / 10000).toFixed(2)}亿元`);
    }

    if (breakdown.anthracite && breakdown.anthracite.revenue) {
      ownCoalRevenue += breakdown.anthracite.revenue;
      ownCoalCost += breakdown.anthracite.cost || 0;
      hasBreakdownData = true;
      console.log(`    无烟煤收入: ${(breakdown.anthracite.revenue / 10000).toFixed(2)}亿元`);
    }

    if (hasBreakdownData && ownCoalRevenue > 0) {
      // 用分产品数据覆盖煤炭生产收入（更准确）
      result.productionCoal.revenue = ownCoalRevenue;
      result.productionCoal.cost = ownCoalCost;
      console.log(`    ✓ 自产煤收入合计: ${(ownCoalRevenue / 10000).toFixed(2)}亿元`);
      console.log(`    ✓ 自产煤成本合计: ${(ownCoalCost / 10000).toFixed(2)}亿元`);
    }

    // 2. 尝试提取贸易煤销量，计算自产煤销量
    // 先尝试从文本描述中提取贸易煤销量
    const tradeCoalSalesMatch = text.match(/贸易煤?[量销]+([\d,，.]+)\s*万吨/);
    let tradeCoalSales = null;

    if (tradeCoalSalesMatch) {
      tradeCoalSales = parseFloat(tradeCoalSalesMatch[1].replace(/[，,]/g, ''));
      if (!isNaN(tradeCoalSales) && tradeCoalSales > 0) {
        result.tradeCoal.sales = tradeCoalSales;
        console.log(`    提取贸易煤销量: ${tradeCoalSales}万吨`);
      }
    }

    // 如果没有直接的贸易煤销量，尝试从贸易煤收入和价格推算
    if (!tradeCoalSales && breakdown.tradeCoal && breakdown.tradeCoal.revenue) {
      // 估算贸易煤价格（通常在700-800元/吨，参考2023年数据）
      // 2023年贸易煤：129.12亿元 / 1764.54万吨 = 731.78元/吨
      const estimatedTradePrice = 750; // 元/吨
      // revenue是万元，转换为亿元后再计算销量（万吨）
      const tradeRevenueYi = breakdown.tradeCoal.revenue / 10000; // 万元转亿元
      tradeCoalSales = (tradeRevenueYi * 10000 / estimatedTradePrice); // 亿元*10000 / (元/吨) = 万吨
      result.tradeCoal.sales = parseFloat(tradeCoalSales.toFixed(2));
      console.log(`    从贸易煤收入推算销量: ${result.tradeCoal.sales}万吨 (收入${tradeRevenueYi.toFixed(2)}亿元，估算价格${estimatedTradePrice}元/吨)`);
    }

    // 3. 验证贸易煤销量的合理性，决定是否用于计算自产煤销量
    if (result.productionCoal.sales && tradeCoalSales && tradeCoalSales > 0) {
      const totalSales = result.productionCoal.sales;
      const ownCoalSales = totalSales - tradeCoalSales;

      // 验证：自产煤销量应该 > 0 且合理（不应过小）
      // 合理性检查：自产煤销量应该在产量的60%-110%之间
      const isReasonable = ownCoalSales > 0 &&
                          ownCoalSales > totalSales * 0.2 && // 至少占总销量的20%
                          (!result.productionCoal.production ||
                           (ownCoalSales >= result.productionCoal.production * 0.6 &&
                            ownCoalSales <= result.productionCoal.production * 1.1));

      if (isReasonable) {
        result.productionCoal.sales = parseFloat(ownCoalSales.toFixed(2));
        result.productionCoal.salesType = 'calculated'; // 标记为计算得出
        console.log(`    ✓ 计算自产煤销量: ${ownCoalSales.toFixed(2)}万吨 (总销量${totalSales}万吨 - 贸易煤${tradeCoalSales}万吨)`);
      } else {
        // 如果计算结果不合理，推测"合计"本身就是自产煤销量
        result.productionCoal.salesType = 'approximated'; // 标记为近似值（煤炭品种合计）
        console.log(`    ⚠️ 贸易煤销量推算不合理（${tradeCoalSales.toFixed(2)}万吨），"合计"可能已是自产煤销量`);
        console.log(`    使用煤炭品种合计作为自产煤销量: ${result.productionCoal.sales}万吨 (产量${result.productionCoal.production}万吨)`);
      }
    } else if (result.productionCoal.sales) {
      // 没有贸易煤销量数据，标记为approximated（煤炭品种合计，近似自产煤）
      result.productionCoal.salesType = 'approximated';
      console.log(`    使用煤炭品种合计作为自产煤销量: ${result.productionCoal.sales}万吨 (无贸易煤数据)`);
    }
  }

  // 计算煤炭生产的产销售价（2024年之前的业绩报告）
  if (result.productionCoal.revenue && result.productionCoal.sales && result.productionCoal.sales > 0) {
    // revenue是万元，sales是万吨，计算得到元/吨
    const price = result.productionCoal.revenue / result.productionCoal.sales;

    // 验证售价合理性（煤炭价格通常在100-3000元/吨之间）
    if (price >= 100 && price <= 3000) {
      result.productionCoal.price = parseFloat(price.toFixed(2));
      console.log(`    计算产销售价: ${result.productionCoal.price}元/吨`);
    } else {
      console.log(`    ⚠️ 售价异常 (${price.toFixed(2)}元/吨)，跳过`);
    }
  }

  // 计算煤炭生产的单位成本
  if (result.productionCoal.cost && result.productionCoal.sales && result.productionCoal.sales > 0) {
    const unitCost = result.productionCoal.cost / result.productionCoal.sales;

    // 验证单位成本合理性（煤炭成本通常在50-1500元/吨之间）
    if (unitCost >= 50 && unitCost <= 1500) {
      result.productionCoal.unitCost = parseFloat(unitCost.toFixed(2));
      console.log(`    计算单位成本: ${result.productionCoal.unitCost}元/吨`);
    } else {
      console.log(`    ⚠️ 单位成本异常 (${unitCost.toFixed(2)}元/吨)，跳过`);
    }
  }

  // 提取煤种分产品数据（冶金煤、动力煤）
  // 表格格式：
  // 煤炭品种  产量(万吨)  销量(万吨)  销售收入  销售成本  毛利
  // 动力煤    2,893.57   2,663.11   1,352,748.17  508,269.42  844,478.75
  // 冶金煤    1,004.80   822.88     1,027,014.91  470,894.04  556,120.87
  // 合计      3,898.37   3,485.99   2,379,763.08  979,163.45  1,400,599.62

  // 提取动力煤数据
  const thermalCoalPattern = /动力煤[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/;
  let thermalMatch = text.match(thermalCoalPattern);
  if (thermalMatch) {
    const production = parseFloat(thermalMatch[1].replace(/[，,]/g, ''));
    const sales = parseFloat(thermalMatch[2].replace(/[，,]/g, ''));
    const revenueWan = parseFloat(thermalMatch[3].replace(/[，,]/g, ''));
    const costWan = parseFloat(thermalMatch[4].replace(/[，,]/g, ''));

    // 验证数据合理性
    if (sales >= 100 && sales < 10000 && revenueWan >= 100000 && revenueWan < 100000000) {
      result.productBreakdown.thermalCoal.sales = sales;
      result.productBreakdown.thermalCoal.revenue = revenueWan; // 万元
      result.productBreakdown.thermalCoal.cost = costWan; // 万元
      result.productBreakdown.thermalCoal.production = production;
      console.log(`    提取动力煤数据: 销量=${sales}万吨, 收入=${revenueWan}万元`);
    }
  }

  // 提取冶金煤数据
  const metallurgicalCoalPattern = /冶金煤[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/;
  let metallurgicalMatch = text.match(metallurgicalCoalPattern);
  if (metallurgicalMatch) {
    const production = parseFloat(metallurgicalMatch[1].replace(/[，,]/g, ''));
    const sales = parseFloat(metallurgicalMatch[2].replace(/[，,]/g, ''));
    const revenueWan = parseFloat(metallurgicalMatch[3].replace(/[，,]/g, ''));
    const costWan = parseFloat(metallurgicalMatch[4].replace(/[，,]/g, ''));

    // 验证数据合理性
    if (sales >= 100 && sales < 10000 && revenueWan >= 100000 && revenueWan < 100000000) {
      result.productBreakdown.metallurgicalCoal.sales = sales;
      result.productBreakdown.metallurgicalCoal.revenue = revenueWan; // 万元
      result.productBreakdown.metallurgicalCoal.cost = costWan; // 万元
      result.productBreakdown.metallurgicalCoal.production = production;
      console.log(`    提取冶金煤数据: 销量=${sales}万吨, 收入=${revenueWan}万元`);
    }
  }

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
    extractQ1FromFirstQuarterReport(text, result, year);
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

  // 2024年之前不从年报提取单季度（改用运营数据）
  if (year && year >= 2024) {
    console.log('    使用2024年新格式（正序：Q1|Q2）');
    extractQ2FromHalfYearReport_NewFormat(text, result);
  } else {
    console.log('    2024年之前：跳过年报单季度提取（使用运营数据）');
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
 * 从第三季度报告的表格中提取Q3的季度数据
 * 新策略：直接提取Q3单季数据
 *
 * 2024年开始：新格式，表格列顺序为 Q1 | Q2 | Q3（正序），Q3是第三列
 * 2023年及之前：旧格式，表格列顺序为 Q3 | Q2 | Q1（倒序），Q3是第一列
 */
function extractQ3FromThirdQuarterReport(text, result, year = null) {
  console.log('  提取Q3单季数据...');

  // 2024年之前不从年报提取单季度（改用运营数据）
  if (year && year >= 2024) {
    console.log('    使用2024年新格式（正序：Q1|Q2|Q3）');
    extractQ3FromThirdQuarterReport_NewFormat(text, result);
  } else {
    console.log('    2024年之前：跳过年报单季度提取（使用运营数据）');
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

  // 2024年之前不从年报提取单季度（改用运营数据）
  if (year && year >= 2024) {
    console.log('    使用2024年新格式（正序：Q1|Q2|Q3|Q4）');
    extractQ4FromAnnualReport_NewFormat(text, result, year);
  } else {
    console.log('    2024年之前：跳过年报单季度提取（使用运营数据）');
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
 * 从第一季度报告中提取Q1数据（作为单季度数据）
 */
function extractQ1FromFirstQuarterReport(text, result, year = null) {
  console.log('  提取Q1单季数据...');

  // ⚠️ 重要：第一季度报告表格中的数据是【累计数据】（1-3月累计），不是单季度数据！
  // 2021-2023年：不从表格提取revenue和cost（会被误用为单季度数据）
  // 2024年及以后：从表格提取完整数据（包括revenue、cost、销量、产量等）

  let revenue = null;
  let cost = null;
  let sales = null;
  let production = null;
  let price = null;
  let unitCost = null;
  let grossMargin = null;

  // 只从2024年及以后的季报提取数据（表格格式改进，数据更准确）
  if (year && year >= 2024) {
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
      } else {
        console.log(`    Q1产量: ${production} 万吨`);
      }
    }

    // 提取售价（元/吨）
    const priceRowPattern = /售价[（(]元\/吨[）)][\s\t]+([\d,，]+\.?\d*)[\s\t]+[\d,，]+\.?\d*[\s\t]+[\d,，\-]+\.?\d*/g;
    match = priceRowPattern.exec(text);
    if (match) {
      price = parseFloat(match[1].replace(/[，,]/g, ''));
      if (isNaN(price) || price < 0 || price > 10000) {
        price = null;
      } else {
        console.log(`    Q1售价: ${price} 元/吨`);
      }
    }

    // 提取吨煤成本（元）
    const unitCostRowPattern = /吨煤成本[（(]元[）)][\s\t]+([\d,，]+\.?\d*)[\s\t]+[\d,，]+\.?\d*[\s\t]+[\d,，\-]+\.?\d*/g;
    match = unitCostRowPattern.exec(text);
    if (match) {
      unitCost = parseFloat(match[1].replace(/[，,]/g, ''));
      if (isNaN(unitCost) || unitCost < 0 || unitCost > 10000) {
        unitCost = null;
      } else {
        console.log(`    Q1吨煤成本: ${unitCost} 元/吨`);
      }
    }

    // 提取毛利率（%）
    const grossMarginRowPattern = /毛利率[（(]%[）)][\s\t]+([\d,，]+\.?\d*)[\s\t]+[\d,，]+\.?\d*[\s\t]+/g;
    match = grossMarginRowPattern.exec(text);
    if (match) {
      grossMargin = parseFloat(match[1].replace(/[，,]/g, ''));
      if (isNaN(grossMargin) || grossMargin < 0 || grossMargin > 100) {
        grossMargin = null;
      } else {
        console.log(`    Q1毛利率: ${grossMargin}%`);
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
  } else {
    console.log('    2024年之前：跳过Q1数据提取（季报表格中的数据是累计值，不是单季值）');
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

    // 提取分产品数据（传入年份以便处理特殊合并逻辑）
    const productData = extractProductData(text, year);

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

    // 2021-2023年季报：清除错误的产销量数据（这些数据不存在于季报中）
    const yearNum = parseInt(year);
    const isQuarterlyReport = filename.includes('季度') || filename.includes('半年');
    if (yearNum >= 2021 && yearNum <= 2023 && isQuarterlyReport) {
      // 只保留营收和成本，清除产销量
      if (productData.productionCoal.sales) {
        console.log(`    ⚠️ 清除${year}年季报中的错误销量数据: ${productData.productionCoal.sales}万吨`);
        productData.productionCoal.sales = null;
      }
      if (productData.productionCoal.production) {
        console.log(`    ⚠️ 清除${year}年季报中的错误产量数据: ${productData.productionCoal.production}万吨`);
        productData.productionCoal.production = null;
      }
      if (productData.productionCoal.price) {
        productData.productionCoal.price = null;
      }
      if (productData.productionCoal.unitCost) {
        productData.productionCoal.unitCost = null;
      }
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
  const reportDir = path.join(__dirname, '../../stock/report_analysis/山煤国际');
  const files = fs.readdirSync(reportDir)
    .filter(f => f.endsWith('.pdf'))
    .filter(f => !f.includes('生产经营数据')); // 跳过生产经营数据PDF（由parse_production_data.js处理）

  // 处理所有PDF文件
  console.log(`找到 ${files.length} 个PDF文件（不含生产经营数据PDF）`);

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
 * 计算煤种分产品数据的季度数据
 * 从全年数据反推Q1、Q4等季度数据
 */
function calculateProductBreakdownQuarterlyData(data) {
  console.log('\n📊 计算煤种分产品季度数据...\n');

  // 按年份分组
  const yearGroups = {};
  data.forEach(item => {
    const year = item.year;
    if (!yearGroups[year]) {
      yearGroups[year] = [];
    }
    yearGroups[year].push(item);
  });

  // 处理每一年
  Object.keys(yearGroups).sort().forEach(year => {
    const yearData = yearGroups[year];

    // 找到全年数据
    const annualItem = yearData.find(d => d.period.includes('全年'));
    if (!annualItem || !annualItem.productData?.productBreakdown) {
      return;
    }

    const annualBreakdown = annualItem.productData.productBreakdown;

    // 检查是否有动力煤或冶金煤的全年数据
    const hasThermal = annualBreakdown.thermalCoal?.sales;
    const hasMetallurgical = annualBreakdown.metallurgicalCoal?.sales;

    if (!hasThermal && !hasMetallurgical) {
      return;
    }

    console.log(`处理 ${year}年煤种分产品数据...`);

    // 找Q1, Q2, Q3数据 (如果存在)
    const q1Item = yearData.find(d => d.period.includes('1-3月'));
    const h1Item = yearData.find(d => d.period.includes('上半年'));
    const q3Item = yearData.find(d => d.period.includes('1-9月'));

    // 辅助函数：从两个分产品数据中相减
    const subtractProductData = (total, ...parts) => {
      const result = {
        production: null,
        sales: null,
        revenue: null,
        cost: null
      };

      ['production', 'sales', 'revenue', 'cost'].forEach(field => {
        if (total[field] == null) {
          result[field] = null;
          return;
        }

        const hasNullInParts = parts.some(p => p[field] == null);
        if (hasNullInParts) {
          result[field] = null;
          return;
        }

        let value = total[field];
        parts.forEach(p => {
          value -= p[field];
        });

        result[field] = value < 0 ? null : parseFloat(value.toFixed(2));
      });

      return result;
    };

    // 如果没有Q1数据，但有上半年数据，可以创建Q1累计（=Q1单季）
    if (!q1Item && h1Item && h1Item.productData?.productBreakdown) {
      console.log(`  ${year}年: 创建Q1累计数据（从H1数据）`);
      // 这里不创建新记录，只是标记可能需要
    }

    // 如果有全年和Q3数据，可以反推Q4
    if (q3Item && q3Item.productData?.productBreakdown) {
      const q3Breakdown = q3Item.productData.productBreakdown;

      // 反推Q4动力煤
      if (hasThermal && q3Breakdown.thermalCoal?.sales) {
        const q4Thermal = subtractProductData(
          annualBreakdown.thermalCoal,
          q3Breakdown.thermalCoal
        );

        // 将Q4数据添加到全年记录的productBreakdown中
        if (!annualItem.productData.productBreakdown.thermalCoalQ4) {
          annualItem.productData.productBreakdown.thermalCoalQ4 = q4Thermal;
          console.log(`  ✓ 动力煤Q4 = 全年 - 1-9月 (反推)`);
        }
      }

      // 反推Q4冶金煤
      if (hasMetallurgical && q3Breakdown.metallurgicalCoal?.sales) {
        const q4Metallurgical = subtractProductData(
          annualBreakdown.metallurgicalCoal,
          q3Breakdown.metallurgicalCoal
        );

        if (!annualItem.productData.productBreakdown.metallurgicalCoalQ4) {
          annualItem.productData.productBreakdown.metallurgicalCoalQ4 = q4Metallurgical;
          console.log(`  ✓ 冶金煤Q4 = 全年 - 1-9月 (反推)`);
        }
      }
    }
  });

  console.log('\n✅ 煤种分产品季度数据计算完成\n');
}

/**
 * 处理2021年数据
 * 特殊处理：如果有全年数据和Q1-Q3，可以反推Q4
 */
function handle2021Data(data, quarters) {
  // 如果没有有效的Q4数据但有Q1-Q3和全年数据，通过减法计算Q4
  const hasQ4 = hasValidData(quarters.Q4);
  const hasQ1 = hasValidData(quarters.Q1);
  const hasQ2 = hasValidData(quarters.Q2);
  const hasQ3 = hasValidData(quarters.Q3);

  if (!hasQ4 && hasQ1 && hasQ2 && hasQ3) {
    const annualData = getAnnualData(data, '2021');
    if (annualData) {
      quarters.Q4 = calculateDifference(annualData, quarters.Q1, quarters.Q2, quarters.Q3);
      console.log('  ✓ Q4 = 全年 - Q1 - Q2 - Q3 (反推计算)');
      // 更新原始数据中的Q4季度数据
      updateQuarterlyData(data, '2021', 'Q4', quarters.Q4);
    }
  }

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

  // Q3累计 = Q1 + Q2 + Q3
  if (quarters.Q1 && quarters.Q2 && quarters.Q3) {
    const q3cum = calculateSum([quarters.Q1, quarters.Q2, quarters.Q3]);
    updateCumulativeData(data, '2021', '1-9月', q3cum);
    console.log('  ✓ Q3累计 = Q1 + Q2 + Q3');
  }

  // 全年 = Q1 + Q2 + Q3 + Q4
  if (quarters.Q1 && quarters.Q2 && quarters.Q3 && quarters.Q4) {
    const annual = calculateSum([quarters.Q1, quarters.Q2, quarters.Q3, quarters.Q4]);
    updateCumulativeData(data, '2021', '全年', annual);
    console.log('  ✓ 全年累计 = Q1 + Q2 + Q3 + Q4');
  }
}

/**
 * 处理正常年份数据
 */
function handleNormalYearData(data, year, quarters) {
  const hasQ4 = hasValidData(quarters.Q4);
  const hasQ1 = hasValidData(quarters.Q1);
  const hasQ2 = hasValidData(quarters.Q2);
  const hasQ3 = hasValidData(quarters.Q3);

  // 检查Q1是否缺少revenue/sales（即使有production）
  const q1MissingRevenueSales = quarters.Q1 &&
    (quarters.Q1.revenue == null || quarters.Q1.sales == null);

  // 如果Q1数据不完整（无数据或缺少revenue/sales）但有Q2和H1累计数据，反推Q1
  // Q1 = H1累计 - Q2单季
  if ((!hasQ1 || q1MissingRevenueSales) && hasQ2) {
    // 获取H1的原始PDF数据作为累积值
    // 注意：对于运营PDF，H1的quarterly字段实际存储的是Q2单季数据
    // 我们需要从productData.productionCoal获取真正的累积数据
    const h1Item = data.find(d => d.year === year && d.period.includes('上半年'));
    let h1CumulativeData = null;

    // 尝试从productData获取
    if (h1Item && h1Item.productData && h1Item.productData.productionCoal) {
      const pc = h1Item.productData.productionCoal;
      h1CumulativeData = {
        revenue: pc.revenue ? parseFloat((pc.revenue / 10000).toFixed(2)) : null,
        cost: pc.cost ? parseFloat((pc.cost / 10000).toFixed(2)) : null,
        sales: pc.sales || null,
        production: pc.production || null
      };
    }

    // 如果productData为空但有quarterData.quarterly（Q2），则H1累积 ≈ Q2（因为Q1可能为0）
    // 这种情况下无法反推Q1，因为H1 - Q2 = 0
    if (!h1CumulativeData || (h1CumulativeData.revenue == null && h1CumulativeData.sales == null)) {
      // 尝试使用H1的quarterly作为累积（适用于运营PDF的情况）
      if (h1Item && h1Item.quarterData && h1Item.quarterData.quarterly) {
        h1CumulativeData = h1Item.quarterData.quarterly;
      }
    }

    if (h1CumulativeData && (h1CumulativeData.revenue != null || h1CumulativeData.sales != null)) {
      const deducedQ1 = calculateDifference(h1CumulativeData, quarters.Q2);

      // 如果Q1已有production，保留它；否则使用反推的production
      if (quarters.Q1 && quarters.Q1.production != null) {
        deducedQ1.production = quarters.Q1.production;
      }

      quarters.Q1 = deducedQ1;
      console.log('  ✓ Q1 = H1累计 - Q2 (反推计算revenue/sales，保留production)');
      updateQuarterlyData(data, year, 'Q1', quarters.Q1, '1-3月');
    }
  }

  // 如果Q4数据不完整但有Q1-Q3和全年数据，反推Q4
  // Q4 = 全年累计 - Q1 - Q2 - Q3
  if (!hasQ4 && hasQ1 && hasQ2 && hasQ3) {
    const annualData = getAnnualData(data, year);
    if (annualData) {
      quarters.Q4 = calculateDifference(annualData, quarters.Q1, quarters.Q2, quarters.Q3);
      console.log('  ✓ Q4 = 全年 - Q1 - Q2 - Q3 (反推计算)');
      updateQuarterlyData(data, year, 'Q4', quarters.Q4, '全年');
    }
  }

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
 * 计算差值数据（用于反推单季度数据）
 * 例如：Q4 = 全年累积 - Q1 - Q2 - Q3
 * 重要规则：
 * 1. 如果total的某个字段为null，则结果为null
 * 2. 如果任何一个quarter的某字段为null，则结果为null（无法准确反推）
 * 3. 如果计算结果为负数，则设为null（数据异常）
 */
function calculateDifference(total, ...quarters) {
  const result = {};

  ['revenue', 'cost', 'sales', 'production'].forEach(field => {
    // 如果全年数据该字段为null/undefined，则结果也为null
    if (total[field] == null) {
      result[field] = null;
      return;
    }

    // 检查所有季度的该字段是否都有值
    const hasNullInQuarters = quarters.some(q => q[field] == null);
    if (hasNullInQuarters) {
      // DEBUG: 打印哪个季度的哪个字段为null
      // console.log(`  DEBUG: ${field} has null in quarters:`, quarters.map(q => q[field]));
      // 如果任何一个季度的该字段为null，则无法准确计算，结果设为null
      result[field] = null;
      return;
    }

    let value = total[field];
    quarters.forEach(q => {
      value -= q[field];
    });

    // 保留2位小数
    const roundedValue = parseFloat(value.toFixed(2));

    // 如果结果为负数（小于-0.01）则设为null（数据异常）
    if (value < -0.01) {
      result[field] = null;
    } else {
      // 对于非负数（包括接近0的值），都保留计算结果
      // 0.00会被保留为0，显示在HTML时会被格式化为"-"
      result[field] = roundedValue;
    }
  });

  return result;
}

/**
 * 检查季度数据是否有效（不是全null/undefined且不是全0）
 */
function hasValidData(quarterData) {
  if (!quarterData) return false;

  // 检查是否有非null/undefined的有效数值
  const hasValidValue = (quarterData.revenue != null && quarterData.revenue !== 0) ||
                        (quarterData.cost != null && quarterData.cost !== 0) ||
                        (quarterData.sales != null && quarterData.sales !== 0) ||
                        (quarterData.production != null && quarterData.production !== 0);

  return hasValidValue;
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
 * 获取全年累积数据（从原始productData中获取，确保数据准确）
 */
function getAnnualData(data, year) {
  const annualItem = data.find(d => d.year === year && d.period.includes('全年'));
  if (annualItem && annualItem.productData && annualItem.productData.productionCoal) {
    const pc = annualItem.productData.productionCoal;
    // 将原始数据转换为标准格式（单位转换：万元->亿元）
    return {
      revenue: pc.revenue ? parseFloat((pc.revenue / 10000).toFixed(2)) : null,
      cost: pc.cost ? parseFloat((pc.cost / 10000).toFixed(2)) : null,
      sales: pc.sales || null,
      production: pc.production || null
    };
  }
  return null;
}

/**
 * 获取半年报的累计数据（用于反推Q1）
 */
function getH1Data(data, year, preferProductData = false) {
  const h1Item = data.find(d => d.year === year && d.period.includes('上半年'));
  if (!h1Item) return null;

  // 如果指定preferProductData=true，尝试使用productData（用于Q1反推）
  if (preferProductData && h1Item.productData && h1Item.productData.productionCoal) {
    const pc = h1Item.productData.productionCoal;
    const pdData = {
      revenue: pc.revenue ? parseFloat((pc.revenue / 10000).toFixed(2)) : null,
      cost: pc.cost ? parseFloat((pc.cost / 10000).toFixed(2)) : null,
      sales: pc.sales || null,
      production: pc.production || null
    };

    // 如果productData有有效数据，返回它
    if (pdData.revenue != null || pdData.sales != null) {
      return pdData;
    }
    // 否则fallback到cumulative
  }

  // 优先使用quarterData.cumulative（如果已经计算过）
  if (h1Item.quarterData && h1Item.quarterData.cumulative) {
    return h1Item.quarterData.cumulative;
  }

  // 否则从productData获取
  if (h1Item.productData && h1Item.productData.productionCoal) {
    const pc = h1Item.productData.productionCoal;
    return {
      revenue: pc.revenue ? parseFloat((pc.revenue / 10000).toFixed(2)) : null,
      cost: pc.cost ? parseFloat((pc.cost / 10000).toFixed(2)) : null,
      sales: pc.sales || null,
      production: pc.production || null
    };
  }

  return null;
}

/**
 * 更新季度数据
 * @param periodType 报告期类型 ('1-3月'/'全年')，用于确定更新哪个记录
 */
function updateQuarterlyData(data, year, quarter, quarterlyData, periodType = '全年') {
  const item = data.find(d => d.year === year && d.period.includes(periodType));
  if (item) {
    if (!item.quarterData) {
      item.quarterData = {};
    }
    if (!item.quarterData.quarterly) {
      item.quarterData.quarterly = {};
    }
    item.quarterData.quarterly = quarterlyData;
    item.quarterData.quarter = quarter;
  }
}

/**
 * 解析单个生产经营数据PDF
 * 提取当期和去年同期的数据
 */
async function parseProductionDataPDF(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: dataBuffer });
  const textData = await parser.getText();
  const text = textData.text;

  const filename = path.basename(filePath);
  const yearQuarterMatch = filename.match(/(\d{4})Q(\d)/);

  if (!yearQuarterMatch) {
    console.log(`⚠️  无法从文件名提取年份和季度: ${filename}`);
    return null;
  }

  const year = yearQuarterMatch[1];
  const quarter = 'Q' + yearQuarterMatch[2];
  const lastYear = (parseInt(year) - 1).toString();

  console.log(`解析: ${filename}`);

  // 提取数据
  const result = {
    year,
    quarter,
    filename,
    data: {},
    lastYearData: null  // 去年同期数据
  };

  // 辅助函数：从表格中提取两列数据（当期和去年同期）
  function extractTwoColumns(pattern) {
    const match = text.match(pattern);
    if (match) {
      const current = parseFloat(match[1].replace(/[，,]/g, ''));
      const last = match[2] ? parseFloat(match[2].replace(/[，,]/g, '')) : null;
      return { current, last };
    }
    return null;
  }

  // 提取产量（万吨）- 原煤产量就是自产煤产量
  // 格式：原煤产量（万吨）  1,055.92  1,107.01
  const productionData = extractTwoColumns(/原煤产量[（(]万吨[）)]\s+([\d,，.]+)\s+([\d,，.]+)/);
  if (productionData) {
    result.data.production = productionData.current;
    if (productionData.last) {
      if (!result.lastYearData) result.lastYearData = {};
      result.lastYearData.production = productionData.last;
    }
  }

  // 提取自产煤销量（万吨）
  // 格式：自产煤销量  967.52  971.50
  const salesData = extractTwoColumns(/自产煤销量\s+([\d,，.]+)\s+([\d,，.]+)/);
  if (salesData) {
    result.data.sales = salesData.current;
    result.data.salesType = 'ownCoal';
    if (salesData.last) {
      if (!result.lastYearData) result.lastYearData = {};
      result.lastYearData.sales = salesData.last;
      result.lastYearData.salesType = 'ownCoal';
    }
  }

  // 提取自产煤营业收入（万元）
  // 格式：自产煤营业收入  640,379.71  729,795.81
  const revenueData = extractTwoColumns(/自产煤营业收入\s+([\d,，.]+)\s+([\d,，.]+)/);
  if (revenueData) {
    result.data.revenue = revenueData.current / 10000; // 转换为亿元
    result.data.revenueType = 'ownCoal';
    if (revenueData.last) {
      if (!result.lastYearData) result.lastYearData = {};
      result.lastYearData.revenue = revenueData.last / 10000;
      result.lastYearData.revenueType = 'ownCoal';
    }
  }

  // 提取自产煤营业成本（万元）
  // 格式：自产煤营业成本  250,043.07  249,801.93
  const costData = extractTwoColumns(/自产煤营业成本\s+([\d,，.]+)\s+([\d,，.]+)/);
  if (costData) {
    result.data.cost = costData.current / 10000; // 转换为亿元
    result.data.costType = 'ownCoal';
    if (costData.last) {
      if (!result.lastYearData) result.lastYearData = {};
      result.lastYearData.cost = costData.last / 10000;
      result.lastYearData.costType = 'ownCoal';
    }
  }

  // 计算当期售价和单位成本
  if (result.data.revenue && result.data.sales && result.data.sales > 0) {
    result.data.price = parseFloat(((result.data.revenue * 10000) / result.data.sales).toFixed(2));
  }

  if (result.data.cost && result.data.sales && result.data.sales > 0) {
    result.data.unitCost = parseFloat(((result.data.cost * 10000) / result.data.sales).toFixed(2));
  }

  // 计算去年同期售价和单位成本
  if (result.lastYearData && result.lastYearData.revenue && result.lastYearData.sales && result.lastYearData.sales > 0) {
    result.lastYearData.price = parseFloat(((result.lastYearData.revenue * 10000) / result.lastYearData.sales).toFixed(2));
  }

  if (result.lastYearData && result.lastYearData.cost && result.lastYearData.sales && result.lastYearData.sales > 0) {
    result.lastYearData.unitCost = parseFloat(((result.lastYearData.cost * 10000) / result.lastYearData.sales).toFixed(2));
  }

  return result;
}

/**
 * 批量解析所有生产经营数据PDF
 */
async function parseAllProductionDataPDFs() {
  console.log('\n📊 解析生产经营数据PDF...\n');

  const reportDir = path.join(__dirname, '../../stock/report_analysis/山煤国际');
  const files = fs.readdirSync(reportDir)
    .filter(f => f.includes('生产经营数据.pdf'))
    .sort();

  console.log(`找到 ${files.length} 个生产经营数据PDF文件\n`);

  const results = [];
  const lastYearDataToAdd = []; // 存储从当期PDF提取的去年同期数据

  for (const file of files) {
    const filePath = path.join(reportDir, file);
    try {
      const result = await parseProductionDataPDF(filePath);
      if (result) {
        // 添加当期数据
        results.push({
          year: result.year,
          quarter: result.quarter,
          filename: result.filename,
          data: result.data
        });
        console.log(`  ✓ ${result.year}${result.quarter}: 产量=${result.data.production || 'N/A'}万吨, 销量=${result.data.sales || 'N/A'}万吨, 收入=${result.data.revenue?.toFixed(2) || 'N/A'}亿元`);

        // 如果有去年同期数据，记录下来
        if (result.lastYearData && Object.keys(result.lastYearData).length > 0) {
          const lastYear = (parseInt(result.year) - 1).toString();
          lastYearDataToAdd.push({
            year: lastYear,
            quarter: result.quarter,
            filename: `${result.filename}(去年同期)`,
            data: result.lastYearData,
            source: 'lastYearFromPDF' // 标记数据来源
          });
          console.log(`    (含去年${lastYear}${result.quarter}同期数据: 销量=${result.lastYearData.sales || 'N/A'}万吨, 收入=${result.lastYearData.revenue?.toFixed(2) || 'N/A'}亿元)`);
        }
      }
    } catch (err) {
      console.error(`❌ 解析失败 ${file}:`, err.message);
    }
  }

  console.log(`\n✅ 成功解析 ${results.length}/${files.length} 个文件`);

  // 合并去年同期数据（只添加缺失的数据）
  console.log('\n📝 处理去年同期数据...');
  let addedCount = 0;
  lastYearDataToAdd.forEach(lastYearItem => {
    // 检查是否已经有该年份季度的数据
    const existing = results.find(r => r.year === lastYearItem.year && r.quarter === lastYearItem.quarter);
    if (!existing) {
      results.push(lastYearItem);
      console.log(`  + 补充 ${lastYearItem.year}${lastYearItem.quarter} 数据（从${parseInt(lastYearItem.year) + 1}年PDF提取）`);
      addedCount++;
    } else if (existing.source !== 'lastYearFromPDF') {
      // 如果已有数据不是从去年同期提取的，用去年同期数据补充缺失字段
      let updated = false;
      ['revenue', 'cost', 'sales', 'production'].forEach(field => {
        if (!existing.data[field] && lastYearItem.data[field]) {
          existing.data[field] = lastYearItem.data[field];
          if (lastYearItem.data[field + 'Type']) {
            existing.data[field + 'Type'] = lastYearItem.data[field + 'Type'];
          }
          updated = true;
        }
      });
      if (updated) {
        console.log(`  ↻ 更新 ${existing.year}${existing.quarter} 缺失字段`);
        addedCount++;
      }
    }
  });

  if (addedCount > 0) {
    console.log(`✓ 补充/更新了 ${addedCount} 条去年同期数据`);
  } else {
    console.log('✓ 无需补充数据');
  }

  // 按年份和季度排序
  results.sort((a, b) => {
    if (a.year !== b.year) return a.year.localeCompare(b.year);
    return a.quarter.localeCompare(b.quarter);
  });

  // 保存结果
  const outputPath = path.join(reportDir, 'production_data_extracted.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\n💾 数据已保存到: production_data_extracted.json (共${results.length}条记录)`);

  return results;
}

/**
 * 加载生产经营数据PDF的数据（2024年之前优先使用）
 */
function loadProductionDataPDF() {
  const baseDir = path.join(__dirname, '../../stock/report_analysis/山煤国际');
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
 * 数据来源优先级：生产经营数据PDF > 年报/季报PDF
 * 重要：运营销量数据（来自生产经营PDF）不允许被覆盖
 */
function mergeQuarterlyData() {
  console.log('\n🔄 整合季度数据到主数据文件...\n');

  const baseDir = path.join(__dirname, '../../stock/report_analysis/山煤国际');
  const shanmeiDataPath = path.join(baseDir, 'shanmei_data.json');

  if (!fs.existsSync(shanmeiDataPath)) {
    console.error('❌ shanmei_data.json 不存在');
    return false;
  }

  // 加载生产经营数据PDF（优先数据源）
  const productionDataMap = loadProductionDataPDF();

  const shanmeiData = JSON.parse(fs.readFileSync(shanmeiDataPath, 'utf-8'));
  console.log(`  - 主数据: ${shanmeiData.length} 条记录`);

  let productionDataUsed = 0;

  shanmeiData.forEach(item => {
    const year = parseInt(item.year);

    // 确定季度标识（Q1, Q2, Q3, Q4）
    let quarter = null;
    if (item.period.includes('1-3月')) quarter = 'Q1';
    else if (item.period.includes('上半年')) quarter = 'Q2';
    else if (item.period.includes('1-9月')) quarter = 'Q3';
    else if (item.period.includes('全年')) quarter = 'Q4';

    // 使用运营数据PDF（所有年份）
    // 2024年之前：只录入有自产煤销量的数据（salesType === 'ownCoal'）
    // 2024年及以后：录入所有运营数据（都是自产煤）
    if (productionDataMap && quarter) {
      const productionKey = `${item.year}-${quarter}`;
      const productionData = productionDataMap.get(productionKey);

      // 判断是否应该录入数据
      const shouldUseData = year >= 2024 || (productionData && productionData.salesType === 'ownCoal');

      if (shouldUseData && productionData) {
        // 使用生产经营数据PDF（仅自产煤）
        if (!item.quarterData) {
          item.quarterData = {};
        }
        if (!item.quarterData.quarterly) {
          item.quarterData.quarterly = {};
        }

        // 直接更新 quarterly 对象
        const q = item.quarterData.quarterly;

        // 运营数据PDF优先，直接写入（不检查是否存在）
        if (productionData.production !== undefined) {
          q.production = productionData.production;
        }
        if (productionData.sales !== undefined) {
          q.sales = productionData.sales;
          q.salesSource = 'production_pdf'; // 标记数据来源
        }
        if (productionData.revenue !== undefined) {
          q.revenue = productionData.revenue;
        }
        if (productionData.cost !== undefined) {
          q.cost = productionData.cost;
        }
        if (productionData.price !== undefined) {
          q.price = productionData.price;
        }
        if (productionData.unitCost !== undefined) {
          q.unitCost = productionData.unitCost;
        }

        // 计算毛利率
        if (productionData.revenue && productionData.cost) {
          const grossMargin = ((productionData.revenue - productionData.cost) / productionData.revenue * 100).toFixed(2);
          q.grossMargin = parseFloat(grossMargin);
        }

        item.quarterData.quarter = quarter;
        productionDataUsed++;
        console.log(`    ${item.period}: 使用生产经营数据PDF (${quarter}, 自产煤)`);
      } else if (productionData && !productionData.salesType) {
        // 如果有运营数据但不是自产煤，只取产量
        if (!item.quarterData) {
          item.quarterData = {};
        }
        if (!item.quarterData.quarterly) {
          item.quarterData.quarterly = {};
        }

        const q = item.quarterData.quarterly;

        // 只录入产量（原煤产量=自产煤产量）
        if (productionData.production !== undefined) {
          q.production = productionData.production;
        }

        item.quarterData.quarter = quarter;
          console.log(`    ${item.period}: 仅使用产量数据 (${quarter})`);
        }
      }

    // 确保quarterData存在
    if (!item.quarterData && quarter) {
        item.quarterData = {
        quarter: quarter,
        quarterly: {}
      };
        }
  });

  if (productionDataUsed > 0) {
    console.log(`  ✓ 使用了 ${productionDataUsed} 条生产经营数据PDF记录`);
  }

  shanmeiData.sort((a, b) => {
    const yearA = parseInt(a.year);
    const yearB = parseInt(b.year);
    if (yearA !== yearB) return yearA - yearB;
    return (a.month || 0) - (b.month || 0);
  });

  // 计算累计数据
  calculateCumulativeData(shanmeiData);

  // 计算煤种分产品季度数据
  calculateProductBreakdownQuarterlyData(shanmeiData);

  // 清理嵌套的季度字段（q1, q2, q3, q4）
  console.log('\n🧹 清理旧的嵌套数据结构...');
  let cleanedCount = 0;
  shanmeiData.forEach(item => {
    if (item.quarterData) {
      // 清理 quarterly 中的嵌套字段
      if (item.quarterData.quarterly) {
        const removed = ['q1', 'q2', 'q3', 'q4'].filter(q => {
          if (item.quarterData.quarterly[q]) {
            delete item.quarterData.quarterly[q];
            return true;
          }
          return false;
        });
        if (removed.length > 0) cleanedCount++;
      }
      // 清理 cumulative 中的嵌套字段
      if (item.quarterData.cumulative) {
        ['q1', 'q2', 'q3', 'q4'].forEach(q => {
          if (item.quarterData.cumulative[q]) {
            delete item.quarterData.cumulative[q];
          }
        });
      }
    }
  });
  if (cleanedCount > 0) {
    console.log(`✓ 清理了 ${cleanedCount} 条记录的嵌套字段`);
  }

  fs.writeFileSync(shanmeiDataPath, JSON.stringify(shanmeiData, null, 2), 'utf-8');
  console.log(`\n💾 数据已保存: shanmei_data.json (${shanmeiData.length}条)`);

  return true;
}

/**
 * 测试数据完整性
 */
function testDataIntegrity() {
  console.log('\n🧪 测试数据完整性...\n');

  const dataPath = path.join(__dirname, '../../stock/report_analysis/山煤国际/shanmei_data.json');

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



    case 'production':
    case 'prod':
      // 解析生产经营数据PDF
      await parseAllProductionDataPDFs();
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
      // 执行所有操作：解析生产经营数据PDF → 解析年报PDF → 合并季度数据 → 测试
      console.log('\n📋 执行完整流程...\n');

      // 1. 解析生产经营数据PDF
      await parseAllProductionDataPDFs();
      console.log('\n' + '='.repeat(60));

      // 2. 解析年报PDF
      await processAllPDFs();
      console.log('\n' + '='.repeat(60));

      // 3. 合并季度数据
      console.log('\n' + '='.repeat(60));
      if (mergeQuarterlyData()) {
        // 4. 测试数据完整性
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
  production  - 解析生产经营数据PDF，生成 production_data_extracted.json
  parse/pdf   - 解析所有年报PDF文件，提取数据到 shanmei_data.json
  merge       - 从HTML提取季度数据并合并到主文件（一步到位）
  test        - 测试数据完整性
  all         - 执行完整流程：production → parse → merge → test
  help        - 显示帮助信息

常用流程:
  1. 首次使用或添加新PDF:
     node shanmei_report_parse.js all

  2. 只解析生产经营数据PDF:
     node shanmei_report_parse.js production

  3. 只更新季度数据:
     node shanmei_report_parse.js merge

  4. 只测试数据:
     node shanmei_report_parse.js test

说明:
  - all 命令会依次执行所有步骤，适合完整更新数据
  - production 命令解析生产经营数据PDF（2020-2023年的季度数据）
  - parse 命令解析年报、半年报、季报PDF
  - merge 命令整合所有数据源并计算累积数据
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
  parseProductionDataPDF,
  parseAllProductionDataPDFs,
  mergeQuarterlyData,
  testDataIntegrity
};

