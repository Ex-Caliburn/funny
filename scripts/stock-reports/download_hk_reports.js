/**
 * 港股业绩报下载工具
 * 支持：年报、中期报告、季度报告
 * 数据源：港交所披露易（www.hkexnews.hk）
 * 
 * 使用方法：
 * # 下载所有类型报告
 * node download_hk_reports.js --code 00700 --name 腾讯控股 --years 2023 --type all
 * 
 * # 只下载年报
 * node download_hk_reports.js --code 00700 --name 腾讯控股 --years 2023 --type annual
 * 
 * # 同时下载多个类型
 * node download_hk_reports.js --code 00700 --name 腾讯控股 --years 2023 --types annual,interim
 * 
 * # 下载多年数据
 * node download_hk_reports.js --code 00700 --name 腾讯控股 --start 2021 --end 2023 --type annual
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');
const { PDFParse } = require('pdf-parse');
const cheerio = require('cheerio');

// 尝试加载Puppeteer（可选）
let puppeteer = null;
try {
  puppeteer = require('puppeteer');
} catch (e) {
  // Puppeteer未安装，将使用HTTP请求方式
}

// 配置
const CONFIG = {
  SEARCH_API: 'https://www1.hkexnews.hk/search/titlesearch.xhtml',
  BASE_URL: 'https://www.hkexnews.hk',
  
  HEADERS: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Referer': 'https://www.hkexnews.hk/',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
  },
  
  // 报告类型配置
  REPORT_TYPES: {
    annual: { 
      name: '年报', 
      enName: 'Annual Report',
      keywords: ['年度报告', '年报', 'Annual Report', 'Annual'],
      category: 40400  // 年报类别代码
    },
    interim: { 
      name: '中期报告', 
      enName: 'Interim Report',
      keywords: ['中期报告', 'Interim Report', 'Interim'],
      category: 40400  // 中期报告类别代码
    },
    quarterly: { 
      name: '季度报告', 
      enName: 'Quarterly Report',
      keywords: ['季度报告', 'Quarterly Report', 'Quarterly', '季度'],
      category: 40400  // 季度报告类别代码
    },
    q1: { 
      name: '第一季度报告', 
      enName: 'Q1 Report',
      keywords: ['第一季度', 'Q1', 'First Quarter'],
      category: 40400
    },
    q2: { 
      name: '第二季度报告', 
      enName: 'Q2 Report',
      keywords: ['第二季度', 'Q2', 'Second Quarter'],
      category: 40400
    },
    q3: { 
      name: '第三季度报告', 
      enName: 'Q3 Report',
      keywords: ['第三季度', 'Q3', 'Third Quarter'],
      category: 40400
    }
  }
};

/**
 * 解析命令行参数
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const params = { 
    code: '', 
    name: '', 
    years: [], 
    outputDir: '',
    reportTypes: ['annual'], // 默认只下载年报
    lang: 'ZH' // 默认中文
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--code':
        params.code = args[++i];
        break;
      case '--name':
        params.name = args[++i];
        break;
      case '--years':
        params.years = args[++i].split(',').map(y => parseInt(y.trim()));
        break;
      case '--start':
        params.start = parseInt(args[++i]);
        break;
      case '--end':
        params.end = parseInt(args[++i]);
        if (params.start) {
          params.years = [];
          for (let y = params.start; y <= params.end; y++) {
            params.years.push(y);
          }
        }
        break;
      case '--output':
        params.outputDir = args[++i];
        break;
      case '--type':
        params.reportTypes = [args[++i]];
        break;
      case '--types':
        params.reportTypes = args[++i].split(',').map(t => t.trim());
        break;
      case '--lang':
        params.lang = args[++i].toUpperCase(); // ZH 或 EN
        break;
    }
  }

  return params;
}

/**
 * 验证参数
 */
