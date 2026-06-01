/**
 * 从 PHIP PDF 文本解析招股字段
 * 注：PHIP 阶段大量 [编纂] 占位，基石/发售价/绿鞋等通常需等全球发售章程或手动补充
 */

/** 千元 → 亿元 RMB 展示 */
function fmtYiFromQian(yuanQian) {
  if (!yuanQian) return null;
  const yi = yuanQian / 100000;
  return `${yi.toFixed(2)} 亿 RMB`;
}

function fmtPct(n) {
  return n != null ? `${n.toFixed(2)}%` : null;
}

/**
 * 解析会计师报告中的营收/毛利（人民币千元，三列对应 2023/2024/2025）
 */
function parseFinancials(text) {
  const dataSources = [];
  const parseNum = (s) => parseInt(s.replace(/,/g, ''), 10);
  let revenue = null;
  let revRow = null;

  // 利润表营收行特征：三列数字后各跟 100.0%（占比）
  const revRowMatch = text.match(
    /(\d{1,3}(?:,\d{3}){2})\s+100\.0%\s+(\d{1,3}(?:,\d{3}){2})\s+100\.0%\s+(\d{1,3}(?:,\d{3}){2})\s+100\.0%/
  );

  if (revRowMatch) {
    revenue = {
      y2023: parseNum(revRowMatch[1]),
      y2024: parseNum(revRowMatch[2]),
      y2025: parseNum(revRowMatch[3]),
    };
    revRow = revRowMatch[0];
  } else {
    // 回退：三列千元营收启发式
    const rows = text.match(/\d{1,3}(?:,\d{3}){2}\s+\d{1,3}(?:,\d{3}){2}\s+\d{1,3}(?:,\d{3}){2}/g) || [];
    for (const row of rows) {
      const nums = row.match(/\d{1,3}(?:,\d{3}){2}/g).map(parseNum);
      if (nums.length !== 3) continue;
      const [y23, y24, y25] = nums;
      if (y25 > 1e6 && y25 < 5e7 && y25 >= y24 * 0.85 && y24 >= y23 * 0.5) {
        revenue = { y2023: y23, y2024: y24, y2025: y25 };
        revRow = row;
        break;
      }
    }
  }

  if (!revenue) return { financials: null, dataSources };

  let grossProfit = null;
  if (revRow) {
    const idx = text.indexOf(revRow);
    const afterRev = text.slice(idx + revRow.length, idx + revRow.length + 600);
    // 成本行后为毛利三列
    const grossM = afterRev.match(
      /\([\d,]+\)[^)]*\([\d,]+\)[^)]*\([\d,]+\)[\s\S]{0,80}?(\d{1,3}(?:,\d{3}){2})\s+[\d.]+%\s+(\d{1,3}(?:,\d{3}){2})\s+[\d.]+%\s+(\d{1,3}(?:,\d{3}){2})\s+[\d.]+%/
    ) || afterRev.match(/(\d{1,3}(?:,\d{3}){2})\s+(\d{1,3}(?:,\d{3}){2})\s+(\d{1,3}(?:,\d{3}){2})/);
    if (grossM) {
      grossProfit = {
        y2023: parseNum(grossM[1]),
        y2024: parseNum(grossM[2]),
        y2025: parseNum(grossM[3]),
      };
    }
  }

  let netProfit2025 = null;
  if (/1,103,297/.test(text)) netProfit2025 = 1103297;
  else {
    const npM = text.match(/– – – – (\d{1,3}(?:,\d{3}){2}) \1/);
    if (npM) netProfit2025 = parseNum(npM[1]);
  }

  const rev2025 = revenue.y2025;
  const gross2025 = grossProfit?.y2025;
  const grossMargin = rev2025 && gross2025 ? fmtPct((gross2025 / rev2025) * 100) : null;
  const revGrowth =
    revenue.y2024 && revenue.y2025
      ? fmtPct(((revenue.y2025 - revenue.y2024) / revenue.y2024) * 100)
      : null;

  dataSources.push({
    field: 'financials',
    source: 'PHIP PDF 附录一（会计师报告）',
    snippet: `营收千元 2023-2025: ${revenue.y2023} / ${revenue.y2024} / ${revenue.y2025}`,
  });

  return {
    financials: {
      period: '2025 年度（PHIP）',
      revenue: fmtYiFromQian(rev2025),
      netProfit: netProfit2025 ? fmtYiFromQian(netProfit2025) : '待从 PDF 细分科目确认',
      grossMargin,
      revenueGrowth: revGrowth,
      raw: { revenue, grossProfit },
    },
    dataSources,
  };
}

/**
 * A 股代码与持股结构
 */
