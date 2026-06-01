/**
 * A 股 IPO AI 分析脚本
 *
 * 读取 ipo_list.json，合并 analysis.json，生成 HTML 看板。
 *
 * 用法:
 *   node scripts/cn_ipo/analyze_cn_ipo.js
 *   node scripts/cn_ipo/analyze_cn_ipo.js --html
 *
 * 一键流水线:
 *   npm run cn-ipo
 */

const fs = require('fs');
const path = require('path');
const { ANALYSIS_SCHEMA } = require('./analysis_schema');

const PATHS = {
  ipoList: path.join(__dirname, 'data/ipo_list.json'),
  analysis: path.join(__dirname, 'data/analysis.json'),
  outputJson: path.join(__dirname, '../../stock/cleaned_data/cn_ipo_analysis.json'),
  outputHtml: path.join(__dirname, '../../stock/html/cn_ipo_analysis.html'),
};

const BOARD_LABELS = ANALYSIS_SCHEMA.boards;
const STATUS_LABELS = ANALYSIS_SCHEMA.statusLabels;
const FEAS_LABELS = ANALYSIS_SCHEMA.feasibilityLabels;
const VERDICT_LABELS = ANALYSIS_SCHEMA.verdictLabels;

function createPlaceholder(ipo) {
  return {
    id: ipo.id,
    name: ipo.name,
    secuCode: ipo.secuCode,
    board: ipo.board,
    status: ipo.status,
    basic: {
      industry: '待分析',
      boardLabel: ipo.boardLabel,
      businessSummary: ipo.mainBusiness || '待 AI 分析补充',
      sponsor: null,
      underwriter: null,
      expectedListing: ipo.listingDate || '待定',
      financials: null,
    },
    arbitrage: {
      type: '待分析',
      feasibility: 'none',
      expectedPremium: null,
      winRateEstimate: null,
      logic: '待补充',
      strategies: [],
      constraints: [],
    },
    shadowStock: { peers: [], correlation: '待补充', investmentTiming: '待补充', thematicPlay: null },
    valuation: {
      verdict: 'uncertain',
      method: '待分析',
      comparables: [],
      assumptions: [],
      catalysts: [],
      risks: [],
    },
    subscription: ipo.subscription || null,
    cninfoUrl: ipo.cninfoUrl,
    eastmoneyUrl: ipo.eastmoneyUrl,
    summary: '待 AI 分析',
    keyRisks: [],
    score: 0,
    analyzedAt: null,
    analyst: 'placeholder',
  };
}

function mergeAnalysis(ipoData, analysisData) {
  const analysisMap = new Map((analysisData?.companies || []).map((c) => [c.id, c]));
  const ipoMap = new Map(ipoData.companies.map((c) => [c.id, c]));

  // 优先展示已分析 + 待申购/待上市；其余仅保留有 AI 分析记录的
  const ids = new Set([
    ...analysisMap.keys(),
    ...ipoData.companies
      .filter((c) => c.status === 'pending_apply' || c.status === 'pending_list')
      .map((c) => c.id),
  ]);

  const companies = [...ids].map((id) => {
    const ipo = ipoMap.get(id);
    const existing = analysisMap.get(id);
    if (!ipo && existing) {
      return { ...existing, subscription: existing.subscription || null };
    }
    if (!ipo) return null;
    if (existing) {
      return {
        ...existing,
        name: ipo.name,
        secuCode: ipo.secuCode,
        board: ipo.board,
        status: ipo.status,
        cninfoUrl: ipo.cninfoUrl,
        eastmoneyUrl: ipo.eastmoneyUrl,
        basic: {
          ...existing.basic,
          boardLabel: ipo.boardLabel,
          businessSummary: existing.basic?.businessSummary || ipo.mainBusiness || '—',
        },
        subscription: { ...(ipo.subscription || {}), ...(existing.subscription || {}) },
      };
    }
    return createPlaceholder(ipo);
  }).filter(Boolean);

  companies.sort((a, b) => {
    const score = (c) => (c.score || 0) * 10 + (c.status === 'pending_apply' ? 5 : c.status === 'pending_list' ? 3 : 0);
    return score(b) - score(a);
  });

  return {
    meta: {
      ...(analysisData?.meta || {}),
      ipoMeta: ipoData.meta,
      mergedAt: new Date().toISOString(),
      count: companies.length,
    },
    companies,
  };
}