function validateParams(params) {
  if (!params.code) throw new Error('请提供股票代码 (--code)');
  if (!params.name) throw new Error('请提供公司名称 (--name)');
  if (params.years.length === 0) throw new Error('请提供年份');
  
  // 验证股票代码格式（港股是5位数字）
  if (!/^\d{5}$/.test(params.code)) {
    throw new Error('港股代码必须是5位数字（如：00700）');
  }
  
  // 确保 reportTypes 是数组
  if (!Array.isArray(params.reportTypes)) {
    params.reportTypes = [params.reportTypes];
  }
  
  const validTypes = ['annual', 'interim', 'quarterly', 'q1', 'q2', 'q3', 'all'];
  for (const reportType of params.reportTypes) {
    if (!validTypes.includes(reportType)) {
      throw new Error(`报告类型必须是: ${validTypes.join(', ')}，当前值: ${reportType}`);
    }
  }
  
  return true;
}

/**
 * 创建输出目录
 */
function ensureOutputDir(params) {
  if (!params.outputDir) {
    params.outputDir = path.join(__dirname, '../..', 'stock', 'hk_reports', params.name);
  }
  
  if (!fs.existsSync(params.outputDir)) {
    fs.mkdirSync(params.outputDir, { recursive: true });
    console.log(`✓ 创建目录: ${params.outputDir}`);
  }
  
  return params.outputDir;
}

/**
 * 使用Puppeteer搜索港股报告（支持JavaScript动态加载）
 */
