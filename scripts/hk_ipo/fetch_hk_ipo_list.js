/**
 * 港股新上市申请列表拉取工具
 * 数据源：港交所披露易 AP & PHIP 页面
 * https://www1.hkexnews.hk/app/appindex.html?lang=zh
 *
 * 通过分析页面 JS（app_common.js）发现数据来自 JSON 接口，无需浏览器自动化。
 *
 * 使用方法：
 * # 拉取主板「处理中」+ 申请版本/整体协调人公告/聆讯后资料集（默认）
 * node scripts/hk_ipo/fetch_hk_ipo_list.js
 *
 * # 拉取已上市列表
 * node scripts/hk_ipo/fetch_hk_ipo_list.js --tab listed
 *
 * # 拉取 GEM 板 + 全部 tab
 * node scripts/hk_ipo/fetch_hk_ipo_list.js --board gem --tab all
 *
 * # 下载 PDF 文档
 * node scripts/hk_ipo/fetch_hk_ipo_list.js --download
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const PATHS = require('./paths');
const { downloadPhipPdf, resolvePhipDoc } = require('./phip_pdf');

const CONFIG = {
  BASE_URL: 'https://www1.hkexnews.hk',
  JSON_PATH: '/ncms/json/eds/',
  APP_BASE: 'https://www1.hkexnews.hk/app/',
  DATA_DIR: PATHS.DATA_DIR,
  HISTORY_DIR: PATHS.HISTORY_DIR,
  HEADERS: {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: 'application/json',
    'Accept-Language': 'zh-CN,zh;q=0.9',
  },
  REQUEST_DELAY_MS: 500,
};

/** tab 与 filter 对应的 JSON 文件名前缀 */
const TAB_CONFIG = {
  active: {
    ap: 'appactive_app_',
    'ap-phip': 'appactive_appphip_',
  },
  inactive: 'appinactive_',
  listed: 'applisted_',
  returned: 'appreturned_',
};

const STATUS_MAP = {
  A: '处理中',
  LP: '失效',
  RJ: '拒绝',
  W: '撤回',
  LT: '已上市',
  RN: '发还',
};

const BOARD_MAP = {
  sehk: { suffix: 'sehk_', label: '主板' },
  gem: { suffix: 'gem_', label: 'GEM' },
};

/**
 * 解析命令行参数
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const params = {
    board: 'sehk',
    tab: 'active',
    filter: 'ap-phip',
    lang: 'c',
    outputDir: CONFIG.DATA_DIR,
    download: false,
    downloadAll: false,
    history: true,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--board':
        params.board = args[++i];
        break;
      case '--tab':
        params.tab = args[++i];
        break;
      case '--filter':
        params.filter = args[++i];
        break;
      case '--lang':
        params.lang = args[++i] === 'en' ? 'e' : 'c';
        break;
      case '--output':
        params.outputDir = args[++i];
        break;
      case '--download':
        params.download = true;
        break;
      case '--download-all':
        params.downloadAll = true;
        break;
      case '--no-history':
        params.history = false;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
    }
  }

  return params;
}

function printHelp() {
  console.log(`
港股新上市申请列表拉取工具

用法:
  node scripts/hk_ipo/fetch_hk_ipo_list.js [选项]

选项:
  --board sehk|gem     板块，默认 sehk（主板）
  --tab active|listed|inactive|returned|all  数据分类，默认 active
  --filter ap|ap-phip  处理中 tab 的筛选，默认 ap-phip
                       ap      = 申请版本及整体协调人公告
                       ap-phip = 申请版本、整体协调人公告及聆讯后资料集
  --lang zh|en         语言，默认 zh
  --output <dir>       输出目录，默认 stock/hk_ipo
  --download           下载 PHIP（聆讯后资料集）全文 PDF 到 stock/hk_ipo/prospectus/
  --download-all       下载所有 PDF（含申请版本、协调人公告等）
  --no-history         不保存历史快照
  -h, --help           显示帮助
`);
}

/**
 * HTTP GET（优先 curl，港交所直连 node https 易超时）
 */