function generateHtml(data) {
  const jsonStr = JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');

  return `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>A 股 IPO 分析看板 — 新股申购</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg: #0a0e17;
      --surface: #111827;
      --surface2: #1a2234;
      --border: #1e293b;
      --text: #e2e8f0;
      --muted: #94a3b8;
      --accent: #f59e0b;
      --accent2: #ef4444;
      --green: #10b981;
      --yellow: #f59e0b;
      --red: #ef4444;
      --sidebar-w: 280px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Noto Sans SC', -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
    }
    .sidebar {
      width: var(--sidebar-w);
      min-width: var(--sidebar-w);
      background: var(--surface);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      height: 100vh;
      position: sticky;
      top: 0;
    }
    .sidebar-header { padding: 20px 16px 12px; border-bottom: 1px solid var(--border); }
    .sidebar-header h1 { font-size: 15px; font-weight: 600; line-height: 1.4; }
    .sidebar-header .sub { font-size: 11px; color: var(--muted); margin-top: 4px; }
    .company-list { flex: 1; overflow-y: auto; padding: 8px; }
    .company-item {
      display: flex; align-items: center; gap: 10px; padding: 10px 12px;
      border-radius: 8px; cursor: pointer; transition: background 0.15s; margin-bottom: 2px;
    }
    .company-item:hover { background: var(--surface2); }
    .company-item.active {
      background: linear-gradient(135deg, rgba(245,158,11,0.15), rgba(239,68,68,0.08));
      border: 1px solid rgba(245,158,11,0.3);
    }
    .score-badge {
      width: 32px; height: 32px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 700; font-family: 'JetBrains Mono', monospace; flex-shrink: 0;
    }
    .score-high { background: rgba(16,185,129,0.15); color: var(--green); }
    .score-mid { background: rgba(245,158,11,0.15); color: var(--yellow); }
    .score-low { background: rgba(239,68,68,0.15); color: var(--red); }
    .company-info { flex: 1; min-width: 0; }
    .company-name { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .company-meta { font-size: 11px; color: var(--muted); margin-top: 2px; }
    .main { flex: 1; overflow-y: auto; height: 100vh; }
    .main-header {
      padding: 24px 32px 16px; border-bottom: 1px solid var(--border);
      background: linear-gradient(180deg, var(--surface) 0%, var(--bg) 100%);
    }
    .main-header h2 { font-size: 22px; font-weight: 700; }
    .tags { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
    .tag {
      font-size: 11px; padding: 3px 10px; border-radius: 20px;
      background: var(--surface2); border: 1px solid var(--border); color: var(--muted);
    }
    .tag.highlight {
      background: rgba(245,158,11,0.1); border-color: rgba(245,158,11,0.3); color: var(--accent);
    }
    .tabs { display: flex; gap: 4px; padding: 16px 32px 0; border-bottom: 1px solid var(--border); flex-wrap: wrap; }
    .tab {
      padding: 10px 20px; font-size: 13px; font-weight: 500; color: var(--muted);
      cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.15s;
      background: none; border-top: none; border-left: none; border-right: none; font-family: inherit;
    }
    .tab:hover { color: var(--text); }
    .tab.active { color: var(--accent); border-bottom-color: var(--accent); }
    .content { padding: 24px 32px 48px; }
    .panel { display: none; }
    .panel.active { display: block; }
    .card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 12px; padding: 20px; margin-bottom: 16px;
    }
    .card-title { font-size: 14px; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
    .card p, .card li { font-size: 13px; line-height: 1.7; color: #cbd5e1; }
    .card ul { padding-left: 18px; }
    .card li { margin-bottom: 6px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 900px) {
      .grid-2 { grid-template-columns: 1fr; }
      .sidebar { width: 100%; min-width: 100%; height: auto; position: relative; }
      body { flex-direction: column; }
    }
    .data-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .data-table th {
      text-align: left; padding: 8px 12px; background: var(--surface2);
      color: var(--muted); font-weight: 500; border-bottom: 1px solid var(--border);
    }
    .data-table td { padding: 8px 12px; border-bottom: 1px solid var(--border); color: #cbd5e1; }
    .data-table tr:hover td { background: rgba(245,158,11,0.04); }
    .mono { font-family: 'JetBrains Mono', monospace; font-size: 11px; }
    .verdict { display: inline-block; padding: 2px 10px; border-radius: 4px; font-size: 12px; font-weight: 600; }
    .verdict-under { background: rgba(16,185,129,0.15); color: var(--green); }
    .verdict-fair { background: rgba(245,158,11,0.15); color: var(--accent); }
    .verdict-over { background: rgba(239,68,68,0.15); color: var(--red); }
    .verdict-uncertain { background: rgba(100,116,139,0.15); color: var(--muted); }
    .feasibility { display: inline-block; padding: 2px 10px; border-radius: 4px; font-size: 12px; font-weight: 600; }
    .feas-high { background: rgba(16,185,129,0.15); color: var(--green); }
    .feas-medium { background: rgba(245,158,11,0.15); color: var(--yellow); }
    .feas-low, .feas-none { background: rgba(100,116,139,0.15); color: var(--muted); }
    .summary-box {
      background: linear-gradient(135deg, rgba(245,158,11,0.08), rgba(239,68,68,0.05));
      border: 1px solid rgba(245,158,11,0.2); border-radius: 12px; padding: 20px; margin-bottom: 16px;
    }
    .summary-box p { font-size: 14px; line-height: 1.8; }
    .risk-list li { color: var(--red); }
    .doc-link { color: var(--accent); text-decoration: none; font-size: 12px; }
    .doc-link:hover { text-decoration: underline; }
    .disclaimer { padding: 16px 32px; font-size: 11px; color: var(--muted); border-top: 1px solid var(--border); line-height: 1.6; }
    .stat-row { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
    .stat-item { background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 12px 16px; min-width: 120px; }
    .stat-label { font-size: 11px; color: var(--muted); margin-bottom: 4px; }
    .stat-value { font-size: 15px; font-weight: 600; }
    .status-pending { color: var(--yellow); }
    .status-listed { color: var(--green); }
    .premium-up { color: var(--green); font-weight: 600; }
    .premium-down { color: var(--red); font-weight: 600; }
  </style>
</head>
<body>
  <aside class="sidebar">
    <div class="sidebar-header">
      <h1>A 股 IPO 分析看板</h1>
      <div class="sub">新股申购 · 打新套利 · 影子股</div>
    </div>
    <div class="company-list" id="companyList"></div>
  </aside>
  <main class="main">
    <div class="main-header">
      <h2 id="companyTitle">—</h2>
      <div class="tags" id="companyTags"></div>
    </div>
    <div class="tabs">
      <button class="tab active" data-tab="overview">综合概览</button>
      <button class="tab" data-tab="subscription">发行申购</button>
      <button class="tab" data-tab="arbitrage">打新套利</button>
      <button class="tab" data-tab="shadow">影子股</button>
      <button class="tab" data-tab="valuation">估值</button>
      <button class="tab" data-tab="docs">公告链接</button>
    </div>
    <div class="content">
      <div class="panel active" id="panel-overview"></div>
      <div class="panel" id="panel-subscription"></div>
      <div class="panel" id="panel-arbitrage"></div>
      <div class="panel" id="panel-shadow"></div>
      <div class="panel" id="panel-valuation"></div>
      <div class="panel" id="panel-docs"></div>
    </div>
    <div class="disclaimer" id="disclaimer"></div>
  </main>
  <script>
    const DATA = ${jsonStr};
    const BOARD_LABELS = ${JSON.stringify(BOARD_LABELS)};
    const STATUS_LABELS = ${JSON.stringify(STATUS_LABELS)};
    const FEAS_LABELS = ${JSON.stringify(FEAS_LABELS)};
    const VERDICT_LABELS = ${JSON.stringify(VERDICT_LABELS)};

    let currentIdx = 0;

    function scoreClass(s) {
      if (s >= 7) return 'score-high';
      if (s >= 5) return 'score-mid';
      return 'score-low';
    }
    function feasClass(f) { return 'feas-' + (f || 'none'); }
    function verdictClass(v) { return 'verdict-' + (v || 'uncertain'); }
    function fmt(v, suffix) { return v != null && v !== '' ? v + (suffix || '') : '—'; }
    function fmtWan(v) { return v != null ? v.toLocaleString('zh-CN') + ' 万' : '—'; }
    function fmtPct(v) {
      if (v == null) return '—';
      const cls = v >= 0 ? 'premium-up' : 'premium-down';
      return '<span class="' + cls + '">' + (v >= 0 ? '+' : '') + v + '%</span>';
    }

    function renderSidebar() {
      const list = document.getElementById('companyList');
      list.innerHTML = DATA.companies.map((c, i) => {
        const sub = c.subscription || {};
        return '<div class="company-item' + (i === currentIdx ? ' active' : '') + '" data-idx="' + i + '">' +
          '<div class="score-badge ' + scoreClass(c.score) + '">' + c.score + '</div>' +
          '<div class="company-info">' +
          '<div class="company-name">' + c.name + '</div>' +
          '<div class="company-meta">' + c.id + ' · ' + (BOARD_LABELS[c.board] || c.board) + ' · ' + (sub.status || STATUS_LABELS[c.status] || c.status) + '</div>' +
          '</div></div>';
      }).join('');
      list.querySelectorAll('.company-item').forEach(el => {
        el.addEventListener('click', () => {
          currentIdx = parseInt(el.dataset.idx, 10);
          renderSidebar();
          renderCompany();
        });
      });
    }

    function renderCompany() {
      const c = DATA.companies[currentIdx];
      const b = c.basic || {};
      const sub = c.subscription || {};

      document.getElementById('companyTitle').textContent = c.name + ' (' + c.id + ')';
      document.getElementById('companyTags').innerHTML = [
        '<span class="tag highlight">' + (b.industry || '') + '</span>',
        '<span class="tag">' + (b.boardLabel || BOARD_LABELS[c.board] || '') + '</span>',
        '<span class="tag">' + (sub.status || STATUS_LABELS[c.status] || c.status) + '</span>',
        sub.issuePrice != null ? '<span class="tag">发行价 ' + sub.issuePrice + ' 元</span>' : '',
        sub.issuePe != null ? '<span class="tag">PE ' + sub.issuePe + 'x</span>' : '',
        '<span class="tag">评分 ' + c.score + '/10</span>',
      ].filter(Boolean).join('');

      renderOverview(c);
      renderSubscription(c);
      renderArbitrage(c);
      renderShadow(c);
      renderValuation(c);
      renderDocs(c);
    }

    function renderOverview(c) {
      const b = c.basic || {};
      const f = b.financials;
      let html = '<div class="summary-box"><p>' + (c.summary || '') + '</p></div>';
      html += '<div class="stat-row">';
      if (f) {
        html += statItem('营收', f.revenue || '—');
        html += statItem('净利润', f.netProfit || '—');
        html += statItem('毛利率', f.grossMargin || '—');
        html += statItem('增速', f.revenueGrowth || '—');
      }
      html += statItem('综合评分', c.score + ' / 10');
      html += '</div>';
      html += '<div class="grid-2">';
      html += '<div class="card"><div class="card-title"><span class="icon">📋</span> 业务概要</div><p>' + (b.businessSummary || '—') + '</p></div>';
      html += '<div class="card"><div class="card-title"><span class="icon">⚠️</span> 核心风险</div><ul class="risk-list">' +
        (c.keyRisks || []).map(r => '<li>' + r + '</li>').join('') + '</ul></div>';
      html += '</div>';
      html += '<div class="card"><div class="card-title"><span class="icon">ℹ️</span> 基本信息</div><table class="data-table"><tbody>';
      html += row('行业', b.industry);
      html += row('板块', b.boardLabel || BOARD_LABELS[c.board]);
      html += row('证券代码', c.secuCode || c.id);
      html += row('保荐机构', b.sponsor || '—');
      html += row('主承销商', b.underwriter || '—');
      html += row('预期上市', b.expectedListing || '—');
      html += row('分析时间', c.analyzedAt ? c.analyzedAt.slice(0, 10) : '—');
      html += '</tbody></table></div>';
      document.getElementById('panel-overview').innerHTML = html;
    }

    function renderSubscription(c) {
      const s = c.subscription;
      if (!s) {
        document.getElementById('panel-subscription').innerHTML = '<div class="card"><p>暂无发行申购数据，请先运行 fetch_cn_ipo_list.js</p></div>';
        return;
      }

      let html = '<div class="stat-row">';
      html += statItem('状态', s.status || '—');
      html += statItem('发行价', fmt(s.issuePrice, ' 元'));
      html += statItem('发行 PE', s.issuePe != null ? s.issuePe + 'x' : '—');
      html += statItem('行业 PE', s.industryPe != null ? s.industryPe + 'x' : '—');
      html += statItem('顶格市值', fmtWan(s.applyAmountUpperWan));
      html += statItem('发行总量', s.issueSharesWan != null ? s.issueSharesWan + ' 万股' : '—');
      if (s.ldOpenPremium != null) html += statItem('首日开盘溢价', fmtPct(s.ldOpenPremium));
      if (s.ldCloseChange != null) html += statItem('首日收盘涨跌', fmtPct(s.ldCloseChange));
      html += '</div>';

      html += '<div class="grid-2">';
      html += '<div class="card"><div class="card-title"><span class="icon">💵</span> 定价与规模</div><table class="data-table"><tbody>';
      html += row('定价方式', s.priceMethod);
      html += row('发行价', fmt(s.issuePrice, ' 元'));
      html += row('发行市盈率', s.issuePe != null ? s.issuePe + 'x' : '—');
      html += row('行业市盈率', s.industryPe != null ? s.industryPe + 'x' : '—');
      html += row('发行总量', s.issueSharesWan != null ? s.issueSharesWan + ' 万股' : '—');
      html += row('网上发行股数', s.onlineIssueShares != null ? s.onlineIssueShares.toLocaleString('zh-CN') + ' 股' : '—');
      html += row('网上申购上限', s.onlineApplyUpper != null ? s.onlineApplyUpper.toLocaleString('zh-CN') + ' 股' : '—');
      html += row('顶格申购市值', fmtWan(s.applyAmountUpperWan));
      html += row('主营业务', s.mainBusiness);
      html += row('注册制', s.isRegistration ? '是' : '否');
      html += '</tbody></table></div>';

      html += '<div class="card"><div class="card-title"><span class="icon">📅</span> 关键日期</div><table class="data-table"><tbody>';
      html += row('申购日', s.applyDate);
      html += row('缴款日', s.onlinePayDate);
      html += row('退款日', s.onlineRefundDate);
      html += row('中签号公布', s.ballotDate);
      html += row('上市日', s.listingDate || '待定');
      html += '</tbody></table></div>';
      html += '</div>';

      if (s.status === '已上市' || s.ldOpenPremium != null) {
        html += '<div class="card"><div class="card-title"><span class="icon">📈</span> 上市表现</div><table class="data-table"><tbody>';
        html += row('开盘价', fmt(s.openPrice, ' 元'));
        html += row('收盘价', fmt(s.closePrice, ' 元'));
        html += row('首日开盘溢价', s.ldOpenPremium != null ? s.ldOpenPremium + '%' : '—');
        html += row('首日收盘涨跌', s.ldCloseChange != null ? s.ldCloseChange + '%' : '—');
        html += row('首日最高涨幅', s.ldHighChange != null ? s.ldHighChange + '%' : '—');
        html += row('中签率', s.ballotNum || '—');
        html += row('超额认购', s.oversubscription || '—');
        html += row('冻结资金', fmtWan(s.freezeFundWan));
        html += '</tbody></table></div>';
      }

      html += '<div class="card"><div class="card-title"><span class="icon">📝</span> 数据来源</div>';
      html += '<p>东方财富 datacenter · RPTA_APP_IPOAPPLY · 更新于 ' + (DATA.meta.ipoMeta?.fetchedAt?.slice(0, 10) || '—') + '</p></div>';

      document.getElementById('panel-subscription').innerHTML = html;
    }

    function renderArbitrage(c) {
      const a = c.arbitrage || {};
      let html = '<div class="card">';
      html += '<div class="card-title"><span class="icon">🎯</span> 打新套利分析 ';
      html += '<span class="feasibility ' + feasClass(a.feasibility) + '">' + (FEAS_LABELS[a.feasibility] || a.feasibility) + '可行性</span></div>';
      html += '<table class="data-table" style="margin-bottom:16px"><tbody>';
      html += row('套利类型', a.type);
      html += row('预期首日溢价', a.expectedPremium || '—');
      html += row('中签率/热度', a.winRateEstimate || '—');
      html += '</tbody></table>';
      html += '<p style="margin-bottom:12px">' + (a.logic || '') + '</p>';
      if (a.strategies && a.strategies.length) {
        html += '<div class="card-title" style="margin-top:16px">策略建议</div><ul>';
        html += a.strategies.map(s => '<li>' + s + '</li>').join('');
        html += '</ul>';
      }
      if (a.constraints && a.constraints.length) {
        html += '<div class="card-title" style="margin-top:16px">限制因素</div><ul>';
        html += a.constraints.map(s => '<li>' + s + '</li>').join('');
        html += '</ul>';
      }
      html += '</div>';
      document.getElementById('panel-arbitrage').innerHTML = html;
    }

    function renderShadow(c) {
      const s = c.shadowStock || {};
      let html = '';
      if (s.peers && s.peers.length) {
        html += '<div class="card"><div class="card-title"><span class="icon">🔗</span> 可比 / 影子股</div>';
        html += '<table class="data-table"><thead><tr>';
        html += '<th>公司</th><th>代码</th><th>市场</th><th>关联度</th><th>PE</th><th>PS</th><th>市值</th><th>备注</th>';
        html += '</tr></thead><tbody>';
        s.peers.forEach(p => {
          html += '<tr><td><b>' + p.name + '</b></td><td class="mono">' + p.code + '</td><td>' + p.market + '</td>';
          html += '<td>' + p.relevance + '</td><td>' + (p.pe || '—') + '</td><td>' + (p.ps || '—') + '</td>';
          html += '<td>' + (p.marketCap || '—') + '</td><td style="max-width:200px">' + (p.note || '') + '</td></tr>';
        });
        html += '</tbody></table></div>';
      }
      html += '<div class="grid-2">';
      html += '<div class="card"><div class="card-title"><span class="icon">📈</span> 联动逻辑</div><p>' + (s.correlation || '—') + '</p></div>';
      html += '<div class="card"><div class="card-title"><span class="icon">⏰</span> 投资时点</div><p>' + (s.investmentTiming || '—') + '</p></div>';
      html += '</div>';
      if (s.thematicPlay) {
        html += '<div class="card"><div class="card-title"><span class="icon">🎯</span> 主题逻辑</div><p>' + s.thematicPlay + '</p></div>';
      }
      document.getElementById('panel-shadow').innerHTML = html;
    }

    function renderValuation(c) {
      const v = c.valuation || {};
      let html = '<div class="card">';
      html += '<div class="card-title"><span class="icon">💰</span> 估值分析 ';
      html += '<span class="verdict ' + verdictClass(v.verdict) + '">' + (VERDICT_LABELS[v.verdict] || v.verdict) + '</span></div>';
      html += '<div class="stat-row">';
      html += statItem('发行价', v.priceRange || '待公布');
      html += statItem('市值区间', v.marketCapRange || '—');
      html += statItem('隐含 PE', v.impliedPe || 'N/A');
      html += statItem('隐含 PS', v.impliedPs || 'N/A');
      html += statItem('合理价值', v.fairValueRange || '—');
      html += statItem('估值方法', v.method || '—');
      html += '</div>';
      if (v.comparables && v.comparables.length) {
        html += '<table class="data-table" style="margin:16px 0"><thead><tr>';
        html += '<th>指标</th><th>同业中位数</th><th>IPO 隐含</th><th>评论</th>';
        html += '</tr></thead><tbody>';
        v.comparables.forEach(cmp => {
          html += '<tr><td>' + cmp.metric + '</td><td>' + cmp.peerMedian + '</td>';
          html += '<td>' + cmp.ipoImplied + '</td><td>' + cmp.comment + '</td></tr>';
        });
        html += '</tbody></table>';
      }
      html += '<div class="grid-2" style="margin-top:16px">';
      if (v.catalysts && v.catalysts.length) {
        html += '<div><div class="card-title">催化因素</div><ul>' + v.catalysts.map(x => '<li>' + x + '</li>').join('') + '</ul></div>';
      }
      if (v.risks && v.risks.length) {
        html += '<div><div class="card-title">估值风险</div><ul class="risk-list">' + v.risks.map(x => '<li>' + x + '</li>').join('') + '</ul></div>';
      }
      html += '</div>';
      if (v.assumptions && v.assumptions.length) {
        html += '<div class="card-title" style="margin-top:16px">关键假设</div><ul>';
        html += v.assumptions.map(x => '<li>' + x + '</li>').join('');
        html += '</ul>';
      }
      html += '</div>';
      document.getElementById('panel-valuation').innerHTML = html;
    }

    function renderDocs(c) {
      let html = '<div class="card"><div class="card-title"><span class="icon">📄</span> 公告与数据源</div>';
      html += '<table class="data-table"><tbody>';
      html += row('巨潮资讯', c.cninfoUrl ? '<a class="doc-link" href="' + c.cninfoUrl + '" target="_blank">公司公告页</a>' : '—');
      html += row('东方财富新股', c.eastmoneyUrl ? '<a class="doc-link" href="' + c.eastmoneyUrl + '" target="_blank">新股详情</a>' : '—');
      if (c.subscription && c.subscription.infoCode) {
        html += row('发行公告', '<a class="doc-link" href="https://data.eastmoney.com/notices/detail/' + c.id + '/' + c.subscription.infoCode + '.html" target="_blank">' + c.subscription.infoCode + '</a>');
      }
      html += '</tbody></table></div>';
      html += '<div class="card"><div class="card-title"><span class="icon">📚</span> 招股说明书</div>';
      html += '<p>可在巨潮资讯搜索「' + c.name + ' 招股说明书」下载 PDF。后续版本将支持自动下载与解析。</p></div>';
      document.getElementById('panel-docs').innerHTML = html;
    }

    function statItem(label, value) {
      return '<div class="stat-item"><div class="stat-label">' + label + '</div><div class="stat-value">' + value + '</div></div>';
    }
    function row(label, value) {
      return '<tr><td style="color:var(--muted);width:140px">' + label + '</td><td>' + (value || '—') + '</td></tr>';
    }

    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
      });
    });

    document.getElementById('disclaimer').textContent = DATA.meta.disclaimer || '';
    renderSidebar();
    renderCompany();
  </script>
</body>
</html>`;
}

