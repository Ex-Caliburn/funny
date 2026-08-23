const fs = require('fs');
const path = require('path');
const BaseDataExtractor = require('./base_data_extractor');

/**
 * 财政部国库司「财政收支情况」正文页下载
 *
 * 列表页分页规律：
 *   第 1 页：https://gks.mof.gov.cn/tongjishuju/index.htm
 *   第 2 页起：index_1.htm、index_2.htm …（页码从 0 开始，故 index_{page-1}.htm）
 *
 * 与海关总署不同：本站无 JS 挑战，无需 Playwright，但 WAF 会对 axios 请求回 400
 * （axios 走 Node http 模块，header 顺序/形态被识别）。实测 Node 原生 fetch(undici)
 * 与 curl 均可正常返回 200，故此处统一用原生 fetch。
 * 详情页没有 xls 附件，数据全在正文段落里，因此直接把详情页 HTML 落盘，
 * 由 scripts/tools/mof_fiscal_parse.js 统一解析成 JSON。
 *
 * 重要口径：所有公布值均为「年初至今累计值」，标题里的「5月」实际是「1-5月」。
 */

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

class MofFiscalExtractor extends BaseDataExtractor {
  /**
   * @param {string} [downloadDir]
   * @param {object} [options]
   */
  constructor(downloadDir, options = {}) {
    const cfg = require('../framework/crawler_config.js').mofFiscal || {};
    const merged = { ...cfg, ...options };
    const dir =
      downloadDir ||
      path.join(__dirname, '../../../stock', merged.downloadDirRel || 'mof_fiscal');
    super(dir, merged);

    this.downloadDir = dir;
    this.listIndexUrl = merged.listIndexUrl;
    this.listUrlTemplate = merged.listUrlTemplate;
    this.pagination = merged.pagination || { startPage: 1, endPage: 4 };
    this.yearRange = merged.yearRange || {};
    this.titleKeywords = merged.titleKeywords || ['财政收支情况'];
    this.excludeKeywords = merged.excludeKeywords || [];
    this.maxScanPages = merged.maxScanPages ?? 6;
    this.delayBetweenRequests = merged.delayBetweenRequests ?? 400;
    this.maxRetries = merged.maxRetries ?? 3;
    this.timeout = merged.timeout ?? 30000;
  }

  sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  /** 标题关键词匹配（含排除词） */
  matchTitle(text) {
    const t = (text || '').replace(/\s+/g, '');
    if (!t.length) return false;
    if (!this.titleKeywords.every((kw) => t.includes(kw))) return false;
    if (this.excludeKeywords.some((kw) => t.includes(kw))) return false;
    return true;
  }

  /**
   * 从标题解析统计期（year + 累计截止月）
   * 支持：2026年1-7月 / 上半年 / 一季度 / 前三季度 / 2025年（全年）/ 2024年11月（老格式）
   * @param {string} title
   * @returns {{ year: number, cumMonth: number, periodLabel: string }|null}
   */
  parsePeriodFromTitle(title) {
    const t = (title || '').replace(/\s+/g, '');
    const ym = t.match(/(\d{4})年/);
    if (!ym) return null;
    const year = Number(ym[1]);
    const rest = t.slice(t.indexOf('年') + 1);

    let cumMonth = null;
    let m;
    // 1-7月 / 1—7月 / 1至7月
    if ((m = rest.match(/1\s*[-—–~至]\s*(\d{1,2})\s*月/))) {
      cumMonth = Number(m[1]);
    } else if (/上半年/.test(rest)) {
      cumMonth = 6;
    } else if (/前三季度/.test(rest)) {
      cumMonth = 9;
    } else if (/一季度|第一季度/.test(rest)) {
      cumMonth = 3;
    } else if (/前两季度|前二季度/.test(rest)) {
      cumMonth = 6;
    } else if ((m = rest.match(/^(\d{1,2})\s*月/))) {
      // 老格式：「2024年11月财政收支情况」，正文实为 1-11 月累计
      cumMonth = Number(m[1]);
    } else if (/^财政收支情况/.test(rest)) {
      cumMonth = 12; // 全年
    }

    if (cumMonth == null || cumMonth < 1 || cumMonth > 12) return null;
    const periodLabel = cumMonth === 12 ? `${year}年全年` : `${year}年1-${cumMonth}月`;
    return { year, cumMonth, periodLabel };
  }