function httpGet(url) {
  const headerArgs = Object.entries(CONFIG.HEADERS).flatMap(([k, v]) => ['-H', `${k}: ${v}`]);
  try {
    return execFileSync(
      'curl',
      ['-sL', '--max-time', '60', ...headerArgs, url],
      { encoding: 'buffer', maxBuffer: 20 * 1024 * 1024 }
    );
  } catch (err) {
    throw new Error(`请求失败: ${url} (${err.message})`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 构建 JSON 文件名
 */
function buildJsonFileName(tab, filter, board, lang) {
  const boardSuffix = BOARD_MAP[board]?.suffix || `${board}_`;
  let prefix;

  if (tab === 'active') {
    prefix = TAB_CONFIG.active[filter] || TAB_CONFIG.active['ap-phip'];
  } else {
    prefix = TAB_CONFIG[tab];
  }

  if (!prefix) {
    throw new Error(`不支持的 tab: ${tab}`);
  }

  return `${prefix}${boardSuffix}${lang}.json`;
}

/**
 * 拉取 JSON 数据
 */
async function fetchJsonData(tab, filter, board, lang) {
  const fileName = buildJsonFileName(tab, filter, board, lang);
  const url = `${CONFIG.BASE_URL}${CONFIG.JSON_PATH}${fileName}`;
  console.log(`📡 请求: ${url}`);

  const body = httpGet(url);
  const data = JSON.parse(body.toString('utf-8'));
  return { fileName, url, data };
}

/**
 * 将相对路径转为完整文档 URL
 */
function toFullUrl(relativePath) {
  if (!relativePath) return null;
  if (relativePath.startsWith('http')) return relativePath;
  return CONFIG.APP_BASE + relativePath;
}

/**
 * 规范化单个文档条目
 */
function normalizeDocument(proof) {
  return {
    date: proof.d || null,
    docType: proof.nF || null,
    fullDocLabel: proof.nS1 || null,
    multiFileLabel: proof.nS2 || null,
    fullDocUrl: toFullUrl(proof.u1),
    multiFileUrl: toFullUrl(proof.u2),
  };
}

/**
 * 规范化申请人记录
 */
function normalizeApplicant(raw, tab) {
  const base = {
    id: raw.id || null,
    name: raw.a,
    status: raw.s || null,
    statusLabel: STATUS_MAP[raw.s] || raw.s || null,
    postingDate: raw.d || raw.postingDate || null,
    stockCode: raw.st || null,
    hasPhip: raw.hasPhip || false,
    warningStatementUrl: toFullUrl(raw.w),
  };

  if (tab === 'returned') {
    return {
      ...base,
      sponsor: raw.s,
      returnDate: raw.rd || null,
    };
  }

  if (tab === 'inactive') {
    return {
      ...base,
      statusLabel: raw.s || null,
    };
  }

  if (tab === 'listed') {
    return base;
  }

  // active tab - 包含文档列表
  return {
    ...base,
    documents: {
      latest: (raw.ls || []).map(normalizeDocument),
      previous: (raw.ps || []).map(normalizeDocument),
    },
  };
}

/**
 * 构建输出数据结构
 */
function buildOutput(tab, filter, board, lang, rawData, sourceUrl) {
  const applicants = (rawData.app || []).map((item) => normalizeApplicant(item, tab));

  return {
    meta: {
      fetchedAt: new Date().toISOString(),
      source: 'https://www1.hkexnews.hk/app/appindex.html?lang=zh',
      sourceJson: sourceUrl,
      board,
      boardLabel: BOARD_MAP[board]?.label || board,
      tab,
      filter: tab === 'active' ? filter : null,
      filterLabel:
        tab === 'active'
          ? filter === 'ap-phip'
            ? '申请版本、整体协调人公告及聆讯后资料集'
            : '申请版本及整体协调人公告'
          : null,
      lang: lang === 'c' ? 'zh' : 'en',
      genDate: rawData.genDate || null,
      updateDate: rawData.uDate || null,
      count: applicants.length,
    },
    applicants,
  };
}

/**
 * 确保目录存在
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * 保存 JSON 文件
 */
function saveJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`💾 已保存: ${filePath}`);
}

/**
 * 与上次记录对比，找出新增/移除的申请人
 */
function diffWithPrevious(current, previousPath) {
  if (!fs.existsSync(previousPath)) {
    return { newApplicants: current.applicants, removedApplicants: [], isFirstRun: true };
  }

  const previous = JSON.parse(fs.readFileSync(previousPath, 'utf-8'));
  const prevMap = new Map(previous.applicants.map((a) => [getApplicantKey(a), a]));
  const currMap = new Map(current.applicants.map((a) => [getApplicantKey(a), a]));

  const newApplicants = [];
  const removedApplicants = [];

  for (const [key, applicant] of currMap) {
    if (!prevMap.has(key)) {
      newApplicants.push(applicant);
    }
  }

  for (const [key, applicant] of prevMap) {
    if (!currMap.has(key)) {
      removedApplicants.push(applicant);
    }
  }

  return { newApplicants, removedApplicants, isFirstRun: false };
}

function getApplicantKey(applicant) {
  return applicant.id ? String(applicant.id) : applicant.name;
}

/**
 * 下载 PHIP 全文 PDF（统一走 phip_pdf，存 stock/hk_ipo/prospectus/{companyId}/）
 */
async function downloadDocuments(output, ipoListPath) {
  let downloadCount = 0;
  let skipCount = 0;

  for (const applicant of output.applicants) {
    if (!applicant.id) continue;

    const phip = resolvePhipDoc(applicant.id, ipoListPath);
    if (!phip) {
      skipCount++;
      continue;
    }

    try {
      const meta = await downloadPhipPdf(applicant.id, { ipoListPath });
      const label = phip.docType || phip.fullDocLabel || 'PHIP';
      console.log(`  ✅ ${applicant.name} - ${label}: ${meta.fileName}${meta.cached ? ' (缓存)' : ''}`);
      downloadCount++;
      await sleep(CONFIG.REQUEST_DELAY_MS);
    } catch (err) {
      console.error(`  ❌ ${applicant.name}: ${err.message}`);
    }
  }

  console.log(`📥 共下载 ${downloadCount} 个 PHIP PDF 到 ${PATHS.prospectusDir}${skipCount ? `（跳过 ${skipCount} 家无 PHIP）` : ''}`);
}

/**
 * 拉取单个 tab 的数据
 */
async function fetchTab(params, tab) {
  const { filter, board, lang, outputDir, history, download, downloadAll } = params;
  const outputFileName = tab === 'active' ? `${tab}_${filter}_${board}.json` : `${tab}_${board}.json`;
  const outputPath = path.join(outputDir, outputFileName);

  const { url, data } = await fetchJsonData(tab, filter, board, lang);
  const output = buildOutput(tab, filter, board, lang, data, url);

  const { newApplicants, removedApplicants, isFirstRun } = diffWithPrevious(output, outputPath);

  saveJson(outputPath, output);

  if (history) {
    const dateStr = new Date().toISOString().slice(0, 10);
    const historyPath = path.join(CONFIG.HISTORY_DIR, `${outputFileName.replace('.json', '')}_${dateStr}.json`);
    saveJson(historyPath, output);
  }

  // 更新 changelog
  if (!isFirstRun && (newApplicants.length > 0 || removedApplicants.length > 0)) {
    const changelogPath = path.join(outputDir, 'changelog.json');
    let changelog = [];
    if (fs.existsSync(changelogPath)) {
      changelog = JSON.parse(fs.readFileSync(changelogPath, 'utf-8'));
    }
    changelog.push({
      timestamp: new Date().toISOString(),
      board,
      tab,
      filter: tab === 'active' ? filter : null,
      newCount: newApplicants.length,
      removedCount: removedApplicants.length,
      newApplicants: newApplicants.map((a) => ({ id: a.id, name: a.name, postingDate: a.postingDate })),
      removedApplicants: removedApplicants.map((a) => ({ id: a.id, name: a.name })),
    });
    saveJson(changelogPath, changelog);
  }

  console.log(`\n📊 ${BOARD_MAP[board]?.label || board} / ${tab}: 共 ${output.meta.count} 条记录`);
  if (!isFirstRun) {
    if (newApplicants.length > 0) {
      console.log(`   🆕 新增 ${newApplicants.length} 条:`);
      newApplicants.forEach((a) => console.log(`      - ${a.name} (${a.postingDate || ''})`));
    }
    if (removedApplicants.length > 0) {
      console.log(`   ➖ 移除 ${removedApplicants.length} 条`);
    }
    if (newApplicants.length === 0 && removedApplicants.length === 0) {
      console.log('   ✓ 与上次记录无变化');
    }
  }

  if (download && tab === 'active') {
    await downloadDocuments(output, outputPath);
  }

  return output;
}

/**
 * 主函数
 */
async function main() {
  const params = parseArgs();

  if (!BOARD_MAP[params.board]) {
    console.error(`❌ 不支持的板块: ${params.board}，请使用 sehk 或 gem`);
    process.exit(1);
  }

  ensureDir(params.outputDir);
  ensureDir(CONFIG.HISTORY_DIR);

  console.log('🏦 港股新上市申请列表拉取');
  console.log(`   板块: ${BOARD_MAP[params.board].label}`);
  console.log(`   筛选: ${params.tab === 'active' ? (params.filter === 'ap-phip' ? '申请版本、整体协调人公告及聆讯后资料集' : '申请版本及整体协调人公告') : params.tab}`);
  console.log('');

  const tabs = params.tab === 'all' ? ['active', 'inactive', 'listed', 'returned'] : [params.tab];

  for (const tab of tabs) {
    try {
      await fetchTab(params, tab);
      if (tabs.length > 1) {
        await sleep(CONFIG.REQUEST_DELAY_MS);
      }
    } catch (err) {
      console.error(`❌ 拉取 ${tab} 失败: ${err.message}`);
    }
  }

  console.log('\n✅ 完成');
}

main().catch((err) => {
  console.error('❌ 运行失败:', err.message);
  process.exit(1);
});
