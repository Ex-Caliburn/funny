/**
 * 港股 IPO AI 分析脚本
 *
 * 读取 active_ap-phip 列表，合并/更新 analysis.json，并生成 HTML 展示页。
 *
 * 用法:
 *   node scripts/hk_ipo/analyze_hk_ipo.js           # 合并列表 + 生成 HTML
 *   node scripts/hk_ipo/analyze_hk_ipo.js --html    # 仅重新生成 HTML
 *   node scripts/hk_ipo/analyze_hk_ipo.js --fetch-ah # 先拉取 A/H 折价再合并
 *   node scripts/hk_ipo/analyze_hk_ipo.js --fetch-offering # 先解析 PHIP 招股详情
 *
 * 一键流水线（推荐）:
 *   npm run hk-ipo
 *   node scripts/hk_ipo/run_hk_ipo_pipeline.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const PATHS = require('./paths');
const { getOfferingProfiles, reloadOfferingProfiles, TIER_LABELS } = require('./offering_profiles');

/**
 * 合并 A/H 折价数据
 */
function mergeAhSpread(companies, ahData) {
  if (!ahData?.companies?.length) return companies;
  const ahMap = new Map(ahData.companies.map((c) => [c.companyId, c]));

  return companies.map((c) => {
    const ah = ahMap.get(c.id);
    if (!ah || ah.error) return c;

    const ahSpread = {
      isAh: true,
      aShareCode: ah.aShareCode,
      hShareCode: ah.hShareCode,
      aShare: ah.aShare,
      hShare: ah.hShare,
      exchangeRate: ah.exchangeRate,
      spread: ah.spread,
      summary: ah.summary,
      dataSources: ah.dataSources,
      prospectus: ah.prospectus,
      calculatedAt: ah.calculatedAt,
    };

    const offering = c.offering
      ? {
          ...c.offering,
          ahDiscount: `H股折价 ${ah.spread.hDiscountPct}%（A/H溢价 ${ah.spread.ahPremiumPct}%）`,
        }
      : c.offering;

    const arbitrage = c.arbitrage
      ? {
          ...c.arbitrage,
          ahPremium: `${ah.spread.ahPremiumPct}%`,
          spreadEstimate: ah.summary,
        }
      : c.arbitrage;

    return { ...c, ahSpread, offering, arbitrage };
  });
}

/**
 * 读取已上市 ID 集合，用于标记 listingStatus
 */
function loadListedIds() {
  try {
    if (!fs.existsSync(PATHS.listed)) return new Set();
    const data = JSON.parse(fs.readFileSync(PATHS.listed, 'utf-8'));
    return new Set((data.applicants || []).map((a) => a.id));
  } catch {
    return new Set();
  }
}

function resolveListingStatus(app, listedIds) {
  if (app.stockCode || app.status === 'LT' || listedIds.has(app.id)) return 'listed';
  return 'pending';
}

/**
 * 合并 IPO 列表与已有分析，保留分析内容、更新基础字段
 */
