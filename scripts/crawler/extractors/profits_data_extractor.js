const cheerio = require('cheerio');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const BaseDataExtractor = require('./base_data_extractor');

/**
 * 规模以上工业增加值数据提取器
 * 参考 stats-export-extension 和其他成功提取器的逻辑
 */
class ProfitsDataExtractor extends BaseDataExtractor {
  constructor(downloadDir, options) {
    const dir = downloadDir || path.join(__dirname, '../../../stock/profits');
    super(dir, options);
    this.downloadDir = dir;
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
      
      // 生成文件名（使用页面标题）
      const dateInfo = this.extractDateInfo(detailUrl);
      const ext = this.guessExtFromUrl(relatedUrl) || 'xlsx';
      const filename = this.buildRawFilename(dateInfo.publishDate, pageTitle, ext);
      const filePath = path.join(this.downloadDir, filename);
      
      // 检查文件是否已存在
      if (this.shouldSkipExistingFile(filePath, this.skipExistingFiles)) {
        return {
          url: detailUrl,
          file: filePath,
          success: true,
          skipped: true
        };
      }
      
      // 下载Excel文件
      const response = await this.fetchWithRetry(relatedUrl, 3, { responseType: 'arraybuffer' });
      
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

      // 使用基类的生成Excel方法
      await this.generateExcelFile(tableData, filename);

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

