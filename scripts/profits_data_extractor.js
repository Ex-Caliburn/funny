const axios = require('axios');
const cheerio = require('cheerio');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

/**
 * 规模以上工业增加值数据提取器
 * 参考 stats-export-extension 和其他成功提取器的逻辑
 */
class ProfitsDataExtractor {
  constructor() {
    this.downloadDir = path.join(__dirname, '../stock/profits');
    this.ensureDownloadDir();
  }

  ensureDownloadDir() {
    if (!fs.existsSync(this.downloadDir)) {
      fs.mkdirSync(this.downloadDir, { recursive: true });
    }
  }

  /**
   * 处理详情页面，提取工业增加值数据
   */
  async processDetailPage(detailUrl) {
    try {
      console.log(`正在提取工业增加值数据: ${detailUrl}`);
      
      const response = await this.fetchWithRetry(detailUrl);
      const $ = cheerio.load(response.data);
      
      // 1. 优先查找"相关数据表"链接
      const relatedDatasetLink = this.findRelatedDatasetLink($, detailUrl);
      if (relatedDatasetLink) {
        console.log(`找到相关数据表链接: ${relatedDatasetLink}`);
        return await this.downloadRelatedDataset(relatedDatasetLink, detailUrl, $);
      }
      
      // 2. 如果没有相关数据表，从页面表格中提取
      console.log('未找到相关数据表，从页面表格提取数据...');
      return await this.extractFromPageTable($, detailUrl);
      
    } catch (error) {
      console.error(`处理工业增加值数据失败 ${detailUrl}:`, error.message);
      return null;
    }
  }

  /**
   * 查找"相关数据表"链接
   */
  findRelatedDatasetLink($, baseUrl) {
    const anchors = $('a[href], button');
    for (let i = 0; i < anchors.length; i++) {
      const el = anchors.eq(i);
      const text = el.text().replace(/\s+/g, '');
      if (/相关数据表/.test(text)) {
        const href = el.attr('href');
        if (href) {
          try {
            return new URL(href, baseUrl).href;
          } catch (e) {
            // 继续查找
          }
        }
        const dataUrl = el.attr('data-url') || el.attr('data-href');
        if (dataUrl) {
          try {
            return new URL(dataUrl, baseUrl).href;
          } catch (e) {
            // 继续查找
          }
        }
      }
    }
    return null;
  }

  /**
   * 下载相关数据表
   */
  async downloadRelatedDataset(relatedUrl, detailUrl, detailPageDoc) {
    try {
      console.log(`正在下载相关数据表: ${relatedUrl}`);
      
      // 从详情页文档提取页面标题（而不是从相关数据表页面）
      const pageTitle = this.extractPageTitle(detailPageDoc);
      
      // 下载Excel文件
      const response = await this.fetchWithRetry(relatedUrl, 3, { responseType: 'arraybuffer' });
      
      // 生成文件名（使用页面标题）
      const dateInfo = this.extractDateInfo(detailUrl);
      const ext = this.guessExtFromUrl(relatedUrl) || 'xlsx';
      const filename = this.buildRawFilename(dateInfo.publishDate, pageTitle, ext);
      const filePath = path.join(this.downloadDir, filename);
      
      // 保存文件
      fs.writeFileSync(filePath, response.data);
      console.log(`已保存文件: ${filename}`);
      
      return {
        url: detailUrl,
        file: filePath,
        success: true
      };
    } catch (error) {
      console.error(`下载相关数据表失败 ${relatedUrl}:`, error.message);
      return null;
    }
  }