async function searchHKReportWithPuppeteer(stockCode, year, reportType, lang = 'ZH') {
  if (!puppeteer) {
    throw new Error('Puppeteer未安装，请运行: npm install puppeteer');
  }
  
  const typeConfig = CONFIG.REPORT_TYPES[reportType];
  if (!typeConfig) {
    throw new Error(`未知的报告类型: ${reportType}`);
  }
  
  // 港股代码处理：去掉前导零（00700 -> 700）
  const stockId = parseInt(stockCode).toString();
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // 设置用户代理
    await page.setUserAgent(CONFIG.HEADERS['User-Agent']);
    
    // 访问搜索页面
    const searchUrl = `${CONFIG.SEARCH_API}?lang=${lang.toLowerCase() === 'zh' ? 'zh' : 'en'}`;
    console.log(`      🔍 访问搜索页面: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // 等待页面完全加载（包括JavaScript）
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 使用JavaScript直接操作表单（因为JSF表单可能是隐藏的）
    const fromDate = `${year}0101`;
    const toDate = `${year + 1}1231`;
    
    console.log(`      🔍 填写搜索表单...`);
    // 使用正确的选择器填写表单
    try {
      // 填写股票代码（使用可见的输入框）
      const stockInput = await page.$('#searchStockCode');
      if (stockInput) {
        await stockInput.click({ clickCount: 3 }); // 选中现有内容
        await stockInput.type(stockId, { delay: 50 });
        console.log(`      ✓ 已输入股票代码: ${stockId}`);
      } else {
        console.log(`      ⚠️  未找到股票代码输入框`);
      }
    } catch (e) {
      console.log(`      ⚠️  填写股票代码失败: ${e.message}`);
    }
    
    // 填写日期（格式：yyyy/mm/dd）
    const fromDateFormatted = `${year}/01/01`;
    const toDateFormatted = `${year + 1}/12/31`;
    
    try {
      // 填写开始日期
      const fromInput = await page.$('#searchDate-From');
      if (fromInput) {
        await fromInput.click({ clickCount: 3 });
        await fromInput.type(fromDateFormatted, { delay: 50 });
        console.log(`      ✓ 已输入开始日期: ${fromDateFormatted}`);
      }
    } catch (e) {
      console.log(`      ⚠️  填写开始日期失败: ${e.message}`);
    }
    
    try {
      // 填写结束日期
      const toInput = await page.$('#searchDate-To');
      if (toInput) {
        await toInput.click({ clickCount: 3 });
        await toInput.type(toDateFormatted, { delay: 50 });
        console.log(`      ✓ 已输入结束日期: ${toDateFormatted}`);
      }
    } catch (e) {
      console.log(`      ⚠️  填写结束日期失败: ${e.message}`);
    }
    
    // 验证表单是否填写成功
    const formFilled = await page.evaluate(() => {
      const stockValue = document.querySelector('#searchStockCode')?.value || '';
      const fromValue = document.querySelector('#searchDate-From')?.value || '';
      const toValue = document.querySelector('#searchDate-To')?.value || '';
      return stockValue.length > 0 && (fromValue.length > 0 || toValue.length > 0);
    });
    
    if (!formFilled) {
      console.log(`      ⚠️  表单填写可能失败，继续尝试...`);
    } else {
      console.log(`      ✓ 表单已填写`);
    }
    
    // 等待一下让表单更新
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // 提交搜索表单（使用正确的按钮选择器）
    console.log(`      🔍 提交搜索表单...`);
    try {
      // 查找搜索按钮（使用正确的类名）
      const searchButton = await page.$('.filter__btn-applyFilters-js');
      if (searchButton) {
        await searchButton.click();
        console.log(`      ✓ 已点击搜索按钮`);
      } else {
        // 尝试通过JavaScript查找
        const buttonFound = await page.evaluate(() => {
          // 优先查找正确的类名
          let btn = document.querySelector('.filter__btn-applyFilters-js, .btn-blue');
          if (btn) {
            btn.click();
            return true;
          }
          // 查找包含"SEARCH"文本的链接
          const links = Array.from(document.querySelectorAll('a'));
          btn = links.find(b => {
            const text = (b.textContent || '').trim().toUpperCase();
            return text === 'SEARCH' || text.includes('SEARCH');
          });
          if (btn) {
            btn.click();
            return true;
          }
          return false;
        });
        
        if (!buttonFound) {
          console.log(`      ⚠️  未找到搜索按钮`);
        }
      }
    } catch (e) {
      console.log(`      ⚠️  点击搜索按钮失败: ${e.message}`);
    }
    
    // 等待搜索结果加载（使用更宽松的等待策略）
    console.log(`      🔍 等待搜索结果加载...`);
    try {
      // 等待页面导航完成或结果出现
      await Promise.race([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {}),
        page.waitForSelector('#titleSearchResultPanel table tbody tr, table.title-search-result tbody tr, table tbody tr', { timeout: 15000 }).catch(() => {})
      ]);
    } catch (e) {
      // 即使超时也继续
      console.log(`      ⚠️  等待超时，继续尝试提取...`);
    }
    
    // 再等待一下确保内容渲染完成
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 提取搜索结果
    console.log(`      🔍 提取搜索结果...`);
    const reports = await page.evaluate((year, typeConfig) => {
      const results = [];
      
      // 查找结果表格行（尝试多种选择器，包括港交所特定的）
      const rows = document.querySelectorAll('#titleSearchResultPanel table tbody tr, table.title-search-result tbody tr, table tbody tr, .result-row, .search-result-row');
      
      rows.forEach(row => {
        // 提取日期
        const dateCell = row.querySelector('td:first-child, .date, .release-date');
        if (!dateCell) return;
        
        const dateText = dateCell.textContent.trim();
        const dateMatch = dateText.match(/(\d{4}-\d{2}-\d{2})/);
        if (!dateMatch) return;
        
        const date = dateMatch[1];
        const reportYear = parseInt(date.substring(0, 4));
        
        // 检查年份
        if (reportYear < year || reportYear > year + 1) return;
        
        // 提取文档链接和标题
        const link = row.querySelector('a[href*=".pdf"], a[href*="document"], a[href*="file"], td a');
        if (!link) return;
        
        const docUrl = link.getAttribute('href');
        const docTitle = link.textContent.trim() || row.querySelector('td:nth-child(2), .title')?.textContent.trim() || '';
        
        if (!docTitle) return;
        
        // 检查标题是否匹配报告类型
        const titleLower = docTitle.toLowerCase();
        const hasKeyword = typeConfig.keywords.some(kw => 
          titleLower.includes(kw.toLowerCase()) || docTitle.includes(kw)
        );
        
        if (!hasKeyword) return;
        
        // 排除不需要的文档
        const excludeWords = ['摘要', 'Summary', '更正', 'Amendment', '补充', 'Supplement', '修订', 'Revised', 'Erratum'];
        const hasExclude = excludeWords.some(word => docTitle.includes(word));
        if (hasExclude) return;
        
        results.push({
          title: docTitle,
          url: docUrl,
          date: date,
          year: reportYear
        });
      });
      
      return results;
    }, year, typeConfig);
    
    // 按日期排序
    reports.sort((a, b) => b.date.localeCompare(a.date));
    
    console.log(`      🔍 找到 ${reports.length} 个结果`);
    
    if (reports.length > 0) {
      // 构建完整URL
      reports.forEach(report => {
        if (!report.url.startsWith('http')) {
          if (report.url.startsWith('/')) {
            report.url = CONFIG.BASE_URL + report.url;
          } else {
            report.url = CONFIG.BASE_URL + '/' + report.url;
          }
        }
      });
      
      // 调试：显示找到的报告
      if (process.env.DEBUG_HK) {
        console.log(`      🔍 调试：找到的报告:`);
        reports.forEach((r, i) => {
          console.log(`         ${i + 1}. ${r.title} (${r.date})`);
        });
      }
      
      return { reports, type: reportType, typeConfig, multiple: reports.length > 1 };
    }
    
    // 如果没找到，尝试保存页面截图用于调试
    if (process.env.DEBUG_HK) {
      const debugPath = require('path').join(__dirname, 'hk_debug_screenshot.png');
      await page.screenshot({ path: debugPath, fullPage: true });
      const html = await page.content();
      fs.writeFileSync(require('path').join(__dirname, 'hk_debug_page.html'), html);
      console.log(`      🔍 调试：已保存页面截图和HTML`);
    }
    
    return null;
  } finally {
    await browser.close();
  }
}

/**
 * 搜索港股报告（优先使用Puppeteer，如果不可用则使用HTTP请求）
 */
async function searchHKReport(stockCode, year, reportType, lang = 'ZH') {
  // 如果Puppeteer可用，优先使用
  if (puppeteer) {
    try {
      return await searchHKReportWithPuppeteer(stockCode, year, reportType, lang);
    } catch (error) {
      console.log(`      ⚠️  Puppeteer搜索失败: ${error.message}，尝试HTTP方式...`);
      // 如果Puppeteer失败，回退到HTTP方式
    }
  }
  
  // 使用HTTP请求方式（原有逻辑）
  return new Promise((resolve, reject) => {
    const typeConfig = CONFIG.REPORT_TYPES[reportType];
    if (!typeConfig) {
      reject(new Error(`未知的报告类型: ${reportType}`));
      return;
    }
    
    // 港股代码处理：去掉前导零（00700 -> 700）
    const stockId = parseInt(stockCode).toString();
    
    // 构建搜索参数
    const fromDate = `${year}0101`;
    const toDate = `${year + 1}1231`; // 年报通常在次年发布，所以搜索到次年年底
    
    const postData = querystring.stringify({
      'lang': lang,
      'market': 'SEHK', // 主板
      'searchType': 1,
      't1code': 40000, // 标题搜索
      't2Gcode': -2,
      't2code': typeConfig.category || 40400,
      'stockId': stockId, // 使用去掉前导零的代码
      'from': fromDate,
      'to': toDate,
      'category': 0
    });

    const url = new URL(CONFIG.SEARCH_API);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        ...CONFIG.HEADERS,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          // 调试：如果启用调试模式，保存HTML响应
          if (process.env.DEBUG_HK) {
            fs.writeFileSync(path.join(__dirname, '../docs/hk_debug_response.html'), data);
            console.log(`      🔍 调试：已保存响应到 hk_debug_response.html`);
          }
          
          // 解析HTML响应
          const reports = parseSearchResults(data, year, reportType, typeConfig);
          if (reports && reports.length > 0) {
            resolve({ reports, type: reportType, typeConfig, multiple: reports.length > 1 });
          } else {
            // 调试信息
            if (process.env.DEBUG_HK) {
              console.log(`      🔍 调试：未找到报告，HTML长度: ${data.length}`);
              console.log(`      🔍 调试：HTML前500字符: ${data.substring(0, 500)}`);
            }
            resolve(null);
          }
        } catch (err) {
          reject(new Error(`解析失败: ${err.message}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(new Error(`搜索失败: ${err.message}`));
    });

    req.write(postData);
    req.end();
  });
}

