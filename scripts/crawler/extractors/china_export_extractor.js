const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');
const BaseDataExtractor = require('./base_data_extractor');
const { isRmbFile: isRmbFileUtil } = require('../../tools/china_export_xls_to_json');

/**
 * 海关总署「出口重点/主要商品量值表」附件下载
 *
 * 列表页分页规律：…/9f806879-{page}.html（{page} = 1, 2, 3…）
 *
 * WAF 机制说明：
 *   - HTML 页面（列表页/详情页）返回 412 + JS 挑战，需用真实 Chrome 访问
 *   - 附件（.xls / .xlsx）是静态文件，axios 可直接下载（不触发 WAF）
 *
 * 运行前提：本机已安装 Google Chrome（路径见 REAL_CHROME_PATH）
 */

/** 系统真实 Chrome 路径（macOS） */
const REAL_CHROME_PATH =
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

/** Playwright 用户数据目录（持久 session，避免每次初始化） */
const USER_DATA_DIR = path.join(os.tmpdir(), 'pw-customs-export-profile');

class ChinaExportExtractor extends BaseDataExtractor {
  /**
   * @param {string} [downloadDir]
   * @param {object} [options]
   */
  constructor(downloadDir, options = {}) {
    const cfg = require('../framework/crawler_config.js').chinaExport || {};
    const merged = { ...cfg, ...options };
    const dir =
      downloadDir ||
      path.join(__dirname, '../../../stock', merged.downloadDirRel || 'china_export');
    super(dir, merged);

    this.downloadDir = dir;
    this.listUrlTemplate = merged.listUrlTemplate;
    this.pagination = merged.pagination || { startPage: 1, endPage: 3 };
    this.yearRange = merged.yearRange || {};
    /** 链接标题同时包含这些词才算目标 */
    this.titleKeywords = merged.titleKeywords || ['出口', '商品', '量值'];
    this.excludeKeywords = merged.excludeKeywords || [];
    this.delayBetweenRequests = merged.delayBetweenRequests ?? 1500;
    this.maxRetries = merged.maxRetries ?? 3;
    this.timeout = merged.timeout ?? 30000;

    /** @type {import('playwright').BrowserContext|null} */
    this._browser = null;
  }

  sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  /** 标题关键词匹配，同时检查排除词 */
  matchTitle(text) {
    const t = (text || '').replace(/\s+/g, '');
    if (!t.length) return false;
    if (!this.titleKeywords.every((kw) => t.includes(kw))) return false;
    if (this.excludeKeywords.some((kw) => t.includes(kw))) return false;
    return true;
  }

  /**
   * 检查已下载的 xls 是否为人民币版本
   * @param {string} filepath
   * @returns {boolean}
   */
  isRmbFile(filepath) {
    return isRmbFileUtil(filepath);
  }

  /**
   * 清理标题：去掉开头序号前缀及所有括号内容，如「（3）」「(5)」「（人民币值）」
   * @param {string} title
   */
  cleanTitle(title) {
    return (title || '')
      .replace(/^[（(]\d+[）)]\s*/, '')   // 开头序号，如 （3）
      .replace(/[（(][^（(）)]*[）)]/g, '') // 所有括号及其内容
      .trim();
  }

