/**
 * 聆讯后资料集（PHIP）PDF 解析
 * 策略：仅下载最新 PHIP 全文 PDF，不下载申请版本或多文件分册
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { execFileSync } = require('child_process');
const { PDFParse } = require('pdf-parse');
const PATHS = require('./paths');

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Referer: 'https://www1.hkexnews.hk/app/appindex.html?lang=zh',
};

const PDF_CACHE_MS = 7 * 24 * 60 * 60 * 1000;

/** PHIP 文档类型关键词 */
const PHIP_DOC_KEYWORDS = ['聆訊後', '聆讯后', 'PHIP', 'Post-Hearing'];

function httpGetCurl(url) {
  const headerArgs = Object.entries(HEADERS).flatMap(([k, v]) => ['-H', `${k}: ${v}`]);
  return execFileSync(
    'curl',
    ['-sL', '--max-time', '180', '-A', HEADERS['User-Agent'], ...headerArgs, url],
    { encoding: 'buffer', maxBuffer: 100 * 1024 * 1024 }
  );
}

function isPdfBuffer(buf) {
  return buf.length >= 4 && buf.slice(0, 4).toString() === '%PDF';
}

function httpGet(url, retries = 3) {
  return new Promise((resolve, reject) => {
    const attempt = (left) => {
      const client = url.startsWith('https') ? https : http;
      const req = client.get(url, { headers: HEADERS }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const loc = res.headers.location.startsWith('http')
            ? res.headers.location
            : new URL(res.headers.location, url).href;
          httpGet(loc, left).then(resolve).catch(reject);
          return;
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          if (res.statusCode !== 200) {
            if (left > 1) {
              setTimeout(() => attempt(left - 1), 800);
              return;
            }
            reject(new Error(`HTTP ${res.statusCode}: ${url}`));
            return;
          }
          resolve(Buffer.concat(chunks));
        });
      });
      req.on('error', (err) => {
        if (left > 1) {
          setTimeout(() => attempt(left - 1), 800);
          return;
        }
        try {
          resolve(httpGetCurl(url));
        } catch {
          reject(err);
        }
      });
      req.setTimeout(120000, () => {
        req.destroy();
        if (left > 1) {
          setTimeout(() => attempt(left - 1), 800);
          return;
        }
        try {
          resolve(httpGetCurl(url));
        } catch {
          reject(new Error(`超时: ${url}`));
        }
      });
    };
    attempt(retries);
  });
}

/**
 * 从 IPO 列表解析最新 PHIP 全文 PDF
 */
function resolvePhipDoc(companyId, ipoListPath = PATHS.ipoList) {
  if (!fs.existsSync(ipoListPath)) return null;

  const ipoData = JSON.parse(fs.readFileSync(ipoListPath, 'utf-8'));
  const applicant = ipoData.applicants?.find((a) => a.id === companyId);
  if (!applicant?.documents?.latest?.length) return null;

  const phipDoc = applicant.documents.latest.find((d) => {
    const type = d.docType || '';
    return PHIP_DOC_KEYWORDS.some((kw) => type.includes(kw));
  });

  if (!phipDoc?.fullDocUrl) return null;

  return {
    companyId,
    name: applicant.name,
    postingDate: applicant.postingDate,
    docType: phipDoc.docType,
    fullDocUrl: phipDoc.fullDocUrl,
    multiFileUrl: phipDoc.multiFileUrl || null,
    date: phipDoc.date,
    source: '港交所 IPO 列表 / stock/hk_ipo/active_ap-phip_sehk.json',
  };
}

async function downloadPdf(url, destPath, force = false) {
  if (!force && fs.existsSync(destPath)) {
    const stat = fs.statSync(destPath);
    if (Date.now() - stat.mtimeMs < PDF_CACHE_MS && stat.size > 1024 && isPdfBuffer(fs.readFileSync(destPath).slice(0, 4))) {
      return {
        path: destPath,
        size: stat.size,
        url,
        downloadedAt: stat.mtime.toISOString(),
        cached: true,
      };
    }
  }

  let buf;
  try {
    buf = httpGetCurl(url);
  } catch {
    buf = await httpGet(url);
  }

  if (!isPdfBuffer(buf)) {
    const preview = buf.slice(0, 200).toString('utf-8').replace(/\s+/g, ' ').slice(0, 80);
    throw new Error(`非 PDF 响应 (${buf.length} bytes): ${preview}`);
  }

  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, buf);
  return { path: destPath, size: buf.length, url, downloadedAt: new Date().toISOString(), cached: false };
}

/**
 * 下载 PHIP 全文 PDF（唯一需要下载的招股文件）
 */
async function downloadPhipPdf(companyId, options = {}) {
  const phip = options.phipDoc || resolvePhipDoc(companyId, options.ipoListPath);
  if (!phip?.fullDocUrl) {
    throw new Error(`未找到公司 ${companyId} 的 PHIP 全文 PDF`);
  }

  const pdfDir = path.join(options.destDir || PATHS.prospectusDir, String(companyId));
  const fileName = phip.fullDocUrl.split('/').pop();
  const dest = path.join(pdfDir, fileName);

  const meta = await downloadPdf(phip.fullDocUrl, dest, options.force);
  return { ...phip, ...meta, fileName };
}