  yearAllowed(year) {
    if (year == null || Number.isNaN(year)) return true;
    const { minYear, maxYear } = this.yearRange;
    if (minYear != null && year < minYear) return false;
    if (maxYear != null && year > maxYear) return false;
    return true;
  }

  /** 第 1 页用 index.htm，第 N 页用 index_{N-1}.htm */
  buildListUrl(pageNum) {
    const p = Number(pageNum);
    if (p <= 1) return this.listIndexUrl;
    return this.listUrlTemplate.replace(/\{page\}/g, String(p - 1));
  }

  isValidListHtml(html) {
    const s = html || '';
    if (s.length < 1000) return false;
    if (/404 Not Found|页面不存在/i.test(s)) return false;
    return true;
  }

  resolveUrl(href, baseUrl) {
    try {
      return new URL(href, baseUrl).href;
    } catch {
      return href;
    }
  }

  // ─── 抓取 ───────────────────────────────────────────────────────────────

  /**
   * 抓 HTML，自动按 meta charset 解码（老页面可能是 gb2312）
   * 必须用原生 fetch：axios 会被该站 WAF 判 400
   * @param {string} url
   */
  async fetchHtml(url) {
    let lastErr;
    for (let i = 0; i < this.maxRetries; i++) {
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': UA,
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9',
          },
          signal: AbortSignal.timeout(this.timeout),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        return this.decodeBuffer(buf);
      } catch (e) {
        lastErr = e;
        if (i < this.maxRetries - 1) await this.sleep(1000 * (i + 1));
      }
    }
    throw lastErr;
  }

  /**
   * @param {Buffer} buf
   * @returns {string}
   */
  decodeBuffer(buf) {
    const head = buf.slice(0, 2048).toString('latin1');
    const m = head.match(/charset\s*=\s*["']?([\w-]+)/i);
    const charset = (m ? m[1] : 'utf-8').toLowerCase();
    if (/gb2312|gbk|gb18030/.test(charset)) {
      try {
        return new TextDecoder('gb18030').decode(buf);
      } catch {
        return buf.toString('utf8');
      }
    }
    return buf.toString('utf8');
  }

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
      if (/\.(pdf|xlsx?|docx?|zip)$/i.test(href)) return; // 附件类跳过
      // title 属性通常是完整标题，链接文字可能被截断
      const title = ($(el).attr('title') || $(el).text() || '').replace(/\s+/g, ' ').trim();
      if (!this.matchTitle(title)) return;
      const abs = this.resolveUrl(href, baseUrl);
      if (!abs || seen.has(abs)) return;
      seen.add(abs);
      out.push({ title, detailUrl: abs });
    });

    return out;
  }

  /** 候选链接中的最大数据年份，用于按年份范围提前停止翻页 */
  maxCandidateYear(candidates) {
    let max = null;
    for (const item of candidates) {
      const p = this.parsePeriodFromTitle(item.title);
      if (p && (max == null || p.year > max)) max = p.year;
    }
    return max;
  }

  /**
   * 文件名：2026-07_2026年1-7月财政收支情况.html（按期排序友好）
   * @param {{ year: number, cumMonth: number }} period
   * @param {string} title
   */
  buildFilename(period, title) {
    const key = `${period.year}-${String(period.cumMonth).padStart(2, '0')}`;
    const t = (title || '').replace(/[<>:"/\\|?*'=]/g, '').replace(/\s+/g, '').slice(0, 40);
    return `${key}_${t}.html`;
  }

  /**
   * 下载详情页正文 HTML
   * @param {{ title: string, detailUrl: string }} item
   */
  async processDetailPage(item) {
    const period = this.parsePeriodFromTitle(item.title);
    if (!period) {
      console.log(`  跳过（标题无法解析统计期）: ${item.title.slice(0, 40)}`);
      return null;
    }
    if (!this.yearAllowed(period.year)) {
      console.log(`  跳过（年份限制 ${period.year}）: ${item.title.slice(0, 40)}`);
      return null;
    }

    const filename = this.buildFilename(period, item.title);
    const filepath = path.join(this.downloadDir, filename);
    if (this.shouldSkipExistingFile(filepath, this.skipExistingFiles)) {
      return { skipped: true, file: filepath };
    }

    const html = await this.fetchHtml(item.detailUrl);
    if (!html || html.length < 2000) {
      console.warn(`  ✗ 详情页内容异常: ${item.detailUrl}`);
      return null;
    }
    // 记录来源，便于溯源
    const withMeta = `<!-- source: ${item.detailUrl} -->\n<!-- title: ${item.title} -->\n<!-- period: ${period.periodLabel} -->\n${html}`;
    fs.writeFileSync(filepath, withMeta, 'utf8');
    console.log(`✓ 已保存: ${filename}`);
    await this.sleep(this.delayBetweenRequests);
    return { skipped: false, file: filepath };
  }

  // ─── 主流程 ──────────────────────────────────────────────────────────────

  /**
   * @param {{ startPage?: number, endPage?: number, minYear?: number|null, maxYear?: number|null }} [override]
   */
  async crawl(override = {}) {
    const start = override.startPage ?? this.pagination.startPage ?? 1;
    const end = override.endPage ?? this.pagination.endPage ?? 4;
    if (end < start) throw new Error(`endPage(${end}) < startPage(${start})`);
    if (override.minYear !== undefined) this.yearRange.minYear = override.minYear;
    if (override.maxYear !== undefined) this.yearRange.maxYear = override.maxYear;

    const files = [];
    const seenDetailUrls = new Set();
    const minYear = this.yearRange.minYear;

    for (let page = start; page <= end; page++) {
      const listUrl = this.buildListUrl(page);
      console.log(`\n列表页 ${page}/${end}: ${listUrl}`);
      let html;
      try {
        html = await this.fetchHtml(listUrl);
      } catch (e) {
        console.error(`  列表页加载失败: ${e.message}`);
        continue;
      }
      if (!this.isValidListHtml(html)) {
        console.log('  列表页无效或已到末页，停止翻页');
        break;
      }

      const candidates = this.collectDetailLinks(html, listUrl);
      console.log(`  匹配到 ${candidates.length} 条候选链接`);

      const pageMaxYear = this.maxCandidateYear(candidates);
      if (minYear != null && candidates.length > 0 && pageMaxYear != null && pageMaxYear < minYear) {
        console.log(`  本页数据年份已早于 ${minYear}，停止翻页`);
        break;
      }

      for (const item of candidates) {
        if (seenDetailUrls.has(item.detailUrl)) continue;
        seenDetailUrls.add(item.detailUrl);
        try {
          const r = await this.processDetailPage(item);
          if (r && r.file) files.push(r.file);
        } catch (e) {
          console.warn(`  处理失败 (${item.title.slice(0, 30)}): ${e.message}`);
        }
      }
    }

    return { files, totalSaved: files.length };
  }

  /**
   * 仅抓最新 N 期（按统计期去重）
   * @param {number} periodCount
   */
  async crawlRecentPeriods(periodCount = 1) {
    const start = this.pagination.startPage ?? 1;
    const maxPages = Math.min(this.maxScanPages ?? 6, 3);
    const all = [];
    const seenDetailUrls = new Set();

    for (let page = start; page <= maxPages; page++) {
      const listUrl = this.buildListUrl(page);
      console.log(`\n列表页 ${page}: ${listUrl}`);
      let html;
      try {
        html = await this.fetchHtml(listUrl);
      } catch (e) {
        console.error(`  列表页加载失败: ${e.message}`);
        continue;
      }
      if (!this.isValidListHtml(html)) break;

      for (const item of this.collectDetailLinks(html, listUrl)) {
        if (seenDetailUrls.has(item.detailUrl)) continue;
        seenDetailUrls.add(item.detailUrl);
        const p = this.parsePeriodFromTitle(item.title);
        if (!p) continue;
        all.push({ item, period: p });
      }
      if (all.length >= periodCount) break;
    }

    all.sort(
      (a, b) =>
        b.period.year - a.period.year || b.period.cumMonth - a.period.cumMonth
    );
    const toDownload = all.slice(0, periodCount);
    console.log(
      `\n最新 ${periodCount} 期: ${toDownload.map((x) => x.period.periodLabel).join(', ') || '（无匹配）'}`
    );

    const files = [];
    for (const { item } of toDownload) {
      try {
        const r = await this.processDetailPage(item);
        if (r && r.file) files.push(r.file);
      } catch (e) {
        console.warn(`  处理失败: ${e.message}`);
      }
    }
    return { files, totalSaved: files.length };
  }
}

module.exports = MofFiscalExtractor;
