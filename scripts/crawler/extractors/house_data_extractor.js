const axios = require('axios');
const cheerio = require('cheerio');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

/**
 * 房地产数据提取器
 * 参考 stats-export-extension 的逻辑
 */
class HouseDataExtractor {
  constructor() {
    this.downloadDir = path.join(__dirname, '../../../stock/house');
    this.ensureDownloadDir();
  }

  ensureDownloadDir() {
    if (!fs.existsSync(this.downloadDir)) {
      fs.mkdirSync(this.downloadDir, { recursive: true });
    }
  }

  /**
   * 处理详情页面，提取房地产数据
   */
  async processDetailPage(detailUrl) {
    try {
      console.log(`正在提取房地产数据: ${detailUrl}`);
      
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
      console.error(`处理房地产数据失败 ${detailUrl}:`, error.message);
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
      
      // 从详情页文档提取页面标题
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
      console.log(`相关数据表已保存: ${filePath}`);
      
      return {
        url: detailUrl,
        publishDate: dateInfo.publishDate,
        periodInfo: dateInfo.periodInfo,
        excelFile: filePath,
        source: 'related_dataset',
        title: pageTitle
      };
      
    } catch (error) {
      console.error(`下载相关数据表失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 从页面表格提取数据
   */
  async extractFromPageTable($, detailUrl) {
    try {
      // 查找所有表格
      const tables = this.findHouseTables($);
      if (!tables || tables.length === 0) {
        console.log('未找到房地产数据表格');
        return null;
      }
      
      console.log(`找到 ${tables.length} 个表格`);
      
      // 提取日期信息和页面标题
      const dateInfo = this.extractDateInfo(detailUrl);
      const pageTitle = this.extractPageTitle($);
      
      // 生成Excel文件（使用页面标题）
      const filename = this.buildRawFilename(dateInfo.publishDate, pageTitle, 'xlsx');
      const excelFile = await this.generateExcelFile(tables, filename);
      
      return {
        url: detailUrl,
        publishDate: dateInfo.publishDate,
        periodInfo: dateInfo.periodInfo,
        dataRows: tables.reduce((sum, t) => sum + t.rows.length, 0),
        file: excelFile,
        source: 'page_table',
        title: pageTitle
      };
      
    } catch (error) {
      console.error(`从页面表格提取数据失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 查找房地产数据表格
   */
  findHouseTables($) {
    const tables = [];
    
    $('table').each((i, table) => {
      const $table = $(table);
      const rows = this.tableToRowsArray($, table);
      
      if (rows.length > 0) {
        // 提取表格标题（通常在第一行或表格前的标题）
        let title = '';
        const firstRow = rows[0];
        if (firstRow && firstRow.length === 1) {
          title = firstRow[0];
        }
        
        tables.push({
          title: title || `表${i + 1}`,
          rows: rows
        });
      }
    });
    
    return tables;
  }

  /**
   * 将表格转换为行数组
   */
  tableToRowsArray($, table) {
    const rows = [];
    const $table = $(table);
    const $rows = $table.find('tr');
    
    $rows.each((i, row) => {
      const $row = $(row);
      const rowData = [];
      
      $row.find('th, td').each((j, cell) => {
        const $cell = $(cell);
        let text = $cell.text().replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
        
        if (!text && $cell.children().length > 0) {
          const childTexts = [];
          $cell.children().each((k, child) => {
            const childText = $(child).text().trim();
            if (childText) {
              childTexts.push(childText);
            }
          });
          text = childTexts.join(' ');
        }
        
        rowData.push(text || '');
      });
      
      rows.push(rowData);
    });
    
    return rows;
  }

  /**
   * 提取日期信息
   */
  extractDateInfo(url) {
    const urlMatch = url.match(/(\d{4})(\d{2})(\d{2})/);
    let publishDate = '';
    let periodInfo = '';
    
    if (urlMatch) {
      publishDate = `${urlMatch[1]}-${urlMatch[2]}-${urlMatch[3]}`;
    }
    
    return {
      publishDate: publishDate || new Date().toISOString().split('T')[0],
      periodInfo: periodInfo
    };
  }

  /**
   * 提取页面标题
   */
  extractPageTitle($) {
    let title = $('title').text().trim();
    
    if (!title) {
      title = $('h1').first().text().trim();
    }
    
    if (!title) {
      title = $('h2').first().text().trim();
    }
    
    return title || '相关数据表';
  }

  /**
   * 构建文件名（参考 stats-export-extension）
   */
  buildRawFilename(dateStr, title, ext) {
    const base = (dateStr || '').replace(/[^0-9-]/g, '');
    const t = (title || '').replace(/\s+/g, '').slice(0, 40) || '相关数据表';
    return (base ? base + '_' : '') + t + '.' + ext;
  }

  /**
   * 从URL猜测文件扩展名
   */
  guessExtFromUrl(url) {
    try {
      const u = new URL(url);
      const m = (u.pathname || '').match(/\.([a-z0-9]+)$/i);
      return m && m[1] ? m[1].toLowerCase() : '';
    } catch (e) {
      return '';
    }
  }

  /**
   * 生成Excel文件（多个工作表）
   */
  async generateExcelFile(tables, filename) {
    try {
      const workbook = xlsx.utils.book_new();
      
      tables.forEach((table, index) => {
        const sheetName = table.title || `表${index + 1}`;
        const worksheet = xlsx.utils.aoa_to_sheet(table.rows);
        xlsx.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
      });
      
      const filePath = path.join(this.downloadDir, filename);
      xlsx.writeFile(workbook, filePath);
      
      console.log(`Excel文件已生成: ${filePath}`);
      return filePath;
      
    } catch (error) {
      console.error(`生成Excel文件失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 带重试的请求
   */
  async fetchWithRetry(url, maxRetries = 3, config = {}) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        console.log(`正在请求: ${url} (尝试 ${i + 1}/${maxRetries})`);
        const response = await axios.get(url, {
          timeout: 30000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          },
          ...config
        });
        return response;
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        console.log(`请求失败，${1000 * (i + 1)}ms后重试...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }
}

module.exports = HouseDataExtractor;
