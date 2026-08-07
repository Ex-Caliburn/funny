/**
 * A/H 折价率计算
 * - 招股数据：仅下载 PHIP（聆讯后资料集）全文 PDF 解析
 * - A 股现价：东方财富实时行情（二级市场价格，无法来自 PDF）
 * - H 股：已上市用行情；招股中用 PDF 发售价，PHIP 无定价则回退招股公告
 *
 * 用法:
 *   node scripts/hk_ipo/fetch_ah_discount.js
 *   node scripts/hk_ipo/fetch_ah_discount.js --code 108430
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { getOfferingProfiles } = require('./offering_profiles');
const { AH_PROFILES } = require('./ah_profiles');
const {
  parseExchangeRateFromText,
  parseHOfferPriceFromPhip,
  getPhipText,
} = require('./phip_pdf');
const PATHS = require('./paths');

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

function httpGetCurl(url) {
  return execFileSync('curl', ['-sL', '--max-time', '60', '-A', HEADERS['User-Agent'], url], {
    encoding: 'buffer',
    maxBuffer: 10 * 1024 * 1024,
  });
}

async function fetchEastMoneyPrice(secId) {
  const url = `https://push2.eastmoney.com/api/qt/stock/get?secid=${secId}&fields=f43,f57,f58,f169,f170`;
  let body;
  try {
    body = httpGetCurl(url);
  } catch {
    throw new Error('无法获取行情（东方财富）');
  }
  const json = JSON.parse(body.toString('utf-8'));
  if (!json.data || !json.data.f43) return null;
  return {
    code: json.data.f57,
    name: json.data.f58,
    price: json.data.f43 / 100,
    changePct: json.data.f170 != null ? json.data.f170 / 100 : null,
    source: '东方财富 push2.eastmoney.com',
    url,
    asOf: new Date().toISOString(),
  };
}

async function fetchCnyPerHkd() {
  const url = 'https://api.exchangerate-api.com/v4/latest/HKD';
  const body = httpGetCurl(url);
  const json = JSON.parse(body.toString('utf-8'));
  return {
    cnyPerHkd: json.rates.CNY,
    source: 'exchangerate-api.com (HKD base)',
    asOf: json.date || new Date().toISOString().slice(0, 10),
    url,
  };
}

async function resolveHOfferPrice(companyId) {
  const offering = getOfferingProfiles()[companyId] || {};
  let dataSources = [];
  let prospectusFile = null;
  let parsedFromPdf = null;

  try {
    const phipResult = await parseHOfferPriceFromPhip(companyId);
    dataSources = phipResult.dataSources;
    prospectusFile = phipResult.prospectusFile;
    parsedFromPdf = phipResult.hOffer;

    if (!phipResult.prospectusFile.cached) {
      console.log(`  📥 下载 PHIP 全文 PDF: ${phipResult.prospectusFile.fileName}`);
    } else {
      console.log(`  ♻ 使用缓存 PHIP PDF: ${phipResult.prospectusFile.fileName}`);
    }
  } catch (e) {
    dataSources.push({ field: 'phipPdf', error: e.message });
    console.warn(`  ⚠ PHIP PDF: ${e.message}`);
  }

  if (parsedFromPdf) return { hOffer: parsedFromPdf, prospectusFile, dataSources };

  const pr = offering.offerPriceRange;
  if (pr && pr.high) {
    dataSources.push({
      field: 'hOfferPrice',
      value: pr.high,
      source: '招股公告（PHIP 无最终定价时的回退）',
      note: pr.note || '',
    });
    return {
      hOffer: { price: pr.high, currency: 'HKD', source: '招股公告', note: pr.note },
      prospectusFile,
      dataSources,
    };
  }

  return { hOffer: null, prospectusFile, dataSources };
}

function calcAhSpread(aPriceCny, hPriceHkd, cnyPerHkd) {
  const hEquivCny = hPriceHkd * cnyPerHkd;
  return {
    hEquivalentCny: round(hEquivCny),
    ahPremiumPct: round((aPriceCny / hEquivCny - 1) * 100),
    hDiscountPct: round((1 - hEquivCny / aPriceCny) * 100),
    formula: {
      ahPremium: '(A股人民币价 / (H股港元价 × CNY/HKD) - 1) × 100%',
      hDiscount: '(1 - H股等效人民币价 / A股人民币价) × 100%',
      hEquivalentCny: 'H股港元价 × CNY/HKD',
    },
  };
}

function round(n) {
  return Math.round(n * 100) / 100;
}

async function computeAhForCompany(companyId, config) {
  console.log(`\n📊 ${config.name} (${config.aShareCode}.SZ / ${config.hShareCode}.HK)`);

  const aQuote = await fetchEastMoneyPrice(config.aShareSecId || `0.${config.aShareCode}`);
  if (!aQuote) throw new Error('无法获取 A 股行情');

  const hQuote = await fetchEastMoneyPrice(config.hShareSecId || `116.${config.hShareCode}`);
  const hListed = hQuote && hQuote.price > 0;

  const { hOffer, prospectusFile, dataSources } = await resolveHOfferPrice(companyId);

  let fx = await fetchCnyPerHkd();
  dataSources.push({
    field: 'exchangeRate',
    value: fx.cnyPerHkd,
    source: fx.source,
    url: fx.url,
    asOf: fx.asOf,
  });

  if (prospectusFile?.path && fs.existsSync(prospectusFile.path)) {
    try {
      const phipText = await getPhipText(companyId);
      const pdfFx = parseExchangeRateFromText(phipText.text);
      if (pdfFx) {
        fx = { ...fx, ...pdfFx, source: pdfFx.source };
        dataSources.push({ field: 'exchangeRate', ...pdfFx, priority: 'phip_pdf' });
      }
    } catch (_) {}
  }

  const hPriceForCalc = hListed ? hQuote.price : hOffer?.price;
  if (!hPriceForCalc) {
    return {
      companyId,
      isAh: true,
      error: '无法确定 H 股价格（未上市且 PHIP/招股公告均无发售价）',
      aShare: aQuote,
      dataSources,
    };
  }

  const spread = calcAhSpread(aQuote.price, hPriceForCalc, fx.cnyPerHkd);

  dataSources.push({
    field: 'aSharePrice',
    value: aQuote.price,
    source: aQuote.source,
    url: aQuote.url,
    asOf: aQuote.asOf,
    note: '二级市场实时价，非 PDF 来源',
  });
  dataSources.push({
    field: 'hSharePrice',
    value: hPriceForCalc,
    source: hListed ? hQuote.source : hOffer.source,
    type: hListed ? 'market' : 'prospectus',
    priceType: hListed ? '二级市场' : '招股发售价',
    asOf: hListed ? hQuote.asOf : prospectusFile?.downloadedAt,
  });

  const result = {
    companyId,
    name: config.name,
    isAh: true,
    aShareCode: `${config.aShareCode}.SZ`,
    hShareCode: `${config.hShareCode}.HK`,
    calculatedAt: new Date().toISOString(),
    aShare: {
      price: aQuote.price,
      currency: 'CNY',
      changePct: aQuote.changePct,
      source: aQuote.source,
      asOf: aQuote.asOf,
    },
    hShare: {
      price: hPriceForCalc,
      currency: 'HKD',
      priceType: hListed ? '二级市场' : '招股发售价',
      changePct: hListed ? hQuote.changePct : null,
      source: hListed ? hQuote.source : hOffer.source,
      pdfFile: hOffer?.pdfFile || prospectusFile?.path || null,
      pdfUrl: hOffer?.pdfUrl || prospectusFile?.fullDocUrl || null,
      pdfLabel: hOffer?.pdfLabel || prospectusFile?.docType || 'PHIP 全文 PDF',
      asOf: hListed ? hQuote.asOf : prospectusFile?.downloadedAt,
    },
    exchangeRate: {
      cnyPerHkd: fx.cnyPerHkd,
      source: fx.source,
      asOf: fx.asOf,
    },
    spread,
    summary: hListed
      ? `A股 ${aQuote.price} CNY vs H股 ${hPriceForCalc} HKD（等效 ${spread.hEquivalentCny} CNY），A/H溢价 ${spread.ahPremiumPct}%，H股折价 ${spread.hDiscountPct}%`
      : `A股 ${aQuote.price} CNY vs H股招股发售价 ${hPriceForCalc} HKD（等效 ${spread.hEquivalentCny} CNY），理论 H股折价 ${spread.hDiscountPct}%`,
    prospectus: prospectusFile,
    dataSources,
  };

  console.log(`  ✓ ${result.summary}`);
  console.log(`  数据来源: A=${aQuote.source}, H=${result.hShare.source}, FX=${fx.source}`);

  return result;
}

function discoverAhCompanies() {
  const ids = new Set(Object.keys(AH_PROFILES).map(Number));
  if (fs.existsSync(PATHS.analysis)) {
    const analysis = JSON.parse(fs.readFileSync(PATHS.analysis, 'utf-8'));
    analysis.companies.forEach((c) => {
      if (c.basic?.aShareCode) ids.add(c.id);
    });
  }
  return [...ids].filter((id) => AH_PROFILES[id]).map((id) => ({ id, config: AH_PROFILES[id] }));
}

async function main() {
  const filterCode = process.argv.includes('--code')
    ? parseInt(process.argv[process.argv.indexOf('--code') + 1], 10)
    : null;

  let companies = discoverAhCompanies();
  if (filterCode) companies = companies.filter((c) => c.id === filterCode);

  if (companies.length === 0) {
    console.log('未找到 A+H 公司配置，请在 ah_profiles.js 中添加');
    process.exit(0);
  }

  console.log('🏦 A/H 折价率（PHIP PDF + 实时行情）');

  const results = [];
  for (const { id, config } of companies) {
    try {
      results.push(await computeAhForCompany(id, config));
    } catch (e) {
      console.error(`  ❌ ${config.name}: ${e.message}`);
      results.push({ companyId: id, name: config.name, isAh: true, error: e.message });
    }
  }

  const output = {
    meta: {
      generatedAt: new Date().toISOString(),
      count: results.length,
      note: '仅下载 PHIP 全文 PDF；H 股发售价优先 PDF 解析，PHIP 无定价回退招股公告；A 股用实时行情',
    },
    companies: results,
  };

  fs.mkdirSync(path.dirname(PATHS.ahDiscount), { recursive: true });
  fs.writeFileSync(PATHS.ahDiscount, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\n💾 已保存: ${PATHS.ahDiscount}`);
}

if (require.main === module) {
  main().catch((e) => {
    console.error('❌', e.message);
    process.exit(1);
  });
}

module.exports = { computeAhForCompany, calcAhSpread, AH_PROFILES, PATHS };