/**
 * 解析搜索结果HTML
 */
function parseSearchResults(html, year, reportType, typeConfig) {
  const reports = [];
  
  try {
    const $ = cheerio.load(html);
    
    // 查找结果表格
    // 港交所的搜索结果通常在表格中，查找包含报告链接的行
    $('table tr, .result-row, .search-result-row').each((index, element) => {
      const $row = $(element);
      
      // 提取日期（通常在第一个td中）
      const dateText = $row.find('td:first-child, .date').text().trim();
      const dateMatch = dateText.match(/(\d{4}-\d{2}-\d{2})/);
      if (!dateMatch) return;
      
      const date = dateMatch[1];
      const reportYear = parseInt(date.substring(0, 4));
      
      // 检查年份是否匹配（允许次年发布，如2023年年报在2024年发布）
      if (reportYear < year || reportYear > year + 1) return;
      
      // 提取文档链接和标题
      const $link = $row.find('a[href*=".pdf"], a[href*="document"], a[href*="file"]').first();
      if ($link.length === 0) return;
      
      let docUrl = $link.attr('href') || '';
      const docTitle = $link.text().trim() || $row.find('td:nth-child(2), .title').text().trim();
      
      if (!docTitle) return;
      
      // 检查标题是否匹配报告类型
      const titleLower = docTitle.toLowerCase();
      const hasKeyword = typeConfig.keywords.some(kw => 
        titleLower.includes(kw.toLowerCase()) || docTitle.includes(kw)
      );
      
      if (!hasKeyword) return;
      
      // 排除不需要的文档
      const excludeWords = ['摘要', 'Summary', '更正', 'Amendment', '补充', 'Supplement', '修订', 'Revised', 'Erratum'];
      const hasExclude = excludeWords.some(word => docTitle.includes(word));
      if (hasExclude) return;
      
      // 构建完整URL
      if (!docUrl.startsWith('http')) {
        if (docUrl.startsWith('/')) {
          docUrl = CONFIG.BASE_URL + docUrl;
        } else {
          docUrl = CONFIG.BASE_URL + '/' + docUrl;
        }
      }
      
      // 如果URL不是PDF，可能需要访问详情页获取PDF链接
      // 这里先添加，后续可以改进
      reports.push({
        title: docTitle,
        url: docUrl,
        date: date,
        year: reportYear
      });
    });
    
    // 如果cheerio解析失败，尝试正则表达式作为备选
    if (reports.length === 0) {
      const rowPattern = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
      const rows = html.match(rowPattern);
      
      if (rows) {
        for (const row of rows) {
          const dateMatch = row.match(/<td[^>]*>(\d{4}-\d{2}-\d{2})<\/td>/);
          if (!dateMatch) continue;
          
          const date = dateMatch[1];
          const reportYear = parseInt(date.substring(0, 4));
          if (reportYear < year || reportYear > year + 1) continue;
          
          const linkMatch = row.match(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/);
          if (!linkMatch) continue;
          
          const docUrl = linkMatch[1];
          const docTitle = linkMatch[2].replace(/<[^>]*>/g, '').trim();
          
          const titleLower = docTitle.toLowerCase();
          const hasKeyword = typeConfig.keywords.some(kw => 
            titleLower.includes(kw.toLowerCase()) || docTitle.includes(kw)
          );
          
          if (!hasKeyword) continue;
          
          const excludeWords = ['摘要', 'Summary', '更正', 'Amendment', '补充', 'Supplement', '修订', 'Revised'];
          const hasExclude = excludeWords.some(word => docTitle.includes(word));
          if (hasExclude) continue;
          
          let fullUrl = docUrl;
          if (!fullUrl.startsWith('http')) {
            if (fullUrl.startsWith('/')) {
              fullUrl = CONFIG.BASE_URL + fullUrl;
            } else {
              fullUrl = CONFIG.BASE_URL + '/' + fullUrl;
            }
          }
          
          reports.push({
            title: docTitle,
            url: fullUrl,
            date: date,
            year: reportYear
          });
        }
      }
    }
    
    // 按日期排序（最新的在前）
    reports.sort((a, b) => b.date.localeCompare(a.date));
    
    return reports.length > 0 ? reports : null;
  } catch (error) {
    console.error(`解析HTML失败: ${error.message}`);
    return null;
  }
}

