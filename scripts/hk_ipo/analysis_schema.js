/**
 * 港股 IPO AI 分析字段定义
 * 用于 analyze_hk_ipo.js 与 HTML 展示页
 */

/** @typedef {'high'|'medium'|'low'|'none'} FeasibilityLevel */
/** @typedef {'under'|'fair'|'over'|'uncertain'} ValuationVerdict */

/**
 * 分析结果完整结构
 * @typedef {Object} IpoAnalysis
 * @property {number} id - 港交所申请人 ID
 * @property {string} name - 公司名称
 * @property {string|null} stockCode - 已分配股票代码
 * @property {string} postingDate - PHIP 最新登载日期
 * @property {BasicInfo} basic - 基本信息
 * @property {ArbitrageAnalysis} arbitrage - 套利分析
 * @property {ShadowStockAnalysis} shadowStock - 影子股分析
 * @property {ValuationAnalysis} valuation - 估值分析
 * @property {OfferingAnalysis|null} offering - 招股详情（基石/绿鞋/回拨/定价）
 * @property {AhSpread|null} ahSpread - A/H 折价率（实时计算，含数据来源）
 * @property {string} summary - 综合结论（1-2 段）
 * @property {string[]} keyRisks - 核心风险清单
 * @property {number} score - 综合评分 1-10
 * @property {string} analyzedAt - 分析时间 ISO
 * @property {string} analyst - 分析来源标识
 */

/**
 * @typedef {Object} BasicInfo
 * @property {string} industry - 行业分类
 * @property {string} listingType - 上市类型：main / 18A / 18B / 18C
 * @property {string} businessSummary - 业务概要
 * @property {string|null} aShareCode - A 股代码（如有）
 * @property {string|null} sponsor - 保荐人
 * @property {string|null} expectedListing - 预期上市时间
 * @property {FinancialSnapshot|null} financials - 最新财务快照
 */

/**
 * @typedef {Object} FinancialSnapshot
 * @property {string} period - 报告期
 * @property {string} revenue - 营收
 * @property {string|null} netProfit - 净利润
 * @property {string|null} grossMargin - 毛利率
 * @property {string|null} revenueGrowth - 营收增速
 */

/**
 * @typedef {Object} ArbitrageAnalysis
 * @property {string} type - 套利类型：A+H / A股影子 / 港股同业 / 无 / 跨市场对标
 * @property {FeasibilityLevel} feasibility - 套利可行性
 * @property {string|null} ahPremium - A/H 溢价率（百分比或描述）
 * @property {string|null} spreadEstimate - 价差估算
 * @property {string} logic - 套利逻辑说明
 * @property {string[]} strategies - 具体策略建议
 * @property {string[]} constraints - 限制因素（汇率、流动性、锁定期等）
 */

/**
 * @typedef {Object} ShadowStockAnalysis
 * @property {ShadowPeer[]} peers - 可比/影子股列表
 * @property {string} correlation - 联动逻辑
 * @property {string} investmentTiming - 投资时点建议
 * @property {string|null} thematicPlay - 主题炒作逻辑
 */

/**
 * @typedef {Object} ShadowPeer
 * @property {string} name - 公司名称
 * @property {string} code - 股票代码
 * @property {string} market - 市场：A / H / US
 * @property {string} relevance - 关联度：直接对标 / 同行业 / 产业链 / 概念
 * @property {string|null} pe - 市盈率
 * @property {string|null} ps - 市销率
 * @property {string|null} marketCap - 市值
 * @property {string} note - 备注
 */

/**
 * @typedef {Object} ValuationAnalysis
 * @property {ValuationVerdict} verdict - 估值判断
 * @property {string|null} priceRange - 发行价区间
 * @property {string|null} marketCapRange - 市值区间
 * @property {string} method - 估值方法
 * @property {ComparableValuation[]} comparables - 可比估值
 * @property {string|null} impliedPe - 隐含 PE
 * @property {string|null} impliedPs - 隐含 PS
 * @property {string|null} fairValueRange - 合理价值区间
 * @property {string[]} assumptions - 关键假设
 * @property {string[]} catalysts - 催化因素
 * @property {string[]} risks - 估值风险
 */

/**
 * @typedef {Object} ComparableValuation
 * @property {string} metric - 指标名
 * @property {string} peerMedian - 同业中位数
 * @property {string} ipoImplied - IPO 隐含值
 * @property {string} comment - 评论
 */

/**
 * @typedef {Object} AhSpread
 * @property {boolean} isAh - 是否 A+H
 * @property {string} aShareCode - A 股代码
 * @property {string} hShareCode - H 股代码
 * @property {Object} aShare - A 股现价
 * @property {Object} hShare - H 股现价或招股发售价
 * @property {Object} exchangeRate - CNY/HKD 汇率
 * @property {Object} spread - 折价/溢价计算结果
 * @property {string} summary - 一句话摘要
 * @property {Object[]} dataSources - 各字段数据来源
 * @property {string} calculatedAt - 计算时间 ISO
 */