  /**
   * 从页面表格提取数据
   */
  async extractFromPageTable($, detailUrl) {
    try {
      const tables = $('table');
      if (tables.length === 0) {
        console.log('页面中没有找到表格');
        return null;
      }

      // 提取第一个表格
      const tableData = [];
      tables.first().find('tr').each((i, row) => {
        const rowData = [];
        $(row).find('td, th').each((j, cell) => {
          rowData.push($(cell).text().trim());
        });
        if (rowData.length > 0) {
          tableData.push(rowData);
        }
      });

      if (tableData.length === 0) {
        console.log('表格中没有数据');
        return null;
      }

      // 生成Excel文件
      const dateInfo = this.extractDateInfo(detailUrl);
      const pageTitle = this.extractPageTitle($);
      const filename = this.buildRawFilename(dateInfo.publishDate, pageTitle, 'xlsx');
      const filePath = path.join(this.downloadDir, filename);

      const ws = xlsx.utils.aoa_to_sheet(tableData);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
      xlsx.writeFile(wb, filePath);

      console.log(`已从页面表格生成文件: ${filename}`);
      return {
        url: detailUrl,
        file: filePath,
        success: true
      };
    } catch (error) {
      console.error(`从页面表格提取数据失败:`, error.message);
      return null;
    }
  }

  /**
   * 提取页面标题
   */
  extractPageTitle($) {
    // 尝试多种方式提取标题
    const titleSelectors = [
      'h1.title',
      'h1',
      '.article-title',
      'title'
    ];

    for (const selector of titleSelectors) {
      const title = $(selector).first().text().trim();
      if (title && title.length > 0 && title !== '国家统计局') {
        return title.replace(/-国家统计局$/, '').trim();
      }
    }

    return '相关数据表';
  }

  /**
   * 从URL提取日期信息
   */
  extractDateInfo(url) {
    // 尝试从URL中提取日期: /202509/t20250927_xxx.html
    const match = url.match(/\/(\d{6})\/t(\d{8})_/);
    if (match) {
      const yyyymm = match[1]; // 202509
      const yyyymmdd = match[2]; // 20250927
      
      return {
        publishDate: yyyymmdd.substring(0, 4) + '-' + 
                     yyyymmdd.substring(4, 6) + '-' + 
                     yyyymmdd.substring(6, 8),
        yearMonth: yyyymm.substring(0, 4) + '-' + yyyymm.substring(4, 6)
      };
    }

    // 如果无法从URL提取，使用当前日期
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    
    return {
      publishDate: `${yyyy}-${mm}-${dd}`,
      yearMonth: `${yyyy}-${mm}`
    };
  }

  /**
   * 猜测文件扩展名
   */
  guessExtFromUrl(url) {
    const lower = url.toLowerCase();
    if (lower.includes('.xlsx')) return 'xlsx';
    if (lower.includes('.xls')) return 'xls';
    return 'xlsx';
  }

  /**
   * 构建文件名 (参考 stats-export-extension 的 buildRawFilename)
   * 格式：日期_页面标题.ext
   * 示例：2025-09-15_2025年8月份规模以上工业增加值增长5.1%-国家统计局.xlsx
   */
  buildRawFilename(dateStr, title, ext) {
    // 日期只保留数字和横杠
    const base = (dateStr || '').replace(/[^0-9-]/g, '');
    // 标题移除所有空格，截取前40个字符
    const t = (title || '').replace(/\s+/g, '').slice(0, 40) || '相关数据表';
    return (base ? base + '_' : '') + t + '.' + ext;
  }

  /**
   * 带重试的fetch
   */
  async fetchWithRetry(url, maxRetries = 3, options = {}) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await axios.get(url, {
          timeout: 30000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          },
          ...options
        });
        return response;
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        console.log(`请求失败，重试 (${i + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  /**
   * 批量处理多个页面
   */
  async processMultiplePages(urls) {
    const results = [];
    for (const url of urls) {
      const result = await this.processDetailPage(url);
      if (result) {
        results.push(result);
      }
      // 延迟避免请求过快
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return results;
  }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  const extractor = new ProfitsDataExtractor();
  
  // 测试URL - 规模以上工业增加值
  const testUrls = [
    'https://www.stats.gov.cn/sj/zxfb/202509/t20250914_1961336.html'
  ];
  
  extractor.processMultiplePages(testUrls).then(results => {
    console.log('提取结果:', results);
  }).catch(error => {
    console.error('测试失败:', error);
  });
}

module.exports = ProfitsDataExtractor;