function mergeAnalysis(ipoData, analysisData) {
  const analysisMap = new Map((analysisData?.companies || []).map((c) => [c.id, c]));
  const offeringProfiles = getOfferingProfiles();
  const listedIds = loadListedIds();

  const companies = ipoData.applicants.map((app) => {
    const listingStatus = resolveListingStatus(app, listedIds);
    const existing = analysisMap.get(app.id);
    if (existing) {
      const offering = offeringProfiles[app.id] || existing.offering || null;
      const basic =
        offering?.financials && existing.basic
          ? { ...existing.basic, financials: offering.financials }
          : existing.basic;

      return {
        ...existing,
        name: app.name,
        postingDate: app.postingDate,
        stockCode: app.stockCode || existing.stockCode,
        status: app.status,
        statusLabel: app.statusLabel,
        listingStatus,
        documents: app.documents,
        warningStatementUrl: app.warningStatementUrl,
        hasPhip: app.hasPhip,
        basic,
        offering,
      };
    }
    return {
      ...createPlaceholderAnalysis(app, offeringProfiles),
      status: app.status,
      statusLabel: app.statusLabel,
      listingStatus,
    };
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

/**
 * 为尚未分析的公司创建占位结构
 */
function createPlaceholderAnalysis(app, offeringProfiles) {
  const profiles = offeringProfiles || getOfferingProfiles();
  return {
    id: app.id,
    name: app.name,
    stockCode: app.stockCode,
    postingDate: app.postingDate,
    documents: app.documents,
    warningStatementUrl: app.warningStatementUrl,
    hasPhip: app.hasPhip,
    basic: {
      industry: '待分析',
      listingType: app.name.includes('- B') ? '18A' : 'main',
      businessSummary: '待 AI 分析补充',
      aShareCode: null,
      sponsor: null,
      expectedListing: null,
      financials: null,
    },
    arbitrage: { type: '待分析', feasibility: 'none', logic: '待补充', strategies: [], constraints: [] },
    shadowStock: { peers: [], correlation: '待补充', investmentTiming: '待补充', thematicPlay: null },
    valuation: { verdict: 'uncertain', method: '待分析', comparables: [], assumptions: [], catalysts: [], risks: [] },
    offering: profiles[app.id] || null,
    summary: '待 AI 分析',
    keyRisks: [],
    score: 0,
    analyzedAt: null,
    analyst: 'placeholder',
  };
}

/**
 * 生成 HTML 展示页
 */
function generateHtml(data) {
  const jsonStr = JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');

  return `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>港股 IPO 分析看板 — 聆讯后资料集</title>
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
      --accent: #3b82f6;
      --accent2: #6366f1;
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

    /* Sidebar */
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
    .sidebar-header {
      padding: 20px 16px 12px;
      border-bottom: 1px solid var(--border);
    }
    .sidebar-header h1 {
      font-size: 15px;
      font-weight: 600;
      line-height: 1.4;
      color: var(--text);
    }
    .sidebar-header .sub {
      font-size: 11px;
      color: var(--muted);
      margin-top: 4px;
    }
    .company-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }
    .company-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.15s;
      margin-bottom: 2px;
    }
    .company-item:hover { background: var(--surface2); }
    .company-item.active {
      background: linear-gradient(135deg, rgba(59,130,246,0.15), rgba(99,102,241,0.1));
      border: 1px solid rgba(59,130,246,0.3);
    }
    .score-badge {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
      flex-shrink: 0;
    }
    .score-high { background: rgba(16,185,129,0.15); color: var(--green); }
    .score-mid { background: rgba(245,158,11,0.15); color: var(--yellow); }
    .score-low { background: rgba(239,68,68,0.15); color: var(--red); }
    .company-info { flex: 1; min-width: 0; }
    .company-name {
      font-size: 13px;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .company-meta {
      font-size: 11px;
      color: var(--muted);
      margin-top: 2px;
    }

    /* Main */
    .main {
      flex: 1;
      overflow-y: auto;
      height: 100vh;
    }
    .main-header {
      padding: 24px 32px 16px;
      border-bottom: 1px solid var(--border);
      background: linear-gradient(180deg, var(--surface) 0%, var(--bg) 100%);
    }
    .main-header h2 {
      font-size: 22px;
      font-weight: 700;
    }
    .tags {
      display: flex;
      gap: 8px;
      margin-top: 10px;
      flex-wrap: wrap;
    }
    .tag {
      font-size: 11px;
      padding: 3px 10px;
      border-radius: 20px;
      background: var(--surface2);
      border: 1px solid var(--border);
      color: var(--muted);
    }
    .tag.highlight {
      background: rgba(59,130,246,0.1);
      border-color: rgba(59,130,246,0.3);
      color: var(--accent);
    }

    /* Tabs */
    .tabs {
      display: flex;
      gap: 4px;
      padding: 16px 32px 0;
      border-bottom: 1px solid var(--border);
    }
    .tab {
      padding: 10px 20px;
      font-size: 13px;
      font-weight: 500;
      color: var(--muted);
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.15s;
      background: none;
      border-top: none;
      border-left: none;
      border-right: none;
      font-family: inherit;
    }
    .tab:hover { color: var(--text); }
    .tab.active {
      color: var(--accent);
      border-bottom-color: var(--accent);
    }

    /* Content */
    .content { padding: 24px 32px 48px; }
    .panel { display: none; }
    .panel.active { display: block; }

    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .card-title {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .card-title .icon { font-size: 16px; }
    .card p, .card li {
      font-size: 13px;
      line-height: 1.7;
      color: #cbd5e1;
    }
    .card ul { padding-left: 18px; }
    .card li { margin-bottom: 6px; }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    @media (max-width: 900px) {
      .grid-2 { grid-template-columns: 1fr; }
      .sidebar { width: 100%; min-width: 100%; height: auto; position: relative; }
      body { flex-direction: column; }
    }

    /* Table */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .data-table th {
      text-align: left;
      padding: 8px 12px;
      background: var(--surface2);
      color: var(--muted);
      font-weight: 500;
      border-bottom: 1px solid var(--border);
    }
    .data-table td {
      padding: 8px 12px;
      border-bottom: 1px solid var(--border);
      color: #cbd5e1;
    }
    .data-table tr:hover td { background: rgba(59,130,246,0.04); }
    .mono { font-family: 'JetBrains Mono', monospace; font-size: 11px; }

    /* Verdict badges */
    .verdict {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
    .verdict-under { background: rgba(16,185,129,0.15); color: var(--green); }
    .verdict-fair { background: rgba(59,130,246,0.15); color: var(--accent); }
    .verdict-over { background: rgba(239,68,68,0.15); color: var(--red); }
    .verdict-uncertain { background: rgba(245,158,11,0.15); color: var(--yellow); }

    .feasibility {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
    .feas-high { background: rgba(16,185,129,0.15); color: var(--green); }
    .feas-medium { background: rgba(245,158,11,0.15); color: var(--yellow); }
    .feas-low, .feas-none { background: rgba(100,116,139,0.15); color: var(--muted); }

    .summary-box {
      background: linear-gradient(135deg, rgba(59,130,246,0.08), rgba(99,102,241,0.05));
      border: 1px solid rgba(59,130,246,0.2);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .summary-box p { font-size: 14px; line-height: 1.8; }

    .risk-list li { color: var(--red); }
    .risk-list li::marker { color: var(--red); }

    .doc-link {
      color: var(--accent);
      text-decoration: none;
      font-size: 12px;
    }
    .doc-link:hover { text-decoration: underline; }

    .disclaimer {
      padding: 16px 32px;
      font-size: 11px;
      color: var(--muted);
      border-top: 1px solid var(--border);
      line-height: 1.6;
    }

    .stat-row {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      margin-bottom: 16px;
    }
    .stat-item {
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px 16px;
      min-width: 140px;
    }
    .stat-label { font-size: 11px; color: var(--muted); }
    .stat-value { font-size: 16px; font-weight: 600; margin-top: 4px; font-family: 'JetBrains Mono', monospace; }

    .tier-sovereign { color: #fbbf24; }
    .tier-top_tier { color: var(--accent); }
    .tier-well_known { color: var(--green); }
    .tier-general { color: var(--muted); }
    .badge-yes { background: rgba(16,185,129,0.15); color: var(--green); padding: 2px 8px; border-radius: 4px; font-size: 11px; }
    .badge-no { background: rgba(239,68,68,0.15); color: var(--red); padding: 2px 8px; border-radius: 4px; font-size: 11px; }
    .badge-pending { background: rgba(100,116,139,0.15); color: var(--muted); padding: 2px 8px; border-radius: 4px; font-size: 11px; }
    .ah-highlight { color: var(--green); font-weight: 600; }
    .ah-premium { color: var(--yellow); font-weight: 600; }
    .source-link { color: var(--accent); font-size: 11px; word-break: break-all; }
    .filter-bar {
      display: flex; flex-wrap: wrap; gap: 6px;
      padding: 10px 12px 8px; border-bottom: 1px solid var(--border);
    }
    .filter-btn {
      font-size: 11px; padding: 4px 10px; border-radius: 20px;
      border: 1px solid var(--border); background: var(--surface2);
      color: var(--muted); cursor: pointer; font-family: inherit;
      transition: all 0.15s;
    }
    .filter-btn:hover { color: var(--text); border-color: rgba(59,130,246,0.4); }
    .filter-btn.active {
      background: rgba(59,130,246,0.15); border-color: rgba(59,130,246,0.45);
      color: var(--accent); font-weight: 600;
    }
    .empty-hint {
      padding: 24px 16px; font-size: 12px; color: var(--muted); text-align: center; line-height: 1.6;
    }
  </style>
</head>
<body>
  <aside class="sidebar">
    <div class="sidebar-header">
      <h1>港股 IPO 分析看板</h1>
      <div class="sub" id="sidebarSub">主板 · 处理中 · 聆讯后资料集</div>
    </div>
    <div class="filter-bar" id="filterBar">
      <button class="filter-btn active" data-filter="unlisted">未上市</button>
      <button class="filter-btn" data-filter="listed">已上市</button>
      <button class="filter-btn" data-filter="all">全部</button>
    </div>
    <div class="company-list" id="companyList"></div>
  </aside>

  <main class="main">
    <div class="main-header" id="mainHeader">
      <h2 id="companyTitle">—</h2>
      <div class="tags" id="companyTags"></div>
    </div>

    <div class="tabs">
      <button class="tab active" data-tab="overview">综合概览</button>
      <button class="tab" data-tab="offering">招股详情</button>
      <button class="tab" data-tab="arbitrage">套利分析</button>
      <button class="tab" data-tab="shadow">影子股分析</button>
      <button class="tab" data-tab="valuation">估值分析</button>
      <button class="tab" data-tab="docs">招股书链接</button>
    </div>

    <div class="content">
      <div class="panel active" id="panel-overview"></div>
      <div class="panel" id="panel-offering"></div>
      <div class="panel" id="panel-arbitrage"></div>
      <div class="panel" id="panel-shadow"></div>
      <div class="panel" id="panel-valuation"></div>
      <div class="panel" id="panel-docs"></div>
    </div>

    <div class="disclaimer" id="disclaimer"></div>
  </main>

  <script>
    const DATA = ${jsonStr};
    let currentFilter = 'unlisted';
    let currentCompanyId = null;

    const VERDICT_LABELS = { under: '低估', fair: '合理', over: '高估', uncertain: '不确定' };
    const FEAS_LABELS = { high: '高', medium: '中', low: '低', none: '无' };
    const LISTING_LABELS = { main: '主板', '18A': '18A 生物科技', '18B': '18B SPAC', '18C': '18C 专精特新' };

    const TIER_LABELS = { sovereign: '主权/政府基金', top_tier: '顶级资管', well_known: '知名机构', general: '一般机构' };

    function isListed(c) {
      if (c.listingStatus === 'listed') return true;
      if (c.stockCode) return true;
      if (c.status === 'LT') return true;
      const o = c.offering || {};
      return !!(o.status && /已上市/.test(o.status));
    }

    function matchFilter(c, filter) {
      if (filter === 'all') return true;
      if (filter === 'listed') return isListed(c);
      if (filter === 'unlisted') return !isListed(c);
      return true;
    }

    function getVisibleCompanies() {
      return DATA.companies.filter((c) => matchFilter(c, currentFilter));
    }

    function scoreClass(s) {
      if (s >= 7) return 'score-high';
      if (s >= 5) return 'score-mid';
      return 'score-low';
    }

    function verdictClass(v) {
      return 'verdict verdict-' + (v || 'uncertain');
    }

    function feasClass(f) {
      return 'feasibility feas-' + (f || 'none');
    }

    function shortName(name) {
      return name.replace(/股份有限公司|控股有限公司|\s*\(.*?\)\s*|- B/g, '').slice(0, 12);
    }

    function renderSidebar() {
      const list = document.getElementById('companyList');
      const visible = getVisibleCompanies();
      const subEl = document.getElementById('sidebarSub');
      if (subEl) {
        subEl.textContent = '主板 · 聆讯后资料集 · 显示 ' + visible.length + ' / ' + DATA.companies.length;
      }
      if (!visible.length) {
        list.innerHTML = '<div class="empty-hint">当前筛选下暂无 IPO<br>可切换「全部」或「已上市」查看历史</div>';
        return;
      }
      if (!currentCompanyId || !visible.some((c) => c.id === currentCompanyId)) {
        currentCompanyId = visible[0].id;
      }
      list.innerHTML = visible.map((c) =>
        '<div class="company-item' + (c.id === currentCompanyId ? ' active' : '') + '" data-id="' + c.id + '">' +
          '<div class="score-badge ' + scoreClass(c.score) + '">' + c.score + '</div>' +
          '<div class="company-info">' +
            '<div class="company-name">' + shortName(c.name) + '</div>' +
            '<div class="company-meta">' + (c.stockCode || '待分配') + ' · ' + c.postingDate + '</div>' +
          '</div>' +
        '</div>'
      ).join('');

      list.querySelectorAll('.company-item').forEach(el => {
        el.addEventListener('click', () => {
          currentCompanyId = Number(el.dataset.id);
          renderSidebar();
          renderCompany();
        });
      });
    }

    function renderCompany() {
      const c = DATA.companies.find((x) => x.id === currentCompanyId);
      if (!c) {
        document.getElementById('companyTitle').textContent = '—';
        document.getElementById('companyTags').innerHTML = '';
        ['overview', 'offering', 'arbitrage', 'shadow', 'valuation', 'docs'].forEach((tab) => {
          document.getElementById('panel-' + tab).innerHTML = '<div class="card"><p>请从左侧选择一家公司，或切换筛选条件。</p></div>';
        });
        return;
      }
      const b = c.basic || {};

      document.getElementById('companyTitle').textContent = c.name;
      document.getElementById('companyTags').innerHTML = [
        '<span class="tag highlight">' + (b.industry || '') + '</span>',
        '<span class="tag">' + (LISTING_LABELS[b.listingType] || b.listingType || '') + '</span>',
        c.stockCode ? '<span class="tag">' + c.stockCode + '</span>' : '',
        b.aShareCode ? '<span class="tag highlight">A股 ' + b.aShareCode + '</span>' : '',
        c.ahSpread ? '<span class="tag highlight">H折价 ' + c.ahSpread.spread.hDiscountPct + '%</span>' : '',
        c.offering && c.offering.status ? '<span class="tag highlight">' + c.offering.status + '</span>' : '',
        '<span class="tag">评分 ' + c.score + '/10</span>',
      ].filter(Boolean).join('');

      renderOverview(c);
      renderOffering(c);
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
      html += row('上市类型', LISTING_LABELS[b.listingType] || b.listingType);
      html += row('A 股代码', b.aShareCode || '—');
      html += row('保荐人', b.sponsor || '—');
      html += row('预期上市', b.expectedListing || '—');
      html += row('PHIP 日期', c.postingDate);
      html += row('分析时间', c.analyzedAt ? c.analyzedAt.slice(0, 10) : '—');
      html += '</tbody></table></div>';

      document.getElementById('panel-overview').innerHTML = html;
    }

    function fmtPriceRange(pr) {
      if (!pr) return '待披露';
      if (pr.low === pr.high) return pr.low + ' ' + (pr.currency || 'HKD') + (pr.note ? '（' + pr.note + '）' : '');
      return pr.low + ' - ' + pr.high + ' ' + (pr.currency || 'HKD');
    }

    function renderAhSpread(ah) {
      if (!ah || !ah.spread) return '';
      const s = ah.spread;
      let html = '<div class="card" style="border-color:rgba(16,185,129,0.3)">';
      html += '<div class="card-title"><span class="icon">🏦</span> A/H 折价率（实时）';
      html += ' <span class="badge-yes">A+H</span></div>';
      html += '<p style="margin-bottom:16px">' + (ah.summary || '') + '</p>';

      html += '<div class="stat-row">';
      html += statItem('A股 ' + (ah.aShareCode || ''), ah.aShare.price + ' CNY' + (ah.aShare.changePct != null ? ' (' + ah.aShare.changePct + '%)' : ''));
      html += statItem('H股 ' + (ah.hShareCode || ''), ah.hShare.price + ' HKD <span style="font-size:11px;color:var(--muted)">(' + ah.hShare.priceType + ')</span>');
      html += statItem('H等效人民币', s.hEquivalentCny + ' CNY');
      html += statItem('H股折价', '<span class="ah-highlight">' + s.hDiscountPct + '%</span>');
      html += statItem('A/H溢价', '<span class="ah-premium">' + s.ahPremiumPct + '%</span>');
      html += statItem('汇率 CNY/HKD', ah.exchangeRate.cnyPerHkd);
      html += '</div>';

      html += '<table class="data-table"><tbody>';
      html += row('A股代码', ah.aShareCode);
      html += row('H股代码', ah.hShareCode);
      html += row('A股价格', ah.aShare.price + ' CNY · ' + (ah.aShare.source || ''));
      html += row('H股价格', ah.hShare.price + ' HKD · ' + ah.hShare.priceType + ' · ' + (ah.hShare.source || ''));
      html += row('汇率', '1 HKD = ' + ah.exchangeRate.cnyPerHkd + ' CNY · ' + (ah.exchangeRate.source || ''));
      html += row('计算公式', s.formula ? s.formula.hDiscount : '—');
      html += row('更新时间', ah.calculatedAt ? ah.calculatedAt.slice(0, 19).replace('T', ' ') : '—');
      if (ah.hShare.pdfUrl) {
        html += '<tr><td style="color:var(--muted)">招股 PDF</td><td><a class="source-link" href="' + ah.hShare.pdfUrl + '" target="_blank">' + (ah.hShare.pdfLabel || '下载 PDF') + '</a></td></tr>';
      } else if (ah.prospectus && ah.prospectus.url) {
        html += '<tr><td style="color:var(--muted)">参考 PDF</td><td><a class="source-link" href="' + ah.prospectus.url + '" target="_blank">' + ah.prospectus.url.split('/').pop() + '</a>（未解析到发售价）</td></tr>';
      }
      html += '</tbody></table>';

      if (ah.dataSources && ah.dataSources.length) {
        html += '<div class="card-title" style="margin-top:16px">数据来源</div>';
        html += '<table class="data-table"><thead><tr><th>字段</th><th>数值</th><th>来源</th><th>备注</th></tr></thead><tbody>';
        ah.dataSources.forEach(ds => {
          html += '<tr><td class="mono">' + (ds.field || '—') + '</td><td>' + (ds.value != null ? ds.value : '—') + '</td>';
          html += '<td>' + (ds.source || '—') + '</td><td style="max-width:240px;font-size:11px">';
          if (ds.url) html += '<a class="source-link" href="' + ds.url + '" target="_blank">链接</a> ';
          if (ds.note) html += ds.note + ' ';
          if (ds.reason) html += ds.reason + ' ';
          if (ds.snippet) html += ds.snippet.slice(0, 60);
          html += '</td></tr>';
        });
        html += '</tbody></table>';
      }
      html += '</div>';
      return html;
    }

    function yesNoBadge(val) {
      if (val === true) return '<span class="badge-yes">有</span>';
      if (val === false) return '<span class="badge-no">无</span>';
      return '<span class="badge-pending">待披露</span>';
    }

    function renderOffering(c) {
      const o = c.offering;
      if (!o) {
        document.getElementById('panel-offering').innerHTML = '<div class="card"><p>暂无招股详情，请更新 offering_profiles.js</p></div>';
        return;
      }

      const cs = o.cornerstone || {};
      const gs = o.greenShoe || {};
      const cb = o.clawback || {};
      const pr = o.offerPriceRange;

      let html = '';
      if (c.ahSpread) html += renderAhSpread(c.ahSpread);

      html += '<div class="stat-row">';
      html += statItem('招股状态', o.status || '—');
      html += statItem('发售价', fmtPriceRange(pr));
      html += statItem('最终定价', o.finalOfferPrice || '待披露');
      html += statItem('入场费', o.entryFee || '待披露');
      html += statItem('募集总额', o.totalFundraising || '待披露');
      html += statItem('募资净额', o.netProceeds || '待披露');
      html += statItem('总市值', o.marketCapRange || '待披露');
      html += statItem('发行比例', o.issuanceRatio || '待披露');
      html += statItem('基石占比', cs.totalRatio || (cs.hasCornerstone === false ? '0%' : '待披露'));
      html += statItem('绿鞋', gs.hasGreenShoe === true ? '有 ' + (gs.ratio || '15%') : (gs.hasGreenShoe === false ? '无' : '待披露'));
      html += '</div>';

      // 定价与规模
      html += '<div class="card"><div class="card-title"><span class="icon">💵</span> 定价与发行规模</div>';
      html += '<table class="data-table"><tbody>';
      html += row('发售价区间', fmtPriceRange(pr));
      html += row('最终发售价', o.finalOfferPrice || '待披露');
      html += row('每手股数', o.lotSize != null ? o.lotSize + ' 股' : '待披露');
      html += row('入场费（一手）', o.entryFee || '待披露');
      html += row('甲/乙组门槛', o.groupThreshold || '甲组 ≤500万 HKD；乙组 >500万 HKD');
      html += row('顶头槌（甲组最大认购）', o.hammerMaxLots || '待披露');
      html += row('全球发售股数', o.sharesOffered || '待披露');
      html += row('超额配股权股数', o.overAllotmentShares || '待披露');
      html += row('发行比例', o.issuanceRatio || '待披露');
      html += row('募集总额（毛）', o.totalFundraising || '待披露');
      html += row('募资净额', o.netProceeds || '待披露');
      html += row('总市值', o.marketCapRange || '待披露');
      html += row('H 股市值', o.hShareMarketCap || '—');
      if (o.ahDiscount) html += row('较 A 股折价', o.ahDiscount);
      html += row('发售量调整权', o.volumeAdjustment || '待披露');
      html += row('旧股出售', o.oldSharesOffered === true ? '有' : (o.oldSharesOffered === false ? '无' : '待披露'));
      html += '</tbody></table></div>';

      // 发售结构
      html += '<div class="grid-2">';
      html += '<div class="card"><div class="card-title"><span class="icon">📊</span> 发售结构</div><table class="data-table"><tbody>';
      html += row('分配机制', o.allocationMechanism || '待披露');
      html += row('香港公开发售', o.publicOfferRatio || '待披露');
      html += row('国际配售', o.internationalOfferRatio || '待披露');
      html += row('整体协调人/保荐人', o.overallCoordinator || '—');
      html += row('承销商', (o.underwriters || []).join('、') || '—');
      html += '</tbody></table></div>';

      html += '<div class="card"><div class="card-title"><span class="icon">📅</span> 关键日期</div><table class="data-table"><tbody>';
      html += row('招股期', o.subscriptionPeriod ? (o.subscriptionPeriod.start + ' ~ ' + o.subscriptionPeriod.end) : '待披露');
      html += row('定价日', o.pricingDate || '待披露');
      html += row('配售结果/暗盘', o.darkPoolDate || '待披露');
      html += row('上市日', o.listingDate || '待披露');
      html += row('集资用途', o.useOfProceeds || '—');
      html += '</tbody></table></div>';
      html += '</div>';

      // 回拨机制
      html += '<div class="card"><div class="card-title"><span class="icon">🔄</span> 回拨机制 ' + yesNoBadge(cb.enabled) + '</div>';
      html += '<p style="margin-bottom:12px">' + (cb.description || '—') + '</p>';
      if (cb.tiers && cb.tiers.length) {
        html += '<table class="data-table"><thead><tr><th>超额认购倍数</th><th>回拨后公开发售占比</th></tr></thead><tbody>';
        cb.tiers.forEach(t => { html += '<tr><td>' + t.threshold + '</td><td>' + t.ratio + '</td></tr>'; });
        html += '</tbody></table>';
      }
      html += '</div>';

      // 绿鞋
      html += '<div class="card"><div class="card-title"><span class="icon">👟</span> 绿鞋机制 ' + yesNoBadge(gs.hasGreenShoe) + '</div>';
      html += '<table class="data-table"><tbody>';
      html += row('超额配股权比例', gs.ratio || '—');
      html += row('超额配售股数', gs.shares || '—');
      html += row('绿鞋金额', gs.amount || '—');
      html += row('稳价人/绿鞋经办人', gs.stabilizingManager || '—');
      html += '</tbody></table></div>';

      // 基石分析
      html += '<div class="card"><div class="card-title"><span class="icon">🏛️</span> 基石分析 ' + yesNoBadge(cs.hasCornerstone) + '</div>';
      html += '<table class="data-table" style="margin-bottom:16px"><tbody>';
      html += row('基石认购总额', cs.totalAmount || '—');
      html += row('占全球发售比例', cs.totalRatio || '—');
      html += row('占发行后股本', cs.postIpoRatio || '—');
      html += row('锁定期', cs.lockUpPeriod || '—');
      html += row('权威性评估', cs.authorityAssessment || '—');
      html += '</tbody></table>';

      if (cs.investors && cs.investors.length) {
        html += '<table class="data-table"><thead><tr><th>基石投资者</th><th>认购金额</th><th>类型</th><th>备注</th></tr></thead><tbody>';
        cs.investors.forEach(inv => {
          html += '<tr><td><b>' + inv.name + '</b></td><td>' + (inv.amount || '—') + '</td>';
          html += '<td class="tier-' + (inv.tier || 'general') + '">' + (TIER_LABELS[inv.tier] || inv.tier || '—') + '</td>';
          html += '<td>' + (inv.note || '') + '</td></tr>';
        });
        html += '</tbody></table>';
      } else if (cs.hasCornerstone === false) {
        html += '<p style="color:var(--yellow)">⚠ 本次 IPO 未引入基石投资者</p>';
      }
      html += '</div>';

      // 孖展/超额认购
      if (o.oversubscription) {
        const os = o.oversubscription;
        html += '<div class="card"><div class="card-title"><span class="icon">📈</span> 认购热度（孖展）</div><table class="data-table"><tbody>';
        html += row('公开发售超额认购', os.public || '—');
        html += row('孖展总额', os.marginTotal || '—');
        html += row('孖展倍数', os.marginMultiple || '—');
        html += row('国际配售超额认购', os.international || '—');
        html += '</tbody></table></div>';
      }

      if (o.notes && o.notes.length) {
        html += '<div class="card"><div class="card-title"><span class="icon">📝</span> 备注</div><ul>';
        o.notes.forEach(n => { html += '<li>' + n + '</li>'; });
        html += '</ul></div>';
      }

      if (o._meta && o._meta.sources) {
        const srcEntries = Object.entries(o._meta.sources).filter(([k]) => !k.includes('.'));
        if (srcEntries.length) {
          html += '<div class="card"><div class="card-title"><span class="icon">📚</span> 字段数据来源</div>';
          html += '<table class="data-table"><thead><tr><th>字段</th><th>来源</th></tr></thead><tbody>';
          srcEntries.forEach(([field, src]) => {
            const label = src === 'phip_pdf' ? 'PHIP PDF' : src === 'manual' ? '手动/全球发售章程' : src;
            html += '<tr><td class="mono">' + field + '</td><td>' + label + '</td></tr>';
          });
          html += '</tbody></table>';
          if (o._meta.phipPdfUrl) {
            html += '<p style="margin-top:8px;font-size:11px;color:var(--muted)">PHIP: <a class="source-link" href="' + o._meta.phipPdfUrl + '" target="_blank">' + (o._meta.phipDocType || '全文 PDF') + '</a></p>';
          }
          html += '</div>';
        }
      }

      document.getElementById('panel-offering').innerHTML = html;
    }

    function renderArbitrage(c) {
      const a = c.arbitrage || {};
      let html = '';

      if (c.ahSpread) {
        const s = c.ahSpread.spread;
        html += '<div class="summary-box"><p><b>A/H 当前折价：</b> H股折价 <span class="ah-highlight">' + s.hDiscountPct + '%</span>，A/H溢价 <span class="ah-premium">' + s.ahPremiumPct + '%</span>。' + (c.ahSpread.summary || '') + '</p></div>';
      }

      html += '<div class="card">';
      html += '<div class="card-title"><span class="icon">⚖️</span> 套利分析 ';
      html += '<span class="' + feasClass(a.feasibility) + '">' + (FEAS_LABELS[a.feasibility] || a.feasibility) + '可行性</span></div>';

      html += '<table class="data-table" style="margin-bottom:16px"><tbody>';
      html += row('套利类型', a.type);
      html += row('A/H 溢价率', a.ahPremium || '—');
      html += row('价差估算', a.spreadEstimate || '—');
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
      html += '<span class="' + verdictClass(v.verdict) + '">' + (VERDICT_LABELS[v.verdict] || v.verdict) + '</span></div>';

      html += '<div class="stat-row">';
      html += statItem('发行价区间', v.priceRange || '待公布');
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
      const docs = (c.documents && c.documents.latest) || [];
      let html = '<div class="card"><div class="card-title"><span class="icon">📄</span> 聆讯后资料集文档</div>';
      if (!docs.length) {
        html += '<p>暂无文档链接</p>';
      } else {
        html += '<table class="data-table"><thead><tr><th>日期</th><th>文档类型</th><th>链接</th></tr></thead><tbody>';
        docs.forEach(d => {
          html += '<tr><td>' + (d.date || '') + '</td><td>' + (d.docType || d.fullDocLabel || '') + '</td><td>';
          if (d.fullDocUrl) html += '<a class="doc-link" href="' + d.fullDocUrl + '" target="_blank">' + (d.fullDocLabel || 'PDF') + '</a> ';
          if (d.multiFileUrl) html += '<a class="doc-link" href="' + d.multiFileUrl + '" target="_blank">' + (d.multiFileLabel || '多文件') + '</a>';
          html += '</td></tr>';
        });
        html += '</tbody></table>';
      }
      html += '</div>';
      document.getElementById('panel-docs').innerHTML = html;
    }

    function statItem(label, value) {
      return '<div class="stat-item"><div class="stat-label">' + label + '</div><div class="stat-value">' + value + '</div></div>';
    }
    function row(label, value) {
      return '<tr><td style="color:var(--muted);width:120px">' + label + '</td><td>' + (value || '—') + '</td></tr>';
    }

    // Tabs
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
      });
    });

    document.querySelectorAll('.filter-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        currentFilter = btn.dataset.filter;
        document.querySelectorAll('.filter-btn').forEach((b) => b.classList.toggle('active', b === btn));
        renderSidebar();
        renderCompany();
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
  const fetchAh = process.argv.includes('--fetch-ah');
  const fetchOffering = process.argv.includes('--fetch-offering');

  if (fetchOffering && !htmlOnly) {
    console.log('🔄 解析 PHIP 招股详情...');
    execSync('node scripts/hk_ipo/fetch_offering_from_phip.js', { stdio: 'inherit', cwd: path.join(__dirname, '../..') });
    reloadOfferingProfiles();
  }

  if (fetchAh && !htmlOnly) {
    console.log('🔄 拉取 A/H 折价率...');
    execSync('node scripts/hk_ipo/fetch_ah_discount.js', { stdio: 'inherit', cwd: path.join(__dirname, '../..') });
  }

  if (!htmlOnly) {
    if (!fs.existsSync(PATHS.ipoList)) {
      console.error('❌ 请先运行 fetch_hk_ipo_list.js 拉取 IPO 列表');
      process.exit(1);
    }
    const ipoData = JSON.parse(fs.readFileSync(PATHS.ipoList, 'utf-8'));
    let analysisData = { meta: {}, companies: [] };
    if (fs.existsSync(PATHS.analysis)) {
      analysisData = JSON.parse(fs.readFileSync(PATHS.analysis, 'utf-8'));
    }
    let merged = mergeAnalysis(ipoData, analysisData);

    if (fs.existsSync(PATHS.ahDiscount)) {
      const ahData = JSON.parse(fs.readFileSync(PATHS.ahDiscount, 'utf-8'));
      const validAh = (ahData.companies || []).filter((c) => !c.error);
      if (validAh.length) {
        merged = {
          ...merged,
          meta: { ...merged.meta, ahDiscountMeta: ahData.meta },
          companies: mergeAhSpread(merged.companies, { ...ahData, companies: validAh }),
        };
        console.log('🔗 已合并 A/H 折价: ' + PATHS.ahDiscount);
      } else {
        console.warn('⚠ A/H 折价数据无效（网络错误？），跳过合并');
      }
    }

    fs.mkdirSync(path.dirname(PATHS.outputJson), { recursive: true });
    fs.writeFileSync(PATHS.outputJson, JSON.stringify(merged, null, 2), 'utf-8');
    console.log('💾 已合并分析数据: ' + PATHS.outputJson);

    const html = generateHtml(merged);
    fs.writeFileSync(PATHS.outputHtml, html, 'utf-8');
    console.log('🌐 已生成 HTML: ' + PATHS.outputHtml);
  } else {
    const data = JSON.parse(fs.readFileSync(PATHS.outputJson, 'utf-8'));
    const html = generateHtml(data);
    fs.writeFileSync(PATHS.outputHtml, html, 'utf-8');
    console.log('🌐 已重新生成 HTML: ' + PATHS.outputHtml);
  }

  console.log('✅ 完成，在浏览器打开 stock/html/hk_ipo_analysis.html');
}

main();