/**
 * @typedef {Object} OfferingAnalysis
 * @property {string} status - 招股状态
 * @property {Object|null} subscriptionPeriod - 招股期
 * @property {string} pricingDate - 定价日
 * @property {string} listingDate - 上市日
 * @property {string} darkPoolDate - 暗盘日
 * @property {string} allocationMechanism - 机制A / 机制B
 * @property {string} publicOfferRatio - 公开发售比例
 * @property {string} internationalOfferRatio - 国际配售比例
 * @property {ClawbackInfo} clawback - 回拨机制
 * @property {PriceRange|null} offerPriceRange - 发售价区间
 * @property {string} finalOfferPrice - 最终发售价
 * @property {number|null} lotSize - 每手股数
 * @property {string} entryFee - 入场费（一手）
 * @property {string} groupThreshold - 甲组/乙组门槛
 * @property {string} hammerMaxLots - 顶头槌（甲组最大认购）
 * @property {string} sharesOffered - 发售股数
 * @property {string} issuanceRatio - 发行比例（占扩大后股本）
 * @property {string} totalFundraising - 募集总额
 * @property {string} netProceeds - 募资净额
 * @property {string} marketCapRange - 总市值区间
 * @property {GreenShoeInfo} greenShoe - 绿鞋机制
 * @property {CornerstoneInfo} cornerstone - 基石分析
 * @property {string} overallCoordinator - 整体协调人/保荐人
 * @property {string[]} underwriters - 承销商
 * @property {OversubscriptionInfo|null} oversubscription - 超额认购/孖展
 * @property {string} useOfProceeds - 集资用途
 * @property {string[]} notes - 备注
 */

const ANALYSIS_SCHEMA = {
  version: '1.2',
  fields: {
    ahSpread: ['isAh', 'aShareCode', 'hShareCode', 'aShare', 'hShare', 'exchangeRate', 'spread', 'summary', 'dataSources', 'calculatedAt'],
    basic: ['industry', 'listingType', 'businessSummary', 'aShareCode', 'sponsor', 'expectedListing', 'financials'],
    arbitrage: ['type', 'feasibility', 'ahPremium', 'spreadEstimate', 'logic', 'strategies', 'constraints'],
    shadowStock: ['peers', 'correlation', 'investmentTiming', 'thematicPlay'],
    valuation: ['verdict', 'priceRange', 'marketCapRange', 'method', 'comparables', 'impliedPe', 'impliedPs', 'fairValueRange', 'assumptions', 'catalysts', 'risks'],
    offering: [
      'status', 'subscriptionPeriod', 'pricingDate', 'listingDate', 'darkPoolDate',
      'allocationMechanism', 'publicOfferRatio', 'internationalOfferRatio', 'clawback',
      'offerPriceRange', 'finalOfferPrice', 'lotSize', 'entryFee', 'groupThreshold', 'hammerMaxLots',
      'sharesOffered', 'overAllotmentShares', 'issuanceRatio', 'totalFundraising', 'netProceeds',
      'marketCapRange', 'hShareMarketCap', 'greenShoe', 'cornerstone',
      'overallCoordinator', 'underwriters', 'oversubscription', 'useOfProceeds', 'volumeAdjustment', 'oldSharesOffered',
    ],
  },
  /** 易遗漏但重要的招股字段清单 */
  offeringChecklist: [
    '基石投资者名单及认购金额', '基石占比', '基石权威性评估', '基石锁定期',
    '绿鞋机制（超额配股权）', '稳价人/绿鞋经办人', '回拨机制（机制A/B）',
    '发售价区间/最终定价', '每手股数', '入场费', '甲组顶头槌',
    '募集总额/净额', '总市值/H股市值', '发行比例', '公开发售/国际配售比例',
    '超额认购倍数', '孖展总额', '暗盘日期', '定价日/配售结果日',
    '整体协调人/保荐人/承销商', '发售量调整权', '旧股出售', 'A/H折价（如适用）',
  ],
  listingTypes: {
    main: '主板常规',
    '18A': '18A 未盈利生物科技公司',
    '18B': '18B 特殊目的收购公司',
    '18C': '18C 专精特新/预商业化公司',
  },
  feasibilityLabels: { high: '高', medium: '中', low: '低', none: '无' },
  verdictLabels: { under: '低估', fair: '合理', over: '高估', uncertain: '不确定' },
};

module.exports = { ANALYSIS_SCHEMA };
