/**
 * 港股业绩报下载工具 - Playwright版本
 * 支持：年报、中期报告、季度报告
 * 数据源：港交所披露易（www.hkexnews.hk）
 * 
 * 使用方法：
 * # 下载年报
 * node download_hk_reports_playwright.js --code 00700 --name 腾讯控股 --years 2023 --type annual
 * 
 * # 下载多年数据
 * node download_hk_reports_playwright.js --code 00700 --name 腾讯控股 --start 2021 --end 2023 --type annual
 */

const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

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
async function searchHKReportWithPlaywright(stockCode, year, reportType, lang = 'ZH') {
  if (!playwright) {
    throw new Error('Playwright未安装');
  }

  const typeConfig = CONFIG.REPORT_TYPES[reportType];
  if (!typeConfig) {
    throw new Error(`未知的报告类型: ${reportType}`);
  }

  // 港股代码处理：保持原始格式（00700），但确保是字符串
  const stockId = stockCode.toString().padStart(5, '0'); // 保持5位，前导零
  
  // 始终使用非headless模式，方便用户手动操作
  const browser = await playwright.chromium.launch({
    headless: false, // 始终显示浏览器窗口
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    slowMo: 300 // 减慢操作速度，方便观察
  });
  
  try {
    const context = await browser.newContext({
      userAgent: CONFIG.HEADERS['User-Agent'],
      locale: lang.toLowerCase() === 'zh' ? 'zh-CN' : 'en-US'
    });
    
    const page = await context.newPage();
    
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
    
    // 填写股票代码
    console.log(`      🔍 填写搜索表单...`);
    const stockInput = page.locator('#searchStockCode');
    await stockInput.click({ clickCount: 3 });
    await stockInput.fill(stockId);
    console.log(`      ✓ 已输入股票代码: ${stockId}`);
    
    // 等待自动完成建议出现，然后点击第一个建议
    console.log(`      ⏳ 等待自动完成建议...`);
    try {
      await page.waitForSelector('#autocomplete-list-0 tr.autocomplete-suggestion', { timeout: 5000 });
      console.log(`      ✓ 自动完成建议已出现`);
      
      // 查找包含目标股票代码的建议（确保选中正确的）
      const suggestionText = await page.evaluate((stockId) => {
        const suggestions = Array.from(document.querySelectorAll('#autocomplete-list-0 tr.autocomplete-suggestion'));
        for (const suggestion of suggestions) {
          const text = suggestion.textContent || '';
          // 查找包含股票代码的建议（如"00700"）
          if (text.includes(stockId)) {
            return text.substring(0, 100);
          }
        }
        return null;
      }, stockId);
      
      if (suggestionText) {
        console.log(`      🔍 找到匹配的建议: ${suggestionText}`);
      }
      
      // 点击第一个建议（通常是匹配的股票，如"00700 TENCENT"）
      // 使用更可靠的方式：先hover，再click
      const firstSuggestion = page.locator('#autocomplete-list-0 tr.autocomplete-suggestion').first();
      await firstSuggestion.hover();
      await page.waitForTimeout(300);
      await firstSuggestion.click({ force: true }); // 使用force确保点击
      console.log(`      ✓ 已点击自动完成建议`);
      
      // 等待自动完成建议设置字段（可能需要更长时间）
      await page.waitForTimeout(2000);
      
      // 验证stockId是否已正确设置
      const stockIdAfterSelect = await page.evaluate(() => {
        return document.querySelector('#stockId')?.value;
      });
      console.log(`      🔍 选择后stockId值: ${stockIdAfterSelect}`);
      
      // 验证输入框是否已更新
      const inputValue = await page.evaluate(() => {
        return document.querySelector('#searchStockCode')?.value || '';
      });
      console.log(`      🔍 选择后输入框值: ${inputValue}`);
      
      // 验证stockId是否已正确设置（让自动完成建议自动处理，不手动设置）
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
          console.log(`      ⚠️  等待后stockId仍未设置，但继续执行（让自动完成建议处理）`);
        }
      } else {
        console.log(`      ✓ stockId已正确设置: ${stockIdAfterSelect}`);
      }
    } catch (e) {
      console.log(`      ⚠️  自动完成建议未出现或超时: ${e.message}`);
      // 如果自动完成建议未出现，等待一下让页面处理
      await page.waitForTimeout(1000);
    }
    
    console.log(`      ✓ 已设置股票代码`);
    
    // 填写日期范围（只设置可见的日期输入框，不手动设置隐藏字段）
    const fromDateFormatted = `${year}/01/01`;
    const toDateFormatted = `${year + 1}/12/31`;
    
    console.log(`      🔍 填写日期范围...`);
    // 只设置可见的日期输入框，让表单自动处理隐藏字段
    await page.evaluate(({ fromDate, toDate }) => {
      const fromInput = document.querySelector('#searchDate-From');
      const toInput = document.querySelector('#searchDate-To');
      
      if (fromInput) {
        fromInput.value = fromDate;
        fromInput.dispatchEvent(new Event('input', { bubbles: true }));
        fromInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      
      if (toInput) {
        toInput.value = toDate;
        toInput.dispatchEvent(new Event('input', { bubbles: true }));
        toInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, { 
      fromDate: fromDateFormatted, 
      toDate: toDateFormatted
    });
    
    console.log(`      ✓ 已输入开始日期: ${fromDateFormatted}`);
    console.log(`      ✓ 已输入结束日期: ${toDateFormatted}`);
    
    // 选择标题类别（標題類別）- 先选择"標題類別"，然后选择"公告及通告"
    console.log(`      🔍 选择标题类别（標題類別 -> 公告及通告）...`);
    try {
      // 首先需要选择搜索类型为"標題類別"（而不是"所有"或"文件類別"）
      // 查找搜索类型下拉菜单（id="selectedCategory"）
      const searchTypeDropdown = page.locator('#selectedCategory .combobox-field').first();
      if (await searchTypeDropdown.isVisible({ timeout: 3000 }).catch(() => false)) {
        await searchTypeDropdown.click();
        await page.waitForTimeout(500);
        
        // 在下拉菜单中选择"標題類別"（data-value="rbAfter2006"）
        const titleCategoryOption = page.locator('.droplist-item[data-value="rbAfter2006"]').first();
        if (await titleCategoryOption.isVisible({ timeout: 2000 }).catch(() => false)) {
          await titleCategoryOption.click();
          console.log(`      ✓ 已选择搜索类型为"標題類別"`);
          await page.waitForTimeout(1000); // 等待下拉菜单更新
        } else {
          // 尝试通过文本查找
          const titleCategoryByText = page.locator('text=標題類別').first();
          if (await titleCategoryByText.isVisible({ timeout: 2000 }).catch(() => false)) {
            await titleCategoryByText.click();
            console.log(`      ✓ 已通过文本选择"標題類別"`);
            await page.waitForTimeout(1000);
          }
        }
      }
      
      // 现在选择具体的标题类别"公告及通告"
      // 查找标题类别下拉菜单（应该在id="rbAfter2006"的容器中）
      await page.waitForTimeout(500);
      const titleCategoryDropdown = page.locator('#rbAfter2006 .combobox-field, .tier1-wrap .combobox-field').first();
      if (await titleCategoryDropdown.isVisible({ timeout: 3000 }).catch(() => false)) {
        await titleCategoryDropdown.click();
        await page.waitForTimeout(500);
        
        // 在下拉菜单中选择"公告及通告"
        const announcementOption = page.locator('.droplist-item:has-text("公告及通告"), .droplist-item:has-text("公告")').first();
        if (await announcementOption.isVisible({ timeout: 2000 }).catch(() => false)) {
          await announcementOption.click();
          console.log(`      ✓ 已选择"公告及通告"`);
          await page.waitForTimeout(500);
        } else {
          // 尝试通过JavaScript查找并点击
          const clicked = await page.evaluate(() => {
            // 查找所有下拉选项
            const items = Array.from(document.querySelectorAll('.droplist-item, li, div[data-value]'));
            const announcementItem = items.find(item => {
              const text = item.textContent || '';
              return text.includes('公告及通告') || text.includes('公告');
            });
            if (announcementItem) {
              announcementItem.click();
              return true;
            }
            return false;
          });
          if (clicked) {
            console.log(`      ✓ 已通过JavaScript选择"公告及通告"`);
            await page.waitForTimeout(500);
          } else {
            console.log(`      ⚠️  未找到"公告及通告"选项`);
          }
        }
      } else {
        console.log(`      ⚠️  未找到标题类别下拉菜单`);
      }
    } catch (e) {
      console.log(`      ⚠️  选择标题类别失败: ${e.message}`);
    }
    
    // 等待一下让表单更新
    await page.waitForTimeout(1000);
    
    // 提交搜索表单 - 直接提交JSF表单（服务端渲染）
    console.log(`      🔍 提交搜索表单（JSF服务端渲染）...`);
    
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
    
    // 等待页面JavaScript完全加载（按钮可能通过JS事件委托）
    console.log(`      ⏳ 等待页面JavaScript加载...`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000); // 等待JS执行
    
    // 检查是否有JavaScript错误
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`      ⚠️  页面JS错误: ${msg.text()}`);
      }
    });
    
    // 等待一下让点击生效
    await page.waitForTimeout(500);
    
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
        // 提取日期 - 检查多个可能的列位置
        const cells = row.querySelectorAll('td');
        if (cells.length < 2) return;
        
        // 通常日期在第一列，标题/链接在后面的列
        const dateCell = cells[0];
        const dateText = dateCell.textContent.trim();
        
        // 匹配多种日期格式：yyyy/mm/dd, yyyy-mm-dd, dd/mm/yyyy
        const dateMatch = dateText.match(/(\d{4})[\/\-](\d{2})[\/\-](\d{2})/) || 
                         dateText.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
        if (!dateMatch) {
          // 如果没有日期匹配，跳过（可能是表头或其他内容）
          return;
        }
        
        let date, reportYear;
        if (dateMatch[1].length === 4) {
          // yyyy/mm/dd 格式
          date = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
          reportYear = parseInt(dateMatch[1]);
        } else {
          // dd/mm/yyyy 格式
          date = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
          reportYear = parseInt(dateMatch[3]);
        }
        
        // 检查年份
        if (reportYear < year || reportYear > year + 1) return;
        
        // 提取文档链接和标题 - 通常在后面的列中
        let link = null;
        let docTitle = '';
        
        // 尝试从不同列中查找链接
        for (let i = 1; i < cells.length; i++) {
          const cellLink = cells[i].querySelector('a[href*=".pdf"], a[href*="document"], a[href*="file"], a');
          if (cellLink) {
            link = cellLink;
            docTitle = cellLink.textContent.trim() || cells[i].textContent.trim();
            break;
          }
        }
        
        // 如果还没找到，尝试在整个行中查找
        if (!link) {
          link = row.querySelector('a[href*=".pdf"], a[href*="document"], a[href*="file"], a');
          if (link) {
            docTitle = link.textContent.trim();
          }
        }
        
        if (!link || !docTitle) return;
        
        let docUrl = link.getAttribute('href');
        
        // docTitle已经在上面设置了，这里不需要重新声明
        
        // 检查标题是否匹配报告类型
        const titleLower = docTitle.toLowerCase();
        const hasKeyword = typeConfig.keywords.some(kw => 
          titleLower.includes(kw.toLowerCase()) || docTitle.includes(kw)
        );
        
        if (!hasKeyword) return;
        
        // 排除不需要的文档
        const excludeWords = ['摘要', 'Summary', '更正', 'Amendment', '补充', 'Supplement', '修订', 'Revised', 'Erratum', '澄清', 'Clarification'];
        const hasExclude = excludeWords.some(word => docTitle.includes(word));
        if (hasExclude) return;
        
        // 构建完整URL
        if (!docUrl.startsWith('http')) {
          if (docUrl.startsWith('/')) {
            docUrl = 'https://www.hkexnews.hk' + docUrl;
          } else {
            docUrl = 'https://www.hkexnews.hk/' + docUrl;
          }
        }
        
        results.push({
          title: docTitle,
          url: docUrl,
          date: date,
          year: reportYear
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
    await browser.close();
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
async function downloadReport(params, year, reportType) {
  const typeConfig = CONFIG.REPORT_TYPES[reportType];
  if (!typeConfig) {
    console.log(`   ❌ 未知的报告类型: ${reportType}`);
    return { year, type: reportType, success: false, reason: '未知的报告类型' };
  }
  
  console.log(`   📄 查找${typeConfig.name}...`);
  
  try {
    const searchResult = await searchHKReportWithPlaywright(params.code, year, reportType, params.lang);
    
    if (!searchResult || !searchResult.reports || searchResult.reports.length === 0) {
      console.log(`      ⚠ 未找到`);
      return { year, type: reportType, success: false, reason: '未找到' };
    }
    
    // 选择最新的报告（如果有多个）
    const report = searchResult.reports[0];
    
    console.log(`      ✅ 找到: ${report.title}`);
    console.log(`         日期: ${report.date}`);
    console.log(`         URL: ${report.url}`);
    
    // 创建输出目录
    const outputDir = params.outputDir || path.join(__dirname, '../../stock/hk_reports', params.name);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // 生成文件名
    const safeTitle = report.title.replace(/[<>:"/\\|?*]/g, '_').substring(0, 50);
    const fileName = `${params.name}_${year}_${safeTitle}.pdf`;
    const filePath = path.join(outputDir, fileName);
    
    // 检查文件是否已存在
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      console.log(`      ⏭️  文件已存在 (${(stats.size / 1024).toFixed(1)} KB)`);
      return { year, type: reportType, success: true, path: filePath, skipped: true };
    }
    
    // 下载文件
    console.log(`      ⬇️  下载中...`);
    await downloadFile(report.url, filePath);
    
    // 检查文件大小
    const stats = fs.statSync(filePath);
    if (stats.size < 1024) {
      fs.unlinkSync(filePath);
      console.log(`      ❌ 下载失败: 文件过小 (${stats.size} bytes)`);
      return { year, type: reportType, success: false, reason: '文件过小' };
    }
    
    console.log(`      ✅ 下载完成 (${(stats.size / 1024).toFixed(1)} KB)`);
    return { year, type: reportType, success: true, path: filePath };
    
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
  
  for (const year of params.years) {
    console.log(`\n============================================================`);
    console.log(`📊 ${params.name} ${year} 年`);
    console.log(`============================================================\n`);
    
    for (const reportType of params.reportTypes) {
      const result = await downloadReport(params, year, reportType);
      results.push(result);
      
      // 添加延迟，避免请求过快
      if (reportType !== params.reportTypes[params.reportTypes.length - 1] || year !== params.years[params.years.length - 1]) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  
  // 输出总结
  console.log(`\n============================================================`);
  console.log(`📊 下载总结`);
  console.log(`============================================================`);
  
  const successCount = results.filter(r => r.success).length;
  const skippedCount = results.filter(r => r.success && r.skipped).length;
  const failedCount = results.filter(r => !r.success).length;
  
  console.log(`✅ 成功: ${successCount} 份 (其中 ${skippedCount} 份已存在)`);
  console.log(`❌ 失败: ${failedCount} 份\n`);
  
  // 按类型统计
  const typeStats = {};
  params.reportTypes.forEach(type => {
    const typeResults = results.filter(r => r.type === type);
    const typeSuccess = typeResults.filter(r => r.success).length;
    const typeFailed = typeResults.filter(r => !r.success).length;
    typeStats[type] = { success: typeSuccess, failed: typeFailed };
  });
  
  console.log('按类型统计:');
  Object.keys(typeStats).forEach(type => {
    const stats = typeStats[type];
    const typeName = CONFIG.REPORT_TYPES[type]?.name || type;
    console.log(`   ${typeName}: ${stats.success}✓ / ${stats.failed}✗`);
  });
  
  if (failedCount > 0) {
    console.log('\n未找到的报告:');
    results.filter(r => !r.success).forEach(r => {
      const typeName = CONFIG.REPORT_TYPES[r.type]?.name || r.type;
      console.log(`   - ${r.year}年 ${typeName}: ${r.reason || '未知错误'}`);
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

module.exports = { searchHKReportWithPlaywright, downloadReport };

