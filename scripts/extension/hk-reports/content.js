(function () {
  'use strict';

  // 检查是否在搜索页面
  function isSearchPage() {
    return window.location.href.includes('titlesearch.xhtml');
  }

  // 创建控制面板
  function createControlPanel() {
    if (document.getElementById('hk-reports-panel')) {
      return; // 已存在
    }

    const panel = document.createElement('div');
    panel.id = 'hk-reports-panel';
    panel.className = 'hk-reports-panel';
    panel.innerHTML = `
      <div class="hk-panel-header">
        <span>港股业绩报下载</span>
        <button type="button" id="hk-panel-close" class="hk-close-btn">×</button>
      </div>
      <div class="hk-panel-body">
        <div class="hk-form-row">
          <label>股票代码：</label>
          <input type="text" id="hk-stock-code" placeholder="例如：00700" style="width: 120px;" />
        </div>
        <div class="hk-form-row">
          <label>开始日期：</label>
          <input type="date" id="hk-start-date" style="width: 140px;" />
        </div>
        <div class="hk-form-row">
          <label>结束日期：</label>
          <input type="date" id="hk-end-date" style="width: 140px;" />
        </div>
        <div class="hk-form-row">
          <button type="button" id="hk-fill-btn" class="hk-btn-search">填入搜索条件</button>
          <button type="button" id="hk-search-btn" class="hk-btn-search" style="display:none;">开始搜索</button>
          <button type="button" id="hk-download-btn" class="hk-btn-start" style="display:none;">下载</button>
          <button type="button" id="hk-stop-btn" class="hk-btn" style="display:none;">停止</button>
        </div>
        <div class="hk-status" id="hk-status">等待开始...</div>
        <div class="hk-progress" id="hk-progress" style="display:none;">
          <div class="hk-progress-bar" id="hk-progress-bar"></div>
        </div>
        <div class="hk-log" id="hk-log"></div>
      </div>
    `;

    document.body.appendChild(panel);

    // 添加拖拽功能
    let isDragging = false;
    let currentX = 0;
    let currentY = 0;
    let initialX = 0;
    let initialY = 0;

    const header = panel.querySelector('.hk-panel-header');

    header.addEventListener('mousedown', function(e) {
      // 如果点击的是关闭按钮，不触发拖拽
      if (e.target.id === 'hk-panel-close' || e.target.closest('#hk-panel-close')) {
        return;
      }

      isDragging = true;
      initialX = e.clientX - currentX;
      initialY = e.clientY - currentY;
      header.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', function(e) {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;

        // 限制拖拽范围，确保面板不会拖出屏幕
        const panelRect = panel.getBoundingClientRect();
        const maxX = window.innerWidth - panelRect.width;
        const maxY = window.innerHeight - panelRect.height;

        currentX = Math.max(0, Math.min(currentX, maxX));
        currentY = Math.max(0, Math.min(currentY, maxY));

        panel.style.left = currentX + 'px';
        panel.style.top = currentY + 'px';
        panel.style.right = 'auto';
      }
    });

    document.addEventListener('mouseup', function() {
      if (isDragging) {
        isDragging = false;
        header.style.cursor = 'grab';
      }
    });

    // 关闭按钮
    document.getElementById('hk-panel-close').addEventListener('click', function () {
      panel.style.display = 'none';
    });

    // 初始化日期（默认最近3年）
    const today = new Date();
    const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startDate = new Date(today.getFullYear() - 3, 0, 1);

    document.getElementById('hk-start-date').valueAsDate = startDate;
    document.getElementById('hk-end-date').valueAsDate = endDate;

    // 填入搜索条件按钮（只填写表单，不搜索）
    document.getElementById('hk-fill-btn').addEventListener('click', function () {
      const code = document.getElementById('hk-stock-code').value.trim();
      if (!code) {
        updateStatus('请输入股票代码', 'error');
        return;
      }

      const startDateInput = document.getElementById('hk-start-date').value;
      const endDateInput = document.getElementById('hk-end-date').value;

      if (!startDateInput || !endDateInput) {
        updateStatus('请选择日期范围', 'error');
        return;
      }

      if (new Date(startDateInput) > new Date(endDateInput)) {
        updateStatus('开始日期不能晚于结束日期', 'error');
        return;
      }

      // 保存股票代码和日期到localStorage，以便页面刷新后使用
      localStorage.setItem('hk-reports-stock-code', code);
      localStorage.setItem('hk-reports-start-date', startDateInput);
      localStorage.setItem('hk-reports-end-date', endDateInput);

      fillSearchConditions(code, startDateInput, endDateInput);
    });

    // 开始搜索按钮（点击搜索）
    document.getElementById('hk-search-btn').addEventListener('click', function () {
      clickSearchButton();
    });

    // 开始下载按钮
    document.getElementById('hk-download-btn').addEventListener('click', function () {
      const code = localStorage.getItem('hk-reports-stock-code') ||
                   document.getElementById('hk-stock-code').value.trim();
      if (!code) {
        updateStatus('未找到股票代码，请先搜索', 'error');
        return;
      }
      startDownload(code);
    });

    // 停止按钮
    document.getElementById('hk-stop-btn').addEventListener('click', function () {
      stopDownload();
    });

    // 检查页面是否有搜索结果，如果有则显示下载按钮
    checkSearchResults();
  }

  let isRunning = false;
  let stopFlag = false;

  // 更新状态
  function updateStatus(message, type = 'info') {
    const statusEl = document.getElementById('hk-status');
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.className = 'hk-status hk-status-' + type;
    }
    addLog(message, type);
  }

  // 添加日志（同时输出到console和UI）
  function addLog(message, type = 'info') {
    // 输出到console
    const time = new Date().toLocaleTimeString();
    const logMessage = `[${time}] [${type.toUpperCase()}] ${message}`;

    switch (type) {
      case 'error':
        console.error(logMessage);
        break;
      case 'warning':
        console.log(logMessage);
        break;
      case 'success':
        console.log('%c' + logMessage, 'color: green');
        break;
      default:
        console.log(logMessage);
    }

    // 输出到UI
    const logEl = document.getElementById('hk-log');
    if (logEl) {
      const logItem = document.createElement('div');
      logItem.className = 'hk-log-item hk-log-' + type;
      logItem.textContent = `[${time}] ${message}`;
      logEl.appendChild(logItem);
      logEl.scrollTop = logEl.scrollHeight;
    }
  }

  // 更新进度
  function updateProgress(current, total) {
    const progressEl = document.getElementById('hk-progress');
    const progressBarEl = document.getElementById('hk-progress-bar');
    if (progressEl && progressBarEl) {
      progressEl.style.display = 'block';
      const percent = total > 0 ? (current / total * 100) : 0;
      progressBarEl.style.width = percent + '%';
      progressBarEl.textContent = `${current}/${total}`;
    }
  }

  // 格式化日期为 dd/mm/yyyy（港交所网站使用的格式）
  function formatDate(dateStr) {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${day}/${month}/${year}`;
  }

  // 等待元素出现
  function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const check = () => {
        if (stopFlag) {
          reject(new Error('已停止'));
          return;
        }
        const element = document.querySelector(selector);
        if (element) {
          resolve(element);
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(`等待元素超时: ${selector}`));
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }

  // 等待一段时间
  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 填写股票代码
  async function fillStockCode(code) {
    try {
      updateStatus('填写股票代码...');
      console.log('开始填写股票代码:', code);

      const stockInput = await waitForElement('#searchStockCode');
      console.log('找到股票代码输入框:', stockInput);

      // 清空并输入代码
      stockInput.value = '';
      stockInput.focus();
      await delay(300);

      // 逐字符输入（模拟真实输入）
      for (const char of code) {
        stockInput.value += char;
        stockInput.dispatchEvent(new Event('input', { bubbles: true }));
        await delay(100);
      }
      console.log('已输入股票代码:', stockInput.value);

      stockInput.dispatchEvent(new Event('change', { bubbles: true }));
      await delay(1000); // 等待自动完成建议出现

      // 等待并选择自动完成建议
      try {
        const suggestion = await waitForElement('#autocomplete-list-0 tr.autocomplete-suggestion', 5000);
        if (suggestion) {
          console.log('找到自动完成建议');
          // 查找包含股票代码的建议
          const suggestions = document.querySelectorAll('#autocomplete-list-0 tr.autocomplete-suggestion');
          console.log(`找到 ${suggestions.length} 个建议`);

          let targetSuggestion = null;

          for (const sug of suggestions) {
            const text = sug.textContent || '';
            console.log('建议文本:', text);
            if (text.includes(code)) {
              targetSuggestion = sug;
              console.log('找到匹配的建议:', text);
              break;
            }
          }

          if (targetSuggestion) {
            targetSuggestion.click();
            await delay(2000); // 等待自动完成设置stockId

            // 验证是否设置成功
            const stockId = document.querySelector('#stockId')?.value;
            console.log('选择后stockId值:', stockId);
            updateStatus('已选择股票代码', 'success');
          } else {
            // 点击第一个建议
            console.log('未找到匹配建议，点击第一个建议');
            suggestion.click();
            await delay(2000);
            const stockId = document.querySelector('#stockId')?.value;
            console.log('选择后stockId值:', stockId);
            updateStatus('已选择股票代码（第一个建议）', 'success');
          }
        }
      } catch (e) {
        console.log('自动完成建议未出现:', e.message);
        updateStatus('自动完成建议未出现，继续执行...', 'warning');
      }

      return true;
    } catch (error) {
      console.error('填写股票代码失败:', error);
      updateStatus(`填写股票代码失败: ${error.message}`, 'error');
      throw error;
    }
  }

  // 使用日期选择器选择日期
  async function selectDate(input, dateStr) {
    // 解析日期字符串 DD/MM/YYYY
    const dateParts = dateStr.split('/');
    if (dateParts.length !== 3) {
      throw new Error('日期格式错误，应为 DD/MM/YYYY');
    }
    const day = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]) - 1; // 月份是0-11，需要减1
    const year = parseInt(dateParts[2]);

    console.log('准备选择日期:', { day, month: month + 1, year, dateStr });

    // 记录原始值
    const originalValue = input.value || input.getAttribute('value') || '';
    console.log('输入框原始值:', originalValue);

    // 点击输入框打开日期选择器
    input.click();
    input.focus();
    await delay(500);

    // 触发 focus 事件，确保日期选择器初始化
    input.dispatchEvent(new Event('focus', { bubbles: true, cancelable: true }));
    await delay(500);

    // 等待日期选择器出现并完全初始化
    let calendar = null;
    let yearButtonsReady = false;
    let waitCount = 0;
    while ((!calendar || !yearButtonsReady) && waitCount < 40) {
      await delay(200);

      // 尝试多种选择器查找日期选择器
      if (!calendar) {
        calendar = document.querySelector('.columns, .calendar, [class*="calendar"], div.calendar');
        if (!calendar) {
          // 检查是否有年份按钮出现（说明日期选择器已打开）
          const testYearButton = document.querySelector('b.year, .year');
          if (testYearButton) {
            calendar = testYearButton.parentElement;
          }
        }
      }

      // 检查年份按钮是否已加载（说明日期选择器已初始化）
      if (calendar && !yearButtonsReady) {
        const testYearButtons = document.querySelectorAll('b.year button, .year button');
        if (testYearButtons.length > 0) {
          yearButtonsReady = true;
          console.log(`找到 ${testYearButtons.length} 个年份按钮，日期选择器已初始化`);
        }
      }

      waitCount++;
    }

    if (calendar && yearButtonsReady) {
      console.log('✓ 日期选择器已完全加载并初始化');
    } else if (calendar) {
      console.log('⚠ 找到日期选择器，但年份按钮可能未完全加载');
    } else {
      console.log('⚠ 未找到日期选择器，尝试直接查找按钮');
    }

    // 额外等待，确保日期选择器完全就绪
    await delay(500);

    // 步骤1：选择年份
    await delay(400);

    // 等待年份按钮完全加载
    let yearButtonsLoaded = false;
    let yearButtonWaitCount = 0;
    while (!yearButtonsLoaded && yearButtonWaitCount < 20) {
      await delay(200);
      const testButtons = document.querySelectorAll('b.year button, .year button');
      if (testButtons.length > 0) {
        yearButtonsLoaded = true;
        console.log(`年份按钮已加载，共 ${testButtons.length} 个`);
      }
      yearButtonWaitCount++;
    }

    const yearSelectors = [
      `b.year button[data-value="${year}"]`,
      `.year button[data-value="${year}"]`,
      `button[data-value="${year}"]`
    ];
    let yearButton = null;
    for (const selector of yearSelectors) {
      yearButton = document.querySelector(selector);
      if (yearButton && yearButton.closest('b.year, .year')) {
        break;
      }
    }

    if (yearButton) {
      const buttonYear = yearButton.getAttribute('data-value');
      const buttonText = yearButton.textContent.trim();
      console.log('找到年份按钮:', { expected: year, dataValue: buttonYear, text: buttonText });

      // 验证按钮的年份是否正确
      if (buttonYear && parseInt(buttonYear) !== year) {
        console.warn('警告：年份按钮的data-value不匹配！', { expected: year, actual: buttonYear });
      }

      // 检查按钮是否可见和可点击
      const buttonStyle = window.getComputedStyle(yearButton);
      const isVisible = buttonStyle.display !== 'none' &&
                       buttonStyle.visibility !== 'hidden' &&
                       yearButton.offsetParent !== null;

      if (!isVisible) {
        console.warn('警告：年份按钮不可见，可能未完全加载');
        await delay(500);
      }

      yearButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await delay(400);

      // 使用更安全的方式点击：先触发 mousedown 和 mouseup，再触发 click
      // 这样可以确保日期选择器的内部状态正确初始化
      try {
        console.log('准备点击年份按钮，触发鼠标事件...');
        yearButton.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
        await delay(100);
        yearButton.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
        await delay(100);
        yearButton.click();
        console.log('已点击年份按钮');
        await delay(1200); // 增加等待时间，让年份选择生效并初始化月份选择器
      } catch (error) {
        console.error('点击年份按钮时出错:', error);
        // 如果出错，尝试直接点击
        yearButton.click();
        await delay(1200);
      }

      // 验证年份是否已选择（检查按钮是否被选中或高亮）
      const selectedYearButton = document.querySelector(`b.year button[data-value="${year}"].selected, .year button[data-value="${year}"].selected, b.year button[data-value="${year}"][class*="selected"], .year button[data-value="${year}"][class*="selected"]`);
      if (selectedYearButton) {
        console.log('✓ 年份已选择（按钮已标记为选中）');
      }
    } else {
      console.log('未找到年份按钮:', year);
      // 输出所有年份按钮用于调试
      const allYearButtons = document.querySelectorAll('b.year button, .year button');
      console.log('所有年份按钮:', Array.from(allYearButtons).map(btn => ({
        dataValue: btn.getAttribute('data-value'),
        text: btn.textContent.trim()
      })));
    }

    // 步骤2：选择月份（注意月份是0-11）
    await delay(400);

    // 等待月份按钮完全加载（选择年份后，月份选择器需要时间初始化）
    let monthButtonsLoaded = false;
    let monthButtonWaitCount = 0;
    while (!monthButtonsLoaded && monthButtonWaitCount < 20) {
      await delay(200);
      const testButtons = document.querySelectorAll('b.month button, .month button');
      if (testButtons.length > 0) {
        monthButtonsLoaded = true;
        console.log(`月份按钮已加载，共 ${testButtons.length} 个`);
      }
      monthButtonWaitCount++;
    }

    const monthSelectors = [
      `b.month button[data-value="${month}"]`,
      `.month button[data-value="${month}"]`
    ];
    let monthButton = null;
    for (const selector of monthSelectors) {
      monthButton = document.querySelector(selector);
      if (monthButton && monthButton.closest('b.month, .month')) {
        break;
      }
    }

    if (monthButton) {
      const buttonMonth = monthButton.getAttribute('data-value');
      const buttonText = monthButton.textContent.trim();
      console.log('找到月份按钮:', { expected: month, expectedDisplay: month + 1, dataValue: buttonMonth, text: buttonText });

      // 验证按钮的月份是否正确
      if (buttonMonth && parseInt(buttonMonth) !== month) {
        console.warn('警告：月份按钮的data-value不匹配！', { expected: month, actual: buttonMonth });
      }

      // 检查按钮是否可见和可点击
      const buttonStyle = window.getComputedStyle(monthButton);
      const isVisible = buttonStyle.display !== 'none' &&
                       buttonStyle.visibility !== 'hidden' &&
                       monthButton.offsetParent !== null;

      if (!isVisible) {
        console.warn('警告：月份按钮不可见，可能未完全加载');
        await delay(500);
      }

      monthButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await delay(400);

      // 使用更安全的方式点击
      try {
        console.log('准备点击月份按钮，触发鼠标事件...');
        monthButton.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
        await delay(100);
        monthButton.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
        await delay(100);
        monthButton.click();
        console.log('已点击月份按钮');
        await delay(1200); // 增加等待时间，让月份选择生效并初始化日期选择器
      } catch (error) {
        console.error('点击月份按钮时出错:', error);
        monthButton.click();
        await delay(1200);
      }

      // 验证月份是否已选择
      const selectedMonthButton = document.querySelector(`b.month button[data-value="${month}"].selected, .month button[data-value="${month}"].selected, b.month button[data-value="${month}"][class*="selected"], .month button[data-value="${month}"][class*="selected"]`);
      if (selectedMonthButton) {
        console.log('✓ 月份已选择（按钮已标记为选中）');
      }
    } else {
      console.log('未找到月份按钮:', month + 1, '(data-value:', month, ')');
      // 输出所有月份按钮用于调试
      const allMonthButtons = document.querySelectorAll('b.month button, .month button');
      console.log('所有月份按钮:', Array.from(allMonthButtons).map(btn => ({
        value: btn.getAttribute('data-value'),
        text: btn.textContent
      })));
    }

    // 步骤3：选择日期
    await delay(400);

    // 等待日期按钮完全加载（选择月份后，日期选择器需要时间初始化）
    let dayButtonsLoaded = false;
    let dayButtonWaitCount = 0;
    while (!dayButtonsLoaded && dayButtonWaitCount < 20) {
      await delay(200);
      const testButtons = document.querySelectorAll('b.day button, .day button');
      if (testButtons.length > 0) {
        dayButtonsLoaded = true;
        console.log(`日期按钮已加载，共 ${testButtons.length} 个`);
      }
      dayButtonWaitCount++;
    }

    const daySelectors = [
      `b.day button[data-value="${day}"]`,
      `.day button[data-value="${day}"]`
    ];
    let dayButton = null;
    for (const selector of daySelectors) {
      dayButton = document.querySelector(selector);
      if (dayButton && dayButton.closest('b.day, .day')) {
        break;
      }
    }

    if (dayButton) {
      const buttonDay = dayButton.getAttribute('data-value');
      const buttonText = dayButton.textContent.trim();
      console.log('找到日期按钮:', { expected: day, dataValue: buttonDay, text: buttonText });

      // 验证按钮的日期是否正确
      if (buttonDay && parseInt(buttonDay) !== day) {
        console.warn('警告：日期按钮的data-value不匹配！', { expected: day, actual: buttonDay });
      }

      // 检查按钮是否可见和可点击
      const buttonStyle = window.getComputedStyle(dayButton);
      const isVisible = buttonStyle.display !== 'none' &&
                       buttonStyle.visibility !== 'hidden' &&
                       dayButton.offsetParent !== null;

      if (!isVisible) {
        console.warn('警告：日期按钮不可见，可能未完全加载');
        await delay(500);
      }

      dayButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await delay(400);

      // 记录点击前的值
      const beforeClickValue = input.value || input.getAttribute('value') || '';
      console.log('点击日期按钮前的值:', beforeClickValue);

      // 使用更安全的方式点击日期按钮
      try {
        console.log('准备点击日期按钮，触发鼠标事件...');
        dayButton.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
        await delay(100);
        dayButton.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
        await delay(100);
        dayButton.click();
        console.log('已点击日期按钮');
        await delay(1000);
      } catch (error) {
        console.error('点击日期按钮时出错:', error);
        dayButton.click();
        await delay(1000);
      }

      // 立即检查输入框值是否有变化
      const afterClickValue = input.value || input.getAttribute('value') || '';
      if (afterClickValue !== beforeClickValue) {
        console.log('✓ 点击后输入框值已更新:', afterClickValue);
      } else {
        console.log('⚠ 点击后输入框值未更新');
      }

      // 验证日期选择器是否已关闭（说明选择成功）
      let calendarStillOpen = document.querySelector('b.year, .year, .columns, .calendar');
      let checkCount = 0;
      while (calendarStillOpen && checkCount < 10) {
        await delay(200);
        calendarStillOpen = document.querySelector('b.year, .year, .columns, .calendar');
        checkCount++;
      }

      if (!calendarStillOpen) {
        console.log('日期选择器已关闭，选择可能成功');
      } else {
        console.log('日期选择器仍然打开，尝试关闭');
        // 尝试点击输入框外部关闭
        if (input.blur) {
          input.blur();
        }
        // 或者按ESC键
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        await delay(500);
      }

      await delay(500); // 额外等待，确保输入框值更新
    } else {
      console.log('未找到日期按钮:', day);
      // 输出所有日期按钮用于调试
      const allDayButtons = document.querySelectorAll('b.day button, .day button');
      console.log('所有日期按钮:', Array.from(allDayButtons).slice(0, 10).map(btn => ({
        value: btn.getAttribute('data-value'),
        text: btn.textContent
      })));
    }

    // 关闭日期选择器（点击输入框外部或按ESC）
    // 先尝试点击输入框外部
    if (input.blur) {
      input.blur();
    }
    await delay(500);

    // 触发各种事件以确保值更新
    input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    input.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
    await delay(500);

    // 验证输入框的值是否正确
    let currentValue = input.value || input.getAttribute('value') || '';
    console.log('选择日期完成:', dateStr, '当前值:', currentValue);

    // 如果值不正确，尝试直接设置值
    // 港交所网站使用的日期格式可能是 YYYY/MM/DD
    const expectedValue = `${year}/${String(month + 1).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
    const expectedValueAlt = dateStr; // DD/MM/YYYY 格式

    // 检查当前值是否匹配预期格式
    // 解析当前值，检查是否包含正确的年月日
    let isValueCorrect = false;
    if (currentValue) {
      // 尝试解析当前值（可能是 YYYY/MM/DD 或 DD/MM/YYYY 格式）
      const currentParts = currentValue.split(/[\/\-]/);
      if (currentParts.length === 3) {
        // 判断是 YYYY/MM/DD 还是 DD/MM/YYYY
        let currentYear, currentMonth, currentDay;
        if (currentParts[0].length === 4) {
          // YYYY/MM/DD 格式
          currentYear = parseInt(currentParts[0]);
          currentMonth = parseInt(currentParts[1]);
          currentDay = parseInt(currentParts[2]);
        } else {
          // DD/MM/YYYY 格式
          currentDay = parseInt(currentParts[0]);
          currentMonth = parseInt(currentParts[1]);
          currentYear = parseInt(currentParts[2]);
        }

        // 验证年月日是否匹配
        isValueCorrect = currentYear === year &&
                        currentMonth === (month + 1) &&
                        currentDay === day;

        console.log('解析当前值:', { currentYear, currentMonth, currentDay, expectedYear: year, expectedMonth: month + 1, expectedDay: day });
      }
    }

    // 如果值不正确，尝试重试或直接设置
    if (!isValueCorrect) {
      console.log('日期值不正确，预期:', expectedValue, '或', expectedValueAlt, '实际:', currentValue);

      // 如果值完全没有改变，说明选择可能失败，尝试重试一次
      if (currentValue === originalValue) {
        console.log('警告：日期值未更新，尝试重试选择日期');

        // 重试：再次打开日期选择器并选择
        await delay(500);
        input.click();
        input.focus();
        await delay(1000);

        // 快速重选（如果按钮还在）
        const retryYearButton = document.querySelector(`b.year button[data-value="${year}"], .year button[data-value="${year}"]`);
        const retryMonthButton = document.querySelector(`b.month button[data-value="${month}"], .month button[data-value="${month}"]`);
        const retryDayButton = document.querySelector(`b.day button[data-value="${day}"], .day button[data-value="${day}"]`);

        if (retryYearButton && retryMonthButton && retryDayButton) {
          console.log('重试选择日期...');
          retryYearButton.click();
          await delay(500);
          retryMonthButton.click();
          await delay(500);
          retryDayButton.click();
          await delay(1000);

          if (input.blur) {
            input.blur();
          }
          await delay(500);

          // 再次检查值
          currentValue = input.value || input.getAttribute('value') || '';
          console.log('重试后的值:', currentValue);
        }
      }

      // 如果重试后仍然不正确，尝试直接设置值
      currentValue = input.value || input.getAttribute('value') || '';
      const stillIncorrect = !currentValue ||
                            (currentValue === originalValue) ||
                            (!currentValue.includes(String(year)) ||
                             !currentValue.includes(String(month + 1)) ||
                             !currentValue.includes(String(day)));

      if (stillIncorrect) {
        console.log('重试后值仍不正确，尝试直接设置值');
        // 尝试直接设置值（多种格式）
        const formats = [
          expectedValue, // YYYY/MM/DD
          expectedValueAlt, // DD/MM/YYYY
          `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` // YYYY-MM-DD
        ];

        for (const format of formats) {
          try {
            // 尝试设置 value 属性
            input.setAttribute('value', format);
            input.value = format;

            // 触发事件
            input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
            await delay(300);

            // 检查是否成功
            const newValue = input.value || input.getAttribute('value') || '';
            if (newValue && newValue !== originalValue) {
              console.log('直接设置值成功:', format, '新值:', newValue);
              currentValue = newValue;
              break;
            }
          } catch (e) {
            console.log('设置值失败:', format, e);
          }
        }
      }
    } else {
      console.log('✓ 日期值验证通过:', currentValue);
    }

    // 最终验证
    const finalValue = input.value || input.getAttribute('value') || '';
    console.log('最终日期值:', finalValue);

    // 最终验证：检查是否包含正确的年月日
    if (finalValue) {
      const finalParts = finalValue.split(/[\/\-]/);
      if (finalParts.length === 3) {
        let finalYear, finalMonth, finalDay;
        if (finalParts[0].length === 4) {
          finalYear = parseInt(finalParts[0]);
          finalMonth = parseInt(finalParts[1]);
          finalDay = parseInt(finalParts[2]);
        } else {
          finalDay = parseInt(finalParts[0]);
          finalMonth = parseInt(finalParts[1]);
          finalYear = parseInt(finalParts[2]);
        }

        if (finalYear === year && finalMonth === (month + 1) && finalDay === day) {
          console.log('✓ 最终验证通过：日期选择成功');
        } else {
          console.warn('⚠ 最终验证失败：日期不匹配', {
            expected: `${year}/${month + 1}/${day}`,
            actual: `${finalYear}/${finalMonth}/${finalDay}`
          });
        }
      }
    } else {
      console.warn('⚠ 最终验证失败：日期值为空');
    }
  }

  // 填写日期范围
  async function fillDateRange(startDate, endDate) {
    try {
      updateStatus('填写日期范围...');
      console.log('开始填写日期范围:', startDate, '至', endDate);

      const fromInput = await waitForElement('#searchDate-From');
      const toInput = await waitForElement('#searchDate-To');
      console.log('找到日期输入框:', fromInput, toInput);

      // 使用日期选择器选择开始日期
      await selectDate(fromInput, startDate);
      await delay(500);

      // 使用日期选择器选择结束日期
      await selectDate(toInput, endDate);
      await delay(500);

      // 验证是否填写成功
      const fromValue = fromInput.value || fromInput.getAttribute('value') || '';
      const toValue = toInput.value || toInput.getAttribute('value') || '';
      console.log('验证日期填写结果 - 开始日期:', fromValue, '结束日期:', toValue);

      if (fromValue && toValue) {
        updateStatus(`已填写日期范围: ${fromValue} 至 ${toValue}`, 'success');
      } else {
        updateStatus(`日期填写可能不完整: ${fromValue || '空'} 至 ${toValue || '空'}`, 'warning');
      }

      return true;
    } catch (error) {
      console.error('填写日期范围失败:', error);
      updateStatus(`填写日期范围失败: ${error.message}`, 'error');
      throw error;
    }
  }

  // 选择文件类别：按照图片路径 - 標題類別 -> 財務報表/環境、社會及管治資料 -> 所有
  async function selectReportCategory() {
    try {
      updateStatus('选择文件类别...');
      console.log('开始选择文件类别...');

      // 等待页面完全加载
      await delay(2000);

      // 步骤1：先选择搜索类型为"標題類別"（参考Playwright脚本）
      // 查找搜索类型下拉菜单（id="selectedCategory"）
      let searchTypeDropdown = null;
      const searchTypeSelectors = [
        '#selectedCategory .combobox-field',
        '#selectedCategory',
        '.combobox-field[aria-label*="標題"]',
        '.combobox-field[aria-label*="标题"]'
      ];

      for (const selector of searchTypeSelectors) {
        const element = document.querySelector(selector);
        if (element && element.offsetParent !== null) {
          searchTypeDropdown = element;
          break;
        }
      }

      if (searchTypeDropdown) {
        updateStatus('找到搜索类型下拉菜单，选择"標題類別"...', 'info');
        console.log('找到搜索类型下拉菜单');
        searchTypeDropdown.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await delay(300);
        searchTypeDropdown.click();
        console.log('已点击搜索类型下拉菜单');
        await delay(800);

        // 在下拉菜单中选择"標題類別"（data-value="rbAfter2006"）
        const titleCategoryOption = document.querySelector('.droplist-item[data-value="rbAfter2006"]');
        if (titleCategoryOption) {
          console.log('找到"標題類別"选项（通过data-value）');
          titleCategoryOption.click();
          updateStatus('已选择搜索类型为"標題類別"', 'success');
          await delay(1500); // 等待下拉菜单更新
        } else {
          console.log('未找到data-value选项，尝试通过文本查找');
          // 尝试通过文本查找
          const allOptions = Array.from(document.querySelectorAll('.droplist-item, .dropdown-item, [role="option"]'));
          console.log(`找到 ${allOptions.length} 个选项`);
          for (const option of allOptions) {
            const text = (option.textContent || '').trim();
            console.log('选项文本:', text);
            if (text === '標題類別' || text === '标题类别') {
              console.log('找到"標題類別"选项（通过文本）');
              option.click();
              updateStatus('已通过文本选择"標題類別"', 'success');
              await delay(1500);
              break;
            }
          }
        }
      } else {
        console.log('未找到搜索类型下拉菜单');
      }

      // 步骤2：查找"標題類別"下拉菜单（应该在id="rbAfter2006"的容器中）
      await delay(500);
      let titleCategoryDropdown = null;
      const titleCategorySelectors = [
        '#rbAfter2006 .combobox-field',
        '.tier1-wrap .combobox-field',
        '[id*="tier1"] .combobox-field',
        '#rbAfter2006 input[type="text"]',
        '#rbAfter2006 select'
      ];

      for (const selector of titleCategorySelectors) {
        const element = document.querySelector(selector);
        if (element && element.offsetParent !== null) {
          titleCategoryDropdown = element;
          break;
        }
      }

      // 如果还没找到，尝试通过标签查找
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

      if (!titleCategoryDropdown) {
        console.log('未找到标题类别下拉菜单');
        updateStatus('未找到标题类别下拉菜单，尝试直接查找选项', 'warning');
      } else {
        // 步骤3：点击"標題類別"下拉菜单
        updateStatus('点击标题类别下拉菜单...', 'info');
        console.log('找到标题类别下拉菜单，准备点击');
        titleCategoryDropdown.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await delay(300);
        titleCategoryDropdown.click();
        console.log('已点击标题类别下拉菜单');
        await delay(1200);
      }

      // 步骤4：查找并选择"財務報表/環境、社會及管治資料"选项
      await delay(500);
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

      updateStatus(`找到 ${allOptions.length} 个选项，查找"財務報表/環境、社會及管治資料"...`, 'info');
      console.log(`找到 ${allOptions.length} 个选项，开始查找"財務報表/環境、社會及管治資料"`);

      // 输出所有选项用于调试
      const optionTexts = allOptions.map(opt => (opt.textContent || '').trim()).filter(t => t);
      console.log(`所有选项 (${optionTexts.length}个):`, optionTexts);
      console.log('前10个选项:', optionTexts.slice(0, 10));

      // 输出包含"財務"或"報表"的选项
      const financialOptions = allOptions.filter(opt => {
        const text = (opt.textContent || '').trim();
        return text.includes('財務') || text.includes('报表') || text.includes('報表');
      });
      console.log(`包含"財務"或"報表"的选项 (${financialOptions.length}个):`,
        financialOptions.map(opt => (opt.textContent || '').trim()));

      // 查找"財務報表/環境、社會及管治資料"选项
      // 目标文本的完整匹配模式
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
        console.log('检查选项:', text);

        // 检查是否完全匹配目标文本
        for (const pattern of targetTextPatterns) {
          if (text === pattern || text.startsWith(pattern) || text.includes(pattern)) {
            targetOption = option;
            console.log('✓ 找到目标选项（精确匹配）:', text);
            updateStatus(`找到目标选项: ${text}`, 'success');
            break;
          }
        }
        if (targetOption) break;
      }

      // 方法2：如果精确匹配失败，使用更严格的匹配
      // 必须同时包含"財務報表"和"環境、社會及管治"相关关键词
      if (!targetOption) {
        console.log('精确匹配失败，尝试严格匹配');
        for (const option of allOptions) {
          const text = (option.textContent || '').trim();

          // 必须包含"財務報表"（或"财务报表"）
          const hasFinancialReport = text.includes('財務報表') || text.includes('财务报表');

          // 必须包含"環境、社會及管治"相关关键词
          const hasESG = text.includes('環境、社會及管治') ||
                        text.includes('环境、社会及管治') ||
                        (text.includes('環境') && text.includes('社會') && text.includes('管治')) ||
                        (text.includes('环境') && text.includes('社会') && text.includes('管治')) ||
                        text.includes('ESG');

          // 必须同时包含两者
          if (hasFinancialReport && hasESG) {
            // 排除明显不是的选项（如"公告"等）
            const excludeWords = ['公告', '通告', '通知', 'Announcement'];
            const hasExclude = excludeWords.some(word => text.includes(word));

            if (!hasExclude) {
              targetOption = option;
              console.log('✓ 找到目标选项（严格匹配）:', text);
              updateStatus(`找到目标选项: ${text}`, 'success');
              break;
            }
          }
        }
      }

      // 方法3：如果还是没找到，尝试部分匹配但要求更严格
      if (!targetOption) {
        console.log('严格匹配失败，尝试部分匹配');
        for (const option of allOptions) {
          const text = (option.textContent || '').trim();

          // 必须包含"財務報表"和"環境"、"社會"、"管治"中的至少两个
          const hasFinancialReport = text.includes('財務報表') || text.includes('财务报表');
          const hasEnv = text.includes('環境') || text.includes('环境');
          const hasSocial = text.includes('社會') || text.includes('社会');
          const hasGov = text.includes('管治');

          if (hasFinancialReport && ((hasEnv && hasSocial) || (hasEnv && hasGov) || (hasSocial && hasGov))) {
            // 排除明显不是的选项
            const excludeWords = ['公告', '通告', '通知', 'Announcement'];
            const hasExclude = excludeWords.some(word => text.includes(word));

            if (!hasExclude) {
              targetOption = option;
              console.log('✓ 找到目标选项（部分匹配）:', text);
              updateStatus(`找到目标选项: ${text}`, 'warning');
              break;
            }
          }
        }
      }

      if (!targetOption) {
        console.error('无法找到"財務報表/環境、社會及管治資料"选项');
        updateStatus('无法找到"財務報表/環境、社會及管治資料"选项', 'error');
        // 输出所有选项用于调试
        const optionTexts = allOptions.slice(0, 20).map(opt => (opt.textContent || '').trim()).filter(t => t);
        console.log('所有选项:', optionTexts);
        updateStatus(`前20个选项: ${optionTexts.join(', ')}`, 'info');
        return false;
      }

      // 步骤5：点击"財務報表/環境、社會及管治資料"选项，展开子菜单
      updateStatus('点击"財務報表/環境、社會及管治資料"选项...', 'info');
      console.log('准备点击目标选项');

      // 验证找到的选项是否正确
      const targetText = (targetOption.textContent || '').trim();
      console.log('找到的选项文本:', targetText);
      console.log('目标选项的DOM结构:', targetOption);
      console.log('目标选项的父元素:', targetOption.parentElement);
      console.log('目标选项的父元素的类名:', targetOption.parentElement?.className);
      console.log('目标选项的父元素的ID:', targetOption.parentElement?.id);

      // 验证：确保选项文本包含关键信息
      const isValidOption = targetText.includes('財務報表') || targetText.includes('财务报表');
      const hasESGInfo = targetText.includes('環境') || targetText.includes('社會') || targetText.includes('管治') ||
                        targetText.includes('环境') || targetText.includes('社会') || targetText.includes('ESG');

      if (!isValidOption || !hasESGInfo) {
        console.error('警告：找到的选项可能不正确！');
        console.error('选项文本:', targetText);
        console.error('包含財務報表:', isValidOption);
        console.error('包含ESG信息:', hasESGInfo);
        updateStatus(`警告：找到的选项可能不正确: ${targetText}`, 'warning');
      }

      console.log('目标选项的所有兄弟元素:', Array.from(targetOption.parentElement?.children || []).map(el => ({
        tagName: el.tagName,
        className: el.className,
        id: el.id,
        textContent: (el.textContent || '').trim().substring(0, 50)
      })));

      // 在点击前，记录当前所有可见的选项（用于后续排除主菜单选项）
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
      console.log(`点击前记录 ${beforeClickOptions.size} 个可见选项`);

      targetOption.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await delay(300);

      // 尝试多种点击方式
      if (targetOption.click) {
        targetOption.click();
        console.log('已使用click()方法点击');
      } else {
        targetOption.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        console.log('已使用dispatchEvent点击');
      }

      await delay(2000); // 等待子菜单出现
      console.log('等待子菜单出现完成');

      // 步骤6：在子菜单中选择"所有"
      await delay(500);

      // 首先尝试找到子菜单容器（通常在点击的选项附近）
      let subMenuContainer = null;

      // 等待子菜单容器出现（最多等待5秒）
      let waitCount = 0;
      const maxWaitCount = 25; // 25 * 200ms = 5秒

      while (!subMenuContainer && waitCount < maxWaitCount) {
        await delay(200);
        waitCount++;

        // 方法1：优先查找目标选项的子元素中的子菜单（这是最准确的方法）
        // 根据DOM结构，子菜单是 .droplist-submenu 或 .droplist-group.droplist-submenu
        if (!subMenuContainer && targetOption.querySelector) {
          const childMenu = targetOption.querySelector('.droplist-submenu, .droplist-group.droplist-submenu');
          if (childMenu) {
            subMenuContainer = childMenu;
            console.log('找到子菜单容器（子元素）:', childMenu.className);
            break; // 找到后立即退出循环
          }
        }

        // 方法2：如果没找到，尝试查找目标选项内的 ul.droplist-items
        if (!subMenuContainer && targetOption.querySelector) {
          const ulMenu = targetOption.querySelector('ul.droplist-items, ul[class*="droplist"]');
          if (ulMenu) {
            subMenuContainer = ulMenu;
            console.log('找到子菜单容器（ul元素）:', ulMenu.className);
            break; // 找到后立即退出循环
          }
        }

        // 方法3：通过DOM结构查找（查找最近出现的新的下拉菜单）
        if (!subMenuContainer) {
          // 查找所有可能的下拉菜单容器，优先查找 .droplist-submenu
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

          // 选择最靠近目标选项的菜单（通过位置判断）
          if (allMenus.length > 0) {
            const targetRect = targetOption.getBoundingClientRect();
            let closestMenu = null;
            let minDistance = Infinity;

            for (const menu of allMenus) {
              const menuRect = menu.getBoundingClientRect();
              // 计算距离（子菜单通常在目标选项下方或右侧）
              const distance = Math.abs(menuRect.top - targetRect.bottom) + Math.abs(menuRect.left - targetRect.left);
              if (distance < minDistance && (menuRect.top >= targetRect.bottom - 10 || menuRect.left >= targetRect.left - 10)) {
                minDistance = distance;
                closestMenu = menu;
              }
            }

            if (closestMenu) {
              subMenuContainer = closestMenu;
              console.log('找到子菜单容器（位置判断）');
            }
          }
        }
      }

      if (!subMenuContainer) {
        console.log('未找到子菜单容器，等待超时');
        console.log('尝试查找所有可能的菜单容器...');
        // 输出所有可能的菜单容器用于调试
        const allPossibleMenus = Array.from(document.querySelectorAll('.droplist, .dropdown-menu, .submenu, [class*="droplist"], [class*="dropdown"], [class*="menu"], ul, ol, div[class*="list"]'));
        console.log(`找到 ${allPossibleMenus.length} 个可能的菜单容器`);
        allPossibleMenus.slice(0, 10).forEach((menu, idx) => {
          const style = window.getComputedStyle(menu);
          const rect = menu.getBoundingClientRect();
          console.log(`菜单容器 ${idx + 1}:`, {
            tagName: menu.tagName,
            className: menu.className,
            id: menu.id,
            display: style.display,
            visibility: style.visibility,
            width: rect.width,
            height: rect.height,
            offsetParent: menu.offsetParent !== null,
            children: menu.children.length,
            textContent: (menu.textContent || '').trim().substring(0, 100)
          });
        });
      } else {
        console.log('找到子菜单容器:', subMenuContainer);
        console.log('子菜单容器的DOM结构:', {
          tagName: subMenuContainer.tagName,
          className: subMenuContainer.className,
          id: subMenuContainer.id,
          children: subMenuContainer.children.length,
          innerHTML: subMenuContainer.innerHTML.substring(0, 500)
        });
        console.log('找到子菜单容器，等待子菜单选项加载...');
        // 等待子菜单选项出现（最多等待3秒）
        let optionWaitCount = 0;
        const maxOptionWaitCount = 15; // 15 * 200ms = 3秒

        while (optionWaitCount < maxOptionWaitCount) {
          await delay(200);
          optionWaitCount++;

          // 检查子菜单容器中是否有选项
          // 根据DOM结构，选项是 .droplist-submenu .droplist-item 或 ul.droplist-items li.droplist-item
          const testOptions = subMenuContainer.querySelectorAll('.droplist-item, li.droplist-item, .dropdown-item, [role="option"], li[role="option"]');
          if (testOptions.length > 0) {
            console.log(`子菜单选项已加载，找到 ${testOptions.length} 个选项`);
            // 输出前几个选项的详细信息
            Array.from(testOptions).slice(0, 5).forEach((opt, idx) => {
              const linkText = opt.querySelector('a')?.textContent?.trim() || (opt.textContent || '').trim();
              console.log(`选项 ${idx + 1}:`, {
                tagName: opt.tagName,
                className: opt.className,
                linkText: linkText,
                fullText: (opt.textContent || '').trim().substring(0, 50)
              });
            });
            break;
          }
        }
      }

      // 如果找到了子菜单容器，只在该容器中查找选项
      let subOptions = [];
      if (subMenuContainer) {
        console.log('在子菜单容器中查找选项');

        // 再次等待一下，确保选项完全渲染
        await delay(500);

        // 尝试多种选择器来查找子菜单选项
        const selectors = [
          '.droplist-item',
          '.dropdown-item',
          '[role="option"]',
          'li[role="option"]',
          '.menu-item',
          '.option-item',
          'tr[class*="suggestion"]',
          'td[class*="option"]',
          'li',
          'tr',
          'td',
          'div[class*="item"]',
          'a',
          'span[class*="item"]'
        ];

        console.log('尝试使用多种选择器查找选项...');
        for (const selector of selectors) {
          const testOptions = subMenuContainer.querySelectorAll(selector);
          if (testOptions.length > 0) {
            console.log(`使用选择器 "${selector}" 找到 ${testOptions.length} 个元素`);
            // 输出前几个元素的文本
            Array.from(testOptions).slice(0, 3).forEach((el, idx) => {
              console.log(`  元素 ${idx + 1}:`, (el.textContent || '').trim().substring(0, 50));
            });
          }
        }

        // 根据DOM结构，子菜单选项是 .droplist-item，文本在 <a> 标签中
        subOptions = Array.from(subMenuContainer.querySelectorAll('.droplist-item, li.droplist-item'))
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

            // 从 <a> 标签中获取文本，而不是整个 <li> 的文本
            const linkElement = el.querySelector('a');
            const text = linkElement ? (linkElement.textContent || '').trim() : (el.textContent || '').trim();

            // 对于"所有"选项，即使点击前存在也可能是子菜单的（因为可能有多个"所有"）
            // 如果已经在子菜单容器中，就认为是子菜单的选项
            if (text === '所有' || text === 'All') {
              return true; // 在子菜单容器中的"所有"选项，直接接受
            }

            // 额外验证：排除点击前就存在的选项（确保是子菜单中的新选项）
            if (beforeClickOptions.has(el)) {
              console.log('排除点击前就存在的选项:', text);
              return false;
            }

            return true;
          });
        console.log(`在子菜单容器中找到 ${subOptions.length} 个选项`);

        // 如果还是没找到选项，再等待一下并重试，使用更通用的方法
        if (subOptions.length === 0) {
          console.log('子菜单选项为空，再等待1秒后重试...');
          await delay(1000);

          // 尝试查找所有直接子元素
          const directChildren = Array.from(subMenuContainer.children);
          console.log(`子菜单容器的直接子元素数量: ${directChildren.length}`);
          directChildren.forEach((child, idx) => {
            console.log(`直接子元素 ${idx + 1}:`, {
              tagName: child.tagName,
              className: child.className,
              textContent: (child.textContent || '').trim().substring(0, 50),
              children: child.children.length
            });
          });

          // 尝试查找所有后代元素中的可点击元素
          const allDescendants = Array.from(subMenuContainer.querySelectorAll('*'));
          console.log(`子菜单容器的所有后代元素数量: ${allDescendants.length}`);

          subOptions = Array.from(subMenuContainer.querySelectorAll('.droplist-item, li.droplist-item'))
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
              // 如果文本为空或太长，可能是容器元素，跳过
              if (!text || text.length > 100) {
                return false;
              }

              if (text === '所有' || text === 'All') {
                return true;
              }
              if (beforeClickOptions.has(el)) {
                return false;
              }
              return true;
            });
          console.log(`重试后找到 ${subOptions.length} 个选项`);

          // 如果还是没找到，尝试使用直接子元素
          if (subOptions.length === 0 && directChildren.length > 0) {
            console.log('尝试使用直接子元素作为选项');
            subOptions = directChildren.filter(el => {
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

              const text = (el.textContent || '').trim();
              if (!text || text.length > 100) {
                return false;
              }

              return true;
            });
            console.log(`使用直接子元素找到 ${subOptions.length} 个选项`);
          }
        }
      } else {
        // 如果没找到子菜单容器，使用原来的方法，但需要更严格的过滤
        console.log('未找到子菜单容器，使用全局查找（带过滤）');
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

        // 过滤：优先排除点击前就存在的选项（主菜单选项），然后排除目标选项本身
        subOptions = allOptions.filter(opt => {
          const text = (opt.textContent || '').trim();

          // 排除目标选项本身
          if (opt === targetOption || opt.contains(targetOption)) {
            return false;
          }

          // 对于"所有"选项，即使点击前存在也可能是子菜单的（因为可能有多个"所有"）
          // 所以如果文本是"所有"，不排除
          if (text === '所有' || text === 'All') {
            // 检查位置：如果这个选项在目标选项下方或右侧，可能是子菜单的
            const optRect = opt.getBoundingClientRect();
            const targetRect = targetOption.getBoundingClientRect();
            if (optRect.top >= targetRect.bottom - 10 || optRect.left >= targetRect.left - 10) {
              return true; // 可能是子菜单的"所有"
            }
            // 否则可能是主菜单的"所有"，排除
            return false;
          }

          // 排除点击前就存在的选项（这些是主菜单选项）
          if (beforeClickOptions.has(opt)) {
            return false;
          }

          // 排除包含"財務報表"且文本较长的选项（主菜单项）
          if (text.includes('財務報表') && text.length > 20) {
            return false;
          }

          // 子选项通常文本较短，且不包含"財務報表"
          return text.length < 50 && !text.includes('財務報表');
        });

        console.log(`过滤后剩余 ${subOptions.length} 个子选项（已排除 ${allOptions.length - subOptions.length} 个主菜单选项）`);
      }

      updateStatus(`找到 ${subOptions.length} 个子选项，查找"所有"...`, 'info');
      console.log(`找到 ${subOptions.length} 个子选项，开始查找"所有"`);

      // 输出所有子选项用于调试（从 <a> 标签获取文本）
      const subOptionTexts = subOptions.map(opt => {
        const linkElement = opt.querySelector('a');
        return linkElement ? (linkElement.textContent || '').trim() : (opt.textContent || '').trim();
      }).filter(t => t);
      console.log(`所有子选项 (${subOptionTexts.length}个):`, subOptionTexts);
      if (subOptionTexts.length > 0) {
        console.log('前10个子选项:', subOptionTexts.slice(0, 10));
      }

      let allOption = null;

      // 首先尝试精确匹配"所有"
      for (const subOption of subOptions) {
        // 从 <a> 标签中获取文本
        const linkElement = subOption.querySelector('a');
        const text = linkElement ? (linkElement.textContent || '').trim() : (subOption.textContent || '').trim();
        // 精确匹配"所有"（必须是纯文本"所有"，不包含其他内容）
        if (text === '所有' || text === 'All') {
          allOption = subOption;
          console.log('✓ 找到"所有"选项（精确匹配）:', text);
          break;
        }
      }

      // 如果精确匹配失败，尝试包含匹配（但排除包含"財務"的选项）
      if (!allOption) {
        console.log('精确匹配失败，尝试包含匹配');
        for (const subOption of subOptions) {
          // 从 <a> 标签中获取文本
          const linkElement = subOption.querySelector('a');
          const text = linkElement ? (linkElement.textContent || '').trim() : (subOption.textContent || '').trim();
          // 只匹配以"所有"开头或等于"所有"的选项，且不包含"財務"
          if ((text.startsWith('所有') || text === '所有' || text.includes('所有')) &&
              !text.includes('財務') &&
              text.length < 10) {
            allOption = subOption;
            console.log('找到"所有"选项（包含匹配）:', text);
            break;
          }
        }
      }

      // 如果还是没找到，且子选项数量为0，可能是过滤太严格了
      // 尝试在所有可见选项中查找，但排除明显是主菜单的选项
      if (!allOption && subOptions.length === 0) {
        console.log('子选项数量为0，可能过滤太严格，尝试在所有可见选项中查找');
        const allVisibleOptions = Array.from(document.querySelectorAll('.droplist-item, .dropdown-item, [role="option"], li[role="option"], .menu-item, .option-item, tr[class*="suggestion"], td[class*="option"]'))
          .filter(el => {
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            return style.display !== 'none' &&
                   style.visibility !== 'hidden' &&
                   rect.width > 0 &&
                   rect.height > 0 &&
                   el.offsetParent !== null;
          });

        console.log(`找到 ${allVisibleOptions.length} 个所有可见选项`);

        // 在所有可见选项中查找"所有"，但排除目标选项本身和明显是主菜单的选项
        for (const opt of allVisibleOptions) {
          if (opt === targetOption || opt.contains(targetOption)) {
            continue;
          }

          const text = (opt.textContent || '').trim();

          // 排除明显是主菜单的选项（包含"財務報表"且文本较长）
          if (text.includes('財務報表') && text.length > 20) {
            continue;
          }

          // 精确匹配"所有"
          if (text === '所有' || text === 'All') {
            // 检查这个选项是否在目标选项附近（可能是子菜单）
            const optRect = opt.getBoundingClientRect();
            const targetRect = targetOption.getBoundingClientRect();
            // 如果选项在目标选项下方或右侧，可能是子菜单选项
            if (optRect.top >= targetRect.bottom - 10 || optRect.left >= targetRect.left - 10) {
              allOption = opt;
              console.log('✓ 在所有可见选项中找到"所有"选项（位置判断）:', text);
              break;
            }
          }
        }
      }

      if (allOption) {
        updateStatus('找到"所有"选项，点击选择...', 'info');
        console.log('准备点击"所有"选项');
        allOption.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await delay(300);

        if (allOption.click) {
          allOption.click();
          console.log('已使用click()方法点击"所有"选项');
        } else {
          allOption.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          console.log('已使用dispatchEvent点击"所有"选项');
        }

        await delay(800);
        updateStatus('已选择文件类别：所有财报', 'success');
        console.log('✓ 文件类别选择完成');
        return true;
      } else {
        console.log('未找到"所有"选项');
        updateStatus('已选择"財務報表/環境、社會及管治資料"（未找到"所有"选项）', 'warning');
        // 输出子选项用于调试（从 <a> 标签获取文本）
        const allSubOptionTexts = subOptions.slice(0, 20).map(opt => {
          const linkElement = opt.querySelector('a');
          return linkElement ? (linkElement.textContent || '').trim() : (opt.textContent || '').trim();
        }).filter(t => t);
        console.log('所有子选项:', allSubOptionTexts);
        updateStatus(`前20个子选项: ${allSubOptionTexts.join(', ')}`, 'info');
        return true;
      }

    } catch (error) {
      console.error('选择文件类别错误:', error);
      console.error('错误堆栈:', error.stack);
      updateStatus(`选择文件类别失败: ${error.message}`, 'error');
      // 不抛出错误，继续执行
      return false;
    }
  }

  // 点击搜索按钮
  async function clickSearch() {
    try {
      updateStatus('点击搜索按钮...');
      console.log('开始查找搜索按钮...');

      // 查找搜索按钮（尝试多种选择器）
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
          console.log('找到搜索按钮（通过选择器）:', selector);
          break;
        }
      }

      if (!searchButton) {
        console.log('选择器查找失败，尝试通过文本查找');
        // 尝试通过JavaScript查找
        const buttons = Array.from(document.querySelectorAll('button, a, input[type="submit"]'))
          .filter(btn => btn.offsetParent !== null); // 只取可见的

        console.log(`找到 ${buttons.length} 个可见按钮`);
        for (const btn of buttons) {
          const text = (btn.textContent || btn.value || '').toUpperCase();
          console.log('按钮文本:', text);
          if (text.includes('SEARCH') || text.includes('搜索') || text.includes('搜尋') || text.includes('SEARCH')) {
            searchButton = btn;
            console.log('找到搜索按钮（通过文本）:', text);
            break;
          }
        }
      }

      if (searchButton) {
        console.log('准备点击搜索按钮');
        searchButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await delay(300);
        searchButton.click();
        console.log('已点击搜索按钮');
        updateStatus('已点击搜索，等待结果...', 'info');
        await delay(3000); // 等待页面加载
        return true;
      } else {
        console.error('未找到搜索按钮');
        throw new Error('未找到搜索按钮');
      }
    } catch (error) {
      console.error('点击搜索失败:', error);
      updateStatus(`点击搜索失败: ${error.message}`, 'error');
      throw error;
    }
  }

  // 提取搜索结果中的业绩报链接
  function extractReportLinks() {
    const reports = [];
    console.log('开始提取业绩报链接...');

    try {
      // 查找结果表格
      const resultPanel = document.querySelector('#titleSearchResultPanel');
      if (!resultPanel) {
        console.log('未找到结果面板 #titleSearchResultPanel');
        return reports;
      }
      console.log('找到结果面板');

      // 查找所有结果行
      const rows = resultPanel.querySelectorAll('table tbody tr, tbody tr');
      console.log(`找到 ${rows.length} 行数据`);

      for (const row of rows) {
        // 跳过表头
        if (row.querySelector('th')) {
          console.log('跳过表头行');
          continue;
        }

        // 提取日期
        const dateCell = row.querySelector('td:first-child');
        if (!dateCell) {
          console.log('未找到日期单元格');
          continue;
        }

        const dateText = dateCell.textContent.trim();
        console.log('日期文本:', dateText);

        // 支持多种日期格式：
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

        if (!date) {
          console.log('日期格式不匹配:', dateText);
          continue;
        }

        console.log('解析的日期:', date);

        // 提取链接和标题
        // 标题在第4列（td:nth-child(4)），包含完整信息
        const titleCell = row.querySelector('td:nth-child(4)');
        const link = titleCell ? titleCell.querySelector('a[href*=".pdf"], a[href*="document"], a[href*="file"], a') :
                   row.querySelector('a[href*=".pdf"], a[href*="document"], a[href*="file"], a');

        if (!link) {
          console.log('未找到链接');
          continue;
        }

        // 提取标题：从标题单元格中提取实际报告名称
        let title = '';
        if (titleCell) {
          const cellText = titleCell.textContent.trim();
          console.log('标题单元格完整文本:', cellText);

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

        if (!title) {
          console.log('未找到标题');
          continue;
        }
        console.log('找到文档:', title);

        // 过滤报告：由于用户选择了"財務報表/環境、社會及管治資料"类别，所有结果都应该是报告
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

        // 排除摘要、更正等
        const excludeWords = ['摘要', 'Summary', '更正', 'Amendment', '补充', 'Supplement', '修订', 'Revised', '修訂'];
        const hasExclude = excludeWords.some(word => title.includes(word) || (titleCell && titleCell.textContent.includes(word)));

        // 只添加财务报告，排除纯ESG报告
        if (isFinancialReport && !isPureESGReport && !hasExclude) {
          let url = link.getAttribute('href');
          if (!url.startsWith('http')) {
            if (url.startsWith('/')) {
              url = 'https://www.hkexnews.hk' + url;
            } else {
              url = 'https://www.hkexnews.hk/' + url;
            }
          }

          console.log(`✓ 添加财务报告: ${date} - ${title}`);
          reports.push({
            title: title,
            url: url,
            date: date
          });
        } else {
          let skipReason = '';
          if (isPureESGReport) {
            skipReason = '纯ESG报告（不下载）';
          } else if (hasExclude) {
            skipReason = '排除关键词';
          } else if (!isFinancialReport) {
            skipReason = '非财务报告';
          }
          console.log(`✗ 跳过: ${title} (${skipReason})`);
        }
      }

      // 按日期排序（最新的在前）
      reports.sort((a, b) => b.date.localeCompare(a.date));
      console.log(`提取完成，共 ${reports.length} 份业绩报`);

    } catch (error) {
      console.error('提取结果失败:', error);
      updateStatus(`提取结果失败: ${error.message}`, 'error');
    }

    return reports;
  }

  // 下载文件（使用Chrome Downloads API）
  async function downloadFile(url, filename, stockCode) {
    try {
      // 发送消息给background script进行下载
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'download',
          url: url,
          filename: filename,
          stockCode: stockCode
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response && response.success) {
            resolve(true);
          } else {
            reject(new Error(response?.error || '下载失败'));
          }
        });
      });
    } catch (error) {
      throw new Error(`下载失败: ${error.message}`);
    }
  }

  // 检查页面是否有搜索结果
  function checkSearchResults() {
    try {
      const downloadBtn = document.getElementById('hk-download-btn');
      const searchBtn = document.getElementById('hk-search-btn');
      const fillBtn = document.getElementById('hk-fill-btn');

      if (!downloadBtn || !searchBtn || !fillBtn) {
        return; // 按钮不存在，可能面板还没创建
      }

      // "填入搜索条件"按钮一直显示
      fillBtn.style.display = 'inline-block';

      const resultPanel = document.querySelector('#titleSearchResultPanel');
      if (resultPanel) {
        const rows = resultPanel.querySelectorAll('table tbody tr, tbody tr');
        const hasResults = Array.from(rows).some(row => {
          return !row.querySelector('th') && row.querySelector('td');
        });

        if (hasResults) {
          // 有搜索结果，显示下载按钮，隐藏搜索按钮
          downloadBtn.style.display = 'inline-block';
          searchBtn.style.display = 'none';
          updateStatus('检测到搜索结果，可以开始下载', 'info');
        } else {
          // 没有搜索结果，显示搜索按钮，隐藏下载按钮
          downloadBtn.style.display = 'none';
          searchBtn.style.display = 'inline-block';
        }
      } else {
        // 没有结果面板，显示搜索按钮，隐藏下载按钮
        downloadBtn.style.display = 'none';
        searchBtn.style.display = 'inline-block';
      }
    } catch (e) {
      console.error('检查搜索结果错误:', e);
      // 出错时，确保按钮状态正确
      const downloadBtn = document.getElementById('hk-download-btn');
      const searchBtn = document.getElementById('hk-search-btn');
      const fillBtn = document.getElementById('hk-fill-btn');
      if (downloadBtn && searchBtn && fillBtn) {
        fillBtn.style.display = 'inline-block';
        searchBtn.style.display = 'inline-block';
        downloadBtn.style.display = 'none';
      }
    }
  }

  // 步骤1：填入搜索条件（只填写表单，不搜索）
  async function fillSearchConditions(stockCode, startDateInput, endDateInput) {
    if (isRunning) {
      updateStatus('正在运行中，请等待...', 'warning');
      return;
    }

    if (!isSearchPage()) {
      updateStatus('请先访问港交所搜索页面', 'error');
      return;
    }

    isRunning = true;
    stopFlag = false;

    const fillBtn = document.getElementById('hk-fill-btn');
    const searchBtn = document.getElementById('hk-search-btn');
    const stopBtn = document.getElementById('hk-stop-btn');
    if (fillBtn) fillBtn.disabled = true;
    if (stopBtn) stopBtn.style.display = 'inline-block';

    try {
      updateStatus('开始填入搜索条件...', 'info');

      // 1. 填写股票代码
      await fillStockCode(stockCode);
      if (stopFlag) return;

      // 2. 选择文件类别
      await selectReportCategory();
      if (stopFlag) return;

      // 3. 填写日期范围
      const startDate = formatDate(startDateInput);
      const endDate = formatDate(endDateInput);
      await fillDateRange(startDate, endDate);
      if (stopFlag) return;

      updateStatus('搜索条件已填入完成，可以点击"开始搜索"', 'success');

      // 显示"开始搜索"按钮
      if (searchBtn) {
        searchBtn.style.display = 'inline-block';
      }

    } catch (error) {
      updateStatus(`填入搜索条件失败: ${error.message}`, 'error');
      console.error('填入搜索条件错误详情:', error);
    } finally {
      isRunning = false;
      if (fillBtn) {
        fillBtn.disabled = false;
      }
      if (stopBtn) stopBtn.style.display = 'none';
    }
  }

  // 步骤2：开始搜索（点击搜索按钮）
  async function clickSearchButton() {
    if (isRunning) {
      updateStatus('正在运行中，请等待...', 'warning');
      return;
    }

    if (!isSearchPage()) {
      updateStatus('请先访问港交所搜索页面', 'error');
      return;
    }

    isRunning = true;
    stopFlag = false;

    const searchBtn = document.getElementById('hk-search-btn');
    const fillBtn = document.getElementById('hk-fill-btn');
    const stopBtn = document.getElementById('hk-stop-btn');
    if (searchBtn) searchBtn.disabled = true;
    if (fillBtn) fillBtn.disabled = true;
    if (stopBtn) stopBtn.style.display = 'inline-block';

    try {
      updateStatus('点击搜索按钮...', 'info');
      await clickSearch();
      if (stopFlag) return;

      updateStatus('搜索已提交，页面将刷新...', 'success');

      // 页面会刷新，所以不需要等待结果
      // 刷新后会自动检查是否有搜索结果

    } catch (error) {
      updateStatus(`搜索失败: ${error.message}`, 'error');
      console.error('搜索错误详情:', error);
    } finally {
      isRunning = false;
      if (searchBtn) {
        searchBtn.disabled = false;
      }
      if (fillBtn) {
        fillBtn.disabled = false;
      }
      if (stopBtn) stopBtn.style.display = 'none';
    }
  }

  // 步骤3：开始下载（只执行下载逻辑）
  async function startDownload(stockCode) {
    if (isRunning) {
      updateStatus('正在运行中，请等待...', 'warning');
      return;
    }

    if (!isSearchPage()) {
      updateStatus('请先访问港交所搜索页面', 'error');
      return;
    }

    isRunning = true;
    stopFlag = false;

    const fillBtn = document.getElementById('hk-fill-btn');
    const searchBtn = document.getElementById('hk-search-btn');
    const downloadBtn = document.getElementById('hk-download-btn');
    const stopBtn = document.getElementById('hk-stop-btn');
    if (fillBtn) fillBtn.disabled = true;
    if (searchBtn) searchBtn.disabled = true;
    if (downloadBtn) downloadBtn.style.display = 'none';
    if (stopBtn) stopBtn.style.display = 'inline-block';

    try {
      // 等待结果加载
      updateStatus('等待搜索结果加载...', 'info');
      console.log('等待搜索结果加载...');
      await delay(3000); // 等待结果加载

      // 提取业绩报链接
      updateStatus('提取业绩报链接...', 'info');
      console.log('开始提取业绩报链接...');
      const reports = extractReportLinks();
      console.log(`提取到 ${reports.length} 份业绩报`);

      if (reports.length === 0) {
        console.log('未找到业绩报');
        updateStatus('未找到业绩报，请先填入搜索条件', 'warning');
        isRunning = false;
        const fillBtn = document.getElementById('hk-fill-btn');
        const searchBtn = document.getElementById('hk-search-btn');
        const downloadBtn = document.getElementById('hk-download-btn');
        const stopBtn = document.getElementById('hk-stop-btn');
        if (fillBtn) {
          fillBtn.style.display = 'inline-block';
          fillBtn.disabled = false;
        }
        if (searchBtn) {
          searchBtn.style.display = 'inline-block';
          searchBtn.disabled = false;
        }
        if (downloadBtn) downloadBtn.style.display = 'none';
        if (stopBtn) stopBtn.style.display = 'none';
        return;
      }

      updateStatus(`找到 ${reports.length} 份业绩报，开始下载...`, 'success');
      console.log(`找到 ${reports.length} 份业绩报，开始下载`);
      console.log('业绩报列表:', reports.map(r => `${r.date} - ${r.title}`));
      updateProgress(0, reports.length);

      // 下载业绩报
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < reports.length; i++) {
        if (stopFlag) {
          updateStatus('已停止下载', 'warning');
          break;
        }

        const report = reports[i];
        updateStatus(`下载 ${i + 1}/${reports.length}: ${report.title}`, 'info');
        console.log(`下载 ${i + 1}/${reports.length}: ${report.title}`);
        console.log('下载URL:', report.url);

        try {
          const filename = `${stockCode}_${report.date}_${report.title.replace(/[<>:"/\\|?*]/g, '_')}.pdf`;
          console.log('文件名:', filename);
          await downloadFile(report.url, filename, stockCode);
          successCount++;
          console.log(`✓ 下载成功: ${report.title}`);
          updateStatus(`✓ 下载成功: ${report.title}`, 'success');
        } catch (error) {
          failCount++;
          console.error(`✗ 下载失败: ${report.title}`, error);
          updateStatus(`✗ 下载失败: ${report.title} - ${error.message}`, 'error');
        }

        updateProgress(i + 1, reports.length);

        // 延迟，避免请求过快
        if (i < reports.length - 1) {
          await delay(1000);
        }
      }

      console.log(`下载完成：成功 ${successCount} 份，失败 ${failCount} 份`);
      updateStatus(`下载完成：成功 ${successCount} 份，失败 ${failCount} 份`, 'success');

    } catch (error) {
      console.error('下载过程出错:', error);
      updateStatus(`下载失败: ${error.message}`, 'error');
    } finally {
      isRunning = false;
      const fillBtn = document.getElementById('hk-fill-btn');
      const searchBtn = document.getElementById('hk-search-btn');
      const downloadBtn = document.getElementById('hk-download-btn');
      const stopBtn = document.getElementById('hk-stop-btn');
      if (fillBtn) {
        fillBtn.style.display = 'inline-block';
        fillBtn.disabled = false;
      }
      if (searchBtn) {
        searchBtn.style.display = 'none';
        searchBtn.disabled = false;
      }
      if (downloadBtn) downloadBtn.style.display = 'inline-block';
      if (stopBtn) stopBtn.style.display = 'none';
    }
  }

  // 停止下载
  function stopDownload() {
    stopFlag = true;
    isRunning = false;
    updateStatus('正在停止...', 'warning');

    const fillBtn = document.getElementById('hk-fill-btn');
    const searchBtn = document.getElementById('hk-search-btn');
    const downloadBtn = document.getElementById('hk-download-btn');
    const stopBtn = document.getElementById('hk-stop-btn');

    if (fillBtn) {
      fillBtn.style.display = 'inline-block';
      fillBtn.disabled = false;
    }
    if (searchBtn) {
      searchBtn.disabled = false;
    }
    if (downloadBtn) downloadBtn.style.display = 'none';
    if (stopBtn) stopBtn.style.display = 'none';
  }

  // 初始化
  function init() {
    if (isSearchPage()) {
      createControlPanel();

      // 恢复保存的股票代码
      const savedCode = localStorage.getItem('hk-reports-stock-code');
      const savedStartDate = localStorage.getItem('hk-reports-start-date');
      const savedEndDate = localStorage.getItem('hk-reports-end-date');

      if (savedCode) {
        const codeInput = document.getElementById('hk-stock-code');
        if (codeInput) codeInput.value = savedCode;
      }
      if (savedStartDate) {
        const startInput = document.getElementById('hk-start-date');
        if (startInput) startInput.value = savedStartDate;
      }
      if (savedEndDate) {
        const endInput = document.getElementById('hk-end-date');
        if (endInput) endInput.value = savedEndDate;
      }

      // 延迟检查搜索结果（等待页面完全加载）
      setTimeout(checkSearchResults, 2000);
    }
  }

  // 页面加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 监听URL变化（单页应用）
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      setTimeout(init, 1000);
    }
  }).observe(document, { subtree: true, childList: true });

})();
