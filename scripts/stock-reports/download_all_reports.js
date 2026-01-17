/**
 * 上市公司财报下载工具 - 全功能版
 * 支持：年度报告、半年度报告、季度报告、生产经营数据公告
 *
 * 使用方法：
 * # 下载所有类型报告
 * node scripts/stock-reports/download_all_reports.js --code 600348 --name 华阳股份 --years 2023 --type all
 *
 * # 只下载年报
 * node download_all_reports.js --code 600348 --name 华阳股份 --years 2023 --type annual
 *
 * # 同时下载年报和运营报告（推荐）
 * node download_all_reports.js --code 600348 --name 华阳股份 --years 2023 --types annual,production --keywords "生产经营数据公告"
 *
 * # 同时下载多个类型（用逗号分隔）
 * node download_all_reports.js --code 600348 --name 华阳股份 --years 2023 --types annual,semi,production --keywords "生产经营数据公告"
 *
 * # 只下载半年报
 * node download_all_reports.js --code 600348 --name 华阳股份 --years 2023 --type semi
 *
 * # 只下载季报
 * node download_all_reports.js --code 600348 --name 华阳股份 --years 2023 --type quarterly
 *
 * # 下载生产经营数据公告（支持自定义关键词）
 * node download_all_reports.js --code 600546 --name 山煤国际 --years 2024 --type production --keywords "生产经营数据公告"
 * node download_all_reports.js --code 600546 --name 山煤国际 --years 2024 --type production --keywords "生产经营数据公告,月度数据"
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');
const { PDFParse } = require('pdf-parse');

// 配置
const CONFIG = {
  SEARCH_API: 'http://www.cninfo.com.cn/new/fulltextSearch/full',
  DOWNLOAD_BASE: 'http://static.cninfo.com.cn/',

  HEADERS: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Accept': '*/*',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Referer': 'http://www.cninfo.com.cn/',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'X-Requested-With': 'XMLHttpRequest'
  },

  // 报告类型
  REPORT_TYPES: {
    annual: { name: '年度报告', keywords: ['年度报告', '年报'], quarter: null },
    semi: { name: '半年度报告', keywords: ['半年度报告', '半年报'], quarter: null },
    q1: { name: '第一季度报告', keywords: ['第一季度', '一季报', '第一季度报告', '一季度报告', '一季度'], quarter: 1 },
    q3: { name: '第三季度报告', keywords: ['第三季度', '三季报', '第三季度报告', '三季度报告', '三季度'], quarter: 3 },
    production: { name: '生产经营数据公告', keywords: ['生产经营数据'], quarter: null, customKeywords: true }
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
    reportTypes: ['annual'], // 默认只下载年报，支持数组
    customKeywords: [] // 自定义关键词
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
        // 向后兼容：单个类型
        params.reportTypes = [args[++i]];
        break;
      case '--types':
        // 支持多个类型，用逗号分隔
        params.reportTypes = args[++i].split(',').map(t => t.trim());
        break;
      case '--keywords':
        params.customKeywords = args[++i].split(',').map(k => k.trim());
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

  // 确保 reportTypes 是数组
  if (!Array.isArray(params.reportTypes)) {
    params.reportTypes = [params.reportTypes];
  }

  const validTypes = ['annual', 'semi', 'quarterly', 'q1', 'q3', 'all', 'production'];
  for (const reportType of params.reportTypes) {
    if (!validTypes.includes(reportType)) {
      throw new Error(`报告类型必须是: ${validTypes.join(', ')}，当前值: ${reportType}`);
    }
  }

  // 如果是生产经营数据类型，检查是否提供了关键词
  if (params.reportTypes.includes('production') && params.customKeywords.length === 0) {
    // 使用默认关键词（更宽泛的匹配）
    params.customKeywords = ['生产经营数据'];
    console.log(`   ℹ️  未提供关键词，使用默认关键词: ${params.customKeywords.join(', ')}`);
  }

  return true;
}

/**
 * 创建输出目录
 */
function ensureOutputDir(params) {
  if (!params.outputDir) {
    params.outputDir = path.join(__dirname, '../..', 'stock', 'report_analysis', params.name);
  }

  if (!fs.existsSync(params.outputDir)) {
    fs.mkdirSync(params.outputDir, { recursive: true });
    console.log(`✓ 创建目录: ${params.outputDir}`);
  }

  return params.outputDir;
}

/**
 * 检查标题是否为扫描版
 * @param {string} title - 公告标题
 * @returns {boolean} - 如果是扫描版返回true，否则返回false
 */
function isScannedVersion(title) {
  if (!title) return false;
  // 扫描版常见标识：扫描版、扫描、需手动验证、手动验证
  const scanKeywords = ['扫描版', '扫描', '需手动验证', '手动验证'];
  return scanKeywords.some(keyword => title.includes(keyword));
}

/**
 * 搜索特定类型的报告
 */
