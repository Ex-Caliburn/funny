const axios = require('axios');
const cheerio = require('cheerio');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const BaseDataExtractor = require('./base_data_extractor');

/**
 * 产能利用率数据提取器
 * 从统计局网站提取产能利用率数据
 */
class CapacityUtilizationExtractor extends BaseDataExtractor {
  constructor(downloadDir, options) {
    const dir = downloadDir || path.join(__dirname, '../../../stock/capacity_utilization');
    super(dir, options);
    this.downloadDir = dir;
  }

  /**
   * 处理详情页面，提取产能利用率数据
   */
  async processDetailPage(detailUrl) {
    try {
      const response = await this.fetchWithRetry(detailUrl);
      const $ = cheerio.load(response.data);

      // 1. 优先查找"相关数据表"或附件链接
      const dataTableLink = this.findDataTableLink($, detailUrl);
      if (dataTableLink) {
        return await this.downloadFile(dataTableLink, detailUrl);
      }

      // 2. 尝试查找页面中的表格数据
      return await this.extractFromPageTable($, detailUrl);

    } catch (error) {
      console.error(`处理产能利用率数据失败 ${detailUrl}:`, error.message);
      return null;
    }
  }

  /**
   * 查找"相关数据表"或附件下载链接
   */
  findDataTableLink($, baseUrl) {
    // 查找包含"相关数据表"、"点击下载"等关键词的链接
    const keywords = ['相关数据表', '点击下载', '附件', 'download', '.xls', '.xlsx'];
    const anchors = $('a[href]');

    for (let i = 0; i < anchors.length; i++) {
      const el = anchors.eq(i);
      const text = el.text().replace(/\s+/g, '');
      const href = el.attr('href');

      if (!href) continue;

      // 检查文本或href是否包含关键词
      const matchesKeyword = keywords.some(kw =>
        text.includes(kw) || href.toLowerCase().includes(kw.toLowerCase())
      );

      if (matchesKeyword) {
        try {
          return new URL(href, baseUrl).href;
        } catch (e) {
          console.error('URL解析失败:', href);
        }
      }
    }

    return null;
  }

  /**
   * 从页面表格提取数据
   */
  async extractFromPageTable($, detailUrl) {
    try {
      // 使用基类的 extractPageTitle 方法提取标题
      const title = this.extractPageTitle($);

      // 从URL提取发布日期（格式：YYYY-MM-DD）
      const publishDate = this.extractPublishDateFromUrl(detailUrl);

      // 查找表格
      const tables = $('table');
      if (tables.length === 0) {
        return null;
      }

      // 解析第一个包含产能利用率数据的表格
      const mainTable = this.findMainTable($, tables);
      if (!mainTable) {
        return null;
      }

      // 转换表格为工作簿
      const workbook = this.tableToWorkbook(mainTable, $);

      // 使用基类的 buildRawFilename 方法构建文件名
      const filename = this.buildRawFilename(publishDate, title, 'xlsx');
      const filepath = path.join(this.downloadDir, filename);

      xlsx.writeFile(workbook, filepath);

      return {
        success: true,
        filename,
        file: filepath,
        method: 'page_table'
      };

    } catch (error) {
      console.error('从页面提取表格失败:', error.message);
      return null;
    }
  }

  /**
   * 查找主要数据表格
   */
  findMainTable($, tables) {
    for (let i = 0; i < tables.length; i++) {
      const table = tables.eq(i);
      const text = table.text();

      // 检查表格是否包含产能利用率相关的关键词
      if (text.includes('产能利用率') || text.includes('季度') || text.includes('行业')) {
        return table;
      }
    }
    return tables.first();
  }

  /**
   * 将HTML表格转换为Excel工作簿
   */
  tableToWorkbook(table, $) {
    const rows = [];

    // 解析表头
    table.find('tr').each((i, tr) => {
      const row = [];
      $(tr).find('th, td').each((j, cell) => {
        const $cell = $(cell);
        let text = $cell.text().trim();

        // 处理合并单元格
        const colspan = parseInt($cell.attr('colspan') || '1');
        const rowspan = parseInt($cell.attr('rowspan') || '1');

        row.push(text);

        // 为合并单元格填充空值
        for (let k = 1; k < colspan; k++) {
          row.push('');
        }
      });

      if (row.length > 0) {
        rows.push(row);
      }
    });

    // 创建工作簿
    const worksheet = xlsx.utils.aoa_to_sheet(rows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, '产能利用率');

    return workbook;
  }

  /**
   * 下载文件
   */
  async downloadFile(fileUrl, referer) {
    try {
      const response = await axios({
        method: 'GET',
        url: fileUrl,
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
          'Referer': referer,
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });

      // 从referer页面获取标题和日期
      const pageResponse = await this.fetchWithRetry(referer);
      const $ = cheerio.load(pageResponse.data);

      // 使用基类的 extractPageTitle 方法，它会自动清理 JavaScript 代码
      const title = this.extractPageTitle($);
      const publishDate = this.extractPublishDateFromUrl(referer);

      // 判断文件扩展名
      const urlObj = new URL(fileUrl);
      const urlFilename = path.basename(urlObj.pathname);
      let ext = 'xlsx';
      if (urlFilename.match(/\.xlsx$/i)) {
        ext = 'xlsx';
      } else if (urlFilename.match(/\.xls$/i)) {
        ext = 'xls';
      } else {
        // 从Content-Type判断
        const contentType = response.headers['content-type'];
        if (contentType && contentType.includes('sheet')) {
          ext = 'xlsx';
        } else {
          ext = 'xls';
        }
      }

      // 使用基类的 buildRawFilename 方法构建文件名（已包含扩展名）
      const filename = this.buildRawFilename(publishDate, title, ext);

      // 保存文件
      const filepath = path.join(this.downloadDir, filename);
      fs.writeFileSync(filepath, response.data);

      return {
        success: true,
        filename,
        file: filepath,
        method: 'download'
      };

    } catch (error) {
      console.error(`文件下载失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 从URL提取发布日期（格式：YYYY-MM-DD）
   * 统计局URL格式：https://www.stats.gov.cn/sj/zxfb/202510/t20251020_1961598.html
   */
  extractPublishDateFromUrl(url) {
    // 匹配统计局URL中的日期格式：tYYYYMMDD
    const match = url.match(/\/t(\d{4})(\d{2})(\d{2})_/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }

    // 备用方案：匹配8位连续数字
    const match2 = url.match(/(\d{4})(\d{2})(\d{2})/);
    if (match2) {
      return `${match2[1]}-${match2[2]}-${match2[3]}`;
    }

    // 如果都没有匹配到，使用当前日期
    return new Date().toISOString().split('T')[0];
  }

  /**
   * 带重试的HTTP请求
   */
  async fetchWithRetry(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await axios.get(url, {
          timeout: 30000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          }
        });
        return response;
      } catch (error) {
        console.error(`请求失败 (尝试 ${i + 1}/${retries}):`, error.message);
        if (i === retries - 1) throw error;
        await this.sleep(1000 * (i + 1));
      }
    }
  }

  /**
   * 延迟函数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = CapacityUtilizationExtractor;

