const axios = require('axios');
const cheerio = require('cheerio');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

/**
 * 能源数据提取器
 * 参考 stats-export-extension 的文本解析逻辑
 * 能源数据特殊之处：从文本中提取而不是从表格
 */
class EnergyDataExtractor {
  constructor() {
    this.downloadDir = path.join(__dirname, '../../../stock/energy');
    this.ensureDownloadDir();
  }

  ensureDownloadDir() {
    if (!fs.existsSync(this.downloadDir)) {
      fs.mkdirSync(this.downloadDir, { recursive: true });
    }
  }

  /**
   * 处理详情页面，提取能源数据
   */
  async processDetailPage(detailUrl) {
    try {
      console.log(`正在提取能源数据: ${detailUrl}`);
      
      const response = await this.fetchWithRetry(detailUrl);
      const $ = cheerio.load(response.data);
      
      // 1. 优先查找"相关数据表"链接
      const relatedDatasetLink = this.findRelatedDatasetLink($, detailUrl);
      if (relatedDatasetLink) {
        console.log(`找到相关数据表链接，但能源数据优先使用文本解析`);
      }
      
      // 2. 从页面文本中提取能源数据（能源数据的特殊处理）
      console.log('从页面文本提取能源数据...');
      return await this.extractFromPageText($, detailUrl);
      
    } catch (error) {
      console.error(`处理能源数据失败 ${detailUrl}:`, error.message);
      return null;
    }
  }