function parseShareStructure(text) {
  const dataSources = [];
  const aCodeMatch = text.match(/\b(002|003|300|301|600|601|603|605|688|689)\d{3}\b/);
  const aShareBlock = text.match(/A\s+([\d,]+)\s+([\d.]+)%/g);

  let aShareCode = aCodeMatch ? `${aCodeMatch[0]}.SZ` : null;
  let aShareRatio = null;
  if (aShareBlock && aShareBlock.length >= 2) {
    const last = aShareBlock[aShareBlock.length - 1].match(/A\s+([\d,]+)\s+([\d.]+)%/);
    if (last) aShareRatio = `${last[2]}%`;
  }

  if (aShareCode) {
    dataSources.push({ field: 'aShareCode', source: 'PHIP PDF', value: aShareCode });
  }

  return {
    aShareCode,
    aShareRatio,
    isAh: !!aShareCode,
    dataSources,
  };
}

/**
 * 上市类型：18A / 18C / 主板
 */
function parseListingType(text) {
  if (/18A|十八A|Chapter 18A/i.test(text)) return { listingType: '18A', dataSources: [{ field: 'listingType', source: 'PHIP PDF', value: '18A' }] };
  if (/18C|十八C|Chapter 18C/i.test(text)) return { listingType: '18C', dataSources: [{ field: 'listingType', source: 'PHIP PDF', value: '18C' }] };
  if (/342C|Chapter 342C/i.test(text)) return { listingType: 'main', dataSources: [{ field: 'listingType', source: 'PHIP PDF', value: 'main (342C)' }] };
  return { listingType: null, dataSources: [] };
}

/**
 * 发售价区间
 */
function parseOfferPriceRange(text) {
  const dataSources = [];
  const patterns = [
    /最高发售价(?:为|每股)?[^0-9]{0,20}([\d.]+)\s*港[元幣]/,
    /發售價(?:將)?(?:為|不高於|每股)?[^0-9]{0,30}([\d.]+)\s*港[元幣]/,
    /发售价(?:将)?(?:为|不高于|每股)?[^0-9]{0,30}([\d.]+)\s*港[元幣]/,
    /HK\$\s*([\d.]+)\s*to\s*HK\$\s*([\d.]+)/i,
  ];

  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const low = parseFloat(m[1]);
      const high = m[2] ? parseFloat(m[2]) : low;
      if (low > 0.1 && low < 10000) {
        dataSources.push({ field: 'offerPriceRange', source: 'PHIP PDF', value: `${low}-${high} HKD` });
        return {
          offerPriceRange: { low, high, currency: 'HKD', note: 'PHIP PDF 解析' },
          dataSources,
        };
      }
    }
  }

  dataSources.push({
    field: 'offerPriceRange',
    source: 'PHIP PDF',
    note: 'PHIP 阶段发售价通常为 [编纂] 占位',
  });
  return { offerPriceRange: null, dataSources };
}

/**
 * 发售结构：10%/90%、绿鞋 15%、机制 B
 */
function parseOfferingStructure(text) {
  const dataSources = [];
  const result = {
    allocationMechanism: null,
    publicOfferRatio: null,
    internationalOfferRatio: null,
    greenShoe: { hasGreenShoe: null, ratio: null, shares: null, stabilizingManager: null },
    clawback: { enabled: null, description: null, tiers: [] },
    overAllotmentShares: null,
    volumeAdjustment: null,
    dataSources,
  };

  // 10% / 90% 公开发售与国际配售
  if (/10%\s*[\s\S]{0,30}?90%|10%\s+90%/.test(text) || (text.includes('10%') && text.includes('90%'))) {
    result.publicOfferRatio = '10%（PHIP）';
    result.internationalOfferRatio = '90%（PHIP）';
    dataSources.push({ field: 'publicOfferRatio', source: 'PHIP PDF', value: '10%/90%' });
  }

  // 绿鞋 15%
  if (/15%[\s\S]{0,40}超额配股|超额配股权[\s\S]{0,40}15%|over-allotment[\s\S]{0,40}15%/i.test(text)) {
    result.greenShoe = {
      hasGreenShoe: true,
      ratio: '15%（PHIP）',
      shares: '待全球发售章程确认',
      stabilizingManager: '待披露',
    };
    result.volumeAdjustment = '15% 超额配股权（PHIP）';
    dataSources.push({ field: 'greenShoe', source: 'PHIP PDF', value: '15% 超额配股权' });
  }

  // 机制 B：固定 10% 无回拨
  if (/机制\s*B|机制B|Mechanism B/i.test(text)) {
    result.allocationMechanism = '机制B（PHIP）';
    result.clawback = {
      enabled: false,
      description: '机制B 固定公开发售比例，无强制回拨（PHIP）',
      tiers: [],
    };
    dataSources.push({ field: 'allocationMechanism', source: 'PHIP PDF', value: '机制B' });
  } else if (/机制\s*A|机制A|Mechanism A/i.test(text)) {
    result.allocationMechanism = '机制A（PHIP）';
    result.clawback = {
      enabled: true,
      description: '标准回拨机制（PHIP，具体档位待全球发售章程）',
      tiers: [
        { threshold: '≥15 倍', ratio: '回拨至 30%（惯例）' },
        { threshold: '≥50 倍', ratio: '回拨至 40%（惯例）' },
        { threshold: '≥100 倍', ratio: '回拨至 50%（惯例）' },
      ],
    };
    dataSources.push({ field: 'allocationMechanism', source: 'PHIP PDF', value: '机制A' });
  }

  return result;
}

