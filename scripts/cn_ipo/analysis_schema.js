/**
 * A 股 IPO AI 分析字段定义
 * 用于 analyze_cn_ipo.js 与 HTML 展示页
 */

/** @typedef {'high'|'medium'|'low'|'none'} FeasibilityLevel */
/** @typedef {'under'|'fair'|'over'|'uncertain'} ValuationVerdict */

/**
 * @typedef {Object} CnIpoAnalysis
 * @property {string} id - 股票代码（6 位）
 * @property {string} name - 公司简称
 * @property {string|null} secuCode - 带后缀代码，如 688635.SH
 * @property {string} board - 板块：main / star / chinext / bse
 * @property {string} status - 申购/上市状态
 * @property {BasicInfo} basic
 * @property {IpoArbitrageAnalysis} arbitrage - 打新/联动套利
 * @property {ShadowStockAnalysis} shadowStock
 * @property {ValuationAnalysis} valuation
 * @property {SubscriptionInfo|null} subscription - 发行申购详情（来自东方财富）
 * @property {string} summary
 * @property {string[]} keyRisks
 * @property {number} score
 * @property {string} analyzedAt
 * @property {string} analyst
 */

/**
 * @typedef {Object} BasicInfo
 * @property {string} industry
 * @property {string} boardLabel - 主板 / 科创板 / 创业板 / 北交所
 * @property {string} businessSummary
 * @property {string|null} sponsor - 保荐机构
 * @property {string|null} underwriter - 主承销商
 * @property {string|null} expectedListing
 * @property {FinancialSnapshot|null} financials
 */

/**
 * @typedef {Object} IpoArbitrageAnalysis
 * @property {string} type - 打新溢价 / 板块联动 / 影子股对冲 / 无
 * @property {FeasibilityLevel} feasibility
 * @property {string|null} expectedPremium - 预期首日溢价
 * @property {string|null} winRateEstimate - 中签率/申购热度估算
 * @property {string} logic
 * @property {string[]} strategies
 * @property {string[]} constraints
 */

/**
 * @typedef {Object} SubscriptionInfo
 * @property {string} status
 * @property {number|null} issuePrice - 发行价（元）
 * @property {string|null} priceMethod - 定价方式
 * @property {number|null} issuePe - 发行市盈率
 * @property {number|null} industryPe - 行业市盈率
 * @property {string|null} applyDate
 * @property {string|null} listingDate
 * @property {string|null} ballotDate - 中签号公布日
 * @property {string|null} onlinePayDate
 * @property {string|null} onlineRefundDate
 * @property {number|null} issueSharesWan - 发行总量（万股）
 * @property {number|null} onlineIssueShares - 网上发行股数
 * @property {number|null} onlineApplyUpper - 网上申购上限（股）
 * @property {number|null} applyAmountUpperWan - 顶格申购市值（万元）
 * @property {string|null} mainBusiness
 * @property {number|null} ldOpenPremium - 首日开盘溢价%
 * @property {number|null} ldCloseChange - 首日收盘涨跌幅%
 * @property {number|null} freezeFundWan - 冻结资金（万元）
 * @property {string|null} ballotNum - 中签率
 * @property {string|null} oversubscription - 超额认购倍数
 */

const ANALYSIS_SCHEMA = {
  version: '1.0',
  boards: {
    main: '沪深主板',
    star: '科创板',
    chinext: '创业板',
    bse: '北交所',
  },
  statusLabels: {
    pending_apply: '待申购',
    applying: '申购中',
    pending_list: '待上市',
    listed: '已上市',
  },
  feasibilityLabels: { high: '高', medium: '中', low: '低', none: '无' },
  verdictLabels: { under: '低估', fair: '合理', over: '高估', uncertain: '不确定' },
  subscriptionChecklist: [
    '发行价与发行市盈率', '行业市盈率对比', '网上申购上限/顶格市值',
    '申购日/缴款日/退款日/中签公布日', '发行总量与网上发行比例',
    '定价方式（询价/直接定价）', '首日开盘溢价与收盘涨跌幅',
    '冻结资金与超额认购倍数', '战略配售与回拨（如有）',
  ],
};

module.exports = { ANALYSIS_SCHEMA };
