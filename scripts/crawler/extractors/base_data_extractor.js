const axios = require('axios');
const cheerio = require('cheerio');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

/**
 * 数据提取器基类
 * 包含所有提取器的公共方法
 */
class BaseDataExtractor {
  constructor(downloadDir) {
    this.downloadDir = downloadDir;
    this.ensureDownloadDir();
  }

  /**
   * 确保下载目录存在
   */
  ensureDownloadDir() {
    if (!fs.existsSync(this.downloadDir)) {
      fs.mkdirSync(this.downloadDir, { recursive: true });
    }
  }

  /**
   * 提取页面标题
   * 统一实现，支持多种选择器和清理逻辑
   */
  extractPageTitle($) {
    // 尝试多种方式提取标题
    const titleSelectors = [
      'h1.title',
      'h1',
      '.article-title',
      'title',
      'h2'
    ];

    for (const selector of titleSelectors) {
      let title = $(selector).first().text().trim();
      if (title && title.length > 0 && title !== '国家统计局') {
        // 清理 JavaScript 变量赋值格式，如 vartitle1='...' 或 var title = '...'
        title = title.replace(/^var\s*\w+\s*=\s*['"]?/i, ''); // 移除 var xxx = ' 或 var xxx = "
        title = title.replace(/^vartitle\d+\s*=\s*['"]?/i, ''); // 移除 vartitle1=' 等
        title = title.replace(/['"]\s*;?\s*$/, ''); // 移除末尾的引号和分号
        title = title.replace(/-国家统计局$/, '').trim();

        // 如果清理后还有内容，返回
        if (title && title.length > 0) {
          return title;
        }
      }
    }

    return '相关数据表';
  }

  /**
   * 构建文件名 (参考 stats-export-extension 的 buildRawFilename)
   * 格式：日期_页面标题.ext
   * 示例：2025-09-15_2025年8月份规模以上工业增加值增长5.1%-国家统计局.xlsx
   */
  buildRawFilename(dateStr, title, ext) {
    // 日期只保留数字和横杠
    const base = (dateStr || '').replace(/[^0-9-]/g, '');

    // 清理标题：移除文件名中不允许的字符
    let t = (title || '').trim();

    // 移除 JavaScript 变量赋值格式（如果还有残留）
    t = t.replace(/^var\s*\w+\s*=\s*['"]?/i, '');
    t = t.replace(/^vartitle\d+\s*=\s*['"]?/i, '');
    t = t.replace(/['"]\s*;?\s*$/, '');

    // 移除文件名中不允许的字符：< > : " / \ | ? * 以及单引号、等号
    t = t.replace(/[<>:"/\\|?*'=]/g, '');

    // 移除所有空格，截取前40个字符
    t = t.replace(/\s+/g, '').slice(0, 40) || '相关数据表';

    return (base ? base + '_' : '') + t + '.' + ext;
  }

  /**
   * 从URL提取日期信息
   * 统一实现，支持多种URL格式
   */
  extractDateInfo(url) {
    // 优先尝试从URL中提取日期: /202509/t20250927_xxx.html
    const match = url.match(/\/(\d{6})\/t(\d{8})_/);
    if (match) {
      const yyyymm = match[1]; // 202509
      const yyyymmdd = match[2]; // 20250927

      return {
        publishDate: yyyymmdd.substring(0, 4) + '-' +
                     yyyymmdd.substring(4, 6) + '-' +
                     yyyymmdd.substring(6, 8),
        yearMonth: yyyymm.substring(0, 4) + '-' + yyyymm.substring(4, 6),
        periodInfo: ''
      };
    }

    // 备用方案：匹配8位连续数字
    const urlMatch = url.match(/(\d{4})(\d{2})(\d{2})/);
    if (urlMatch) {
      return {
        publishDate: `${urlMatch[1]}-${urlMatch[2]}-${urlMatch[3]}`,
        yearMonth: `${urlMatch[1]}-${urlMatch[2]}`,
        periodInfo: ''
      };
    }

    // 如果无法从URL提取，使用当前日期
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');

    return {
      publishDate: `${yyyy}-${mm}-${dd}`,
      yearMonth: `${yyyy}-${mm}`,
      periodInfo: ''
    };
  }

  /**
   * 猜测文件扩展名
   * 统一实现，支持多种URL格式
   */
  guessExtFromUrl(url) {
    try {
      // 优先从URL路径中提取
      const u = new URL(url);
      const m = (u.pathname || '').match(/\.([a-z0-9]+)$/i);
      if (m && m[1]) {
        const ext = m[1].toLowerCase();
        if (ext === 'xlsx' || ext === 'xls') {
          return ext;
        }
      }
    } catch (e) {
      // 继续尝试其他方式
    }

    // 备用方案：从URL字符串中查找
    const lower = url.toLowerCase();
    if (lower.includes('.xlsx')) return 'xlsx';
    if (lower.includes('.xls')) return 'xls';

    // 默认返回 xlsx
    return 'xlsx';
  }

  /**
   * 带重试的fetch
   * 统一实现，支持灵活的配置
   */
  async fetchWithRetry(url, maxRetries = 3, options = {}) {
    // 兼容不同的参数格式
    let retries = maxRetries;
    let config = options;

    // 如果第二个参数是对象，说明是旧格式 fetchWithRetry(url, options)
    if (typeof maxRetries === 'object' && !Array.isArray(maxRetries)) {
      config = maxRetries;
      retries = options.maxRetries || 3;
    }

    for (let i = 0; i < retries; i++) {
      try {
        const response = await axios.get(url, {
          timeout: 30000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          },
          ...config
        });
        return response;
      } catch (error) {
        if (i === retries - 1) throw error;
        const delay = 1000 * (i + 1); // 递增延迟
        console.log(`请求失败，${delay}ms后重试 (${i + 1}/${retries})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * 查找"相关数据表"链接
   * 统一实现，支持多种链接格式
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
   * 将表格转换为行数组
   * 统一实现，处理各种表格格式
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

        // 如果单元格为空，检查子元素
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
   * 生成Excel文件（单个工作表）
   * 统一实现，支持行数组或表格对象
   */
  async generateExcelFile(data, filename) {
    try {
      const workbook = xlsx.utils.book_new();

      // 如果data是数组，直接使用
      // 如果data是对象数组（包含title和rows），创建多个工作表
      if (Array.isArray(data) && data.length > 0) {
        if (typeof data[0] === 'object' && data[0].rows) {
          // 多个表格，每个表格一个工作表
          data.forEach((table, index) => {
            const sheetName = (table.title || `表${index + 1}`).slice(0, 31);
            const worksheet = xlsx.utils.aoa_to_sheet(table.rows);
            xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);
          });
        } else {
          // 单个表格，行数组
          const worksheet = xlsx.utils.aoa_to_sheet(data);
          xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
        }
      } else {
        throw new Error('无效的数据格式');
      }

      // 保存文件（filename已经包含扩展名）
      const filePath = path.join(this.downloadDir, filename);
      xlsx.writeFile(workbook, filePath);

      console.log(`Excel文件已生成: ${filePath}`);
      return filePath;

    } catch (error) {
      console.error(`生成Excel文件失败: ${error.message}`);
      return null;
    }
  }
}

module.exports = BaseDataExtractor;