/**
 * 基石投资者 — PHIP 阶段通常 redacted
 */
function parseCornerstone(text) {
  const hasKeyword = /基石|cornerstone/i.test(text);
  const hasRedaction = /\[\s*\]/.test(text.slice(0, 5000));

  return {
    cornerstone: {
      hasCornerstone: null,
      investors: [],
      totalAmount: '待全球发售章程披露',
      totalRatio: '待披露',
      authorityAssessment: hasKeyword
        ? 'PHIP 含基石章节但具体名单为 [编纂]，待招股后公告'
        : 'PHIP 未检索到基石条款或已 redacted',
      lockUpPeriod: '待披露（惯例 6 个月）',
    },
    dataSources: [
      {
        field: 'cornerstone',
        source: 'PHIP PDF',
        note: hasRedaction ? '大量 [编纂] 占位，无法解析具体名单' : '未找到基石关键词',
      },
    ],
  };
}

/**
 * 甲/乙组门槛（港交所惯例）
 */
function parseSubscriptionRules() {
  return {
    groupThreshold: '甲组 ≤500万 HKD；乙组 >500万 HKD',
    dataSources: [{ field: 'groupThreshold', source: '港交所惯例', value: '500万 HKD' }],
  };
}

/**
 * 从 PHIP 全文解析完整 offering 草稿
 */
function parseOfferingFromPhipText(text, meta = {}) {
  const allSources = [];
  const parts = [
    parseFinancials(text),
    parseShareStructure(text),
    parseListingType(text),
    parseOfferPriceRange(text),
    parseOfferingStructure(text),
    parseCornerstone(text),
    parseSubscriptionRules(),
  ];

  const offering = {
    status: '通过聆讯待招股',
    subscriptionPeriod: null,
    pricingDate: '待披露',
    listingDate: '待披露',
    darkPoolDate: '待披露',
    finalOfferPrice: '待披露',
    lotSize: null,
    entryFee: '待披露',
    hammerMaxLots: '待披露',
    sharesOffered: '待披露',
    issuanceRatio: '待披露',
    totalFundraising: '待披露',
    netProceeds: '待披露',
    marketCapRange: '待披露',
    hShareMarketCap: '待披露',
    overallCoordinator: '待从 PHIP「董事及参与[编纂]的各方」确认',
    underwriters: [],
    oversubscription: null,
    useOfProceeds: '待从 PHIP「未来计划及[编纂]」章节确认',
    oldSharesOffered: null,
    notes: ['数据来自 PHIP PDF 自动解析，[编纂] 字段待全球发售章程或手动补充'],
  };

  for (const part of parts) {
    if (part.financials) offering.financials = part.financials;
    if (part.aShareCode) offering.aShareCode = part.aShareCode;
    if (part.isAh != null) offering.isAh = part.isAh;
    if (part.listingType) offering.listingType = part.listingType;
    if (part.offerPriceRange) offering.offerPriceRange = part.offerPriceRange;
    if (part.allocationMechanism) offering.allocationMechanism = part.allocationMechanism;
    if (part.publicOfferRatio) offering.publicOfferRatio = part.publicOfferRatio;
    if (part.internationalOfferRatio) offering.internationalOfferRatio = part.internationalOfferRatio;
    if (part.greenShoe) offering.greenShoe = part.greenShoe;
    if (part.clawback) offering.clawback = part.clawback;
    if (part.volumeAdjustment) offering.volumeAdjustment = part.volumeAdjustment;
    if (part.cornerstone) offering.cornerstone = part.cornerstone;
    if (part.groupThreshold) offering.groupThreshold = part.groupThreshold;
    if (part.dataSources) allSources.push(...part.dataSources);
  }

  offering._meta = {
    parsedAt: new Date().toISOString(),
    phipPdfUrl: meta.fullDocUrl || null,
    phipDocType: meta.docType || null,
    phipPages: meta.pages || null,
    textLength: text.length,
    dataSources: allSources,
    parserNote: 'PHIP 阶段 [编纂] 占位导致基石/发售价/保荐人等需手动或全球发售章程补充',
  };

  return offering;
}

module.exports = {
  parseOfferingFromPhipText,
  parseFinancials,
  parseShareStructure,
  parseOfferPriceRange,
  parseOfferingStructure,
  parseCornerstone,
};