function main() {
  const htmlOnly = process.argv.includes('--html');

  if (!htmlOnly) {
    if (!fs.existsSync(PATHS.ipoList)) {
      console.error('❌ 请先运行 fetch_cn_ipo_list.js 拉取新股列表');
      process.exit(1);
    }
    const ipoData = JSON.parse(fs.readFileSync(PATHS.ipoList, 'utf-8'));
    let analysisData = { meta: {}, companies: [] };
    if (fs.existsSync(PATHS.analysis)) {
      analysisData = JSON.parse(fs.readFileSync(PATHS.analysis, 'utf-8'));
    }
    const merged = mergeAnalysis(ipoData, analysisData);

    fs.mkdirSync(path.dirname(PATHS.outputJson), { recursive: true });
    fs.writeFileSync(PATHS.outputJson, JSON.stringify(merged, null, 2), 'utf-8');
    console.log('💾 已合并分析数据: ' + PATHS.outputJson);

    const html = generateHtml(merged);
    fs.writeFileSync(PATHS.outputHtml, html, 'utf-8');
    console.log('🌐 已生成 HTML: ' + PATHS.outputHtml);
  } else {
    if (!fs.existsSync(PATHS.outputJson)) {
      console.error('❌ 请先运行 analyze_cn_ipo.js 生成 JSON');
      process.exit(1);
    }
    const data = JSON.parse(fs.readFileSync(PATHS.outputJson, 'utf-8'));
    fs.writeFileSync(PATHS.outputHtml, generateHtml(data), 'utf-8');
    console.log('🌐 已重新生成 HTML: ' + PATHS.outputHtml);
  }

  console.log('✅ 完成，在浏览器打开 stock/html/cn_ipo_analysis.html');
}

main();