/**
 * 下载文件
 */
function downloadFile(url, outputPath, title) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, { headers: CONFIG.HEADERS }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlinkSync(outputPath);
        return downloadFile(response.headers.location, outputPath, title)
          .then(resolve)
          .catch(reject);
      }
      
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(outputPath);
        return reject(new Error(`HTTP ${response.statusCode}`));
      }
      
      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloadedSize = 0;
      let lastPercent = 0;
      
      response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        if (totalSize) {
          const percent = Math.floor((downloadedSize / totalSize) * 100);
          if (percent > lastPercent && percent % 20 === 0) {
            process.stdout.write(`\r     进度: ${percent}%`);
            lastPercent = percent;
          }
        }
      });
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        process.stdout.write(`\r     进度: 100%\n`);
        
        const stats = fs.statSync(outputPath);
        const fileSizeKB = Math.round(stats.size / 1024);
        console.log(`      📦 文件大小: ${fileSizeKB} KB`);
        
        resolve({ path: outputPath, size: stats.size });
      });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      reject(err);
    });
  });
}

/**
 * 从详情页提取PDF链接
 */
function extractPDFUrlFromDetailPage(detailUrl) {
  return new Promise((resolve, reject) => {
    const url = new URL(detailUrl);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + (url.search || ''),
      method: 'GET',
      headers: CONFIG.HEADERS
    };
    
    const protocol = url.protocol === 'https:' ? https : http;
    const req = protocol.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const $ = cheerio.load(data);
          
          // 查找PDF下载链接
          let pdfUrl = null;
          
          // 方法1: 查找直接链接到PDF的a标签
          $('a[href$=".pdf"], a[href*=".pdf"]').each((index, element) => {
            const href = $(element).attr('href');
            if (href && href.toLowerCase().includes('.pdf')) {
              if (!pdfUrl) { // 只取第一个
                pdfUrl = href;
                return false; // 跳出循环
              }
            }
          });
          
          // 方法2: 查找包含"下载"、"Download"、"PDF"等关键词的链接
          if (!pdfUrl) {
            $('a').each((index, element) => {
              const $link = $(element);
              const href = $link.attr('href');
              const text = $link.text().toLowerCase();
              
              if (href && (text.includes('download') || text.includes('下载') || text.includes('pdf'))) {
                if (href.toLowerCase().includes('.pdf')) {
                  pdfUrl = href;
                  return false;
                }
              }
            });
          }
          
          // 构建完整URL
          if (pdfUrl) {
            if (!pdfUrl.startsWith('http')) {
              if (pdfUrl.startsWith('/')) {
                pdfUrl = CONFIG.BASE_URL + pdfUrl;
              } else {
                pdfUrl = new URL(pdfUrl, detailUrl).href;
              }
            }
            resolve(pdfUrl);
          } else {
            resolve(null);
          }
        } catch (err) {
          reject(new Error(`解析详情页失败: ${err.message}`));
        }
      });
    });
    
    req.on('error', (err) => {
      reject(new Error(`访问详情页失败: ${err.message}`));
    });
    
    req.end();
  });
}

