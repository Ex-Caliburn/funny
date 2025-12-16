const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const xlsx = require('xlsx');
const { spawn } = require('child_process');

/**
 * 自动化爬虫系统
 * 用于抓取统计局网站数据，下载Excel文件，并运行解析脚本
 */

class AutomatedCrawler {
  constructor() {
    this.baseUrl = 'https://www.stats.gov.cn/sj/zxfb/index.html';
    this.dataDir = path.join(__dirname, '../../../stock');
    this.downloadDir = path.join(this.dataDir, 'goods_price');
    this.maxRetries = 3;
    this.delayBetweenRequests = 1000; // 1秒延迟
    
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
  async fetchWithRetry(url, options = {}, retries = this.maxRetries) {
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`正在请求: ${url} (尝试 ${i + 1}/${retries})`);
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
        console.error(`请求失败 (尝试 ${i + 1}/${retries}):`, error.message);
        if (i === retries - 1) throw error;
        await this.sleep(2000 * (i + 1)); // 递增延迟
      }
    }
  }

  /**
   * 解析分页链接
   */
  async getPageUrls(maxPages = 5) {
    const urls = [];
    
    for (let page = 1; page <= maxPages; page++) {
      let url;
      if (page === 1) {
        url = this.baseUrl;
      } else {
        url = `https://www.stats.gov.cn/sj/zxfb/index_${page}.html`;
      }
      urls.push(url);
    }
    
    return urls;
  }

  /**
   * 从页面中提取"流通领域重要生产资料市场价格变动情况"相关链接
   */
  async extractGoodsPriceLinks(pageUrl) {
    try {
      const response = await this.fetchWithRetry(pageUrl);
      const $ = cheerio.load(response.data);
      const links = [];

      // 查找包含"流通领域重要生产资料市场价格变动情况"的链接
      $('a').each((index, element) => {
        const $link = $(element);
        const text = $link.text().trim();
        const href = $link.attr('href');
        
        if (text.includes('流通领域重要生产资料市场价格变动情况') && href) {
          const fullUrl = this.resolveUrl(href, pageUrl);
          const publishDate = this.extractPublishDate($link);
          
          links.push({
            title: text,
            url: fullUrl,
            publishDate: publishDate
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
      
      // 处理 ./ 开头的相对路径
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
   * 从详情页下载Excel文件
   */
  async downloadExcelFromDetailPage(detailUrl) {
    try {
      console.log(`正在访问详情页: ${detailUrl}`);
      const response = await this.fetchWithRetry(detailUrl);
      const $ = cheerio.load(response.data);
      
      // 查找Excel下载链接
      const excelLinks = [];
      
      $('a').each((index, element) => {
        const $link = $(element);
        const href = $link.attr('href');
        const text = $link.text().trim();
        
        if (href && (href.endsWith('.xls') || href.endsWith('.xlsx') || 
                    text.includes('相关数据表') || text.includes('Excel'))) {
          const fullUrl = this.resolveUrl(href, detailUrl);
          excelLinks.push({
            url: fullUrl,
            text: text,
            filename: this.generateFilename(text, detailUrl)
          });
        }
      });

      console.log(`找到 ${excelLinks.length} 个Excel下载链接`);
      
      // 下载所有找到的Excel文件
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
   * 生成文件名
   */
  generateFilename(linkText, detailUrl) {
    const dateMatch = detailUrl.match(/(\d{4}-\d{2}-\d{2})/);
    const dateStr = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0];
    
    // 清理文件名
    const cleanText = linkText.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '_').slice(0, 30);
    const filename = `${dateStr}_${cleanText}`;
    
    return filename;
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
      
      // 确定文件扩展名
      let extension = '.xls';
      if (url.includes('.xlsx')) {
        extension = '.xlsx';
      } else if (response.headers['content-type']?.includes('xlsx')) {
        extension = '.xlsx';
      }
      
      const filePath = path.join(this.downloadDir, `${filename}${extension}`);
      
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
   * 运行解析脚本
   */
  async runParsingScript() {
    return new Promise((resolve, reject) => {
      console.log('开始运行商品价格解析脚本...');
      const scriptPath = path.join(__dirname, '../../tools/goods_price_parse.js');
      
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
   */
  async crawlAndParse(maxPages = 5) {
    console.log('开始自动化爬取流程...');
    
    try {
      // 1. 获取所有分页URL
      const pageUrls = await this.getPageUrls(maxPages);
      console.log(`将爬取 ${pageUrls.length} 个分页`);
      
      // 2. 提取所有相关链接
      const allLinks = [];
      for (const pageUrl of pageUrls) {
        const links = await this.extractGoodsPriceLinks(pageUrl);
        allLinks.push(...links);
      }
      
      console.log(`总共找到 ${allLinks.length} 个相关链接`);
      
      if (allLinks.length === 0) {
        console.log('没有找到相关链接，流程结束');
        return;
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
        return;
      }
      
      // 4. 运行解析脚本
      await this.runParsingScript();
      
      console.log('自动化爬取流程完成！');
      
      return {
        totalLinks: allLinks.length,
        downloadedFiles: allDownloadedFiles.length,
        files: allDownloadedFiles
      };
      
    } catch (error) {
      console.error('自动化爬取流程失败:', error.message);
      throw error;
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const crawler = new AutomatedCrawler();
  
  // 获取命令行参数
  const maxPages = process.argv[2] ? parseInt(process.argv[2]) : 3;
  
  crawler.crawlAndParse(maxPages)
    .then(result => {
      console.log('爬取结果:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('爬取失败:', error.message);
      process.exit(1);
    });
}

module.exports = AutomatedCrawler;
