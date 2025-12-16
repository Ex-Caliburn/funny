const axios = require('axios');
const cheerio = require('cheerio');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

/**
 * 产能利用率数据提取器
 * 从统计局网站提取产能利用率数据
 */
class CapacityUtilizationExtractor {
  constructor() {
    this.downloadDir = path.join(__dirname, '../../../stock/capacity_utilization');
    this.ensureDownloadDir();
  }

  ensureDownloadDir() {
    if (!fs.existsSync(this.downloadDir)) {
      fs.mkdirSync(this.downloadDir, { recursive: true });
    }
  }

  /**
   * 处理详情页面，提取产能利用率数据
   */
  async processDetailPage(detailUrl) {
    try {
      console.log(`正在提取产能利用率数据: ${detailUrl}`);
      
      const response = await this.fetchWithRetry(detailUrl);
      const $ = cheerio.load(response.data);
      
      // 1. 优先查找"相关数据表"或附件链接
      const dataTableLink = this.findDataTableLink($, detailUrl);
      if (dataTableLink) {
        console.log(`找到数据表链接: ${dataTableLink}`);
        return await this.downloadFile(dataTableLink, detailUrl);
      }
      
      // 2. 尝试查找页面中的表格数据
      console.log('尝试从页面提取表格数据...');
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
      // 提取标题（通常在 h1 或 .title 中）
      const title = $('h1, .title, .article-title').first().text().trim();
      
      // 从URL提取发布日期（格式：YYYY-MM-DD）
      const publishDate = this.extractPublishDateFromUrl(detailUrl);
      
      // 查找表格
      const tables = $('table');
      if (tables.length === 0) {
        console.log('页面中未找到表格');
        return null;
      }
      
      console.log(`找到 ${tables.length} 个表格，开始解析...`);
      
      // 解析第一个包含产能利用率数据的表格
      const mainTable = this.findMainTable($, tables);
      if (!mainTable) {
        console.log('未找到有效的产能利用率数据表格');
        return null;
      }
      
      // 转换表格为工作簿
      const workbook = this.tableToWorkbook(mainTable, $);
      
      // 按照标准格式命名：YYYY-MM-DD_文章标题-国家统计局.xlsx
      const filename = `${publishDate}_${title}-国家统计局.xlsx`;
      const filepath = path.join(this.downloadDir, filename);
      
      xlsx.writeFile(workbook, filepath);
      console.log(`表格数据已保存: ${filename}`);
      
      return {
        success: true,
        filename,
        filepath,
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
      console.log(`开始下载文件: ${fileUrl}`);
      
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
      const title = $('h1, .title, .article-title').first().text().trim();
      const publishDate = this.extractPublishDateFromUrl(referer);
      
      // 按照标准格式命名：YYYY-MM-DD_文章标题-国家统计局.xlsx
      let filename = `${publishDate}_${title}-国家统计局`;
      
      // 判断文件扩展名
      const urlObj = new URL(fileUrl);
      const urlFilename = path.basename(urlObj.pathname);
      if (urlFilename.match(/\.xlsx$/i)) {
        filename += '.xlsx';
      } else if (urlFilename.match(/\.xls$/i)) {
        filename += '.xls';
      } else {
        // 从Content-Type判断
        const contentType = response.headers['content-type'];
        if (contentType && contentType.includes('sheet')) {
          filename += '.xlsx';
        } else {
          filename += '.xls';
        }
      }
      
      // 保存文件
      const filepath = path.join(this.downloadDir, filename);
      fs.writeFileSync(filepath, response.data);
      
      console.log(`文件下载成功: ${filename}`);
      
      return {
        success: true,
        filename,
        filepath,
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

