const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const { spawn } = require('child_process');
const config = require('./crawler_config');

/**
 * 通用爬虫类
 * 支持多种统计局数据类型的自动抓取和解析
 */

class GenericCrawler {
  constructor(targetType = 'goodsPrice') {
    this.config = config.statsGov;
    this.target = this.config.targets[targetType];
    
    if (!this.target) {
      throw new Error(`不支持的目标类型: ${targetType}`);
    }
    
    this.dataDir = path.join(__dirname, '../stock');
    this.downloadDir = path.join(this.dataDir, this.target.downloadDir);
    
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

  /**
   * 延迟函数
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 带重试的HTTP请求
   */
  async fetchWithRetry(url, options = {}) {
    for (let i = 0; i < this.config.maxRetries; i++) {
      try {
        console.log(`正在请求: ${url} (尝试 ${i + 1}/${this.config.maxRetries})`);
        
        const response = await axios({
          url,
          method: 'GET',
          timeout: this.config.timeout,
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
        
        await this.sleep(this.config.delayBetweenRequests);
        return response;
      } catch (error) {
        console.error(`请求失败 (尝试 ${i + 1}/${this.config.maxRetries}):`, error.message);
        if (i === this.config.maxRetries - 1) throw error;
        await this.sleep(2000 * (i + 1)); // 递增延迟
      }
    }
  }

  /**
   * 获取分页URL列表
   * @param {number|null} startPage - 起始页码（默认为1）
   * @param {number|null} endPage - 结束页码（默认使用配置的maxPages）
   */
  getPageUrls(startPage = null, endPage = null) {
    const start = startPage || this.config.pagination?.defaultStartPage || 1;
    const end = endPage || this.config.maxPages;
    const urls = [];
    
    // 验证页码范围
    if (start < 1) {
      throw new Error('起始页码必须大于等于1');
    }
    if (end < start) {
      throw new Error('结束页码不能小于起始页码');
    }
    if (end > this.config.pagination?.maxAllowedPages) {
      throw new Error(`结束页码不能超过 ${this.config.pagination?.maxAllowedPages}`);
    }
    
    for (let page = start; page <= end; page++) {
      let url;
      if (page === 1) {
        url = this.config.baseUrl;
      } else {
        // 统计局的页码: index.html (第1页), index_1.html (第2页), index_2.html (第3页)
        url = `https://www.stats.gov.cn/sj/zxfb/index_${page - 1}.html`;
      }
      urls.push(url);
    }
    
    return urls;
  }

  /**
   * 从页面中提取相关链接
   */
  async extractRelevantLinks(pageUrl) {
    try {
      const response = await this.fetchWithRetry(pageUrl);
      const $ = cheerio.load(response.data);
      const links = [];

      // 查找包含目标关键词的链接
      $('a').each((index, element) => {
        const $link = $(element);
        const text = $link.text().trim();
        const href = $link.attr('href');
        
        // 检查是否包含目标关键词
        const isRelevant = this.target.keywords.some(keyword => 
          text.includes(keyword)
        );
        
        if (isRelevant && href) {
          const fullUrl = this.resolveUrl(href, pageUrl);
          const publishDate = this.extractPublishDate($link);
          
          links.push({
            title: text,
            url: fullUrl,
            publishDate: publishDate,
            keywords: this.target.keywords.filter(keyword => text.includes(keyword))
          });
        }
      });

      console.log(`从 ${pageUrl} 找到 ${links.length} 个相关链接`);
      return links;
    } catch (error) {
      console.error(`解析页面失败 ${pageUrl}:`, error.message);
      return [];
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
      
      // 处理以 ./ 开头的相对路径
      if (href.startsWith('./')) {
        href = href.substring(2);
      }
      
      if (href.startsWith('/')) {
        return `${base.protocol}//${base.host}${href}`;
      } else {
        // 对于相对路径，需要正确处理路径
        const basePath = base.pathname.substring(0, base.pathname.lastIndexOf('/'));
        return `${base.protocol}//${base.host}${basePath}/${href}`;
      }
    } catch (error) {
      console.error(`URL解析失败: ${href}`, error.message);
      return href;
    }
  }

  /**
   * 从链接元素中提取发布日期
   */
  extractPublishDate($link) {
    // 尝试从父元素或兄弟元素中找到日期
    const parent = $link.parent();
    const nextSibling = $link.next();
    const text = (parent.text() + ' ' + nextSibling.text()).trim();
    
    // 匹配日期格式：YYYY-MM-DD
    const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      return dateMatch[1];
    }
    
    return null;
  }

  /**
   * 从详情页下载Excel文件或提取数据生成Excel
   */
  async downloadExcelFromDetailPage(detailUrl) {
    try {
      console.log(`正在访问详情页: ${detailUrl}`);
      
      // 对于配置了专门extractor的目标，直接使用对应的提取器
      if (this.target.extractor) {
        console.log(`使用专门的数据提取器: ${this.target.extractor}`);
        
        if (this.target.name === '流通领域重要生产资料市场价格变动情况') {
          return await this.extractGoodsPriceData(detailUrl);
        }
        
        if (this.target.name === '能源生产情况') {
          return await this.extractEnergyData(detailUrl);
        }
        
        if (this.target.name === '社会消费品零售总额') {
          return await this.extractRetailData(detailUrl);
        }
        
        if (this.target.name === '规模以上工业增加值') {
          return await this.extractProfitsData(detailUrl);
        }
        
        if (this.target.name === '全国规模以上工业企业利润') {
          return await this.extractProfitsData(detailUrl);
        }
        
        if (this.target.name === '全国固定资产投资') {
          return await this.extractInvestData(detailUrl);
        }
        
        if (this.target.name === '全国房地产市场基本情况') {
          return await this.extractHouseData(detailUrl);
        }
      }
      
      // 对于没有专门extractor的目标，使用通用下载逻辑
      const response = await this.fetchWithRetry(detailUrl);
      const $ = cheerio.load(response.data);
      
      // 生成标准文件名
      const standardFilename = await this.getStandardFilename(detailUrl, $);
      
      // 首先查找直接的Excel下载链接
      const excelLinks = [];
      
      // 扩展查找规则
      $('a').each((index, element) => {
        const $link = $(element);
        const href = $link.attr('href');
        const text = $link.text().trim();
        
        // 检查是否是Excel文件链接
        const isExcelFile = href && (
          href.endsWith('.xls') || 
          href.endsWith('.xlsx') || 
          text.includes('相关数据表') || 
          text.includes('Excel') ||
          text.includes('数据表') ||
          text.includes('附件') ||
          text.includes('下载')
        );
        
        if (isExcelFile) {
          const fullUrl = this.resolveUrl(href, detailUrl);
          excelLinks.push({
            url: fullUrl,
            text: text,
            filename: standardFilename  // 使用标准文件名
          });
        }
      });

      // 如果有直接的Excel下载链接，直接下载
      if (excelLinks.length > 0) {
        console.log(`找到 ${excelLinks.length} 个Excel下载链接`);
        
        const downloadedFiles = [];
        for (const link of excelLinks) {
          try {
            const downloadedFile = await this.downloadFile(link.url, link.filename);
            if (downloadedFile) {
              downloadedFiles.push(downloadedFile);
            }
          } catch (error) {
            console.error(`下载失败 ${link.url}:`, error.message);
          }
        }
        
        return downloadedFiles;
      }

      // 如果没有直接的Excel链接，尝试从页面内容提取数据生成Excel
      console.log('未找到直接Excel下载链接，尝试从页面内容提取数据...');
      
      // 对于其他类型，查找其他可能的下载链接
      console.log('尝试查找其他下载链接...');
      
      $('a').each((index, element) => {
        const $link = $(element);
        const href = $link.attr('href');
        const text = $link.text().trim();
        
        // 查找可能包含数据的链接
        if (href && (
          text.includes('数据') || 
          text.includes('统计') ||
          text.includes('表格') ||
          href.includes('data') ||
          href.includes('table')
        )) {
          const fullUrl = this.resolveUrl(href, detailUrl);
          excelLinks.push({
            url: fullUrl,
            text: text,
            filename: standardFilename  // 使用标准文件名
          });
        }
      });

      console.log(`找到 ${excelLinks.length} 个其他下载链接`);
      
      // 下载所有找到的文件
      const downloadedFiles = [];
      for (const link of excelLinks) {
        try {
          const downloadedFile = await this.downloadFile(link.url, link.filename);
          if (downloadedFile) {
            downloadedFiles.push(downloadedFile);
          }
        } catch (error) {
          console.error(`下载失败 ${link.url}:`, error.message);
        }
      }
      
      return downloadedFiles;
    } catch (error) {
      console.error(`访问详情页失败 ${detailUrl}:`, error.message);
      return [];
    }
  }

  /**
   * 提取商品价格数据并生成Excel
   */
  async extractGoodsPriceData(detailUrl) {
    try {
      const GoodsPriceExtractor = require('./goods_price_extractor');
      const extractor = new GoodsPriceExtractor();
      
      // 提取数据并生成Excel文件
      const result = await extractor.processDetailPage(detailUrl);
      
      if (result && result.file) {
        return [result.file];
      }
      
      return [];
    } catch (error) {
      console.error(`提取商品价格数据失败 ${detailUrl}:`, error.message);
      return [];
    }
  }

  /**
   * 提取能源数据
   */
  async extractEnergyData(detailUrl) {
    try {
      const EnergyDataExtractor = require('./energy_data_extractor');
      const extractor = new EnergyDataExtractor();
      
      // 提取数据并生成Excel文件
      const result = await extractor.processDetailPage(detailUrl);
      
      if (result && result.file) {
        return [result.file];
      }
      
      return [];
    } catch (error) {
      console.error(`提取能源数据失败 ${detailUrl}:`, error.message);
      return [];
    }
  }

  /**
   * 提取零售数据
   */
  async extractRetailData(detailUrl) {
    try {
      const RetailDataExtractor = require('./retail_data_extractor');
      const extractor = new RetailDataExtractor();
      
      // 提取数据并生成Excel文件
      const result = await extractor.processDetailPage(detailUrl);
      
      if (result && result.file) {
        return [result.file];
      }
      
      return [];
    } catch (error) {
      console.error(`提取零售数据失败 ${detailUrl}:`, error.message);
      return [];
    }
  }

  /**
   * 提取工业企业利润数据
   */
  async extractProfitsData(detailUrl) {
    try {
      // 根据配置选择合适的提取器
      let ExtractorClass;
      if (this.target.extractor === 'industry_profits_extractor.js') {
        ExtractorClass = require('./industry_profits_extractor');
      } else {
        ExtractorClass = require('./profits_data_extractor');
      }
      
      const extractor = new ExtractorClass();
      
      // 提取数据并生成Excel文件
      const result = await extractor.processDetailPage(detailUrl);
      
      // 提取器返回 { file: filePath, success: true }
      if (result && result.file) {
        return [result.file];
      }
      
      return [];
    } catch (error) {
      console.error(`提取工业企业利润数据失败 ${detailUrl}:`, error.message);
      return [];
    }
  }

  /**
   * 提取固定资产投资数据
   */
  async extractInvestData(detailUrl) {
    try {
      const InvestDataExtractor = require('./invest_data_extractor');
      const extractor = new InvestDataExtractor();
      
      // 提取数据并生成Excel文件
      const result = await extractor.processDetailPage(detailUrl);
      
      if (result && result.file) {
        return [result.file];
      }
      
      return [];
    } catch (error) {
      console.error(`提取固定资产投资数据失败 ${detailUrl}:`, error.message);
      return [];
    }
  }

  /**
   * 提取房地产数据
   */
  async extractHouseData(detailUrl) {
    try {
      const HouseDataExtractor = require('./house_data_extractor');
      const extractor = new HouseDataExtractor();
      
      // 提取数据并生成Excel文件
      const result = await extractor.processDetailPage(detailUrl);
      
      if (result && result.file) {
        return [result.file];
      }
      
      return [];
    } catch (error) {
      console.error(`提取房地产数据失败 ${detailUrl}:`, error.message);
      return [];
    }
  }

  /**
   * 生成文件名（标准格式）
   * 格式：YYYY-MM-DD_文章标题-国家统计局.xlsx
   */
  generateFilename(linkText, detailUrl) {
    // 从URL提取发布日期（格式：tYYYYMMDD）
    const match = detailUrl.match(/\/t(\d{4})(\d{2})(\d{2})_/);
    let dateStr;
    if (match) {
      dateStr = `${match[1]}-${match[2]}-${match[3]}`;
    } else {
      // 备用方案：匹配8位连续数字
      const match2 = detailUrl.match(/(\d{4})(\d{2})(\d{2})/);
      if (match2) {
        dateStr = `${match2[1]}-${match2[2]}-${match2[3]}`;
      } else {
        dateStr = new Date().toISOString().split('T')[0];
      }
    }
    
    // 如果linkText是"相关数据表"等通用词，需要获取页面标题
    // 这里先返回一个占位符，实际标题会在downloadExcelFromDetailPage中设置
    return `${dateStr}_PLACEHOLDER`;
  }

  /**
   * 从URL提取发布日期（格式：YYYY-MM-DD）
   */
  extractPublishDateFromUrl(url) {
    const match = url.match(/\/t(\d{4})(\d{2})(\d{2})_/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
    
    const match2 = url.match(/(\d{4})(\d{2})(\d{2})/);
    if (match2) {
      return `${match2[1]}-${match2[2]}-${match2[3]}`;
    }
    
    return new Date().toISOString().split('T')[0];
  }

  /**
   * 从页面获取标题并生成标准文件名
   */
  async getStandardFilename(detailUrl, $) {
    const title = $('h1, .title, .article-title').first().text().trim();
    const publishDate = this.extractPublishDateFromUrl(detailUrl);
    return `${publishDate}_${title}-国家统计局.xlsx`;
  }

  /**
   * 下载文件
   */
  async downloadFile(url, filename) {
    try {
      console.log(`正在下载: ${url}`);
      const response = await this.fetchWithRetry(url, {
        responseType: 'stream'
      });
      
      // 检查 filename 是否已经有扩展名
      let finalFilename = filename;
      if (!filename.endsWith('.xls') && !filename.endsWith('.xlsx')) {
        // 确定文件扩展名
        let extension = '.xls';
        if (url.includes('.xlsx')) {
          extension = '.xlsx';
        } else if (response.headers['content-type']?.includes('xlsx')) {
          extension = '.xlsx';
        }
        finalFilename = `${filename}${extension}`;
      }
      
      const filePath = path.join(this.downloadDir, finalFilename);
      
      // 检查文件是否已存在
      if (fs.existsSync(filePath)) {
        console.log(`文件已存在，跳过下载: ${filePath}`);
        return filePath;
      }
      
      // 写入文件
      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);
      
      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          console.log(`下载完成: ${filePath}`);
          resolve(filePath);
        });
        writer.on('error', reject);
      });
    } catch (error) {
      console.error(`下载文件失败 ${url}:`, error.message);
      return null;
    }
  }

  /**
   * 运行对应的解析脚本
   */
  async runParsingScript() {
    // 使用配置中的 parseScript
    let scriptName = this.target.parseScript;
    
    if (!scriptName) {
      console.error('未配置 parseScript，请在 crawler_config.js 中配置');
      throw new Error('未配置解析脚本');
    }
    
    const scriptPath = path.join(__dirname, scriptName);
    
    return new Promise((resolve, reject) => {
      console.log(`开始运行解析脚本: ${scriptName}`);
      
      if (!fs.existsSync(scriptPath)) {
        console.error(`解析脚本不存在: ${scriptPath}`);
        reject(new Error('解析脚本不存在'));
        return;
      }
      
      const child = spawn('node', [scriptPath], {
        cwd: __dirname,
        stdio: 'inherit'
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          console.log('解析脚本执行成功');
          resolve();
        } else {
          console.error(`解析脚本执行失败，退出码: ${code}`);
          reject(new Error(`脚本执行失败，退出码: ${code}`));
        }
      });
      
      child.on('error', (error) => {
        console.error('解析脚本执行出错:', error.message);
        reject(error);
      });
    });
  }

  /**
   * 主流程：抓取数据并解析
   * @param {number|null} startPage - 起始页码
   * @param {number|null} endPage - 结束页码
   */
  async crawlAndParse(startPage = null, endPage = null) {
    console.log(`开始自动化爬取流程 - 目标: ${this.target.name}`);
    
    try {
      // 1. 获取所有分页URL
      const pageUrls = this.getPageUrls(startPage, endPage);
      const displayRange = startPage && endPage ? `第${startPage}-${endPage}页` : `${pageUrls.length}个分页`;
      console.log(`将爬取 ${displayRange} (共${pageUrls.length}个页面)`);
      
      // 2. 提取所有相关链接
      const allLinks = [];
      for (const pageUrl of pageUrls) {
        const links = await this.extractRelevantLinks(pageUrl);
        allLinks.push(...links);
      }
      
      console.log(`总共找到 ${allLinks.length} 个相关链接`);
      
      if (allLinks.length === 0) {
        console.log('没有找到相关链接，流程结束');
        return { target: this.target.name, totalLinks: 0, downloadedFiles: 0, files: [] };
      }
      
      // 3. 下载Excel文件
      const allDownloadedFiles = [];
      for (const link of allLinks) {
        const files = await this.downloadExcelFromDetailPage(link.url);
        allDownloadedFiles.push(...files);
      }
      
      console.log(`总共下载了 ${allDownloadedFiles.length} 个Excel文件`);
      
      if (allDownloadedFiles.length === 0) {
        console.log('没有下载到任何文件，流程结束');
        return { target: this.target.name, totalLinks: allLinks.length, downloadedFiles: 0, files: [] };
      }
      
      // 4. 运行解析脚本
      await this.runParsingScript();
      
      console.log('自动化爬取流程完成！');
      
      return {
        target: this.target.name,
        totalLinks: allLinks.length,
        downloadedFiles: allDownloadedFiles.length,
        files: allDownloadedFiles,
        links: allLinks
      };
      
    } catch (error) {
      console.error('自动化爬取流程失败:', error.message);
      throw error;
    }
  }
}

module.exports = GenericCrawler;