  /**
   * 从海关总署详情页 URL 提取发布日期
   * 支持 /customs/2026-01/14/ 和 /customs/2026-03/25/ 等格式
   * @param {string} url
   * @returns {string|null} 如 "2026-01-14"
   */
  extractPublishDateFromUrl(url) {
    const m = (url || '').match(/\/customs\/(\d{4})-(\d{2})\/(\d{2})\//);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    return null;
  }

  /** 从标题解析年月，用于年份过滤和文件命名 */
  parsePeriodFromTitle(title) {
    const m = (title || '').match(/(\d{4})年(\d{1,2})月/);
    if (!m) return null;
    const year = Number(m[1]);
    const month = Number(m[2]);
    const publishDate = `${m[1]}-${String(month).padStart(2, '0')}-01`;
    return { year, month, publishDate };
  }

  yearAllowed(year) {
    if (year == null || Number.isNaN(year)) return true;
    const { minYear, maxYear } = this.yearRange;
    if (minYear != null && year < minYear) return false;
    if (maxYear != null && year > maxYear) return false;
    return true;
  }

  buildListUrl(pageNum) {
    return this.listUrlTemplate.replace(/\{page\}/g, String(pageNum));
  }

  // ─── Playwright 浏览器管理 ───────────────────────────────────────────────

  async getBrowser() {
    if (this._browser) return this._browser;
    const { chromium } = require('playwright');
    this._browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
      headless: false,
      executablePath: REAL_CHROME_PATH,
      args: ['--disable-blink-features=AutomationControlled'],
      ignoreDefaultArgs: ['--enable-automation'],
      locale: 'zh-CN',
    });
    return this._browser;
  }

  async closeBrowser() {
    if (this._browser) {
      await this._browser.close().catch(() => {});
      this._browser = null;
    }
  }

  /**
   * 用 Playwright 打开 URL，等待 networkidle，返回 HTML 字符串
   * @param {string} url
   */
  async fetchHtmlViaBrowser(url) {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: this.timeout }).catch(() => {});
      await page.waitForTimeout(1500);
      const html = await page.content();
      return html;
    } finally {
      await page.close();
    }
  }

  // ─── 页面解析 ───────────────────────────────────────────────────────────

  /**
   * 从列表页 HTML 提取匹配的详情页链接
   * @param {string} html
   * @param {string} baseUrl
   * @returns {Array<{ title: string, detailUrl: string }>}
   */
  collectDetailLinks(html, baseUrl) {
    const cheerio = require('cheerio');
    const $ = cheerio.load(html);
    const out = [];
    const seen = new Set();

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href || /^javascript:/i.test(href)) return;
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      if (!this.matchTitle(text)) return;
      if (/\.xlsx?$/i.test(href)) return; // 直接文件链接，跳过（列表页不太可能）
      const abs = this.resolveUrl(href, baseUrl);
      if (!abs || seen.has(abs)) return;
      seen.add(abs);
      out.push({ title: text, detailUrl: abs });
    });

    return out;
  }

  resolveUrl(href, baseUrl) {
    try {
      if (!href) return href;
      if (href.startsWith('http')) return href;
      const base = new URL(baseUrl);
      let h = href;
      if (h.startsWith('./')) h = h.slice(2);
      if (h.startsWith('/')) return `${base.protocol}//${base.host}${h}`;
      const basePath = base.pathname.substring(0, base.pathname.lastIndexOf('/'));
      return `${base.protocol}//${base.host}${basePath}/${h}`;
    } catch {
      return href;
    }
  }

  /**
   * 从 Playwright page 对象中提取「下载」链接（.xls / .xlsx）
   * 优先找文字为「下载」的 <a>，再找所有 .xls 后缀链接
   * @param {import('playwright').Page} page
   * @param {string} pageUrl
   */
  async findXlsUrlFromPage(page, pageUrl) {
    const links = await page.$$eval('a[href]', (els) =>
      els.map((a) => ({ text: a.textContent.trim(), href: a.href }))
    );

    const xlsLinks = links.filter((l) => /\.xlsx?$/i.test(l.href));
    if (xlsLinks.length === 0) return null;

    // 优先取文字是「下载」的
    const downloadLink = xlsLinks.find((l) => l.text === '下载');
    const pick = downloadLink || xlsLinks[0];
    return pick.href;
  }

  // ─── 下载 ───────────────────────────────────────────────────────────────

  /**
   * 用 axios 直接下载附件（静态文件，不触发 WAF）
   * @param {string} fileUrl
   * @param {{ title: string, detailUrl: string }} meta
   */
  async downloadXls(fileUrl, meta) {
    const ext = this.guessExtFromUrl(fileUrl) || 'xls';
    const cleanedTitle = this.cleanTitle(meta.title);
    const period = this.parsePeriodFromTitle(cleanedTitle);
    const publishDate =
      this.extractPublishDateFromUrl(meta.detailUrl) ||
      (this.extractDateInfo(meta.detailUrl || fileUrl) || {}).publishDate ||
      (period ? period.publishDate : null) ||
      new Date().toISOString().slice(0, 10);
    const filename = this.buildRawFilename(publishDate, cleanedTitle, ext);
    const filepath = path.join(this.downloadDir, filename);

    if (this.shouldSkipExistingFile(filepath, this.skipExistingFiles)) {
      return { skipped: true, file: filepath };
    }

    let lastErr;
    for (let i = 0; i < this.maxRetries; i++) {
      try {
        const res = await axios.get(fileUrl, {
          responseType: 'arraybuffer',
          timeout: this.timeout,
          validateStatus: () => true,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            Referer: meta.detailUrl || 'http://www.customs.gov.cn/',
          },
        });
        if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
        fs.writeFileSync(filepath, Buffer.from(res.data));
        // 下载后验证是否为人民币版本
        if (!this.isRmbFile(filepath)) {
          fs.unlinkSync(filepath);
          console.log(`✗ 非人民币版本，已删除: ${path.basename(filepath)}`);
          await this.sleep(this.delayBetweenRequests);
          return null;
        }
        console.log(`✓ 已保存: ${path.basename(filepath)}`);
        await this.sleep(this.delayBetweenRequests);
        return { skipped: false, file: filepath };
      } catch (e) {
        lastErr = e;
        console.warn(`下载失败 (${i + 1}/${this.maxRetries}): ${e.message}`);
        if (i < this.maxRetries - 1) await this.sleep(2000 * (i + 1));
      }
    }
    throw lastErr;
  }

  // ─── 核心流程 ────────────────────────────────────────────────────────────

  /**
   * 当无 XLS 下载链接时，尝试从 HTML 表格提取数据并保存为 JSON
   * @param {import('playwright').Page} page
   * @param {{ title: string, detailUrl: string }} item
   * @returns {Promise<{ skipped: boolean, file: string }|null>}
   */
  async tryExtractHtmlTable(page, item) {
    const { parseExportHtmlTable, saveHtmlExtracted } = require('../../tools/china_export_html_parse');
    const html = await page.content();
    const data = parseExportHtmlTable(html, item.title);
    if (!data) {
      console.warn(`  ✗ 未找到 xls 下载链接，且页面无有效数据表格: ${item.detailUrl}`);
      return null;
    }

    // 美元版在 parseExportHtmlTable 里已返回 null，这里只处理 RMB
    const filepath = saveHtmlExtracted(data, item.title, this.downloadDir);
    if (!filepath) {
      console.warn(`  ✗ HTML 表格数据提取成功但保存失败: ${item.detailUrl}`);
      return null;
    }

    const period = data.meta.period || {};
    console.log(`✓ HTML 表格提取: ${path.basename(filepath)} (${period.year}-${String(period.month || 0).padStart(2, '0')}，${data.items.length} 条商品)`);
    return { skipped: false, file: filepath };
  }

  /**
   * @param {{ title: string, detailUrl: string }} item
   * @param {Set<string>} seenFileUrls
   */
  async processDetailPage(item, seenFileUrls) {
    const period = this.parsePeriodFromTitle(item.title);
    const year = period ? period.year : null;
    if (!this.yearAllowed(year)) {
      console.log(`  跳过（年份限制 ${year}）: ${item.title.slice(0, 50)}`);
      return null;
    }

    console.log(`  详情页: ${item.title.slice(0, 60)}`);
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
      await page
        .goto(item.detailUrl, { waitUntil: 'networkidle', timeout: this.timeout })
        .catch(() => {});
      await page.waitForTimeout(1500);
      const fileUrl = await this.findXlsUrlFromPage(page, item.detailUrl);
      if (!fileUrl) {
        // 降级：尝试从 HTML 表格提取数据
        return await this.tryExtractHtmlTable(page, item);
      }
      if (seenFileUrls.has(fileUrl)) {
        console.log(`  跳过重复: ${fileUrl}`);
        return null;
      }
      seenFileUrls.add(fileUrl);

      let result;
      try {
        result = await this.downloadXls(fileUrl, item);
      } catch (e) {
        // XLS 下载失败（如 404），降级到 HTML 表格
        console.warn(`  XLS 下载失败 (${e.message})，尝试 HTML 表格提取...`);
        result = await this.tryExtractHtmlTable(page, item);
      }
      return result;
    } finally {
      await page.close();
    }
  }

  /**
   * 主爬取入口
   * @param {object} [override]
   * @param {{ startPage?: number, endPage?: number, minYear?: number|null, maxYear?: number|null }} [override]
   */
  async crawl(override = {}) {
    const start = override.startPage ?? this.pagination.startPage ?? 1;
    const end = override.endPage ?? this.pagination.endPage ?? 1;
    if (end < start) throw new Error(`endPage(${end}) < startPage(${start})`);
    if (override.minYear !== undefined) this.yearRange.minYear = override.minYear;
    if (override.maxYear !== undefined) this.yearRange.maxYear = override.maxYear;

    const files = [];
    const seenFileUrls = new Set();

    try {
      for (let page = start; page <= end; page++) {
        const listUrl = this.buildListUrl(page);
        console.log(`\n列表页 ${page}/${end}: ${listUrl}`);
        let html;
        try {
          html = await this.fetchHtmlViaBrowser(listUrl);
        } catch (e) {
          console.error(`  列表页加载失败: ${e.message}`);
          continue;
        }

        const candidates = this.collectDetailLinks(html, listUrl);
        console.log(`  匹配到 ${candidates.length} 条候选链接`);

        for (const item of candidates) {
          try {
            const r = await this.processDetailPage(item, seenFileUrls);
            if (r && r.file) files.push(r.file);
          } catch (e) {
            console.warn(`  处理失败: ${e.message}`);
          }
        }
      }
    } finally {
      await this.closeBrowser();
    }

    return { files, totalSaved: files.length };
  }
}

module.exports = ChinaExportExtractor;