/**
 * 验证文件大小
 */
function validateFileSize(filePath, reportType) {
  const stats = fs.statSync(filePath);
  const fileSizeKB = Math.round(stats.size / 1024);
  
  const minSizes = {
    'annual': 500,
    'interim': 300,
    'quarterly': 100,
    'q1': 100,
    'q2': 100,
    'q3': 100
  };
  
  const minSize = minSizes[reportType] || 100;
  const isValid = fileSizeKB >= minSize;
  
  return {
    valid: isValid,
    size: stats.size,
    sizeKB: fileSizeKB,
    minSizeKB: minSize,
    reason: isValid ? '文件大小正常' : `文件过小 (${fileSizeKB} KB < ${minSize} KB)`
  };
}

/**
 * 下载某年某类型的报告
 */
async function downloadReportByType(params, year, reportType) {
  const typeConfig = CONFIG.REPORT_TYPES[reportType];
  
  console.log(`   📄 查找${typeConfig.name}...`);
  
  try {
    const result = await searchHKReport(params.code, year, reportType, params.lang);
    
    if (!result || !result.reports || result.reports.length === 0) {
      console.log(`      ⚠ 未找到`);
      return { year, type: reportType, success: false, reason: '未找到' };
    }
    
    // 如果有多个报告，选择最匹配的（通常是第一个，因为已按日期排序）
    const report = result.reports[0];
    
    // 生成文件名
    const fileName = `${params.name}_${year}_${typeConfig.name}.pdf`;
    const outputPath = path.join(params.outputDir, fileName);
    
    // 检查是否已存在
    if (fs.existsSync(outputPath)) {
      const sizeCheck = validateFileSize(outputPath, reportType);
      if (sizeCheck.valid) {
        console.log(`      ✓ 已存在 (${sizeCheck.sizeKB} KB)`);
        return { year, type: reportType, success: true, cached: true, path: outputPath };
      }
    }
    
    // 下载
    console.log(`      ⬇️  下载中...`);
    console.log(`      📄 ${report.title}`);
    try {
      // 如果URL不是PDF，尝试从详情页提取PDF链接
      let downloadUrl = report.url;
      if (!downloadUrl.toLowerCase().endsWith('.pdf')) {
        const pdfUrl = await extractPDFUrlFromDetailPage(downloadUrl);
        if (pdfUrl) {
          downloadUrl = pdfUrl;
        }
      }
      
      await downloadFile(downloadUrl, outputPath, report.title);
      const sizeCheck = validateFileSize(outputPath, reportType);
      
      if (sizeCheck.valid) {
        console.log(`      ✅ 下载完成 (${sizeCheck.sizeKB} KB)`);
        return { year, type: reportType, success: true, path: outputPath };
      } else {
        console.log(`      ⚠️  ${sizeCheck.reason}`);
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
        return { year, type: reportType, success: false, reason: sizeCheck.reason };
      }
    } catch (error) {
      console.log(`      ❌ 失败: ${error.message}`);
      return { year, type: reportType, success: false, reason: error.message };
    }
    
  } catch (error) {
    console.log(`      ❌ 失败: ${error.message}`);
    return { year, type: reportType, success: false, reason: error.message };
  }
}

