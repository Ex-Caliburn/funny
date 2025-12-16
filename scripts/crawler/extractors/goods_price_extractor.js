const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const xlsx = require('xlsx');

/**
 * 流通领域重要生产资料市场价格变动情况数据提取器
 * 从HTML页面中提取表格数据并生成Excel文件
 */

class GoodsPriceExtractor {
  constructor() {
    this.dataDir = path.join(__dirname, '../../../stock');
    this.downloadDir = path.join(this.dataDir, 'goods_price');
    this.maxRetries = 3;
    this.delayBetweenRequests = 1000;
    
    // 确保目录存在
    this.ensureDirectories();
  }

  ensureDirectories() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    if (!fs.existsSync(this.downloadDir)) {
      fs.mkdirSync(this.downloadDir, { recursive: true });
    }
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async fetchWithRetry(url, options = {}) {
    for (let i = 0; i < this.maxRetries; i++) {
      try {
        console.log(`正在请求: ${url} (尝试 ${i + 1}/${this.maxRetries})`);
        
        const response = await axios({
          url,
          method: 'GET',
          timeout: 30000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
          },
          ...options
        });
        
        await this.sleep(this.delayBetweenRequests);
        return response;
      } catch (error) {
        console.error(`请求失败 (尝试 ${i + 1}/${this.maxRetries}):`, error.message);
        if (i === this.maxRetries - 1) throw error;
        await this.sleep(2000 * (i + 1));
      }
    }
  }

  /**
   * 解析相对URL为绝对URL
   */
  resolveUrl(href, baseUrl) {
    try {
      if (href.startsWith('http')) {
        return href;
      }
      
      const base = new URL(baseUrl);
      
      if (href.startsWith('./')) {
        href = href.substring(2);
      }
      
      if (href.startsWith('/')) {
        return `${base.protocol}//${base.host}${href}`;
      } else {
        const basePath = base.pathname.substring(0, base.pathname.lastIndexOf('/'));
        return `${base.protocol}//${base.host}${basePath}/${href}`;
      }
    } catch (error) {
      console.error(`URL解析失败: ${href}`, error.message);
      return href;
    }
  }

  /**
   * 查找商品价格相关的表格
   */
  findGoodsPriceTable($, doc) {
    const tables = $('table');
    let bestTable = null;
    let bestScore = -1;

    tables.each((index, element) => {
      const $table = $(element);
      const tableText = $table.text();
      
      // 检查表格是否包含商品价格相关的内容
      const hasGoodsPriceContent = /流通领域重要生产资料|生产资料价格|重要生产资料|价格变动|本期价格|涨跌幅/.test(tableText);
      
      if (hasGoodsPriceContent) {
        // 计算表格大小作为评分
        const rows = $table.find('tr').length;
        const cols = $table.find('tr').first().find('th, td').length;
        const score = rows * cols;
        
        if (score > bestScore) {
          bestScore = score;
          bestTable = element;
        }
      }
    });

    return bestTable;
  }

  /**
   * 将表格转换为行数组
   */
  tableToRowsArray($, table) {
    const rows = [];
    const $table = $(table);
    
    $table.find('tr').each((rowIndex, tr) => {
      const $tr = $(tr);
      const row = [];
      
      $tr.find('th, td').each((cellIndex, cell) => {
        const $cell = $(cell);
        let text = $cell.text().trim();
        
        // 处理合并单元格的情况
        const colspan = parseInt($cell.attr('colspan') || '1');
        const rowspan = parseInt($cell.attr('rowspan') || '1');
        
        // 清理文本
        text = text.replace(/\s+/g, ' ').trim();
        
        row.push(text || '');
        
        // 如果单元格跨越多列，添加空单元格
        for (let i = 1; i < colspan; i++) {
          row.push('');
        }
      });
      
      if (row.length > 0) {
        rows.push(row);
      }
    });
    
    return rows;
  }

  /**
   * 从页面中提取商品价格数据
   */
  async extractGoodsPriceData(detailUrl) {
    try {
      console.log(`正在提取数据: ${detailUrl}`);
      const response = await this.fetchWithRetry(detailUrl);
      const $ = cheerio.load(response.data);
      
      // 查找商品价格表格
      const table = this.findGoodsPriceTable($, response.data);
      
      if (!table) {
        console.log('未找到商品价格表格');
        return null;
      }
      
      // 提取表格数据
      const rows = this.tableToRowsArray($, table);
      
      if (rows.length === 0) {
        console.log('表格为空');
        return null;
      }
      
      console.log(`提取到 ${rows.length} 行数据`);
      
      // 提取发布日期和期间信息
      const dateInfo = this.extractPublishDate($, detailUrl);
      
      return {
        url: detailUrl,
        publishDate: dateInfo.publishDate,
        periodInfo: dateInfo.periodInfo,
        data: rows,
        headers: rows.length > 0 ? rows[0] : [],
        rows: rows.slice(1) // 去掉表头
      };
      
    } catch (error) {
      console.error(`提取数据失败 ${detailUrl}:`, error.message);
      return null;
    }
  }

  /**
   * 从页面中提取发布日期和期间信息
   */
  extractPublishDate($, url) {
    // 尝试从URL中提取日期
    const urlMatch = url.match(/(\d{4})(\d{2})(\d{2})/);
    let publishDate = '';
    let periodInfo = '';
    
    if (urlMatch) {
      publishDate = `${urlMatch[1]}-${urlMatch[2]}-${urlMatch[3]}`;
    }
    
    // 尝试从页面内容中提取期间信息
    const pageText = $('body').text();
    
    // 查找期间信息（如"2024年1月上旬"、"2024年1月中旬"等）
    const periodMatch = pageText.match(/(\d{4})年(\d{1,2})月(上旬|中旬|下旬)/);
    if (periodMatch) {
      const year = periodMatch[1];
      const month = parseInt(periodMatch[2]);
      const period = periodMatch[3];
      periodInfo = `${year}年${month}月${period}`;
    }
    
    // 如果没有找到期间信息，尝试从标题中提取
    if (!periodInfo) {
      const titleMatch = pageText.match(/(\d{4})年(\d{1,2})月(上旬|中旬|下旬)/);
      if (titleMatch) {
        const year = titleMatch[1];
        const month = parseInt(titleMatch[2]);
        const period = titleMatch[3];
        periodInfo = `${year}年${month}月${period}`;
      }
    }
    
    return {
      publishDate: publishDate || new Date().toISOString().split('T')[0],
      periodInfo: periodInfo
    };
  }

  /**
   * 生成Excel文件
   */
  async generateExcelFile(extractedData, filename) {
    if (!extractedData || !extractedData.data || extractedData.data.length === 0) {
      console.log('没有数据可生成Excel文件');
      return null;
    }
    
    try {
      // 创建工作簿
      const workbook = xlsx.utils.book_new();
      
      // 处理数据，确保格式与现有文件一致
      const processedData = this.processDataForExcel(extractedData.data);
      
      // 创建工作表
      const worksheet = xlsx.utils.aoa_to_sheet(processedData);
      
      // 设置列宽
      const colWidths = [
        { wch: 35 }, // 产品名称
        { wch: 8 },  // 单位
        { wch: 15 }, // 本期价格
        { wch: 20 }, // 价格涨跌
        { wch: 12 }  // 涨跌幅
      ];
      worksheet['!cols'] = colWidths;
      
      // 添加工作表到工作簿，使用标准名称
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      
      // 生成文件路径，使用.xls扩展名以匹配现有文件
      const filePath = path.join(this.downloadDir, `${filename}.xls`);
      
      // 写入文件
      xlsx.writeFile(workbook, filePath);
      
      console.log(`Excel文件已生成: ${filePath}`);
      return filePath;
      
    } catch (error) {
      console.error('生成Excel文件失败:', error.message);
      return null;
    }
  }

  /**
   * 处理数据以匹配现有Excel格式
   */
  processDataForExcel(rawData) {
    if (!rawData || rawData.length === 0) {
      return [];
    }
    
    const processedData = [];
    
    rawData.forEach((row, rowIndex) => {
      if (rowIndex === 0) {
        // 处理表头，确保格式一致
        const header = [
          '产品名称',
          '单位', 
          '本期价格（元）',
          '比上期\n价格涨跌（元）', // 保持换行符
          '涨跌幅（%）'
        ];
        processedData.push(header);
      } else {
        const processedRow = [];
        
        row.forEach((cell, colIndex) => {
          let processedCell = cell;
          
          // 处理数值列（第3、4、5列）
          if (colIndex >= 2 && colIndex <= 4) {
            // 尝试转换为数字
            const numValue = parseFloat(cell);
            if (!isNaN(numValue)) {
              processedCell = numValue;
            } else if (cell === '' || cell === ' ' || cell === '-') {
              processedCell = '';
            }
          }
          
          // 处理分类标题行（只有第一列有内容，其他列为空）
          if (colIndex === 0 && (cell.includes('一、') || cell.includes('二、') || cell.includes('三、') || cell.includes('四、') || cell.includes('五、'))) {
            processedRow.push(cell);
            processedRow.push(' ');
            processedRow.push('');
            processedRow.push('');
            processedRow.push('');
            return; // 跳过后续处理
          }
          
          processedRow.push(processedCell);
        });
        
        // 确保每行只有5列
        let finalRow = processedRow;
        if (processedRow.length > 5) {
          finalRow = processedRow.slice(0, 5);
        } else {
          while (finalRow.length < 5) {
            finalRow.push('');
          }
        }
        
        processedData.push(finalRow);
      }
    });
    
    return processedData;
  }

  /**
   * 处理单个详情页面
   */
  async processDetailPage(detailUrl) {
    try {
      // 提取数据
      const extractedData = await this.extractGoodsPriceData(detailUrl);
      
      if (!extractedData) {
        return null;
      }
      
      // 生成文件名
      const dateInfo = {
        publishDate: extractedData.publishDate,
        periodInfo: extractedData.periodInfo
      };
      const filename = this.generateFilename(dateInfo, detailUrl);
      
      // 生成Excel文件
      const excelFile = await this.generateExcelFile(extractedData, filename);
      
      return {
        url: detailUrl,
        publishDate: extractedData.publishDate,
        periodInfo: extractedData.periodInfo,
        dataRows: extractedData.rows.length,
        file: excelFile
      };
      
    } catch (error) {
      console.error(`处理详情页失败 ${detailUrl}:`, error.message);
      return null;
    }
  }

  /**
   * 生成文件名（匹配现有文件命名规则）
   */
  generateFilename(dateInfo, url) {
    const publishDate = dateInfo.publishDate || new Date().toISOString().split('T')[0];
    const periodInfo = dateInfo.periodInfo || '';
    
    if (periodInfo) {
      return `${publishDate}_${periodInfo}流通领域重要生产资料市场价格变动情况-国家统计局`;
    } else {
      // 如果没有期间信息，使用简化格式
      return `${publishDate}_流通领域重要生产资料市场价格变动情况-国家统计局`;
    }
  }

  /**
   * 批量处理多个详情页面
   */
  async processMultiplePages(detailUrls) {
    console.log(`开始处理 ${detailUrls.length} 个详情页面...`);
    
    const results = [];
    
    for (const url of detailUrls) {
      try {
        const result = await this.processDetailPage(url);
        if (result) {
          results.push(result);
        }
        
        // 添加延迟避免请求过快
        await this.sleep(1000);
        
      } catch (error) {
        console.error(`处理页面失败 ${url}:`, error.message);
      }
    }
    
    console.log(`处理完成，成功处理 ${results.length} 个页面`);
    
    return results;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const extractor = new GoodsPriceExtractor();
  
  // 示例用法
  const testUrls = [
    'https://www.stats.gov.cn/sj/zxfb/202510/t20251009_1961456.html',
    'https://www.stats.gov.cn/sj/zxfb/202509/t20250923_1961330.html'
  ];
  
  extractor.processMultiplePages(testUrls)
    .then(results => {
      console.log('提取结果:', results);
      process.exit(0);
    })
    .catch(error => {
      console.error('提取失败:', error.message);
      process.exit(1);
    });
}

module.exports = GoodsPriceExtractor;
