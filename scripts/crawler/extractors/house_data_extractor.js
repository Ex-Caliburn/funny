const cheerio = require('cheerio');
const path = require('path');
const BaseDataExtractor = require('./base_data_extractor');

/**
 * 房地产数据提取器
 * 参考 stats-export-extension 的逻辑
 */
class HouseDataExtractor extends BaseDataExtractor {
  constructor(downloadDir, options) {
    const dir = downloadDir || path.join(__dirname, '../../../stock/house');
    super(dir, options);
    this.downloadDir = dir;
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
      
      // 生成文件名（使用页面标题）
      const dateInfo = this.extractDateInfo(detailUrl);
      const ext = this.guessExtFromUrl(relatedUrl) || 'xlsx';
      const filename = this.buildRawFilename(dateInfo.publishDate, pageTitle, ext);
      const filePath = path.join(this.downloadDir, filename);
      
      // 检查文件是否已存在
      if (this.shouldSkipExistingFile(filePath, this.skipExistingFiles)) {
        return {
          url: detailUrl,
          publishDate: dateInfo.publishDate,
          periodInfo: dateInfo.periodInfo,
          excelFile: filePath,
          source: 'related_dataset',
          title: pageTitle,
          skipped: true
        };
      }
      
      // 下载Excel文件
      const response = await this.fetchWithRetry(relatedUrl, 3, { responseType: 'arraybuffer' });
      
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

}

module.exports = HouseDataExtractor;