  /**
   * 查找"相关数据表"链接（备用）
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
          } catch (e) {}
        }
      }
    }
    return null;
  }

  /**
   * 从页面文本提取能源数据
   * 参考 stats-export-extension 的 extractEnergyStatsFromDoc 函数
   */
  async extractFromPageText($, detailUrl) {
    try {
      // 获取页面文本
      const text = $('body').text().replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
      
      // 提取年份-月份信息
      const ym = this.extractYearMonthPeriod($);
      const dateStr = ym ? (ym.year + '-' + ym.period) : this.extractDateFromUrl(detailUrl);
      
      const mainRows = [];
      
      // header row
      mainRows.push(['日期', '类目', '产量', '日均', '单位', '增速']);
      
      // 主要产品：原煤/原油/原油加工/天然气/发电量
      const specs = [
        { key: '原煤', amountKey: '原煤产量' },
        { key: '原油', amountKey: '原油产量' },
        { key: '原油加工', amountKey: '原油加工量' },
        { key: '天然气', amountKey: '天然气产量' },
        { key: '发电量', amountKey: '发电量' }
      ];
      
      for (const spec of specs) {
        const extracted = this.extractProductData(text, spec, dateStr);
        if (extracted.amount) {
          mainRows.push([
            dateStr,
            spec.key,
            extracted.amount,
            extracted.daily,
            extracted.unit || extracted.amountUnit,
            ''
          ]);
        }
        
        // 提取进口数据（仅对原煤/原油/天然气）
        if (['原煤', '原油', '天然气'].includes(spec.key)) {
          const importData = this.extractImportData(text, spec.key, dateStr);
          if (importData.amount) {
            mainRows.push([
              dateStr,
              spec.key + '-进口',
              importData.amount,
              '',
              importData.unit,
              ''
            ]);
          }
        }
      }
      
      // 提取发电细分（火电/水电/核电/风电/太阳能发电）
      const varietyRows = this.extractPowerVarieties(text, dateStr);
      varietyRows.forEach(row => {
        mainRows.push([
          dateStr,
          '发电量-' + row[0],
          '',
          '',
          '%',
          row[1]
        ]);
      });
      
      console.log(`从文本提取到 ${mainRows.length - 1} 行数据`);
      
      // 生成Excel文件（能源数据使用特殊文件名格式）
      const filename = this.buildEnergyFilename(ym);
      const excelFile = await this.generateExcelFile(mainRows, filename);
      
      return {
        url: detailUrl,
        publishDate: dateStr,
        periodInfo: ym ? `${ym.year}年${ym.period}月` : '',
        dataRows: mainRows.length - 1,
        file: excelFile,
        source: 'text_extraction'
      };
      
    } catch (error) {
      console.error(`从页面文本提取数据失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 提取产品数据
   */
  extractProductData(text, spec, dateStr) {
    let amount = '', amountUnit = '', daily = '', dailyUnit = '';
    
    // 查找月份相关的文本片段
    const monthPattern = new RegExp(`(\\d{1,2})月份[^。]*?${spec.amountKey || spec.key}\\s*([0-9.,]+)\\s*([亿万]?(?:吨|千瓦时|立方米|亿千瓦时|亿立方米))`);
    const monthMatch = text.match(monthPattern);
    
    if (monthMatch) {
      amount = monthMatch[2].replace(/,/g, '');
      amountUnit = monthMatch[3].replace(/\s+/g, '');
    }
    
    // 提取日均数据
    const dailyPattern = /日均(?:产量|加工|发电(?:量)?)?(?:首次突破)?(?:为|达)?\s*([0-9.,]+)\s*([亿万]?(?:吨|千瓦时|立方米|亿千瓦时|亿立方米))/;
    const dailyMatch = text.match(dailyPattern);
    
    if (dailyMatch) {
      daily = dailyMatch[1].replace(/,/g, '');
      dailyUnit = dailyMatch[2].replace(/\s+/g, '');
    }
    
    return { amount, amountUnit, daily, dailyUnit };
  }

  /**
   * 提取进口数据
   */
  extractImportData(text, productKey, dateStr) {
    let amount = '', unit = '';
    
    const importPatterns = {
      '原煤': /(\d{1,2})月份[^。]*?进口(?:煤炭|原煤)[^0-9]*([0-9.,]+)\s*([亿万]?(?:吨))/,
      '原油': /(\d{1,2})月份[^。]*?进口原油[^0-9]*([0-9.,]+)\s*([亿万]?(?:吨))/,
      '天然气': /(\d{1,2})月份[^。]*?进口天然气[^0-9]*([0-9.,]+)\s*([亿万]?(?:吨|立方米|亿立方米))/
    };
    
    const pattern = importPatterns[productKey];
    if (pattern) {
      const match = text.match(pattern);
      if (match) {
        amount = match[2].replace(/,/g, '');
        unit = match[3].replace(/\s+/g, '');
      }
    }
    
    return { amount, unit };
  }

  /**
   * 提取发电细分品种
   */
  extractPowerVarieties(text, dateStr) {
    const varieties = ['火电', '水电', '核电', '风电', '太阳能发电'];
    const result = [];
    
    // 查找"分品种看"段落
    const varietyBlockMatch = text.match(/分品种看[^。]*?。([^。]*。)?/);
    const vtext = varietyBlockMatch ? varietyBlockMatch[0] : text;
    
    for (const name of varieties) {
      const pattern = new RegExp(name + '(?:[^。]*?)(增长|下降)\\s*([0-9.]+)\\%');
      const match = vtext.match(pattern);
      
      if (match) {
        const sign = match[1] === '下降' ? -1 : 1;
        const val = String(sign * parseFloat(match[2] || '0'));
        result.push([name, val]);
      }
    }
    
    return result;
  }

  /**
   * 提取年份-月份信息
   * 参考 stats-export-extension 的 extractYearMonthPeriod 函数
   */
  extractYearMonthPeriod($) {
    try {
      const title = $('title').text() || '';
      const h1 = $('h1').first().text() || '';
      const h2 = $('h2').first().text() || '';
      const src = (title + ' ' + h1 + ' ' + h2).replace(/\s+/g, '');
      
      // 2025年8月份 / 2025年1—2月份
      const m = src.match(/(\d{4})年(\d{1,2})(?:[—\-－–至到~～](\d{1,2}))?月份/);
      if (m) {
        const year = m[1];
        const m1 = String(parseInt(m[2], 10));
        const m2 = m[3] ? String(parseInt(m[3], 10)) : '';
        const period = m2 ? (m1 + '-' + m2) : m1;
        return { year, period };
      }
      
      // 2023年上半年 -> 2023-6, 2023年下半年 -> 2023-12
      const mHalf = src.match(/(\d{4})年(上|下)半年/);
      if (mHalf) {
        const year = mHalf[1];
        const half = mHalf[2];
        const period = half === '上' ? '6' : '12';
        return { year, period };
      }
      
      return null;
    } catch (e) {
      return null;
    }
  }

  /**
   * 从URL提取日期
   */
  extractDateFromUrl(url) {
    const urlMatch = url.match(/(\d{4})(\d{2})(\d{2})/);
    if (urlMatch) {
      return `${urlMatch[1]}-${urlMatch[2]}-${urlMatch[3]}`;
    }
    return new Date().toISOString().split('T')[0];
  }

  /**
   * 构建能源文件名（特殊格式）
   * 格式: energy_年份-期间.xls
   */
  buildEnergyFilename(ym) {
    if (ym) {
      return `energy_${ym.year}-${ym.period}.xls`;
    }
    const now = new Date();
    return `energy_${now.getFullYear()}-${now.getMonth() + 1}.xls`;
  }

  /**
   * 生成Excel文件
   */
  async generateExcelFile(rows, filename) {
    try {
      const workbook = xlsx.utils.book_new();
      const worksheet = xlsx.utils.aoa_to_sheet(rows);
      xlsx.utils.book_append_sheet(workbook, worksheet, '主要产品');
      
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

module.exports = EnergyDataExtractor;