/**
 * 下载某年的报告
 */
async function downloadYearReports(params, year) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 ${params.name} ${year} 年`);
  console.log(`${'='.repeat(60)}`);
  
  const results = [];
  
  // 根据类型参数决定下载哪些报告
  const typesToDownload = [];
  
  for (const reportType of params.reportTypes) {
    if (reportType === 'all') {
      typesToDownload.push('annual', 'interim', 'quarterly');
    } else if (reportType === 'quarterly') {
      typesToDownload.push('q1', 'q2', 'q3');
    } else {
      typesToDownload.push(reportType);
    }
  }
  
  // 去重
  const uniqueTypes = [...new Set(typesToDownload)];
  
  // 按顺序下载各类型报告
  for (let i = 0; i < uniqueTypes.length; i++) {
    const type = uniqueTypes[i];
    const result = await downloadReportByType(params, year, type);
    results.push(result);
    
    // 每个报告之间延迟1秒
    if (i < uniqueTypes.length - 1) {
      await delay(1000);
    }
  }
  
  return results;
}

/**
 * 延迟
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 主函数
 */
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('📥 港股业绩报下载工具');
  console.log('🔗 支持: 年报 / 中期报告 / 季度报告');
  console.log('='.repeat(60) + '\n');
  
  // 检查Puppeteer是否可用
  if (puppeteer) {
    console.log('✅ 已启用Puppeteer支持（支持JavaScript动态加载）\n');
  } else {
    console.log('⚠️  Puppeteer未安装，将使用HTTP请求方式（可能无法获取动态加载的内容）');
    console.log('💡 建议安装Puppeteer以获得更好的支持: npm install puppeteer\n');
  }
  
  try {
    const params = parseArgs();
    validateParams(params);
    ensureOutputDir(params);
    
    // 显示报告类型说明
    const typeDescriptions = {
      'all': '年报 + 中期报告 + 季度报告',
      'annual': '年报',
      'interim': '中期报告',
      'quarterly': '季度报告(Q1+Q2+Q3)',
      'q1': '第一季度报告',
      'q2': '第二季度报告',
      'q3': '第三季度报告'
    };
    
    const typeDescList = params.reportTypes.map(type => {
      return typeDescriptions[type] || CONFIG.REPORT_TYPES[type]?.name || type;
    });
    const typeDesc = typeDescList.join(' + ');
    
    console.log(`📋 下载配置:`);
    console.log(`   公司: ${params.name} (${params.code})`);
    console.log(`   年份: ${params.years.join(', ')}`);
    console.log(`   类型: ${typeDesc}`);
    console.log(`   语言: ${params.lang === 'ZH' ? '中文' : '英文'}`);
    console.log(`   目录: ${params.outputDir}`);
    
    const allResults = [];
    
    for (let i = 0; i < params.years.length; i++) {
      const results = await downloadYearReports(params, params.years[i]);
      allResults.push(...results);
      
      if (i < params.years.length - 1) {
        await delay(2000);
      }
    }
    
    // 总结
    console.log('\n' + '='.repeat(60));
    console.log('📊 下载总结');
    console.log('='.repeat(60));
    
    const successful = allResults.filter(r => r.success);
    const cached = allResults.filter(r => r.cached);
    const failed = allResults.filter(r => !r.success);
    
    console.log(`✅ 成功: ${successful.length} 份 (其中 ${cached.length} 份已存在)`);
    console.log(`❌ 失败: ${failed.length} 份`);
    
    // 按类型统计
    const byType = {};
    allResults.forEach(r => {
      const typeName = CONFIG.REPORT_TYPES[r.type]?.name || r.type;
      if (!byType[typeName]) byType[typeName] = { success: 0, failed: 0 };
      if (r.success) byType[typeName].success++;
      else byType[typeName].failed++;
    });
    
    console.log(`\n按类型统计:`);
    Object.keys(byType).forEach(typeName => {
      const stat = byType[typeName];
      console.log(`   ${typeName}: ${stat.success}✓ / ${stat.failed}✗`);
    });
    
    if (failed.length > 0) {
      console.log(`\n未找到的报告:`);
      failed.forEach(f => {
        const typeName = CONFIG.REPORT_TYPES[f.type]?.name || f.type;
        console.log(`   - ${f.year}年 ${typeName}: ${f.reason}`);
      });
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
    
  } catch (error) {
    console.error(`\n❌ 错误: ${error.message}\n`);
    console.log('使用方法:');
    console.log('  # 下载所有类型报告');
    console.log('  node download_hk_reports.js --code 00700 --name 腾讯控股 --years 2023 --type all\n');
    console.log('  # 只下载年报');
    console.log('  node download_hk_reports.js --code 00700 --name 腾讯控股 --years 2023 --type annual\n');
    console.log('  # 同时下载多个类型');
    console.log('  node download_hk_reports.js --code 00700 --name 腾讯控股 --years 2023 --types annual,interim\n');
    console.log('  # 下载多年数据');
    console.log('  node download_hk_reports.js --code 00700 --name 腾讯控股 --start 2021 --end 2023 --type annual\n');
    console.log('  # 指定语言（英文）');
    console.log('  node download_hk_reports.js --code 00700 --name 腾讯控股 --years 2023 --type annual --lang EN\n');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { searchHKReport, downloadFile };

