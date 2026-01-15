const cheerio = require('cheerio');
const path = require('path');
const BaseDataExtractor = require('./base_data_extractor');

/**
 * 固定资产投资数据提取器
 * 参考 stats-export-extension 和其他提取器的逻辑
 */
class InvestDataExtractor extends BaseDataExtractor {
  constructor(downloadDir, options) {
    const dir = downloadDir || path.join(__dirname, '../../../stock/invest');
    super(dir, options);
    this.downloadDir = dir;
  }

  /**
   * 处理详情页面，提取固定资产投资数据
   */
  async processDetailPage(detailUrl) {
    try {
      console.log(`正在提取固定资产投资数据: ${detailUrl}`);
      
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
      console.error(`处理固定资产投资数据失败 ${detailUrl}:`, error.message);
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
      // 查找最大的表格
      const table = this.findInvestTable($);
      if (!table) {
        console.log('未找到固定资产投资数据表格');
        return null;
      }
      
      // 提取表格数据
      const rows = this.tableToRowsArray($, table);
      if (rows.length === 0) {
        console.log('表格数据为空');
        return null;
      }
      
      console.log(`提取到 ${rows.length} 行数据`);
      
      // 提取日期信息和页面标题
      const dateInfo = this.extractDateInfo(detailUrl);
      const pageTitle = this.extractPageTitle($);
      
      // 生成Excel文件（使用页面标题）
      const filename = this.buildRawFilename(dateInfo.publishDate, pageTitle, 'xlsx');
      const excelFile = await this.generateExcelFile(rows, filename);
      
      return {
        url: detailUrl,
        publishDate: dateInfo.publishDate,
        periodInfo: dateInfo.periodInfo,
        dataRows: rows.length,
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
   * 查找固定资产投资数据表格
   */
  findInvestTable($) {
    const tables = $('table');
    let best = null;
    let bestScore = -1;
    
    tables.each((i, table) => {
      const $table = $(table);
      const rows = $table.find('tr').length;
      const score = rows * 100; // 按行数评分
      
      if (score > bestScore) {
        bestScore = score;
        best = table;
      }
    });
    
    if (best) return best;
    
    // 如果没找到，尝试在标题附近查找
    const headings = $('h1, h2, h3, h4, h5, h6');
    if (headings.length > 0) {
      const firstHeading = headings.first();
      const nearbyTable = firstHeading.nextAll('table').first();
      if (nearbyTable.length > 0) {
        return nearbyTable[0];
      }
    }
    
    return null;
  }



  /**
   * 批量处理多个详情页面
   */
  async processMultiplePages(detailUrls) {
    console.log(`开始处理 ${detailUrls.length} 个详情页面...`);
    
    const results = [];
    
    for (const detailUrl of detailUrls) {
      try {
        const result = await this.processDetailPage(detailUrl);
        if (result) {
          results.push(result);
        }
      } catch (error) {
        console.error(`处理页面失败 ${detailUrl}:`, error.message);
      }
    }
    
    console.log(`处理完成，成功处理 ${results.length} 个页面`);
    return results;
  }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  const extractor = new InvestDataExtractor();
  
  // 测试URL
  const testUrls = [
    'https://www.stats.gov.cn/sj/zxfb/202509/t20250915_1961177.html'
  ];
  
  extractor.processMultiplePages(testUrls).then(results => {
    console.log('提取结果:', results);
  }).catch(error => {
    console.error('测试失败:', error);
  });
}

module.exports = InvestDataExtractor;
