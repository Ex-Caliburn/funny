/**
 * 从 PHIP PDF 批量解析招股详情，并与手动补充合并
 *
 * 用法:
 *   node scripts/hk_ipo/fetch_offering_from_phip.js
 *   node scripts/hk_ipo/fetch_offering_from_phip.js --code 108430
 *   node scripts/hk_ipo/fetch_offering_from_phip.js --force
 */

const fs = require('fs');
const path = require('path');
const { getPhipText, resolvePhipDoc } = require('./phip_pdf');
const { parseOfferingFromPhipText } = require('./phip_offering_parsers');
const { OFFERING_OVERRIDES } = require('./offering_overrides');
const { mergeOffering } = require('./offering_merge');

const PATHS = {
  ipoList: path.join(__dirname, 'data/active_ap-phip_sehk.json'),
  phipParsed: path.join(__dirname, 'data/offering_from_phip.json'),
  merged: path.join(__dirname, 'data/offering_merged.json'),
};

async function parseCompanyOffering(companyId, options = {}) {
  const phipDoc = resolvePhipDoc(companyId, options.ipoListPath);
  if (!phipDoc) {
    return {
      companyId,
      error: '无 PHIP 文档',
      offering: OFFERING_OVERRIDES[companyId]
        ? mergeOffering(null, OFFERING_OVERRIDES[companyId])
        : null,
    };
  }

  try {
    const phipMeta = await getPhipText(companyId, { force: options.force });
    const parsed = parseOfferingFromPhipText(phipMeta.text, phipMeta);
    const override = OFFERING_OVERRIDES[companyId] || null;
    const offering = mergeOffering(parsed, override);

    return {
      companyId,
      name: phipDoc.name,
      phipDoc,
      offering,
      parseStats: {
        textLength: phipMeta.text.length,
        pages: phipMeta.pages,
        cached: phipMeta.cached,
        fieldsFromPhip: Object.keys(parsed).filter((k) => !isEmpty(parsed[k]) && k !== '_meta').length,
      },
    };
  } catch (e) {
    const override = OFFERING_OVERRIDES[companyId] || null;
    return {
      companyId,
      name: phipDoc.name,
      error: e.message,
      offering: override ? mergeOffering(null, override) : null,
    };
  }
}

function isEmpty(v) {
  if (v == null) return true;
  if (typeof v === 'string') return v.startsWith('待');
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

async function main() {
  const filterCode = process.argv.includes('--code')
    ? parseInt(process.argv[process.argv.indexOf('--code') + 1], 10)
    : null;
  const force = process.argv.includes('--force');

  if (!fs.existsSync(PATHS.ipoList)) {
    console.error('❌ 请先运行 fetch_hk_ipo_list.js');
    process.exit(1);
  }

  const ipoData = JSON.parse(fs.readFileSync(PATHS.ipoList, 'utf-8'));
  let ids = ipoData.applicants.map((a) => a.id);
  if (filterCode) ids = ids.filter((id) => id === filterCode);

  console.log('📄 从 PHIP PDF 解析招股详情（仅全文 PDF）\n');

  const results = [];
  const mergedMap = {};

  for (const id of ids) {
    const name = ipoData.applicants.find((a) => a.id === id)?.name || String(id);
    process.stdout.write(`  ${name} (${id})... `);
    const result = await parseCompanyOffering(id, { force });
    results.push(result);
    if (result.offering) mergedMap[id] = result.offering;

    if (result.error) {
      console.log(`⚠ ${result.error}`);
    } else {
      const s = result.parseStats;
      console.log(`✓ ${s.textLength} 字符, PHIP字段 ${s.fieldsFromPhip}${s.cached ? ' (缓存)' : ''}`);
    }
  }

  const phipOutput = {
    meta: {
      generatedAt: new Date().toISOString(),
      count: results.length,
      note: '仅解析 PHIP 全文 PDF；[编纂] 字段由 offering_overrides.js 补充',
    },
    companies: results,
  };

  fs.mkdirSync(path.dirname(PATHS.phipParsed), { recursive: true });
  fs.writeFileSync(PATHS.phipParsed, JSON.stringify(phipOutput, null, 2), 'utf-8');
  fs.writeFileSync(
    PATHS.merged,
    JSON.stringify({ meta: phipOutput.meta, profiles: mergedMap }, null, 2),
    'utf-8'
  );

  console.log(`\n💾 PHIP 解析: ${PATHS.phipParsed}`);
  console.log(`💾 合并结果: ${PATHS.merged}`);
}

if (require.main === module) {
  main().catch((e) => {
    console.error('❌', e.message);
    process.exit(1);
  });
}

module.exports = { parseCompanyOffering, PATHS };