function searchReport(stockCode, year, reportType, customKeywords = []) {
  return new Promise((resolve, reject) => {
    const typeConfig = CONFIG.REPORT_TYPES[reportType];

    // 对于季度报告，尝试多种搜索关键词
    let searchKeys = [];
    if (reportType === 'q1') {
      searchKeys = [
        `${stockCode} ${year}年一季度报告`,
        `${stockCode} ${year}年第一季度报告`,
        `${stockCode} ${year}年一季报`,
        `${stockCode} ${year}年第一季度`,
        `${year}年一季度报告 ${stockCode}`,
        `${year}年第一季度报告 ${stockCode}`,
        `${year}年一季报 ${stockCode}`
      ];
    } else if (reportType === 'q3') {
      searchKeys = [
        `${stockCode} ${year}年三季度报告`,
        `${stockCode} ${year}年第三季度报告`,
        `${stockCode} ${year}年三季报`,
        `${stockCode} ${year}年第三季度`,
        `${year}年三季度报告 ${stockCode}`,
        `${year}年第三季度报告 ${stockCode}`,
        `${year}年三季报 ${stockCode}`
      ];
    } else if (reportType === 'production') {
      // 生产经营数据公告：使用自定义关键词
      // 注意：不要在搜索词中加年份，因为API会通过日期范围过滤
      const keywords = customKeywords.length > 0 ? customKeywords : typeConfig.keywords;
      searchKeys = keywords.map(kw => `${stockCode} ${kw}`);
    } else if (reportType === 'annual') {
      // 年度报告：使用更精确的搜索词，避免匹配到季度报告
      searchKeys = [
        `${stockCode} ${year}年年度报告`,
        `${stockCode} ${year}年年报`,
        `${year}年年度报告 ${stockCode}`,
        `${year}年年报 ${stockCode}`
      ];
    } else if (reportType === 'semi') {
      // 半年度报告：使用更精确的搜索词
      searchKeys = [
        `${stockCode} ${year}年半年度报告`,
        `${stockCode} ${year}年半年报`,
        `${year}年半年度报告 ${stockCode}`,
        `${year}年半年报 ${stockCode}`
      ];
    } else {
      searchKeys = [`${stockCode} ${year}年${typeConfig.name}`];
    }

    // 使用第一个搜索关键词（最常用的格式）
    const searchKey = searchKeys[0];

    // 调整搜索时间范围：对于季度报告，扩大搜索范围
    // 注意：year可能是字符串，需要转换为数字进行计算
    const yearNum = typeof year === 'string' ? parseInt(year) : year;
    let sdate, edate;
    if (reportType === 'q1') {
      // Q1通常在4月发布，搜索范围从当年1月到次年6月
      sdate = `${yearNum}-01-01`;
      edate = `${yearNum + 1}-06-30`;
    } else if (reportType === 'q3') {
      // Q3通常在10月发布，搜索范围从当年7月到次年3月
      sdate = `${yearNum}-07-01`;
      edate = `${yearNum + 1}-03-31`;
    } else if (reportType === 'production') {
      // 生产经营数据公告：搜索整年，并延伸到次年4月（Q4数据通常在次年初发布）
      sdate = `${yearNum}-01-01`;
      edate = `${yearNum + 1}-04-30`;
    } else {
      sdate = `${yearNum}-01-01`;
      edate = `${yearNum + 1}-12-31`;
    }

    // 判断股票代码所属交易所：600开头是上交所，000/002/300开头是深交所
    const column = stockCode.startsWith('600') || stockCode.startsWith('688') || stockCode.startsWith('603') ? 'sse' : 'szse';

    const postData = querystring.stringify({
      'pageNum': '1',
      'pageSize': '30',
      'column': column,
      'plate': '',
      'stock': stockCode + ',',
      'searchkey': searchKey,
      'secid': '',
      'category': '',
      'trade': '',
      'seDate': sdate + '~' + edate
    });

    const options = {
      hostname: 'www.cninfo.com.cn',
      port: 80,
      path: '/new/fulltextSearch/full',
      method: 'POST',
      headers: {
        ...CONFIG.HEADERS,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);

          if (json.announcements && json.announcements.length > 0) {
            // 对于生产经营数据公告，直接返回所有匹配的报告
            if (reportType === 'production') {
              const allReports = json.announcements.filter(item => {
                const title = (item.announcementTitle || '').replace(/<\/?em>/g, '');
                // 排除扫描版，只保留文字版
                if (isScannedVersion(title)) return false;
                const keywords = customKeywords.length > 0 ? customKeywords : typeConfig.keywords;
                const hasKeyword = keywords.some(kw => title.includes(kw));
                if (!hasKeyword) return false;
                const yearMatch = title.includes(`${year}年`) || title.includes(`${year}`);
                if (!yearMatch) return false;
                const excludeWords = ['摘要', '更正', '取消', '补充', '修订', '问询函', '回复', '反馈意见'];
                const hasExclude = excludeWords.some(word => title.includes(word));
                if (hasExclude) return false;
                return true;
              });

              if (allReports.length > 0) {
                resolve({ reports: allReports, type: reportType, typeConfig, multiple: true });
                return;
              } else {
                resolve(null);
                return;
              }
            }

            // 筛选最匹配的报告
            const report = json.announcements.find(item => {
              // 清理HTML标签（如<em>标签），确保匹配逻辑正确
              let title = (item.announcementTitle || '').replace(/<\/?em>/g, '').trim();

              // 排除扫描版，只保留文字版
              if (isScannedVersion(title)) return false;

              // 检查年份
              const yearMatch = title.includes(`${year}年`);
              if (!yearMatch) return false;

              // 检查关键词（支持多种变体）
              // 重要：需要精确匹配，避免"年度报告"匹配到"半年度报告"或"季度报告"
              let hasKeyword = false;
              if (reportType === 'annual') {
                // 年度报告：必须先排除季度和半年度关键词，再检查年度关键词
                // 这样可以避免"第一季度报告"被误匹配

                // 先检查是否包含季度关键词（优先级最高，一旦包含就排除）
                const hasQuarterKeyword = title.includes('第一季度') || title.includes('一季度') ||
                                         title.includes('一季报') || title.includes('第三季度') ||
                                         title.includes('三季度') || title.includes('三季报') ||
                                         title.includes('季度报告') || title.includes('第二季度') ||
                                         title.includes('二季度') || title.includes('二季报') ||
                                         title.includes('第四季度') || title.includes('四季度') ||
                                         title.includes('四季报');

                // 如果包含季度关键词，直接排除（不可能是年度报告）
                if (hasQuarterKeyword) {
                  hasKeyword = false;
                } else {
                  // 检查是否包含半年度关键词
                  const hasSemiKeyword = title.includes('半年度报告') || title.includes('半年报');

                  // 如果包含半年度关键词，也排除
                  if (hasSemiKeyword) {
                    hasKeyword = false;
                  } else {
                    // 最后检查是否包含年度关键词
                    // 使用正则表达式确保"年度报告"或"年报"是独立的词
                    const annualPattern = /年度报告|年报/;
                    const hasAnnualKeyword = annualPattern.test(title);
                    hasKeyword = hasAnnualKeyword;
                  }
                }
              } else if (reportType === 'semi') {
                // 半年度报告：必须包含"半年度报告"或"半年报"
                hasKeyword = title.includes('半年度报告') || title.includes('半年报');
              } else if (reportType === 'q1' || reportType === 'q3') {
                // 季度报告：必须先排除年度和半年度关键词，再检查季度关键词
                // 这样可以避免"年度报告"被误匹配为季度报告

                // 先检查是否包含年度关键词（如果包含，直接排除）
                const hasAnnualKeyword = title.includes('年度报告') || title.includes('年报');
                if (hasAnnualKeyword) {
                  hasKeyword = false;
                } else {
                  // 检查是否包含半年度关键词（如果包含，也排除）
                  const hasSemiKeyword = title.includes('半年度报告') || title.includes('半年报');
                  if (hasSemiKeyword) {
                    hasKeyword = false;
                  } else {
                    // 最后检查是否包含季度关键词
                    if (reportType === 'q1') {
                      hasKeyword = title.includes('第一季度') || title.includes('一季度') ||
                                  title.includes('一季报') || title.includes('第一季度报告') ||
                                  title.includes('一季度报告');
                    } else if (reportType === 'q3') {
                      hasKeyword = title.includes('第三季度') || title.includes('三季度') ||
                                  title.includes('三季报') || title.includes('第三季度报告') ||
                                  title.includes('三季度报告');
                    } else {
                      // 其他季度报告类型，使用原有逻辑
                      hasKeyword = typeConfig.keywords.some(kw => title.includes(kw));
                    }
                  }
                }
              } else {
                // 其他报告类型：使用原有逻辑
                hasKeyword = typeConfig.keywords.some(kw => title.includes(kw));
              }
              if (!hasKeyword) return false;

              // 排除不需要的（但允许"一季度报告"这种格式）
              const excludeWords = ['摘要', '更正', '取消', '补充', '修订', '业绩快报', '预告', '说明', '独立董事', '监事会', '问询函', '回复', '反馈意见', '专项说明'];
              const hasExclude = excludeWords.some(word => title.includes(word));
              if (hasExclude) return false;

              // 对于季度报告，确保标题包含"报告"或"报"（"一季度报告"、"一季报"都符合）
              if (reportType === 'q1' || reportType === 'q3') {
                // 检查是否包含"报告"、"报"或季度关键词本身已包含
                const hasReport = title.includes('报告') || title.includes('报');
                // 如果关键词是"一季度"、"三季度"这种，本身就不需要"报告"后缀
                const isQuarterOnly = (reportType === 'q1' && title.includes('一季度')) ||
                                     (reportType === 'q3' && title.includes('三季度'));
                if (!hasReport && !isQuarterOnly) {
                  return false;
                }
              }

              return true;
            });

            if (report) {
              resolve({ report, type: reportType, typeConfig });
            } else {
              // 如果第一次搜索没找到，且是季度报告，尝试更简单的搜索
              if ((reportType === 'q1' || reportType === 'q3') && json.announcements.length > 0) {
                // 尝试更宽松的匹配：只要包含年份和季度关键词即可
                const fallbackReport = json.announcements.find(item => {
                  // 清理HTML标签
                  const title = (item.announcementTitle || '').replace(/<\/?em>/g, '').trim();
                  // 排除扫描版，只保留文字版
                  if (isScannedVersion(title)) return false;
                  const yearMatch = title.includes(`${year}年`);
                  if (!yearMatch) return false;

                  // 先排除年度和半年度关键词（优先级最高）
                  const hasAnnualKeyword = title.includes('年度报告') || title.includes('年报');
                  const hasSemiKeyword = title.includes('半年度报告') || title.includes('半年报');
                  if (hasAnnualKeyword || hasSemiKeyword) return false;

                  // 检查季度关键词（更宽松）
                  let quarterMatch = false;
                  if (reportType === 'q1') {
                    quarterMatch = title.includes('一季度') || title.includes('第一季度') || title.includes('一季报');
                  } else if (reportType === 'q3') {
                    quarterMatch = title.includes('三季度') || title.includes('第三季度') || title.includes('三季报');
                  }

                  if (!quarterMatch) return false;

                  // 排除不需要的
                  const excludeWords = ['摘要', '更正', '取消', '补充', '修订', '业绩快报', '预告', '说明', '独立董事', '监事会', '问询函', '回复', '反馈意见', '专项说明'];
                  const hasExclude = excludeWords.some(word => title.includes(word));
                  if (hasExclude) return false;

                  return true;
                });

                if (fallbackReport) {
                  resolve({ report: fallbackReport, type: reportType, typeConfig });
                  return;
                }
              }

              // 如果年度报告没找到，尝试更宽松的搜索（但必须确保不是季度或半年度报告）
              if (reportType === 'annual' && json.announcements.length > 0) {
                const fallbackReport = json.announcements.find(item => {
                  // 清理HTML标签
                  const title = (item.announcementTitle || '').replace(/<\/?em>/g, '').trim();
                  // 排除扫描版，只保留文字版
                  if (isScannedVersion(title)) return false;
                  const yearMatch = title.includes(`${year}年`);
                  if (!yearMatch) return false;

                  // 先检查是否包含季度关键词（优先级最高，一旦包含就排除）
                  const hasQuarterKeyword = title.includes('第一季度') || title.includes('一季度') ||
                                           title.includes('一季报') || title.includes('第三季度') ||
                                           title.includes('三季度') || title.includes('三季报') ||
                                           title.includes('季度报告') || title.includes('第二季度') ||
                                           title.includes('二季度') || title.includes('二季报') ||
                                           title.includes('第四季度') || title.includes('四季度') ||
                                           title.includes('四季报');

                  // 如果包含季度关键词，直接排除（不可能是年度报告）
                  if (hasQuarterKeyword) return false;

                  // 检查是否包含半年度关键词
                  const hasSemiKeyword = title.includes('半年度报告') || title.includes('半年报');
                  if (hasSemiKeyword) return false;

                  // 必须包含年度关键词
                  const annualPattern = /年度报告|年报/;
                  const hasAnnualKeyword = annualPattern.test(title);
                  if (!hasAnnualKeyword) return false;

                  // 排除不需要的
                  const excludeWords = ['摘要', '更正', '取消', '补充', '修订', '业绩快报', '预告', '说明', '独立董事', '监事会', '问询函', '回复', '反馈意见', '专项说明'];
                  const hasExclude = excludeWords.some(word => title.includes(word));
                  if (hasExclude) return false;

                  return true;
                });

                if (fallbackReport) {
                  resolve({ report: fallbackReport, type: reportType, typeConfig });
                  return;
                }
              }
              resolve(null);
            }
          } else {
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

        // 检查文件大小
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
 * 验证文件大小是否合理
 */
function validateFileSize(filePath, reportType) {
  const stats = fs.statSync(filePath);
  const fileSizeKB = Math.round(stats.size / 1024);

  // 定义各类型报告的最小文件大小（KB）
  const minSizes = {
    'annual': 500,      // 年报通常 > 500KB
    'semi': 300,        // 半年报通常 > 300KB
    'q1': 100,          // 季报通常 > 100KB
    'q3': 100,          // 季报通常 > 100KB
    'production': 50    // 生产经营数据公告通常较小
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
 * 从PDF文本中提取报告信息
 */
async function extractReportInfoFromPDF(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const parser = new PDFParse({ data: dataBuffer });
    const textData = await parser.getText();
    const text = textData.text;

    // 检查文本长度，如果太短可能是扫描版PDF（图片格式），无法提取文本
    if (!text || text.trim().length < 100) {
      return {
        year: null,
        reportType: null,
        success: false,
        error: `PDF可能是扫描版（图片格式），无法提取文本（文本长度: ${text ? text.length : 0}）`
      };
    }

    // 提取年份 - 尝试多种格式和多个位置
    let year = null;
    const yearPatterns = [
      /(\d{4})\s*年/g,           // "2024年" 或 "2024 年"
      /(\d{4})\/(\d{1,2})\/(\d{1,2})/g,  // "2024/01/01" 格式，提取年份
      /(\d{4})-(\d{1,2})-(\d{1,2})/g,    // "2024-01-01" 格式，提取年份
      /20\d{2}/g                  // 直接匹配 2000-2099 的年份
    ];

    // 优先在前20000字符中查找（扩大搜索范围）
    const searchLength = Math.min(20000, text.length);
    const preview = text.substring(0, searchLength);

    // 尝试所有年份模式
    for (const pattern of yearPatterns) {
      const matches = preview.match(pattern);
      if (matches) {
        const yearCounts = {};
        matches.forEach(m => {
          let yearStr = null;
          if (pattern === yearPatterns[0]) {
            // "YYYY年" 格式
            const y = m.match(/(\d{4})/);
            if (y && y[1]) yearStr = y[1];
          } else if (pattern === yearPatterns[1] || pattern === yearPatterns[2]) {
            // "YYYY/MM/DD" 或 "YYYY-MM-DD" 格式，提取第一个数字组（年份）
            const y = m.match(/(\d{4})/);
            if (y && y[1]) yearStr = y[1];
          } else {
            // 直接匹配年份
            yearStr = m;
          }

          if (yearStr) {
            const yearNum = parseInt(yearStr);
            // 只考虑合理的年份（2000-2099）
            if (yearNum >= 2000 && yearNum <= 2099) {
              yearCounts[yearStr] = (yearCounts[yearStr] || 0) + 1;
            }
          }
        });

        if (Object.keys(yearCounts).length > 0) {
          // 取最常见的年份（通常是报告年份）
          const sorted = Object.entries(yearCounts).sort((a, b) => b[1] - a[1]);
          year = sorted[0][0];
          break; // 找到年份就退出
        }
      }
    }

    // 如果还没找到，尝试在整个文本中查找（但限制搜索范围，避免太慢）
    if (!year && text.length > searchLength) {
      const extendedLength = Math.min(50000, text.length);
      const extendedPreview = text.substring(0, extendedLength);

      for (const pattern of yearPatterns) {
        const matches = extendedPreview.match(pattern);
        if (matches) {
          const yearCounts = {};
          matches.forEach(m => {
            let yearStr = null;
            if (pattern === yearPatterns[0]) {
              const y = m.match(/(\d{4})/);
              if (y && y[1]) yearStr = y[1];
            } else if (pattern === yearPatterns[1] || pattern === yearPatterns[2]) {
              const y = m.match(/(\d{4})/);
              if (y && y[1]) yearStr = y[1];
            } else {
              yearStr = m;
            }

            if (yearStr) {
              const yearNum = parseInt(yearStr);
              if (yearNum >= 2000 && yearNum <= 2099) {
                yearCounts[yearStr] = (yearCounts[yearStr] || 0) + 1;
              }
            }
          });

          if (Object.keys(yearCounts).length > 0) {
            const sorted = Object.entries(yearCounts).sort((a, b) => b[1] - a[1]);
            year = sorted[0][0];
            break;
          }
        }
      }
    }

    // 提取报告类型
    // 注意：必须先检查更具体的类型（半年度、季度），再检查年度报告
    // 因为"半年度报告"包含"年度报告"字符串
    // 扩大搜索范围，使用更大的文本范围来查找报告类型
    const reportTypeSearchLength = Math.min(30000, text.length);
    const reportTypePreview = text.substring(0, reportTypeSearchLength);

    const patterns = [
      { type: '半年度报告', regex: /半年度报告|半年报/g },
      { type: '第一季度报告', regex: /第一季度报告|一季报|第一季度/g },
      { type: '第三季度报告', regex: /第三季度报告|三季报|第三季度/g },
      { type: '年度报告', regex: /年度报告|年报/g }
    ];

    const counts = {};
    for (const pattern of patterns) {
      const matches = reportTypePreview.match(pattern.regex);
      if (matches) {
        counts[pattern.type] = matches.length;
      }
    }

    let reportType = null;
    if (Object.keys(counts).length > 0) {
      // 改进的识别逻辑：比较匹配次数，选择匹配次数最多的类型
      // 但需要特殊处理"半年度报告"和"年度报告"的关系
      // 因为"半年度报告"包含"年度报告"字符串，可能导致误匹配

      const semiCount = counts['半年度报告'] || 0;
      const annualCount = counts['年度报告'] || 0;

      // 如果"年度报告"的匹配次数明显多于"半年度报告"（比如超过3倍），
      // 说明这确实是年度报告，而不是半年度报告
      if (semiCount > 0 && annualCount > 0) {
        // 如果年度报告的匹配次数明显更多，优先选择年度报告
        if (annualCount > semiCount * 3) {
          reportType = '年度报告';
        } else if (semiCount > 0) {
          // 否则，如果存在"半年度报告"匹配，优先选择半年度报告
          reportType = '半年度报告';
        }
      } else if (counts['半年度报告']) {
        reportType = '半年度报告';
      } else if (counts['第一季度报告']) {
        reportType = '第一季度报告';
      } else if (counts['第三季度报告']) {
        reportType = '第三季度报告';
      } else if (counts['年度报告']) {
        // 如果只匹配到"年度报告"，需要检查是否实际上是"半年度报告"
        // 因为"半年度报告"包含"年度报告"，可能被错误匹配
        // 检查文本中是否包含"半年度"或"半年报"关键词
        const hasSemiKeyword = reportTypePreview.includes('半年度') || reportTypePreview.includes('半年报');
        if (hasSemiKeyword) {
          reportType = '半年度报告';
          console.log(`      💡 PDF文本包含"半年度"关键词，识别为半年度报告（而非年度报告）`);
        } else {
          reportType = '年度报告';
        }
      }
    } else {
      // 如果正则匹配失败，尝试直接查找关键词
      // 优先检查"半年度"（因为可能被分割）
      if (reportTypePreview.includes('半年度') || reportTypePreview.includes('半年报')) {
        reportType = '半年度报告';
        console.log(`      💡 通过关键词匹配识别为: ${reportType}`);
      } else if (reportTypePreview.includes('第一季度') || reportTypePreview.includes('一季报')) {
        reportType = '第一季度报告';
        console.log(`      💡 通过关键词匹配识别为: ${reportType}`);
      } else if (reportTypePreview.includes('第三季度') || reportTypePreview.includes('三季报')) {
        reportType = '第三季度报告';
        console.log(`      💡 通过关键词匹配识别为: ${reportType}`);
      } else if (reportTypePreview.includes('年度报告') || reportTypePreview.includes('年报')) {
        reportType = '年度报告';
        console.log(`      💡 通过关键词匹配识别为: ${reportType}`);
      }
    }

    // 如果无法从PDF文本中提取年份或报告类型，尝试从文件名中提取
    const fileName = path.basename(filePath);

    // 从文件名提取年份（如果PDF文本提取失败）
    if (!year) {
      const fileNameYearMatch = fileName.match(/(\d{4})年/);
      if (fileNameYearMatch && fileNameYearMatch[1]) {
        const fileNameYear = parseInt(fileNameYearMatch[1]);
        if (fileNameYear >= 2000 && fileNameYear <= 2099) {
          year = fileNameYearMatch[1];
          console.log(`      💡 从文件名提取年份: ${year}`);
        }
      }
    }

    // 从文件名提取报告类型（如果PDF文本提取失败）
    // 注意：文件名可能错误，所以优先检查更具体的类型
    if (!reportType) {
      // 优先检查"半年度报告"（因为文件名可能错误写成"年度报告"）
      if (fileName.includes('半年度报告') || fileName.includes('半年报')) {
        reportType = '半年度报告';
        console.log(`      💡 从文件名提取报告类型: ${reportType}`);
      } else if (fileName.includes('第一季度报告') || fileName.includes('一季报') || fileName.includes('第一季度')) {
        reportType = '第一季度报告';
        console.log(`      💡 从文件名提取报告类型: ${reportType}`);
      } else if (fileName.includes('第三季度报告') || fileName.includes('三季报') || fileName.includes('第三季度')) {
        reportType = '第三季度报告';
        console.log(`      💡 从文件名提取报告类型: ${reportType}`);
      } else if (fileName.includes('年度报告') || fileName.includes('年报')) {
        // 最后检查"年度报告"（因为文件名可能错误）
        // 如果PDF文本中找到了"半年度报告"关键词，即使文件名是"年度报告"，也应该优先使用PDF内容
        const hasSemiInText = reportTypePreview.includes('半年度') || reportTypePreview.includes('半年报');
        if (hasSemiInText) {
          reportType = '半年度报告';
          console.log(`      💡 文件名是"年度报告"但PDF内容包含"半年度"，使用: ${reportType}`);
        } else {
          reportType = '年度报告';
          console.log(`      💡 从文件名提取报告类型: ${reportType}`);
        }
      }
    }

    // 如果仍然无法提取年份或报告类型，添加调试信息
    if (!year || !reportType) {
      const textPreview = preview.replace(/\s+/g, ' ').trim();
      if (!year) {
        console.log(`      ⚠️  无法提取年份 - 文本预览（前300字符）: ${textPreview.substring(0, 300)}...`);
        // 尝试查找所有可能的年份数字
        const allYearMatches = preview.match(/\d{4}/g);
        if (allYearMatches) {
          const uniqueYears = [...new Set(allYearMatches)].filter(y => {
            const num = parseInt(y);
            return num >= 2000 && num <= 2099;
          });
          if (uniqueYears.length > 0) {
            console.log(`      💡 发现可能的年份: ${uniqueYears.join(', ')}`);
          }
        }
      }
      if (!reportType) {
        const reportTypePreviewText = reportTypePreview.replace(/\s+/g, ' ').trim();
        console.log(`      ⚠️  无法提取报告类型 - 文本预览（前500字符）: ${reportTypePreviewText.substring(0, 500)}...`);
        // 检查是否包含报告类型关键词
        const reportKeywords = ['半年度报告', '半年报', '年度报告', '年报', '第一季度', '一季报', '第三季度', '三季报'];
        const foundKeywords = reportKeywords.filter(kw => reportTypePreview.includes(kw));
        if (foundKeywords.length > 0) {
          console.log(`      💡 发现报告类型关键词: ${foundKeywords.join(', ')}`);
        } else {
          console.log(`      💡 未发现任何报告类型关键词`);
        }
        // 输出匹配结果
        console.log(`      💡 匹配结果: ${JSON.stringify(counts)}`);
        console.log(`      💡 文件名: ${fileName}`);
      }
    }

    return { year, reportType, success: true };
  } catch (error) {
    return { year: null, reportType: null, success: false, error: error.message };
  }
}

/**
 * 验证下载的PDF文件内容
 */
async function verifyDownloadedPDF(filePath, expectedYear, expectedType, reportType) {
  // 对于生产经营数据公告，跳过内容验证（因为格式不统一）
  if (reportType === 'production') {
    return {
      valid: true,
      yearMatch: true,
      typeMatch: true,
      actualYear: expectedYear,
      actualType: expectedType,
      expectedYear,
      expectedType,
      reason: '生产经营数据公告，跳过内容验证'
    };
  }

  const info = await extractReportInfoFromPDF(filePath);

  if (!info.success) {
    return {
      valid: false,
      reason: `无法解析PDF: ${info.error}`,
      actualYear: null,
      actualType: null
    };
  }

  // 如果成功解析但无法提取年份和类型，可能是扫描版PDF或格式特殊
  if (info.success && !info.year && !info.reportType) {
    // 添加调试信息：输出前500字符以便排查问题
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const parser = new PDFParse({ data: dataBuffer });
      const textData = await parser.getText();
      const text = textData.text || '';
      const preview = text.substring(0, 500).replace(/\s+/g, ' ').trim();
      console.log(`      🔍 调试信息 - PDF文本预览（前500字符）: ${preview.substring(0, 200)}...`);
    } catch (e) {
      // 忽略调试信息提取错误
    }

    return {
      valid: false,
      yearMatch: false,
      typeMatch: false,
      actualYear: null,
      actualType: null,
      expectedYear,
      expectedType,
      reason: 'PDF可能是扫描版（图片格式）或格式特殊，无法提取年份和类型信息。建议手动检查文件内容。'
    };
  }

  // 年份和类型都转换为字符串进行比较
  const yearMatch = String(info.year) === String(expectedYear);
  const typeMatch = info.reportType === expectedType;

  return {
    valid: yearMatch && typeMatch,
    yearMatch,
    typeMatch,
    actualYear: info.year,
    actualType: info.reportType,
    expectedYear,
    expectedType,
    reason: !yearMatch && !typeMatch
      ? `年份不匹配(${info.year} ≠ ${expectedYear}) 且 类型不匹配(${info.reportType} ≠ ${expectedType})`
      : !yearMatch
      ? `年份不匹配(${info.year} ≠ ${expectedYear})`
      : !typeMatch
      ? `类型不匹配(${info.reportType} ≠ ${expectedType})`
      : '验证通过'
  };
}

/**
 * 下载某年某类型的报告
 */
async function downloadReportByType(params, year, reportType) {
  const typeConfig = CONFIG.REPORT_TYPES[reportType];

  // 检查报告是否可能存在（年报通常在次年3-4月发布）
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // 0-11 -> 1-12

  // 对于生产经营数据公告，显示自定义关键词
  if (reportType === 'production' && params.customKeywords.length > 0) {
    console.log(`   📄 查找${typeConfig.name} (关键词: ${params.customKeywords.join(', ')})...`);
  } else {
    console.log(`   📄 查找${typeConfig.name}...`);
  }

  if (reportType === 'annual') {
    // 年报通常在次年4月底前发布
    // 如果当前年份等于报告年份+1，且当前月份小于5月，则年报可能还未发布
    if (year === currentYear - 1 && currentMonth < 5) {
      console.log(`      ⚠️  ${year}年年度报告可能尚未发布（通常在${year + 1}年3-4月发布），跳过下载`);
      return { year, type: reportType, success: false, reason: '报告可能尚未发布' };
    } else if (year >= currentYear) {
      console.log(`      ⚠️  ${year}年年度报告尚未发布（需等到${year + 1}年3-4月），跳过下载`);
      return { year, type: reportType, success: false, reason: '报告尚未发布' };
    }
  }

  try {
    const result = await searchReport(params.code, year, reportType, params.customKeywords || []);

    if (!result) {
      console.log(`      ⚠ 未找到`);
      return { year, type: reportType, success: false, reason: '未找到' };
    }

    // 处理多个报告的情况（生产经营数据公告）
    if (result.multiple && result.reports) {
      console.log(`      ℹ️  找到 ${result.reports.length} 份报告`);
      const downloadResults = [];

      for (let i = 0; i < result.reports.length; i++) {
        const report = result.reports[i];
        const tc = result.typeConfig;

        console.log(`\n      📄 [${i + 1}/${result.reports.length}] ${report.announcementTitle}`);

        // 生成文件名（简洁版）
        const title = (report.announcementTitle || '').replace(/<\/?em>/g, '');
        const monthMatch = title.match(/(\d{1,2})月/);
        const quarterMatch = title.match(/第([一二三四])季度/) || title.match(/第(\d)季度/);

        // 从标题中提取年份（可能与搜索年份不同，如2024年Q4在2025年发布）
        const titleYearMatch = title.match(/(\d{4})年/);
        const reportYear = titleYearMatch ? titleYearMatch[1] : year;

        let fileName;
        if (quarterMatch) {
          // 季度报告：简洁格式
          const quarterMap = {'一': '1', '二': '2', '三': '3', '四': '4'};
          const quarter = quarterMap[quarterMatch[1]] || quarterMatch[1];
          fileName = `${params.name}_${reportYear}Q${quarter}_生产经营数据.pdf`;
        } else if (monthMatch) {
          // 月度报告：简洁格式
          const month = monthMatch[1].padStart(2, '0');
          fileName = `${params.name}_${reportYear}${month}_生产经营数据.pdf`;
        } else {
          // 使用发布日期作为标识（时间戳转日期）
          let dateStr = i;
          if (report.announcementTime) {
            const timestamp = Number(report.announcementTime);
            if (!isNaN(timestamp)) {
              const date = new Date(timestamp * 1000);
              dateStr = date.toISOString().substring(0, 10).replace(/-/g, '');
            } else {
              dateStr = String(report.announcementTime).substring(0, 10).replace(/-/g, '');
            }
          }
          fileName = `${params.name}_${reportYear}_生产经营数据_${dateStr}.pdf`;
        }
        const outputPath = path.join(params.outputDir, fileName);

        // 检查是否已存在
        if (fs.existsSync(outputPath)) {
          const sizeCheck = validateFileSize(outputPath, reportType);
          if (sizeCheck.valid) {
            console.log(`         ✓ 已存在 (${sizeCheck.sizeKB} KB)`);
            downloadResults.push({ success: true, cached: true, path: outputPath });
            continue;
          }
        }

        // 下载
        console.log(`         ⬇️  下载中...`);
        const downloadUrl = CONFIG.DOWNLOAD_BASE + report.adjunctUrl;
        try {
          await downloadFile(downloadUrl, outputPath, report.announcementTitle);
          const sizeCheck = validateFileSize(outputPath, reportType);
          if (sizeCheck.valid) {
            console.log(`         ✅ 下载完成 (${sizeCheck.sizeKB} KB)`);
            downloadResults.push({ success: true, path: outputPath });
          } else {
            console.log(`         ⚠️  ${sizeCheck.reason}`);
            downloadResults.push({ success: false, reason: sizeCheck.reason });
          }
        } catch (error) {
          console.log(`         ❌ 失败: ${error.message}`);
          downloadResults.push({ success: false, reason: error.message });
        }

        // 延迟500ms
        if (i < result.reports.length - 1) {
          await delay(500);
        }
      }

      const successCount = downloadResults.filter(r => r.success).length;
      console.log(`\n      📊 完成: ${successCount}/${result.reports.length} 份成功`);

      return {
        year,
        type: reportType,
        success: successCount > 0,
        multiple: true,
        total: result.reports.length,
        successCount,
        results: downloadResults
      };
    }

    // 单个报告的情况（原有逻辑）
    const { report, typeConfig: tc } = result;

    // 生成文件名
    let fileName;
    if (reportType === 'production') {
      // 对于生产经营数据公告，使用标题中的关键信息
      const title = report.announcementTitle || '';
      // 提取月份信息（如果有）
      const monthMatch = title.match(/(\d{1,2})月/);
      if (monthMatch) {
        fileName = `${params.name}${year}年${monthMatch[1]}月${tc.name}.pdf`;
      } else {
        fileName = `${params.name}${year}年${tc.name}.pdf`;
      }
    } else {
      fileName = `${params.name}${year}年${tc.name}.pdf`;
    }
    const outputPath = path.join(params.outputDir, fileName);

    // 检查是否已存在
    if (fs.existsSync(outputPath)) {
      const sizeCheck = validateFileSize(outputPath, reportType);

      if (!sizeCheck.valid) {
        console.log(`      ⚠️  已存在但${sizeCheck.reason}，重新下载...`);
        // 备份旧文件
        const backupPath = outputPath.replace('.pdf', '_backup_small.pdf');
        fs.renameSync(outputPath, backupPath);
      } else {
        console.log(`      ✓ 已存在 (${sizeCheck.sizeKB} KB)`);
        // 即使已存在，也进行验证
        console.log(`      🔍 验证文件内容...`);
        const verification = await verifyDownloadedPDF(outputPath, year, tc.name, reportType);
        if (verification.valid) {
          console.log(`      ✅ 验证通过`);
        } else {
          console.log(`      ⚠️  验证失败: ${verification.reason}`);
          console.log(`         实际内容: ${verification.actualYear}年${verification.actualType || '未知'}`);
        }
        return { year, type: reportType, success: true, cached: true, path: outputPath, verification };
      }
    }

    // 下载
    console.log(`      ⬇️  下载中...`);
    const downloadUrl = CONFIG.DOWNLOAD_BASE + report.adjunctUrl;
    const downloadResult = await downloadFile(downloadUrl, outputPath, report.announcementTitle);

    // 验证文件大小
    const sizeCheck = validateFileSize(outputPath, reportType);
    if (!sizeCheck.valid) {
      console.log(`      ⚠️  ${sizeCheck.reason}`);
      // 保留文件但添加标记，不删除
      const markedFileName = fileName.replace('.pdf', '_[文件过小需手动检查].pdf');
      const markedPath = path.join(params.outputDir, markedFileName);
      if (fs.existsSync(outputPath)) {
        fs.renameSync(outputPath, markedPath);
        console.log(`      ⚠️  保留文件但标记为文件过小: ${markedFileName}`);
        console.log(`      💡 提示: 文件大小异常，请手动检查文件`);
      }

      return {
        year,
        type: reportType,
        success: false,
        reason: sizeCheck.reason,
        sizeCheck
      };
    }

    // 下载后自动验证内容
    console.log(`      🔍 验证文件内容...`);
    const verification = await verifyDownloadedPDF(outputPath, year, tc.name, reportType);

    if (verification.valid) {
      console.log(`      ✅ 下载完成，验证通过`);
      return { year, type: reportType, success: true, path: outputPath, verification };
    } else {
      console.log(`      ⚠️  验证失败: ${verification.reason}`);
      console.log(`         实际内容: ${verification.actualYear}年${verification.actualType || '未知'}`);
      console.log(`         期望内容: ${verification.expectedYear}年${verification.expectedType}`);

      // 如果验证失败，保留文件并添加标记，不删除
      if (verification.actualYear && verification.actualType) {
        const correctFileName = `${params.name}${verification.actualYear}年${verification.actualType}.pdf`;
        const correctPath = path.join(params.outputDir, correctFileName);

        // 检查目标文件是否已存在
        if (fs.existsSync(correctPath)) {
          // 保留文件但添加验证失败标记
          const markedFileName = fileName.replace('.pdf', '_[验证失败需手动检查].pdf');
          const markedPath = path.join(params.outputDir, markedFileName);
          if (fs.existsSync(outputPath)) {
            fs.renameSync(outputPath, markedPath);
            console.log(`      ⚠️  保留文件但标记为验证失败: ${markedFileName}`);
            console.log(`      💡 提示: 验证失败，请手动检查文件内容`);
          }
        } else {
          console.log(`      🔄 自动重命名为: ${correctFileName}`);
          fs.renameSync(outputPath, correctPath);
        }
      } else {
        // 如果无法识别内容，检查是否是扫描版PDF
        const isScannedPDF = verification.reason && verification.reason.includes('扫描版');
        if (isScannedPDF) {
          // 对于扫描版PDF，保留文件但添加标记
          const markedFileName = fileName.replace('.pdf', '_[扫描版需手动验证].pdf');
          const markedPath = path.join(params.outputDir, markedFileName);
          if (fs.existsSync(outputPath)) {
            fs.renameSync(outputPath, markedPath);
            console.log(`      ⚠️  保留文件但标记为扫描版: ${markedFileName}`);
            console.log(`      💡 提示: 该PDF可能是扫描版（图片格式），无法自动验证，请手动检查内容`);
          }
        } else {
          // 如果无法识别内容且不是扫描版，保留文件但添加标记
          const markedFileName = fileName.replace('.pdf', '_[验证失败需手动检查].pdf');
          const markedPath = path.join(params.outputDir, markedFileName);
          if (fs.existsSync(outputPath)) {
            fs.renameSync(outputPath, markedPath);
            console.log(`      ⚠️  保留文件但标记为验证失败: ${markedFileName}`);
            console.log(`      💡 提示: 无法识别内容，请手动检查文件`);
          }
        }
      }

      return {
        year,
        type: reportType,
        success: false,
        reason: verification.reason,
        verification
      };
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

  // 处理多个报告类型
  for (const reportType of params.reportTypes) {
    if (reportType === 'all') {
      typesToDownload.push('annual', 'semi', 'q1', 'q3');
    } else if (reportType === 'quarterly') {
      typesToDownload.push('q1', 'q3');
    } else {
      typesToDownload.push(reportType);
    }
  }

  // 去重（避免重复下载）
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
  console.log('📥 上市公司财报下载工具 - 全功能版');
  console.log('🔗 支持: 年报 / 半年报 / 季报 / 生产经营数据公告');
  console.log('='.repeat(60) + '\n');

  try {
    const params = parseArgs();
    validateParams(params);
    ensureOutputDir(params);

    // 显示报告类型说明
    const typeDescriptions = {
      'all': '年报 + 半年报 + 季报',
      'annual': '年度报告',
      'semi': '半年度报告',
      'quarterly': '季度报告(Q1+Q3)',
      'q1': '第一季度报告',
      'q3': '第三季度报告',
      'production': '生产经营数据公告'
    };

    const typeDescList = params.reportTypes.map(type => {
      let desc = typeDescriptions[type] || CONFIG.REPORT_TYPES[type]?.name || type;
      if (type === 'production' && params.customKeywords.length > 0) {
        desc += ` (关键词: ${params.customKeywords.join(', ')})`;
      }
      return desc;
    });
    const typeDesc = typeDescList.join(' + ');

    console.log(`📋 下载配置:`);
    console.log(`   公司: ${params.name} (${params.code})`);
    console.log(`   年份: ${params.years.join(', ')}`);
    console.log(`   类型: ${typeDesc}`);
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
      const typeName = CONFIG.REPORT_TYPES[r.type].name;
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
        const typeName = CONFIG.REPORT_TYPES[f.type].name;
        console.log(`   - ${f.year}年 ${typeName}: ${f.reason}`);
      });
    }

    console.log('\n' + '='.repeat(60) + '\n');

  } catch (error) {
    console.error(`\n❌ 错误: ${error.message}\n`);
    console.log('使用方法:');
    console.log('  # 下载所有类型报告');
    console.log('  node download_all_reports.js --code 600348 --name 华阳股份 --years 2023 --type all\n');
    console.log('  # 只下载年报');
    console.log('  node download_all_reports.js --code 600348 --name 华阳股份 --years 2023 --type annual\n');
    console.log('  # 同时下载年报和运营报告（推荐）');
    console.log('  node download_all_reports.js --code 600348 --name 华阳股份 --years 2023 --types annual,production --keywords "生产经营数据公告"\n');
    console.log('  # 同时下载多个类型');
    console.log('  node download_all_reports.js --code 600348 --name 华阳股份 --years 2023 --types annual,semi,production --keywords "生产经营数据公告"\n');
    console.log('  # 只下载半年报');
    console.log('  node download_all_reports.js --code 600348 --name 华阳股份 --years 2023 --type semi\n');
    console.log('  # 只下载季报');
    console.log('  node download_all_reports.js --code 600348 --name 华阳股份 --years 2023 --type quarterly\n');
    console.log('  # 下载生产经营数据公告（使用默认关键词）');
    console.log('  node download_all_reports.js --code 600546 --name 山煤国际 --years 2024 --type production\n');
    console.log('  # 下载生产经营数据公告（自定义关键词）');
    console.log('  node download_all_reports.js --code 600546 --name 山煤国际 --years 2024 --type production --keywords "生产经营数据公告"\n');
    console.log('  # 下载生产经营数据公告（多个关键词）');
    console.log('  node download_all_reports.js --code 600546 --name 山煤国际 --years 2024 --type production --keywords "生产经营数据公告,月度数据"\n');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { searchReport, downloadFile };