async function extractTextFromPdf(filePath) {
  const buf = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: buf });
  const data = await parser.getText();
  return {
    text: data.text || '',
    pages: data.numpages || data.numPages || null,
  };
}

/**
 * 获取 PHIP 全文文本（带磁盘缓存）
 */
async function getPhipText(companyId, options = {}) {
  const meta = await downloadPhipPdf(companyId, options);
  const cacheFile = path.join(PATHS.phipTextDir, `${companyId}_${meta.fileName}.txt`);

  if (!options.force && fs.existsSync(cacheFile)) {
    const stat = fs.statSync(cacheFile);
    const pdfStat = fs.statSync(meta.path);
    if (stat.mtimeMs >= pdfStat.mtimeMs) {
      return {
        ...meta,
        text: fs.readFileSync(cacheFile, 'utf-8'),
        textCached: true,
      };
    }
  }

  const { text, pages } = await extractTextFromPdf(meta.path);
  fs.mkdirSync(PATHS.phipTextDir, { recursive: true });
  fs.writeFileSync(cacheFile, text, 'utf-8');

  return { ...meta, text, pages, textCached: false };
}

function parseOfferPriceFromText(text) {
  const patterns = [
    { re: /最高发售价(?:为|每股)?[^0-9]{0,20}([\d.]+)\s*港[元幣]/g, label: '最高发售价' },
    { re: /发售价(?:将)?(?:为|不高于|每股)?[^0-9]{0,30}([\d.]+)\s*港[元幣]/g, label: '发售价' },
    { re: /發售價(?:將)?(?:為|不高於|每股)?[^0-9]{0,30}([\d.]+)\s*港[元幣]/g, label: '發售價' },
    { re: /offer\s*price[^0-9]{0,30}HK?\$?\s*([\d.]+)/gi, label: 'offer price' },
    { re: /每股[^0-9]{0,10}([\d.]+)\s*港[元幣][^。\n]{0,40}(?:发售|發售|全球发售|全球發售)/g, label: '每股港元+发售' },
  ];

  const hits = [];
  for (const { re, label } of patterns) {
    let m;
    while ((m = re.exec(text)) !== null) {
      const price = parseFloat(m[1]);
      if (price > 1 && price < 10000) {
        hits.push({
          price,
          label,
          snippet: text.slice(Math.max(0, m.index - 40), m.index + 80).replace(/\s+/g, ' '),
        });
      }
    }
  }

  if (hits.length === 0) return null;

  const freq = {};
  hits.forEach((h) => {
    const key = h.price.toFixed(2);
    freq[key] = (freq[key] || 0) + 1;
  });
  const best = Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
  const bestHit = hits.find((h) => h.price.toFixed(2) === best);

  return {
    price: parseFloat(best),
    currency: 'HKD',
    source: 'PHIP PDF 文本解析',
    pattern: bestHit.label,
    snippet: bestHit.snippet,
  };
}

function parseExchangeRateFromText(text) {
  const patterns = [
    /(?:人民币|人民幣)[^0-9]{0,20}(?:兑|兌|相当于)[^0-9]{0,10}([\d.]+)\s*港[元幣]/,
    /1\.00\s*港[元幣][^0-9]{0,20}(?:相当于|約|约)[^0-9]{0,10}([\d.]+)\s*(?:人民币|人民幣|元)/,
    /(?:汇率|匯率)[^0-9]{0,30}([\d.]+)/,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const val = parseFloat(m[1]);
      if (val > 0.5 && val < 2) {
        return { cnyPerHkd: val, source: 'PHIP PDF 文本解析', snippet: m[0] };
      }
    }
  }
  return null;
}

/**
 * 从 PHIP 解析 H 股发售价；PHIP 阶段常无最终定价
 */
async function parseHOfferPriceFromPhip(companyId, options = {}) {
  const dataSources = [];
  const phipMeta = await getPhipText(companyId, options);

  dataSources.push({
    field: 'phipPdf',
    source: '聆讯后资料集（PHIP）全文 PDF',
    url: phipMeta.fullDocUrl,
    file: phipMeta.path,
    docType: phipMeta.docType,
    pages: phipMeta.pages,
    cached: phipMeta.cached,
  });

  const offer = parseOfferPriceFromText(phipMeta.text);
  if (offer) {
    offer.pdfFile = phipMeta.path;
    offer.pdfUrl = phipMeta.fullDocUrl;
    offer.pdfLabel = phipMeta.docType;
    dataSources.push({
      field: 'hOfferPrice',
      value: offer.price,
      source: 'PHIP PDF',
      pattern: offer.pattern,
      snippet: offer.snippet,
    });
    return { hOffer: offer, prospectusFile: phipMeta, dataSources, phipMeta };
  }

  dataSources.push({
    field: 'hOfferPrice',
    source: 'PHIP PDF',
    note: 'PHIP 阶段通常显示 [编纂] 占位，无最终发售价',
  });

  return { hOffer: null, prospectusFile: phipMeta, dataSources, phipMeta };
}

module.exports = {
  PATHS,
  PHIP_DOC_KEYWORDS,
  resolvePhipDoc,
  downloadPhipPdf,
  getPhipText,
  parseOfferPriceFromText,
  parseExchangeRateFromText,
  parseHOfferPriceFromPhip,
};
