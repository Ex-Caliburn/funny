/**
 * 港股业绩报下载工具 - Playwright版本
 * 支持：年报、中期报告、季度报告
 * 数据源：港交所披露易（www.hkexnews.hk）
 *
 * 使用方法：
 * # 下载年报
 * node scripts/stock-reports/download_hk_reports_playwright.js --code 00700 --name 腾讯控股 --years 2024 --type annual
 *
 * # 下载多年数据
 * node scripts/stock-reports/download_hk_reports_playwright.js  --code 00700 --name 腾讯控股 --start 2021 --end 2023 --type annual
 */

const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

/**
 * 繁体转简体（针对报告类型）
 */
function traditionalToSimplified(text) {
  if (!text) return text;

  // 常见繁体转简体映射
  const mapping = {
    '報': '报',
    '告': '告',
    '財': '财',
    '務': '务',
    '表': '表',
    '環': '环',
    '境': '境',
    '社': '社',
    '會': '会',
    '管': '管',
    '治': '治',
    '資': '资',
    '料': '料',
    '環': '环',
    '境': '境',
    '社': '社',
    '會': '会',
    '管': '管',
    '治': '治',
    '資': '资',
    '料': '料'
  };

  let result = text;
  for (const [traditional, simplified] of Object.entries(mapping)) {
    result = result.replace(new RegExp(traditional, 'g'), simplified);
  }

  return result;
}

/**
 * 从报告标题提取年份
 */
function extractYearFromTitle(title) {
  if (!title) return null;

  // 尝试匹配4位数字年份（2000-2099）
  // 支持格式：2024年报、2024 年报、二零二四年报、2024年報、2024 年報等
  const yearPatterns = [
    /(\d{4})\s*年[報报]/,           // "2024年报" 或 "2024 年报" 或 "2024年報" 或 "2024 年報"
    /(\d{4})\s*年/,                 // "2024年"
    /(\d{4})/,                      // "2024"（单独的数字）
    /二零([一二三四五六七八九零]{1,2})年/,  // "二零二四年"（需要转换）
    /二([一二三四五六七八九零]{1,2})年/     // "二四年"（简化格式）
  ];

  for (const pattern of yearPatterns) {
    const match = title.match(pattern);
    if (match) {
      if (pattern === yearPatterns[3] || pattern === yearPatterns[4]) {
        // 处理中文数字年份（如"二零二四年"），只转换捕获的那部分（例如 "二四"）
        const chineseNumbers = {
          '零': 0, '一': 1, '二': 2, '三': 3, '四': 4,
          '五': 5, '六': 6, '七': 7, '八': 8, '九': 9
        };
        const captured = match[1] || '';
        let yearStr = '';
        for (const char of captured) {
          if (chineseNumbers[char] !== undefined) {
            yearStr += chineseNumbers[char];
          }
        }
        if (yearStr.length === 2) {
          // 假设是20xx年
          const year = parseInt('20' + yearStr);
          if (year >= 2000 && year <= 2099) {
            return year;
          }
        }
      } else {
        // 处理数字年份
        const year = parseInt(match[1]);
        if (year >= 2000 && year <= 2099) {
          return year;
        }
      }
    }
  }

  return null;
}

/**
 * 从报告标题提取报告类型（简体）
 */
function extractReportType(title) {
  if (!title) return '';

  // 转换为简体
  const simplifiedTitle = traditionalToSimplified(title);

  // 提取报告类型（按优先级：年报 > 中期报告 > 季度报告）
  // 注意：需要先检查更具体的类型（如"中期报告"），再检查更通用的（如"年报"）

  // 检查中期报告（必须包含"中期"）
  if (simplifiedTitle.includes('中期报告') || simplifiedTitle.includes('中期') ||
      simplifiedTitle.includes('中期報告') || simplifiedTitle.includes('中期')) {
    return '中期报告';
  }

  // 检查季度报告（必须包含"季度"）
  if (simplifiedTitle.includes('季度报告') || simplifiedTitle.includes('季度') ||
      simplifiedTitle.includes('季度報告') || simplifiedTitle.includes('季度') ||
      simplifiedTitle.includes('一季') || simplifiedTitle.includes('二季') ||
      simplifiedTitle.includes('三季') || simplifiedTitle.includes('四季')) {
    return '季度报告';
  }

  // 检查年报（包含"年报"或"年度报告"）
  if (simplifiedTitle.includes('年报') || simplifiedTitle.includes('年度报告') ||
      simplifiedTitle.includes('年報') || simplifiedTitle.includes('年度報告')) {
    return '年报';
  }

  // 如果无法识别，尝试从原标题提取（可能包含繁体）
  const originalLower = title.toLowerCase();
  if (originalLower.includes('annual') || originalLower.includes('年報') || originalLower.includes('年报')) {
    return '年报';
  } else if (originalLower.includes('interim') || originalLower.includes('中期')) {
    return '中期报告';
  } else if (originalLower.includes('quarterly') || originalLower.includes('季度')) {
    return '季度报告';
  }

  // 如果还是无法识别，返回默认值
  return '报告';
}

// 尝试加载Playwright
let playwright = null;
try {
  playwright = require('playwright');
} catch (e) {
  console.error('❌ Playwright未安装，请运行: npm install playwright');
  console.error('   然后运行: npx playwright install chromium');
  process.exit(1);
}

// 配置
const CONFIG = {
  SEARCH_API: 'https://www1.hkexnews.hk/search/titlesearch.xhtml',
  BASE_URL: 'https://www.hkexnews.hk',

  HEADERS: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  },

  // 报告类型配置
  REPORT_TYPES: {
    annual: {
      name: '年报',
      keywords: ['年度报告', '年报', 'Annual Report', 'Annual'],
      category: '40100'  // 年报类别代码（从HTML看到可能是40400，但40100是标准值）
    },
    interim: {
      name: '中期报告',
      keywords: ['中期报告', '中期', 'Interim Report', 'Interim', 'Half-Year'],
      category: '40200'  // 中期报告类别代码
    },
    quarterly: {
      name: '季度报告',
      keywords: ['季度报告', '季度', 'Quarterly Report', 'Quarterly', 'Q1', 'Q2', 'Q3'],
      category: '40300'  // 季度报告类别代码
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
    reportTypes: ['annual'],
    lang: 'ZH'
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--code' && args[i + 1]) {
      params.code = args[++i];
    } else if (arg === '--name' && args[i + 1]) {
      params.name = args[++i];
    } else if (arg === '--years' && args[i + 1]) {
      params.years = args[++i].split(',').map(y => parseInt(y.trim()));
    } else if (arg === '--start' && args[i + 1]) {
      const start = parseInt(args[++i]);
      const end = args[i + 1] && args[i + 1].startsWith('--') ? start : parseInt(args[++i] || start);
      params.years = Array.from({ length: end - start + 1 }, (_, i) => start + i);
    } else if (arg === '--end' && args[i + 1] && !params.years.length) {
      // 如果只有--end没有--start，忽略
    } else if (arg === '--type' && args[i + 1]) {
      const type = args[++i];
      if (type === 'all') {
        params.reportTypes = Object.keys(CONFIG.REPORT_TYPES);
      } else {
        params.reportTypes = [type];
      }
    } else if (arg === '--types' && args[i + 1]) {
      params.reportTypes = args[++i].split(',').map(t => t.trim());
    } else if (arg === '--output' && args[i + 1]) {
      params.outputDir = args[++i];
    } else if (arg === '--lang' && args[i + 1]) {
      params.lang = args[++i].toUpperCase();
    }
  }

  return params;
}

/**
 * 使用Playwright搜索港股报告
 */
async function createPlaywrightSession(lang = 'ZH') {
  if (!playwright) {
    throw new Error('Playwright未安装');
  }

  // 始终使用非headless模式，方便用户手动操作
  const browser = await playwright.chromium.launch({
    headless: false, // 始终显示浏览器窗口
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    slowMo: 300 // 减慢操作速度，方便观察
  });

  const context = await browser.newContext({
    userAgent: CONFIG.HEADERS['User-Agent'],
    locale: lang.toLowerCase() === 'zh' ? 'zh-CN' : 'en-US'
  });

  const page = await context.newPage();

  return { browser, context, page };
}

