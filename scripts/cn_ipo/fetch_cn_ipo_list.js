/**
 * A 股新股申购/上市列表拉取
 * 数据源：东方财富 datacenter RPTA_APP_IPOAPPLY
 * https://data.eastmoney.com/xg/xg/default.html
 *
 * 用法:
 *   node scripts/cn_ipo/fetch_cn_ipo_list.js
 *   node scripts/cn_ipo/fetch_cn_ipo_list.js --days 180
 *   node scripts/cn_ipo/fetch_cn_ipo_list.js --all
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const PATHS = require('./paths');

const CONFIG = {
  API:
    'https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPTA_APP_IPOAPPLY&columns=ALL&pageNumber={page}&pageSize=50&sortColumns=APPLY_DATE&sortTypes=-1',
  DATA_DIR: PATHS.DATA_DIR,
  HISTORY_DIR: PATHS.HISTORY_DIR,
  HEADERS: {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Referer: 'https://data.eastmoney.com/xg/xg/default.html',
  },
  DEFAULT_DAYS: 120,
};

function parseArgs() {
  const args = process.argv.slice(2);
  const params = { days: CONFIG.DEFAULT_DAYS, all: false, history: true };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--days') params.days = parseInt(args[++i], 10) || CONFIG.DEFAULT_DAYS;
    else if (args[i] === '--all') params.all = true;
    else if (args[i] === '--no-history') params.history = false;
    else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
A 股新股列表拉取

用法:
  node scripts/cn_ipo/fetch_cn_ipo_list.js [--days 120] [--all] [--no-history]
`);
      process.exit(0);
    }
  }
  return params;
}

function httpGet(url) {
  const headerArgs = Object.entries(CONFIG.HEADERS).flatMap(([k, v]) => ['-H', `${k}: ${v}`]);
  const body = execFileSync(
    'curl',
    ['-sL', '--max-time', '60', '-A', CONFIG.HEADERS['User-Agent'], ...headerArgs, url],
    { encoding: 'utf-8', maxBuffer: 20 * 1024 * 1024 }
  );
  return JSON.parse(body);
}

function detectBoard(code) {
  const c = String(code);
  if (/^688|^689/.test(c)) return 'star';
  if (/^30[01]/.test(c)) return 'chinext';
  if (/^920/.test(c)) return 'bse';
  return 'main';
}

function boardLabel(board) {
  return { main: '沪深主板', star: '科创板', chinext: '创业板', bse: '北交所' }[board] || board;
}

function fmtDate(v) {
  if (!v) return null;
  return String(v).slice(0, 10);
}

function detectStatus(row, today) {
  const apply = fmtDate(row.APPLY_DATE);
  const listing = fmtDate(row.LISTING_DATE);
  if (listing && listing <= today) return 'listed';
  if (apply && apply > today) return 'pending_apply';
  if (apply && apply <= today && !listing) return 'pending_list';
  if (apply && apply <= today && listing && listing > today) return 'pending_list';
  return 'pending_list';
}

function statusLabel(status) {
  return {
    pending_apply: '待申购',
    applying: '申购中',
    pending_list: '待上市',
    listed: '已上市',
  }[status] || status;
}

function wan(val) {
  if (val == null || val === '') return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

function buildSubscription(row, status) {
  return {
    status: statusLabel(status),
    issuePrice: wan(row.ISSUE_PRICE),
    priceMethod: row.PRICE_WAY || row.ISSUE_WAY_EXPLAIN || null,
    issuePe: wan(row.AFTER_ISSUE_PE),
    industryPe: wan(row.INDUSTRY_PE_NEW || row.INDUSTRY_PE),
    applyDate: fmtDate(row.APPLY_DATE),
    listingDate: fmtDate(row.LISTING_DATE),
    ballotDate: fmtDate(row.BALLOT_NUM_DATE || row.RESULT_NOTICE_DATE),
    onlinePayDate: fmtDate(row.ONLINE_PAY_DATE),
    onlineRefundDate: fmtDate(row.ONLINE_REFUND_DATE),
    issueSharesWan: wan(row.TOTAL_ISSUE_NUM || row.ISSUE_NUM),
    onlineIssueShares: wan(row.ONLINE_ISSUE_NUM),
    onlineApplyUpper: wan(row.ONLINE_APPLY_UPPER),
    onlineApplyLower: wan(row.ONLINE_APPLY_LOWER),
    applyAmountUpperWan: wan(row.APPLY_AMT_UPPER || row.TOP_APPLY_MARKETCAP),
    mainBusiness: row.MAIN_BUSINESS || null,
    ldOpenPremium: wan(row.LD_OPEN_PREMIUM),
    ldCloseChange: wan(row.LD_CLOSE_CHANGE),
    ldHighChange: wan(row.LD_HIGH_CHANG),
    openPrice: wan(row.OPEN_PRICE),
    closePrice: wan(row.CLOSE_PRICE),
    freezeFundWan: row.FREEZE_FUND != null ? wan(row.FREEZE_FUND) / 10000 : null,
    ballotNum: row.BALLOT_NUM != null ? String(row.BALLOT_NUM) : null,
    oversubscription: row.ONLINE_ES_MULTIPLE != null ? String(row.ONLINE_ES_MULTIPLE) : null,
    recommendOrg: row.RECOMMEND_ORG || null,
    underwriterOrg: row.UNDERWRITER_ORG || null,
    isRegistration: row.IS_REGISTRATION_NEW === '1' || row.IS_REGISTRATION === '1',
    infoCode: row.INFO_CODE || null,
    _source: 'eastmoney_RPTA_APP_IPOAPPLY',
  };
}

function normalizeRow(row, today) {
  const code = row.SECURITY_CODE;
  const board = detectBoard(code);
  const status = detectStatus(row, today);
  const secuCode = row.SECUCODE || `${code}.${board === 'bse' ? 'BJ' : board === 'star' ? 'SH' : /^6/.test(code) ? 'SH' : 'SZ'}`;

  return {
    id: code,
    name: row.SECURITY_NAME || row.SECURITY_NAME_ABBR,
    secuCode,
    board,
    boardLabel: boardLabel(board),
    market: row.TRADE_MARKET || row.MARKET_TYPE_NEW,
    status,
    statusLabel: statusLabel(status),
    applyDate: fmtDate(row.APPLY_DATE),
    listingDate: fmtDate(row.LISTING_DATE),
    issuePrice: wan(row.ISSUE_PRICE),
    issuePe: wan(row.AFTER_ISSUE_PE),
    industryPe: wan(row.INDUSTRY_PE_NEW),
    mainBusiness: row.MAIN_BUSINESS || null,
    orgCode: row.ORG_CODE || null,
    infoCode: row.INFO_CODE || null,
    cninfoUrl: `https://www.cninfo.com.cn/new/disclosure/stock?stockCode=${code}${row.ORG_CODE ? `&orgId=${row.ORG_CODE}` : ''}`,
    eastmoneyUrl: `https://data.eastmoney.com/xg/xg/detail/${code}.html`,
    subscription: buildSubscription(row, status),
    raw: {
      SECURITY_INNER_CODE: row.SECURITY_INNER_CODE,
      NETSUMFINA: row.NETSUMFINA,
      DEC_SUMFINA: row.DEC_SUMFINA,
    },
  };
}

async function fetchAllRows(params, today) {
  const rows = [];
  let page = 1;
  let totalPages = 1;
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - (params.all ? 3650 : params.days));
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  while (page <= totalPages) {
    const url = CONFIG.API.replace('{page}', page);
    const json = httpGet(url);
    if (!json.success) throw new Error(json.message || '东方财富 API 失败');

    const result = json.result || {};
    totalPages = result.pages || 1;
    const data = result.data || [];
    rows.push(...data);
    console.log(`  第 ${page}/${totalPages} 页，本页 ${data.length} 条，累计 ${rows.length} 条`);

    const oldestApply = data.length ? String(data[data.length - 1].APPLY_DATE || '').slice(0, 10) : '';
    if (!params.all && oldestApply && oldestApply < cutoffStr) {
      console.log(`  已到达日期 cutoff（${cutoffStr}），停止分页`);
      break;
    }

    page += 1;
    if (page <= totalPages) await new Promise((r) => setTimeout(r, 300));
  }
  return rows;
}

function filterRows(rows, params, today) {
  if (params.all) return rows;
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - params.days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  return rows.filter((row) => {
    const apply = fmtDate(row.APPLY_DATE);
    const listing = fmtDate(row.LISTING_DATE);
    if (!apply) return false;
    if (apply >= cutoffStr) return true;
    if (!listing || listing >= cutoffStr) return true;
    return false;
  });
}

async function main() {
  const params = parseArgs();
  const today = new Date().toISOString().slice(0, 10);

  console.log('📡 拉取 A 股新股列表（东方财富）...');
  const allRows = await fetchAllRows(params, today);
  const filtered = filterRows(allRows, params, today);
  const companies = filtered.map((row) => normalizeRow(row, today));

  const output = {
    meta: {
      source: 'eastmoney_RPTA_APP_IPOAPPLY',
      fetchedAt: new Date().toISOString(),
      today,
      filterDays: params.all ? null : params.days,
      totalFromApi: allRows.length,
      count: companies.length,
    },
    companies,
  };

  fs.mkdirSync(CONFIG.DATA_DIR, { recursive: true });
  const outPath = path.join(CONFIG.DATA_DIR, 'ipo_list.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`✅ 已保存 ${companies.length} 条 → ${outPath}`);

  const byStatus = {};
  companies.forEach((c) => {
    byStatus[c.status] = (byStatus[c.status] || 0) + 1;
  });
  console.log('   状态分布:', byStatus);

  if (params.history) {
    fs.mkdirSync(CONFIG.HISTORY_DIR, { recursive: true });
    const histPath = path.join(CONFIG.HISTORY_DIR, `ipo_list_${today}.json`);
    fs.writeFileSync(histPath, JSON.stringify(output, null, 2), 'utf-8');
    console.log(`📁 历史快照: ${histPath}`);
  }
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