/**
 * 使用Playwright搜索港股报告
 * - 默认：函数内创建/关闭浏览器（兼容旧用法）
 * - 传入session：复用同一浏览器/页面（多年份/多类型时推荐）
 */
async function searchHKReportWithPlaywright(stockCode, year, reportType, lang = 'ZH', session = null) {
  if (!playwright) {
    throw new Error('Playwright未安装');
  }

  const typeConfig = CONFIG.REPORT_TYPES[reportType];
  if (!typeConfig) {
    throw new Error(`未知的报告类型: ${reportType}`);
  }

  // 港股代码处理：保持原始格式（00700），但确保是字符串
  const stockId = stockCode.toString().padStart(5, '0'); // 保持5位，前导零

  const localSession = session || await createPlaywrightSession(lang);
  const { browser, page } = localSession;

  try {
    // 访问搜索页面
    const searchUrl = `${CONFIG.SEARCH_API}?lang=${lang.toLowerCase() === 'zh' ? 'zh' : 'en'}`;
    console.log(`      🔍 访问搜索页面: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });

    // 等待页面完全加载（包括JavaScript执行）
    await page.waitForTimeout(3000);

    // 检查并处理Cookie弹窗
    console.log(`      🔍 检查Cookie弹窗...`);
    try {
      // 尝试多种可能的Cookie接受按钮选择器
      const cookieSelectors = [
        '#onetrust-accept-btn-handler',
        'button[id*="accept"]',
        'button[class*="accept"]',
        'a[id*="accept"]',
        'a[class*="accept"]',
        '.cookie-accept',
        '.accept-cookies',
        '[data-cookie-accept]'
      ];

      let cookieAccepted = false;
      for (const selector of cookieSelectors) {
        try {
          const cookieBtn = await page.locator(selector).first();
          if (await cookieBtn.isVisible({ timeout: 2000 })) {
            await cookieBtn.click();
            console.log(`      ✓ 已点击Cookie接受按钮: ${selector}`);
            cookieAccepted = true;
            await page.waitForTimeout(1000);
            break;
          }
        } catch (e) {
          // 继续尝试下一个选择器
        }
      }

      if (!cookieAccepted) {
        // 尝试通过JavaScript查找并点击
        const found = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button, a'));
          const acceptBtn = buttons.find(btn => {
            const text = (btn.textContent || '').toLowerCase();
            return text.includes('accept') || text.includes('接受') || text.includes('同意');
          });
          if (acceptBtn) {
            acceptBtn.click();
            return true;
          }
          return false;
        });
        if (found) {
          console.log(`      ✓ 已通过JavaScript点击Cookie接受按钮`);
          await page.waitForTimeout(1000);
        } else {
          console.log(`      ℹ️  未找到Cookie弹窗（可能已接受或不存在）`);
        }
      }
    } catch (e) {
      console.log(`      ℹ️  Cookie处理: ${e.message}`);
    }

    // 等待页面元素出现（确保页面完全渲染）
    try {
      await page.waitForSelector('#searchStockCode', { timeout: 10000 });
      console.log(`      ✓ 搜索页面已加载`);
    } catch (e) {
      console.log(`      ⚠️  等待搜索输入框超时: ${e.message}`);
    }

    // 填写股票代码（参考content.js的fillStockCode函数）
    console.log(`      🔍 填写股票代码...`);
    try {
      const stockInput = page.locator('#searchStockCode');
      await stockInput.click({ clickCount: 3 }); // 选中所有文本
      await page.waitForTimeout(300);

      // 逐字符输入（模拟真实输入，参考content.js）
      for (const char of stockId) {
        await stockInput.type(char, { delay: 100 });
        await page.waitForTimeout(100);
      }
      console.log(`      ✓ 已输入股票代码: ${stockId}`);

      // 触发input事件
      await page.evaluate(() => {
        const input = document.querySelector('#searchStockCode');
        if (input) {
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
      await page.waitForTimeout(1000); // 等待自动完成建议出现

      // 等待自动完成建议出现，然后选择匹配的建议
      console.log(`      ⏳ 等待自动完成建议...`);
      try {
        await page.waitForSelector('#autocomplete-list-0 tr.autocomplete-suggestion', { timeout: 5000 });
        console.log(`      ✓ 自动完成建议已出现`);

        // 查找包含目标股票代码的建议（参考content.js的逻辑）
        const targetSuggestion = await page.evaluate((stockId) => {
          const suggestions = Array.from(document.querySelectorAll('#autocomplete-list-0 tr.autocomplete-suggestion'));
          for (const suggestion of suggestions) {
            const text = suggestion.textContent || '';
            // 查找包含股票代码的建议（如"00700"）
            if (text.includes(stockId)) {
              return true; // 找到匹配的建议
            }
          }
          return false;
        }, stockId);

        if (targetSuggestion) {
          console.log(`      🔍 找到匹配的建议`);
        }

        // 点击第一个建议（通常是匹配的股票，如"00700 TENCENT"）
        const firstSuggestion = page.locator('#autocomplete-list-0 tr.autocomplete-suggestion').first();
        await firstSuggestion.hover();
        await page.waitForTimeout(300);
        await firstSuggestion.click({ force: true });
        console.log(`      ✓ 已点击自动完成建议`);

        // 等待自动完成建议设置字段（参考content.js：等待2秒）
        await page.waitForTimeout(2000);

        // 验证stockId是否已正确设置（参考content.js的验证逻辑）
        const stockIdAfterSelect = await page.evaluate(() => {
          return document.querySelector('#stockId')?.value;
        });
        console.log(`      🔍 选择后stockId值: ${stockIdAfterSelect}`);

        if (!stockIdAfterSelect || stockIdAfterSelect === '-1') {
          console.log(`      ⚠️  stockId未自动设置，等待一下让自动完成建议处理...`);
          await page.waitForTimeout(1000);

          // 再次检查
          const stockIdAfterWait = await page.evaluate(() => {
            return document.querySelector('#stockId')?.value;
          });
          if (stockIdAfterWait && stockIdAfterWait !== '-1') {
            console.log(`      ✓ 等待后stockId已设置: ${stockIdAfterWait}`);
          } else {
            console.log(`      ⚠️  等待后stockId仍未设置，但继续执行`);
          }
        } else {
          console.log(`      ✓ stockId已正确设置: ${stockIdAfterSelect}`);
        }
      } catch (e) {
        console.log(`      ⚠️  自动完成建议未出现或超时: ${e.message}`);
        await page.waitForTimeout(1000);
      }

      console.log(`      ✓ 已设置股票代码`);
    } catch (error) {
      console.error(`      ❌ 填写股票代码失败: ${error.message}`);
      throw error;
    }

    // 填写日期范围（参考content.js的selectDate函数，使用日期选择器）
    // 格式化日期为 DD/MM/YYYY（港交所网站使用的格式）
    const formatDateForPicker = (dateStr) => {
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };

    const fromDateFormatted = formatDateForPicker(`${year}-01-01`);
    const toDateFormatted = formatDateForPicker(`${year + 1}-12-31`);

    console.log(`      🔍 填写日期范围（使用日期选择器）...`);

    // 选择开始日期（参考content.js的selectDate函数）
    await page.evaluate(async ({ dateStr }) => {
      const dateParts = dateStr.split('/');
      if (dateParts.length !== 3) {
        throw new Error('日期格式错误，应为 DD/MM/YYYY');
      }
      const day = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]) - 1; // 月份是0-11
      const year = parseInt(dateParts[2]);

      const input = document.querySelector('#searchDate-From');
      if (!input) return;

      // 点击输入框打开日期选择器
      input.click();
      input.focus();
      await new Promise(resolve => setTimeout(resolve, 500));

      // 触发focus事件
      input.dispatchEvent(new Event('focus', { bubbles: true, cancelable: true }));
      await new Promise(resolve => setTimeout(resolve, 500));

      // 等待日期选择器出现并完全初始化
      let calendar = null;
      let yearButtonsReady = false;
      let waitCount = 0;
      while ((!calendar || !yearButtonsReady) && waitCount < 40) {
        await new Promise(resolve => setTimeout(resolve, 200));

        if (!calendar) {
          calendar = document.querySelector('.columns, .calendar, [class*="calendar"], div.calendar');
          if (!calendar) {
            const testYearButton = document.querySelector('b.year, .year');
            if (testYearButton) {
              calendar = testYearButton.parentElement;
            }
          }
        }

        if (calendar && !yearButtonsReady) {
          const testYearButtons = document.querySelectorAll('b.year button, .year button');
          if (testYearButtons.length > 0) {
            yearButtonsReady = true;
          }
        }
        waitCount++;
      }

      if (calendar && yearButtonsReady) {
        await new Promise(resolve => setTimeout(resolve, 500));

        // 选择年份
        const yearButton = document.querySelector(`b.year button[data-value="${year}"], .year button[data-value="${year}"]`);
        if (yearButton) {
          yearButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await new Promise(resolve => setTimeout(resolve, 400));
          yearButton.click();
          await new Promise(resolve => setTimeout(resolve, 1200));
        }

        // 选择月份
        const monthButton = document.querySelector(`b.month button[data-value="${month}"], .month button[data-value="${month}"]`);
        if (monthButton) {
          monthButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await new Promise(resolve => setTimeout(resolve, 400));
          monthButton.click();
          await new Promise(resolve => setTimeout(resolve, 1200));
        }

        // 选择日期
        const dayButton = document.querySelector(`b.day button[data-value="${day}"], .day button[data-value="${day}"]`);
        if (dayButton) {
          dayButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await new Promise(resolve => setTimeout(resolve, 400));
          dayButton.click();
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // 关闭日期选择器
      if (input.blur) {
        input.blur();
      }
      await new Promise(resolve => setTimeout(resolve, 500));

      // 触发事件
      input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      input.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
    }, { dateStr: fromDateFormatted });

    await page.waitForTimeout(500);
    console.log(`      ✓ 已选择开始日期: ${fromDateFormatted}`);

    // 选择结束日期
    await page.evaluate(async ({ dateStr }) => {
      const dateParts = dateStr.split('/');
      if (dateParts.length !== 3) {
        throw new Error('日期格式错误，应为 DD/MM/YYYY');
      }
      const day = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]) - 1;
      const year = parseInt(dateParts[2]);

      const input = document.querySelector('#searchDate-To');
      if (!input) return;

      input.click();
      input.focus();
      await new Promise(resolve => setTimeout(resolve, 500));

      input.dispatchEvent(new Event('focus', { bubbles: true, cancelable: true }));
      await new Promise(resolve => setTimeout(resolve, 500));

      let calendar = null;
      let yearButtonsReady = false;
      let waitCount = 0;
      while ((!calendar || !yearButtonsReady) && waitCount < 40) {
        await new Promise(resolve => setTimeout(resolve, 200));

        if (!calendar) {
          calendar = document.querySelector('.columns, .calendar, [class*="calendar"], div.calendar');
          if (!calendar) {
            const testYearButton = document.querySelector('b.year, .year');
            if (testYearButton) {
              calendar = testYearButton.parentElement;
            }
          }
        }

        if (calendar && !yearButtonsReady) {
          const testYearButtons = document.querySelectorAll('b.year button, .year button');
          if (testYearButtons.length > 0) {
            yearButtonsReady = true;
          }
        }
        waitCount++;
      }

      if (calendar && yearButtonsReady) {
        await new Promise(resolve => setTimeout(resolve, 500));

        const yearButton = document.querySelector(`b.year button[data-value="${year}"], .year button[data-value="${year}"]`);
        if (yearButton) {
          yearButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await new Promise(resolve => setTimeout(resolve, 400));
          yearButton.click();
          await new Promise(resolve => setTimeout(resolve, 1200));
        }

        const monthButton = document.querySelector(`b.month button[data-value="${month}"], .month button[data-value="${month}"]`);
        if (monthButton) {
          monthButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await new Promise(resolve => setTimeout(resolve, 400));
          monthButton.click();
          await new Promise(resolve => setTimeout(resolve, 1200));
        }

        const dayButton = document.querySelector(`b.day button[data-value="${day}"], .day button[data-value="${day}"]`);
        if (dayButton) {
          dayButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await new Promise(resolve => setTimeout(resolve, 400));
          dayButton.click();
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (input.blur) {
        input.blur();
      }
      await new Promise(resolve => setTimeout(resolve, 500));

      input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      input.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
    }, { dateStr: toDateFormatted });

    await page.waitForTimeout(500);
    console.log(`      ✓ 已选择结束日期: ${toDateFormatted}`);

    // 选择文件类别（完全参考content.js的selectReportCategory函数）
    // 按照图片路径：標題類別 -> 財務報表/環境、社會及管治資料 -> 所有
    console.log(`      🔍 选择文件类别（標題類別 -> 財務報表/環境、社會及管治資料 -> 所有）...`);
    try {
      await page.waitForTimeout(2000); // 等待页面完全加载

      // 使用和content.js完全一致的逻辑
      const categorySelected = await page.evaluate(async () => {
        // 步骤1：先选择搜索类型为"標題類別"（参考content.js）
        const searchTypeSelectors = [
          '#selectedCategory .combobox-field',
          '#selectedCategory',
          '.combobox-field[aria-label*="標題"]',
          '.combobox-field[aria-label*="标题"]'
        ];

        let searchTypeDropdown = null;
        for (const selector of searchTypeSelectors) {
          const element = document.querySelector(selector);
          if (element && element.offsetParent !== null) {
            searchTypeDropdown = element;
            break;
          }
        }

        if (searchTypeDropdown) {
          searchTypeDropdown.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await new Promise(resolve => setTimeout(resolve, 300));
          searchTypeDropdown.click();
          await new Promise(resolve => setTimeout(resolve, 800));

          // 在下拉菜单中选择"標題類別"（data-value="rbAfter2006"）
          const titleCategoryOption = document.querySelector('.droplist-item[data-value="rbAfter2006"]');
          if (titleCategoryOption) {
            titleCategoryOption.click();
            await new Promise(resolve => setTimeout(resolve, 1500));
          } else {
            // 尝试通过文本查找
            const allOptions = Array.from(document.querySelectorAll('.droplist-item, .dropdown-item, [role="option"]'));
            for (const option of allOptions) {
              const text = (option.textContent || '').trim();
              if (text === '標題類別' || text === '标题类别') {
                option.click();
                await new Promise(resolve => setTimeout(resolve, 1500));
                break;
              }
            }
          }
        }

        // 步骤2：查找"標題類別"下拉菜单（应该在id="rbAfter2006"的容器中）
        await new Promise(resolve => setTimeout(resolve, 500));
        const titleCategorySelectors = [
          '#rbAfter2006 .combobox-field',
          '.tier1-wrap .combobox-field',
          '[id*="tier1"] .combobox-field',
          '#rbAfter2006 input[type="text"]',
          '#rbAfter2006 select'
        ];

        let titleCategoryDropdown = null;
        for (const selector of titleCategorySelectors) {
          const element = document.querySelector(selector);
          if (element && element.offsetParent !== null) {
            titleCategoryDropdown = element;
            break;
          }
        }

        if (!titleCategoryDropdown) {
          const labels = document.querySelectorAll('label');
          for (const label of labels) {
            const labelText = label.textContent || '';
            if (labelText.includes('標題類別') || labelText.includes('标题类别')) {
              const container = label.closest('div, fieldset, form');
              if (container) {
                const combobox = container.querySelector('.combobox-field, [class*="combobox"], select, input[type="text"]');
                if (combobox && combobox.offsetParent !== null) {
                  titleCategoryDropdown = combobox;
                  break;
                }
              }
            }
          }
        }

        if (titleCategoryDropdown) {
          titleCategoryDropdown.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await new Promise(resolve => setTimeout(resolve, 300));
          titleCategoryDropdown.click();
          await new Promise(resolve => setTimeout(resolve, 1200));
        }

        // 步骤3：查找并选择"財務報表/環境、社會及管治資料"选项（完全参考content.js）
        await new Promise(resolve => setTimeout(resolve, 500));
        const allOptions = Array.from(document.querySelectorAll('.droplist-item, .dropdown-item, [role="option"], li[role="option"], .menu-item, .option-item, tr[class*="suggestion"], td[class*="option"]'))
          .filter(el => {
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            return style.display !== 'none' &&
                   style.visibility !== 'hidden' &&
                   rect.width > 0 &&
                   rect.height > 0 &&
                   el.offsetParent !== null;
          });

        const targetTextPatterns = [
          '財務報表/環境、社會及管治資料',
          '财务报表/环境、社会及管治资料',
          '財務報表/環境、社會及管治',
          '财务报表/环境、社会及管治'
        ];

        let targetOption = null;

        // 方法1：精确匹配完整文本
        for (const option of allOptions) {
          const text = (option.textContent || '').trim();
          for (const pattern of targetTextPatterns) {
            if (text === pattern || text.startsWith(pattern) || text.includes(pattern)) {
              targetOption = option;
              break;
            }
          }
          if (targetOption) break;
        }

        // 方法2：严格匹配（必须同时包含"財務報表"和"環境、社會及管治"）
        if (!targetOption) {
          for (const option of allOptions) {
            const text = (option.textContent || '').trim();
            const hasFinancialReport = text.includes('財務報表') || text.includes('财务报表');
            const hasESG = text.includes('環境、社會及管治') ||
                          text.includes('环境、社会及管治') ||
                          (text.includes('環境') && text.includes('社會') && text.includes('管治')) ||
                          (text.includes('环境') && text.includes('社会') && text.includes('管治')) ||
                          text.includes('ESG');

            if (hasFinancialReport && hasESG) {
              const excludeWords = ['公告', '通告', '通知', 'Announcement'];
              const hasExclude = excludeWords.some(word => text.includes(word));
              if (!hasExclude) {
                targetOption = option;
                break;
              }
            }
          }
        }

        // 记录点击前的选项（用于后续排除主菜单选项）
        const beforeClickOptions = new Set();
        const beforeClickElements = Array.from(document.querySelectorAll('.droplist-item, .dropdown-item, [role="option"], li[role="option"], .menu-item, .option-item, tr[class*="suggestion"], td[class*="option"]'))
          .filter(el => {
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            return style.display !== 'none' &&
                   style.visibility !== 'hidden' &&
                   rect.width > 0 &&
                   rect.height > 0 &&
                   el.offsetParent !== null;
          });
        beforeClickElements.forEach(el => beforeClickOptions.add(el));

        if (targetOption) {
          targetOption.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await new Promise(resolve => setTimeout(resolve, 300));
          if (targetOption.click) {
            targetOption.click();
          } else {
            targetOption.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          }
          await new Promise(resolve => setTimeout(resolve, 2000)); // 等待子菜单出现
        }

        // 步骤4：在子菜单中选择"所有"（完全参考content.js的详细逻辑）
        await new Promise(resolve => setTimeout(resolve, 500));
        let subMenuContainer = null;
        let waitCount = 0;
        const maxWaitCount = 25;

        while (!subMenuContainer && waitCount < maxWaitCount) {
          await new Promise(resolve => setTimeout(resolve, 200));
          waitCount++;

          // 方法1：优先查找目标选项的子元素中的子菜单
          if (targetOption && targetOption.querySelector) {
            const childMenu = targetOption.querySelector('.droplist-submenu, .droplist-group.droplist-submenu');
            if (childMenu) {
              subMenuContainer = childMenu;
              break;
            }
          }

          // 方法2：查找 ul.droplist-items
          if (!subMenuContainer && targetOption && targetOption.querySelector) {
            const ulMenu = targetOption.querySelector('ul.droplist-items, ul[class*="droplist"]');
            if (ulMenu) {
              subMenuContainer = ulMenu;
              break;
            }
          }

          // 方法3：通过DOM结构查找
          if (!subMenuContainer) {
            const allMenus = Array.from(document.querySelectorAll('.droplist-submenu, .droplist-group.droplist-submenu, ul.droplist-items, .droplist, .dropdown-menu, .submenu, [class*="droplist-submenu"], [class*="droplist"], [class*="dropdown"]'))
              .filter(menu => {
                const style = window.getComputedStyle(menu);
                const rect = menu.getBoundingClientRect();
                return style.display !== 'none' &&
                       style.visibility !== 'hidden' &&
                       rect.width > 0 &&
                       rect.height > 0 &&
                       menu.offsetParent !== null;
              });

            if (allMenus.length > 0 && targetOption) {
              const targetRect = targetOption.getBoundingClientRect();
              let closestMenu = null;
              let minDistance = Infinity;

              for (const menu of allMenus) {
                const menuRect = menu.getBoundingClientRect();
                const distance = Math.abs(menuRect.top - targetRect.bottom) + Math.abs(menuRect.left - targetRect.left);
                if (distance < minDistance && (menuRect.top >= targetRect.bottom - 10 || menuRect.left >= targetRect.left - 10)) {
                  minDistance = distance;
                  closestMenu = menu;
                }
              }

              if (closestMenu) {
                subMenuContainer = closestMenu;
              }
            }
          }
        }

        if (subMenuContainer) {
          await new Promise(resolve => setTimeout(resolve, 500));

          // 在子菜单容器中查找"所有"选项（从 <a> 标签获取文本，参考content.js）
          const subOptions = Array.from(subMenuContainer.querySelectorAll('.droplist-item, li.droplist-item'))
            .filter(el => {
              const style = window.getComputedStyle(el);
              const rect = el.getBoundingClientRect();
              const isVisible = style.display !== 'none' &&
                     style.visibility !== 'hidden' &&
                     rect.width > 0 &&
                     rect.height > 0 &&
                     el.offsetParent !== null;

              if (!isVisible) {
                return false;
              }

              // 从 <a> 标签中获取文本
              const linkElement = el.querySelector('a');
              const text = linkElement ? (linkElement.textContent || '').trim() : (el.textContent || '').trim();

              // 对于"所有"选项，即使点击前存在也可能是子菜单的
              if (text === '所有' || text === 'All') {
                return true;
              }

              // 排除点击前就存在的选项（确保是子菜单中的新选项）
              if (beforeClickOptions.has(el)) {
                return false;
              }

              return true;
            });

          // 查找"所有"选项
          for (const subOption of subOptions) {
            const linkElement = subOption.querySelector('a');
            const text = linkElement ? (linkElement.textContent || '').trim() : (subOption.textContent || '').trim();
            if (text === '所有' || text === 'All') {
              subOption.scrollIntoView({ behavior: 'smooth', block: 'center' });
              await new Promise(resolve => setTimeout(resolve, 300));
              if (subOption.click) {
                subOption.click();
              } else {
                subOption.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
              }
              await new Promise(resolve => setTimeout(resolve, 800));
              return true;
            }
          }
        }

        return false;
      });

      if (categorySelected) {
        console.log(`      ✓ 已选择文件类别：所有财报`);
      } else {
        console.log(`      ⚠️  文件类别选择可能未完全成功，但继续执行`);
      }
    } catch (e) {
      console.log(`      ⚠️  选择文件类别失败: ${e.message}`);
    }

    // 等待一下让表单更新
    await page.waitForTimeout(1000);

    // 点击搜索按钮（参考content.js的clickSearch函数）
    console.log(`      🔍 点击搜索按钮...`);

    // 查找搜索按钮（参考content.js的多种选择器）
    const searchButtonClicked = await page.evaluate(async () => {
      const searchSelectors = [
        '.filter__btn-applyFilters-js',
        'button[type="submit"]',
        'input[type="submit"]',
        '.btn-search',
        '.search-btn',
        'button.btn-blue',
        'a.btn-blue'
      ];

      let searchButton = null;
      for (const selector of searchSelectors) {
        const element = document.querySelector(selector);
        if (element && element.offsetParent !== null) {
          searchButton = element;
          break;
        }
      }

      if (!searchButton) {
        // 尝试通过文本查找
        const buttons = Array.from(document.querySelectorAll('button, a, input[type="submit"]'))
          .filter(btn => btn.offsetParent !== null);

        for (const btn of buttons) {
          const text = (btn.textContent || btn.value || '').toUpperCase();
          if (text.includes('SEARCH') || text.includes('搜索') || text.includes('搜尋')) {
            searchButton = btn;
            break;
          }
        }
      }

      if (searchButton) {
        searchButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await new Promise(resolve => setTimeout(resolve, 300));
        searchButton.click();
        return true;
      }
      return false;
    });

    if (!searchButtonClicked) {
      throw new Error('未找到搜索按钮');
    }

    console.log(`      ✓ 已点击搜索按钮`);

    // 监听页面导航和AJAX请求（点击搜索后页面会刷新，数据可能通过AJAX加载）
    const navigationPromise = page.waitForNavigation({
      waitUntil: 'networkidle',
      timeout: 30000
    }).catch(() => {
      console.log(`      ⚠️  页面导航超时`);
      return null;
    });

    // 同时监听可能的AJAX请求（数据可能通过AJAX加载）
    const ajaxPromise = page.waitForResponse(
      response => {
        const url = response.url();
        // 监听可能的数据加载请求
        return (url.includes('search') || url.includes('result') || url.includes('data')) &&
               response.request().method() === 'GET' &&
               response.status() === 200;
      },
      { timeout: 30000 }
    ).catch(() => {
      return null;
    });

    // 等待页面刷新完成（点击搜索后页面会整页刷新）
    console.log(`      🔍 等待页面刷新（服务端渲染）...`);
    try {
      await Promise.race([navigationPromise, ajaxPromise]);
      console.log(`      ✓ 页面刷新或AJAX请求完成`);
    } catch (e) {
      console.log(`      ⚠️  等待超时: ${e.message}`);
    }

    // 等待网络空闲
    try {
      await page.waitForLoadState('networkidle', { timeout: 20000 });
      console.log(`      ✓ 网络请求已完成`);
    } catch (e) {
      console.log(`      ⚠️  网络等待超时: ${e.message}`);
    }

    // 等待页面完全加载（包括JavaScript执行）- 用户说2-3秒就能看到结果
    console.log(`      ⏳ 等待搜索结果加载（2-3秒）...`);
    console.log(`      💡 提示：浏览器窗口已打开，您可以手动操作和检查页面状态`);
    console.log(`      💡 提示：脚本将在10秒后继续执行，如需更多时间请按 Ctrl+C 停止`);
    await page.waitForTimeout(10000); // 给用户更多时间手动操作

    // 再次检查并处理Cookie弹窗（页面刷新后可能再次出现）
    console.log(`      🔍 检查Cookie弹窗（页面刷新后）...`);
    try {
      const found = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, a'));
        const acceptBtn = buttons.find(btn => {
          const text = (btn.textContent || '').toLowerCase();
          return text.includes('accept') || text.includes('接受') || text.includes('同意');
        });
        if (acceptBtn && acceptBtn.offsetParent !== null) { // 检查是否可见
          acceptBtn.click();
          return true;
        }
        return false;
      });
      if (found) {
        console.log(`      ✓ 已通过JavaScript点击Cookie接受按钮（刷新后）`);
        await page.waitForTimeout(1000);
      }
    } catch (e) {
      // 忽略错误
    }

    // 等待结果表格出现（用户说2-3秒就能看到结果，不需要滚动）
    console.log(`      🔍 等待搜索结果表格...`);
    try {
      // 等待结果面板出现
      await page.waitForSelector('#titleSearchResultPanel', { timeout: 10000 });
      console.log(`      ✓ 结果面板已出现`);

      // 等待数据行出现（等待2-3秒，用户说不需要滚动）
      try {
        // 等待有td的数据行出现（排除表头）
        await page.waitForSelector(
          '#titleSearchResultPanel table tbody tr:has(td):not(:has(th))',
          { timeout: 5000 }
        );
        console.log(`      ✓ 结果表格数据行已出现`);
      } catch (e) {
        // 如果上面的选择器不支持，尝试更通用的
        try {
          await page.waitForFunction(() => {
            const panel = document.querySelector('#titleSearchResultPanel');
            if (!panel) return false;
            const rows = panel.querySelectorAll('table tbody tr, tbody tr');
            for (const row of rows) {
              if (!row.querySelector('th') && row.querySelector('td')) {
                return true;
              }
            }
            return false;
          }, { timeout: 5000 });
          console.log(`      ✓ 结果表格数据行已出现（通过waitForFunction）`);
        } catch (e2) {
          console.log(`      ⚠️  数据行等待超时，继续尝试提取...`);
        }
      }
    } catch (e) {
      console.log(`      ⚠️  结果表格等待超时，继续尝试...`);
    }

    // 服务端渲染后，字段可能已经被重置，需要重新设置（如果需要再次搜索）
    // 但通常服务端渲染后，结果应该已经显示在页面上了

    // 保存调试信息
    if (process.env.DEBUG_HK) {
      await page.screenshot({ path: path.join(__dirname, '../docs/hk_playwright_screenshot.png'), fullPage: true });
      const html = await page.content();
      fs.writeFileSync(path.join(__dirname, '../docs/hk_playwright_page.html'), html);
      console.log(`      🔍 调试：已保存页面截图和HTML`);

      // 检查页面状态
      const pageInfo = await page.evaluate(() => {
        const resultPanel = document.querySelector('#titleSearchResultPanel');
        const hasTable = resultPanel?.querySelector('table tbody tr');
        const noResultText = resultPanel?.textContent || '';
        return {
          hasResultPanel: !!resultPanel,
          hasTable: !!hasTable,
          panelText: noResultText.substring(0, 200),
          hiddenFields: {
            stockId: document.querySelector('#stockId')?.value,
            tierOneId: document.querySelector('#tierOneId')?.value,
            tierTwoId: document.querySelector('#tierTwoId')?.value,
            startDate: document.querySelector('#startDate')?.value,
            endDate: document.querySelector('#endDate')?.value
          }
        };
      });
      console.log(`      🔍 调试：页面状态:`, JSON.stringify(pageInfo, null, 2));
    }

    // 提取搜索结果
    console.log(`      🔍 提取搜索结果...`);

    // 先检查页面状态
    const pageState = await page.evaluate(() => {
      const resultPanel = document.querySelector('#titleSearchResultPanel');
      const tables = document.querySelectorAll('#titleSearchResultPanel table, table');
      const rows = document.querySelectorAll('#titleSearchResultPanel table tbody tr, table tbody tr');
      const noResultText = resultPanel?.textContent || '';

      return {
        hasPanel: !!resultPanel,
        tableCount: tables.length,
        rowCount: rows.length,
        panelText: noResultText.substring(0, 300),
        hasNoResult: noResultText.includes('沒有找到') || noResultText.includes('没有找到') || noResultText.includes('No result')
      };
    });

    console.log(`      🔍 页面状态: 表格数=${pageState.tableCount}, 行数=${pageState.rowCount}, 无结果=${pageState.hasNoResult}`);
    if (pageState.panelText) {
      console.log(`      🔍 面板文本: ${pageState.panelText.substring(0, 100)}...`);
    }

    const reports = await page.evaluate(({ year, typeConfig }) => {
      const results = [];
      const debugInfo = [];

      // 查找结果表格行 - 尝试多种选择器
      const resultPanel = document.querySelector('#titleSearchResultPanel');

      // 检查是否有"没有找到"的提示
      const noResultText = resultPanel?.textContent || '';
      const hasNoResult = noResultText.includes('沒有找到') ||
                         noResultText.includes('没有找到') ||
                         noResultText.includes('No result') ||
                         noResultText.includes('No records') ||
                         noResultText.includes('沒有記錄');

      if (hasNoResult) {
        debugInfo.push('检测到"没有找到结果"的提示');
        debugInfo.push(`面板文本: ${noResultText.substring(0, 200)}`);
        return { results: [], debugInfo };
      }

      // 检查是否有"没有数据"或空表格的提示
      if (resultPanel) {
        const emptyMsg = resultPanel.querySelector('.no-result, .empty-result, .no-data');
        if (emptyMsg) {
          debugInfo.push(`检测到空结果提示元素: ${emptyMsg.textContent.substring(0, 100)}`);
          return { results: [], debugInfo };
        }
      }
      debugInfo.push(`结果面板存在: ${!!resultPanel}`);

      // 优先在结果面板中查找（尝试多种选择器）
      let rows = [];
      if (resultPanel) {
        // 尝试多种选择器
        rows = Array.from(resultPanel.querySelectorAll('table tbody tr'));
        if (rows.length === 0) {
          rows = Array.from(resultPanel.querySelectorAll('tbody tr'));
        }
        if (rows.length === 0) {
          rows = Array.from(resultPanel.querySelectorAll('tr'));
        }
        if (rows.length === 0) {
          // 尝试查找所有table，然后在table中查找
          const tables = resultPanel.querySelectorAll('table');
          debugInfo.push(`结果面板中有 ${tables.length} 个表格`);
          tables.forEach((table, tableIdx) => {
            const tableRows = Array.from(table.querySelectorAll('tbody tr, tr'));
            debugInfo.push(`  表格${tableIdx}: ${tableRows.length} 行`);
            // 检查每个表格的tbody
            const tbody = table.querySelector('tbody');
            if (tbody) {
              const tbodyRows = Array.from(tbody.querySelectorAll('tr'));
              debugInfo.push(`    表格${tableIdx}的tbody: ${tbodyRows.length} 行`);
              tbodyRows.forEach((tr, trIdx) => {
                const hasTh = tr.querySelector('th');
                const hasTd = tr.querySelector('td');
                const text = tr.textContent.trim().substring(0, 50);
                debugInfo.push(`      TR${trIdx}: hasTh=${!!hasTh}, hasTd=${!!hasTd}, text="${text}"`);
              });
            }
            if (tableRows.length > 0) {
              rows = tableRows;
            }
          });
        }
        debugInfo.push(`在结果面板中找到 ${rows.length} 行`);
      }

      // 如果结果面板中没有行，尝试全局查找（但排除自动完成建议）
      if (rows.length === 0) {
        const allRows = Array.from(document.querySelectorAll('table tbody tr, tbody tr'));
        // 排除自动完成建议中的行
        rows = allRows.filter(row => {
          const isInAutocomplete = row.closest('#autocomplete-list-0, #autocomplete-list-1');
          const isInResultPanel = row.closest('#titleSearchResultPanel');
          return !isInAutocomplete && (isInResultPanel || !row.closest('#autocomplete-list-0, #autocomplete-list-1'));
        });
        debugInfo.push(`全局查找找到 ${allRows.length} 行，过滤后 ${rows.length} 行`);
      }

      // 过滤出结果表格的行（排除自动完成建议的表格和表头）
      const resultRows = Array.from(rows).filter((row, idx) => {
        // 排除表头行（检查是否有th标签）
        if (row.querySelector('th')) {
          debugInfo.push(`  行${idx}: 包含th，跳过（表头）`);
          return false;
        }

        // 排除空行
        if (row.textContent.trim() === '') {
          debugInfo.push(`  行${idx}: 空行，跳过`);
          return false;
        }

        // 排除自动完成建议的行
        const isInAutocomplete = row.closest('#autocomplete-list-0, #autocomplete-list-1');
        if (isInAutocomplete) {
          debugInfo.push(`  行${idx}: 在自动完成建议中，跳过`);
          return false;
        }

        // 确保行有内容（至少有1个td）
        const cells = row.querySelectorAll('td');
        if (cells.length < 1) {
          debugInfo.push(`  行${idx}: 没有td单元格，跳过`);
          return false;
        }

        // 记录保留的行
        const rowText = Array.from(cells).map(c => c.textContent.trim()).join(' | ');
        debugInfo.push(`  行${idx}: 保留 - ${rowText.substring(0, 100)}`);
        return true;
      });

      debugInfo.push(`过滤后的结果行数: ${resultRows.length}`);

      // 调试：记录前几行的内容
      if (resultRows.length > 0) {
        debugInfo.push(`前${Math.min(5, resultRows.length)}行的内容:`);
        resultRows.slice(0, 5).forEach((row, idx) => {
          const cells = row.querySelectorAll('td');
          const rowText = Array.from(cells).map(c => c.textContent.trim()).join(' | ');
          debugInfo.push(`  行${idx + 1}: ${rowText.substring(0, 200)}`);
        });
      } else {
        debugInfo.push(`⚠️  结果表格中没有找到行`);
        // 如果没找到行，检查所有可能的行
        if (resultPanel) {
          const allTrs = resultPanel.querySelectorAll('tr');
          debugInfo.push(`结果面板中总共有 ${allTrs.length} 个tr标签`);
          allTrs.forEach((tr, idx) => {
            const hasTh = tr.querySelector('th');
            const hasTd = tr.querySelector('td');
            const text = tr.textContent.trim().substring(0, 100);
            debugInfo.push(`  TR${idx}: hasTh=${!!hasTh}, hasTd=${!!hasTd}, text="${text}"`);
          });
        }
      }

      resultRows.forEach((row, rowIdx) => {
        // 提取日期（参考content.js的extractReportLinks函数）
        const dateCell = row.querySelector('td:first-child');
        if (!dateCell) return;

        const dateText = dateCell.textContent.trim();

        // 支持多种日期格式（参考content.js）：
        // 1. DD/MM/YYYY HH:MM (如: 18/09/2025 17:03)
        // 2. YYYY/MM/DD (如: 2025/09/18)
        // 3. YYYY-MM-DD (如: 2025-09-18)
        let dateMatch = dateText.match(/(\d{2})\/(\d{2})\/(\d{4})/); // DD/MM/YYYY
        let date = '';
        if (dateMatch) {
          // 转换为 YYYY-MM-DD 格式
          date = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
        } else {
          // 尝试 YYYY/MM/DD 或 YYYY-MM-DD 格式
          dateMatch = dateText.match(/(\d{4})[\/\-](\d{2})[\/\-](\d{2})/);
          if (dateMatch) {
            date = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
          }
        }

        if (!date) return;

        // 提取链接和标题（完全参考content.js的extractReportLinks函数）
        // 标题在第4列（td:nth-child(4)），包含完整信息
        const titleCell = row.querySelector('td:nth-child(4)');

        // 查找链接：优先在titleCell中查找，如果找不到则在整行中查找
        // 支持多种结构：doc-link中的a标签，或直接在titleCell中的a标签
        let link = null;
        if (titleCell) {
          // 先尝试在doc-link中查找
          const docLink = titleCell.querySelector('.doc-link a[href*=".pdf"], .doc-link a');
          if (docLink) {
            link = docLink;
          } else {
            // 再尝试在titleCell中直接查找
            link = titleCell.querySelector('a[href*=".pdf"], a[href*="document"], a[href*="file"], a');
          }
        }

        // 如果还没找到，在整个行中查找
        if (!link) {
          link = row.querySelector('a[href*=".pdf"], a[href*="document"], a[href*="file"], a');
        }

        if (!link) return;

        // 提取标题：从标题单元格中提取实际报告名称（完全参考content.js）
        let title = '';
        if (titleCell) {
          const cellText = titleCell.textContent.trim();

          // 格式通常是："財務報表/環境、社會及管治資料-[年報] 二零二四年報(2MB)"
          // 或者："財務報表/環境、社會及管治資料-[環境、社會及管治資料/報告] 二零二四年環境、社會及管治報告 (13MB)"

          // 方法1：尝试提取括号后的报告名称（去掉文件大小）
          // 匹配格式：[类型] 报告名称(大小) 或 [类型] 报告名称 (大小)
          const reportMatch = cellText.match(/\[.*?\]\s*(.+?)(?:\s*\([^)]+\))?(?:\s*\([^)]+\))?\s*$/);
          if (reportMatch) {
            title = reportMatch[1].trim();
            // 去掉末尾的文件大小信息（如 "(2MB)"）
            title = title.replace(/\s*\([^)]+\)\s*$/, '').trim();
          }

          // 方法2：如果方法1失败，尝试从链接文本获取
          if (!title) {
            title = link.textContent.trim();
          }

          // 方法3：如果还是为空，去掉前缀后使用
          if (!title) {
            title = cellText.replace(/^財務報表\/環境、社會及管治資料-\s*/, '').trim();
            // 去掉文件大小
            title = title.replace(/\s*\([^)]+\)\s*$/, '').trim();
          }
        } else {
          // 如果没有标题单元格，直接从链接获取
          title = link.textContent.trim();
        }

        if (!title) return;

        // 从标题中提取年份（优先使用标题中的年份，因为标题中的年份是报告对应的年份）
        // 注意：这个函数需要在浏览器环境中内联定义
        function extractYearFromTitleInBrowser(title) {
          if (!title) return null;

          // 尝试匹配4位数字年份（2000-2099）
          // 支持格式：2024年报、2024 年报、二零二四年报、2024年報、2024 年報等
          const yearPatterns = [
            /(\d{4})\s*年[報报]/,           // "2024年报" 或 "2024 年报" 或 "2024年報" 或 "2024 年報"
            /(\d{4})\s*年/,                 // "2024年"
            /(\d{4})/,                      // "2024"（单独的数字）
            /二零([一二三四五六七八九零]{1,2})年/,  // "二零二四年"（需要转换）
            /二([一二三四五六七八九零]{1,2})年/     // "二四年"（简化格式）
          ];

          for (const pattern of yearPatterns) {
            const match = title.match(pattern);
            if (match) {
              if (pattern === yearPatterns[3] || pattern === yearPatterns[4]) {
                // 处理中文数字年份（如"二零二四年"），只转换捕获的那部分（例如 "二四"）
                const chineseNumbers = {
                  '零': 0, '一': 1, '二': 2, '三': 3, '四': 4,
                  '五': 5, '六': 6, '七': 7, '八': 8, '九': 9
                };
                const captured = match[1] || '';
                let yearStr = '';
                for (const char of captured) {
                  if (chineseNumbers[char] !== undefined) {
                    yearStr += chineseNumbers[char];
                  }
                }
                if (yearStr.length === 2) {
                  // 假设是20xx年
                  const year = parseInt('20' + yearStr);
                  if (year >= 2000 && year <= 2099) {
                    return year;
                  }
                }
              } else {
                // 处理数字年份
                const year = parseInt(match[1]);
                if (year >= 2000 && year <= 2099) {
                  return year;
                }
              }
            }
          }

          return null;
        }

        const titleYear = extractYearFromTitleInBrowser(title);
        // 如果标题中没有年份，使用发布日期的年份作为备选
        const dateYear = parseInt(date.split('-')[0]);
        const reportYear = titleYear !== null ? titleYear : dateYear;

        // 年份过滤：只保留指定年份的报告（使用标题中的年份，如果没有则使用日期年份）
        if (reportYear !== year) {
          return;
        }

        // 过滤报告：完全参考content.js的逻辑
        // 由于用户选择了"財務報表/環境、社會及管治資料"类别，所有结果都应该是报告
        // 但需要排除摘要、更正等非正式报告
        const titleLower = title.toLowerCase();
        const fullText = titleCell ? titleCell.textContent.trim().toLowerCase() : titleLower;

        // 判断是否为财务报告（年报、中期、季度报告）
        // 注意：由于选择了"財務報表/環境、社會及管治資料"类别，标题前缀会包含"財務報表/環境、社會及管治資料"
        const hasFinancialKeywords = titleLower.includes('年报') || titleLower.includes('年報') || titleLower.includes('annual') ||
                                     titleLower.includes('中期') || titleLower.includes('interim') ||
                                     titleLower.includes('季度') || titleLower.includes('quarterly') ||
                                     titleLower.includes('业绩') || titleLower.includes('業績') || titleLower.includes('业绩报');

        const isFinancialReport = hasFinancialKeywords ||
                                  fullText.includes('財務報表') ||
                                  (fullText.includes('年報') || fullText.includes('中期') || fullText.includes('季度'));

        // 排除纯ESG报告（只包含"環境、社會及管治報告"，不包含年报/中期/季度等财务报告关键词）
        // 如果同时包含财务报告关键词（年报/中期/季度）和ESG关键词，则认为是财务报告，不是纯ESG报告
        const isPureESGReport = (titleLower.includes('環境、社會及管治') ||
                                 titleLower.includes('环境、社会及管治') ||
                                 titleLower.includes('esg')) &&
                                !hasFinancialKeywords &&
                                !titleLower.includes('年報') &&
                                !titleLower.includes('年报') &&
                                !titleLower.includes('中期') &&
                                !titleLower.includes('季度');

        // 排除摘要、更正等（完全参考content.js）
        const excludeWords = ['摘要', 'Summary', '更正', 'Amendment', '补充', 'Supplement', '修订', 'Revised', '修訂'];
        const hasExclude = excludeWords.some(word => title.includes(word) || (titleCell && titleCell.textContent.includes(word)));

        // 只添加财务报告，排除纯ESG报告（完全参考content.js，不进行额外的类型检查）
        if (!isFinancialReport || isPureESGReport || hasExclude) {
          let skipReason = '';
          if (isPureESGReport) {
            skipReason = '纯ESG报告（不下载）';
          } else if (hasExclude) {
            skipReason = '排除关键词';
          } else if (!isFinancialReport) {
            skipReason = '非财务报告';
          }
          debugInfo.push(`  行${rowIdx}: 跳过 - ${title} (${skipReason})`);
          return;
        }

        // 构建完整URL（完全参考content.js）
        let docUrl = link.getAttribute('href');
        if (!docUrl.startsWith('http')) {
          if (docUrl.startsWith('/')) {
            docUrl = 'https://www.hkexnews.hk' + docUrl;
          } else {
            docUrl = 'https://www.hkexnews.hk/' + docUrl;
          }
        }

        debugInfo.push(`  行${rowIdx}: ✓ 添加财务报告 - ${date} - ${title}`);
        results.push({
          title: title,
          url: docUrl,
          date: date,
          year: reportYear  // 保存从标题提取的年份
        });
      });

      return { results, debugInfo };
    }, { year, typeConfig });

    // 输出调试信息
    if (reports.debugInfo && reports.debugInfo.length > 0) {
      console.log(`      🔍 提取调试信息:`);
      reports.debugInfo.forEach(info => console.log(`         ${info}`));
    }

    // 使用results
    const reportsList = reports.results || [];

    // 按日期排序
    reportsList.sort((a, b) => b.date.localeCompare(a.date));

    console.log(`      🔍 找到 ${reportsList.length} 个结果`);

    if (reportsList.length > 0) {
      // 调试：显示找到的报告
      if (process.env.DEBUG_HK) {
        console.log(`      🔍 调试：找到的报告:`);
        reportsList.forEach((r, i) => {
          console.log(`         ${i + 1}. ${r.title} (${r.date})`);
        });
      }

      return { reports: reportsList, type: reportType, typeConfig, multiple: reportsList.length > 1 };
    }

    return null;
  } catch (error) {
    console.error(`      ❌ Playwright搜索失败: ${error.message}`);
    throw error;
  } finally {
    // 如果外部没有传入session，则由本函数负责关闭（兼容旧用法）
    if (!session) {
      await browser.close();
    }
  }
}

/**
 * 下载文件
 */
async function downloadFile(url, filePath) {
  return new Promise((resolve, reject) => {
    const https = require('https');
    const http = require('http');
    const protocol = url.startsWith('https') ? https : http;

    const file = fs.createWriteStream(filePath);

    protocol.get(url, {
      headers: CONFIG.HEADERS
    }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // 处理重定向
        file.close();
        fs.unlinkSync(filePath);
        return downloadFile(response.headers.location, filePath).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(filePath);
        return reject(new Error(`下载失败: HTTP ${response.statusCode}`));
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      reject(err);
    });
  });
}

/**
 * 下载报告
 */
async function downloadReport(params, year, reportType, session = null) {
  const typeConfig = CONFIG.REPORT_TYPES[reportType];
  if (!typeConfig) {
    console.log(`   ❌ 未知的报告类型: ${reportType}`);
    return { year, type: reportType, success: false, reason: '未知的报告类型' };
  }

  console.log(`   📄 查找${typeConfig.name}...`);

  try {
    const searchResult = await searchHKReportWithPlaywright(params.code, year, reportType, params.lang, session);

    if (!searchResult || !searchResult.reports || searchResult.reports.length === 0) {
      console.log(`      ⚠ 未找到`);
      return { year, type: reportType, success: false, reason: '未找到' };
    }

    // 下载所有匹配的报告（不再只下载第一个）
    const reports = searchResult.reports;
    console.log(`      ✅ 找到 ${reports.length} 份报告`);

    // 创建输出目录
    const outputDir = params.outputDir || path.join(__dirname, '../../stock/hk_reports', params.name);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const downloadResults = [];
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < reports.length; i++) {
      const report = reports[i];
      console.log(`\n      📄 [${i + 1}/${reports.length}] ${report.title}`);
      console.log(`         日期: ${report.date}`);
      console.log(`         URL: ${report.url}`);

      // 生成文件名：公司名_年份报告类型.pdf（简体中文）
      // 优先使用标题中的年份（report.year），如果没有则使用日期年份
      const reportYear = report.year || report.date.split('-')[0];
      const reportType = extractReportType(report.title);

      // 格式：腾讯控股_2024中期报告.pdf
      const fileName = `${params.name}_${reportYear}${reportType}.pdf`;
      const filePath = path.join(outputDir, fileName);

      // 检查文件是否已存在
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log(`         ⏭️  文件已存在 (${(stats.size / 1024).toFixed(1)} KB)`);
        downloadResults.push({ success: true, path: filePath, skipped: true });
        successCount++;
        continue;
      }

      // 下载文件
      console.log(`         ⬇️  下载中...`);
      try {
        await downloadFile(report.url, filePath);

        // 检查文件大小
        const stats = fs.statSync(filePath);
        if (stats.size < 1024) {
          fs.unlinkSync(filePath);
          console.log(`         ❌ 下载失败: 文件过小 (${stats.size} bytes)`);
          downloadResults.push({ success: false, reason: '文件过小' });
          failCount++;
        } else {
          console.log(`         ✅ 下载完成 (${(stats.size / 1024).toFixed(1)} KB)`);
          downloadResults.push({ success: true, path: filePath });
          successCount++;
        }
      } catch (error) {
        console.log(`         ❌ 下载失败: ${error.message}`);
        downloadResults.push({ success: false, reason: error.message });
        failCount++;
      }

      // 延迟，避免请求过快
      if (i < reports.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`\n      📊 完成: ${successCount}/${reports.length} 份成功`);
    return {
      year,
      type: reportType,
      success: successCount > 0,
      multiple: true,
      total: reports.length,
      successCount,
      failCount,
      results: downloadResults
    };

  } catch (error) {
    console.log(`      ❌ 错误: ${error.message}`);
    return { year, type: reportType, success: false, reason: error.message };
  }
}

/**
 * 主函数
 */
async function main() {
  const params = parseArgs();

  if (!params.code || !params.name) {
    console.error('❌ 请提供股票代码和公司名称');
    console.error('   示例: node download_hk_reports_playwright.js --code 00700 --name 腾讯控股 --years 2023 --type annual');
    process.exit(1);
  }

  if (params.years.length === 0) {
    console.error('❌ 请提供年份');
    console.error('   使用 --years 2023 或 --start 2021 --end 2023');
    process.exit(1);
  }

  console.log('\n============================================================');
  console.log('📥 港股业绩报下载工具 - Playwright版本');
  console.log('🔗 支持: 年报 / 中期报告 / 季度报告');
  console.log('============================================================\n');

  console.log('✅ 已启用Playwright支持（支持JavaScript动态加载）\n');

  console.log('📋 下载配置:');
  console.log(`   公司: ${params.name} (${params.code})`);
  console.log(`   年份: ${params.years.join(', ')}`);
  console.log(`   类型: ${params.reportTypes.map(t => CONFIG.REPORT_TYPES[t]?.name || t).join(', ')}`);
  console.log(`   语言: ${params.lang === 'ZH' ? '中文' : '英文'}`);
  console.log(`   目录: ${params.outputDir || path.join(__dirname, '../../stock/hk_reports', params.name)}\n`);

  const results = [];

  // 多年份/多类型：复用同一个浏览器会话，避免反复打开/关闭
  const session = await createPlaywrightSession(params.lang);
  try {
    for (const year of params.years) {
      console.log(`\n============================================================`);
      console.log(`📊 ${params.name} ${year} 年`);
      console.log(`============================================================\n`);

      for (const reportType of params.reportTypes) {
        const result = await downloadReport(params, year, reportType, session);
        results.push(result);

        // 添加延迟，避免请求过快
        if (reportType !== params.reportTypes[params.reportTypes.length - 1] || year !== params.years[params.years.length - 1]) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
  } finally {
    await session.browser.close();
  }

  // 输出总结
  console.log(`\n============================================================`);
  console.log(`📊 下载总结`);
  console.log(`============================================================`);

  // 处理多个报告的情况
  let totalReports = 0;
  let totalSuccess = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  results.forEach(r => {
    if (r.multiple && r.total) {
      // 多个报告的情况
      totalReports += r.total;
      totalSuccess += r.successCount || 0;
      totalFailed += r.failCount || 0;
      // 统计跳过的（已存在的）
      if (r.results) {
        const skipped = r.results.filter(res => res.skipped).length;
        totalSkipped += skipped;
      }
    } else {
      // 单个报告的情况
      totalReports += 1;
      if (r.success) {
        totalSuccess += 1;
        if (r.skipped) {
          totalSkipped += 1;
        }
      } else {
        totalFailed += 1;
      }
    }
  });

  console.log(`✅ 成功: ${totalSuccess} 份 (其中 ${totalSkipped} 份已存在)`);
  console.log(`❌ 失败: ${totalFailed} 份`);
  console.log(`📊 总计: ${totalReports} 份\n`);

  // 按类型统计
  const typeStats = {};
  params.reportTypes.forEach(type => {
    const typeResults = results.filter(r => r.type === type);
    let typeSuccess = 0;
    let typeFailed = 0;
    let typeTotal = 0;

    typeResults.forEach(r => {
      if (r.multiple && r.total) {
        typeTotal += r.total;
        typeSuccess += r.successCount || 0;
        typeFailed += r.failCount || 0;
      } else {
        typeTotal += 1;
        if (r.success) {
          typeSuccess += 1;
        } else {
          typeFailed += 1;
        }
      }
    });

    typeStats[type] = { success: typeSuccess, failed: typeFailed, total: typeTotal };
  });

  console.log('按类型统计:');
  Object.keys(typeStats).forEach(type => {
    const stats = typeStats[type];
    const typeName = CONFIG.REPORT_TYPES[type]?.name || type;
    console.log(`   ${typeName}: ${stats.success}✓ / ${stats.failed}✗ (共 ${stats.total} 份)`);
  });

  if (totalFailed > 0) {
    console.log('\n未找到或失败的报告:');
    results.filter(r => !r.success && !r.multiple).forEach(r => {
      const typeName = CONFIG.REPORT_TYPES[r.type]?.name || r.type;
      console.log(`   - ${r.year}年 ${typeName}: ${r.reason || '未知错误'}`);
    });
    // 处理多个报告中有失败的情况
    results.filter(r => r.multiple && r.failCount > 0).forEach(r => {
      const typeName = CONFIG.REPORT_TYPES[r.type]?.name || r.type;
      console.log(`   - ${r.year}年 ${typeName}: ${r.failCount} 份失败`);
    });
  }

  console.log(`\n============================================================\n`);
}

// 运行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 程序执行失败:', error);
    process.exit(1);
  });
}

module.exports = { createPlaywrightSession, searchHKReportWithPlaywright, downloadReport };

