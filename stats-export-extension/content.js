(function () {
  function createExportButton() {
    var btn = document.createElement('button');
    btn.id = 'retail-export-btn-202508';
    btn.textContent = '导出主要数据（.xls）';
    btn.type = 'button';
    btn.className = 'retail-export-btn';
    btn.addEventListener('click', function() {
      if (!document.getElementById('retail-export-panel')) {
        injectBatchPanel();
      }
      var panel = document.getElementById('retail-export-panel');
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }, false);
    document.documentElement.appendChild(btn);
  }

  function onExportClick() {
    var table = findRetailTable(document);
    if (!table) {
      alert('未找到可导出的表格');
      return;
    }

    exportTableAsXls(table, buildDefaultFilename());
  }

  function buildDefaultFilename() {
    var ym = extractYearMonthPeriod(document);
    var dateStr = ym ? (ym.year + '-' + ym.period) : extractDateForSheetName(document, location.href);
    return buildRawFilename(dateStr, document.title, 'xls');
  }

  function exportTableAsXls(table, filename) {
    var cloned = table.cloneNode(true);
    cleanupTable(cloned);

    var html = (
      '<html><head><meta charset="utf-8" />' +
      '<style>table{border-collapse:collapse;}td,th{border:1px solid #333;padding:4px;white-space:nowrap;}</style>' +
      '</head><body>' + cloned.outerHTML + '</body></html>'
    );

    var blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel' });
    var url = URL.createObjectURL(blob);

    var a = document.createElement('a');
    a.href = url;
    a.download = filename || '社会消费品零售总额.xls';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(url);
      if (a && a.parentNode) a.parentNode.removeChild(a);
    }, 1000);
  }

  function injectBatchPanel() {
    var now = new Date();
    var defaultMax = now.getFullYear();
    var defaultMin = defaultMax - 25;

    var panel = document.createElement('div');
    panel.id = 'retail-export-panel';
    panel.className = 'retail-export-panel';

    panel.innerHTML = '' +
      '<div class="rep-header">数据工具<button type="button" id="rep-close" style="float:right;background:none;border:none;font-size:18px;cursor:pointer;">×</button></div>' +
      '<div class="rep-tabs" style="display:flex;border-bottom:1px solid #ddd;gap:8px;padding:6px 8px;">' +
      '  <button type="button" class="rep-tab rep-tab-active" id="rep-tab-table" style="padding:4px 8px;cursor:pointer;">表格导出</button>' +
      '  <button type="button" class="rep-tab" id="rep-tab-text" style="padding:4px 8px;cursor:pointer;">文本解析</button>' +
      '  <button type="button" class="rep-tab" id="rep-tab-single" style="padding:4px 8px;cursor:pointer;">指定页</button>' +
      '</div>' +
      '<div class="rep-body" id="rep-body-table">' +
      '  <div class="rep-row">' +
      '    <button type="button" class="rep-btn" id="rep-export-current">当前页导出</button>' +
      '    <button type="button" class="rep-btn" id="rep-collect-links">收集本页链接</button>' +
      '    <label style="margin-left:8px;">前</label>' +
      '    <input id="rep-limit" type="number" min="1" style="width:80px" placeholder="全部" />' +
      '    <label>条</label>' +
      '  </div>' +
      '  <div class="rep-row">' +
      '    <label>年份范围：</label>' +
      '    <input id="rep-year-min" type="number" style="width:96px" value="' + defaultMin + '" /> - ' +
      '    <input id="rep-year-max" type="number" style="width:96px" value="' + defaultMax + '" />' +
      '  </div>' +
      '  <div class="rep-row">' +
      '    <label>标题包含：</label>' +
      '    <input id="rep-title-filter" type="text" style="width:260px" placeholder="例如：社会消费品 零售 主要数据" />' +
      '  </div>' +
      '  <div class="rep-row">' +
      '    <label><input id="rep-use-related-dataset" type="checkbox" checked /> 优先使用“相关数据表”下载的Excel</label>' +
      '  </div>' +
      '  <textarea id="rep-links" class="rep-textarea" placeholder="每行一个链接，支持从列表页收集或手动粘贴"></textarea>' +
      '  <div class="rep-row">' +
      '    <button type="button" class="rep-btn" id="rep-batch-related-raw">原样下载“相关数据表”（逐条，保留格式）</button>' +
      '  </div>' +
      '  <div class="rep-row">' +
      '    <button type="button" class="rep-btn" id="rep-batch-related-merge">批量抓取“相关数据表”并合并为一表（.xls）</button>' +
      '  </div>' +
      '  <div class="rep-row">' +
      '    <button type="button" class="rep-btn primary" id="rep-batch-export">批量抓取并分表导出（.xls）</button>' +
      '  </div>' +
      '  <div class="rep-tips">提示：支持按年份与标题过滤；可优先下载“相关数据表”，或直接导出页面表格。</div>' +
      '</div>' +
      '<div class="rep-body" id="rep-body-text" style="display:none;">' +
      '  <div class="rep-row">' +
      '    <button type="button" class="rep-btn" id="rep-text-export-current">当前页解析并导出（.xls）</button>' +
      '    <button type="button" class="rep-btn" id="rep-text-collect-links">收集本页链接</button>' +
      '    <label style="margin-left:8px;">前</label>' +
      '    <input id="rep-text-limit" type="number" min="1" style="width:80px" placeholder="全部" />' +
      '    <label>条</label>' +
      '  </div>' +
      '  <div class="rep-row">' +
      '    <label>年份范围：</label>' +
      '    <input id="rep-text-year-min" type="number" style="width:96px" value="' + defaultMin + '" /> - ' +
      '    <input id="rep-text-year-max" type="number" style="width:96px" value="' + defaultMax + '" />' +
      '  </div>' +
      '  <div class="rep-row">' +
      '    <label>标题包含：</label>' +
      '    <input id="rep-text-title-filter" type="text" style="width:260px" placeholder="例如：能源 生产 情况" />' +
      '  </div>' +
      '  <textarea id="rep-text-links" class="rep-textarea" placeholder="每行一个链接，支持从列表页收集或手动粘贴"></textarea>' +
      '  <div class="rep-row">' +
      '    <button type="button" class="rep-btn primary" id="rep-text-batch-export">批量解析文本并合并为一表（.xls）</button>' +
      '  </div>' +
      '  <div class="rep-row">' +
      '    <textarea id="rep-test-text" placeholder="贴入文本进行测试解析" style="width:100%;height:80px;margin:4px 0;"></textarea>' +
      '    <button type="button" class="rep-btn" id="rep-test-parse">测试解析</button>' +
      '  </div>' +
      '  <div id="rep-test-result" style="margin:4px 0;padding:4px;background:#f5f5f5;font-family:monospace;font-size:12px;white-space:pre-wrap;max-height:200px;overflow-y:auto;"></div>' +
      '  <div class="rep-tips">解析要点：提取"类目-产量-日均"与"分品种-同比增速"，并合并输出。</div>' +
      '</div>' +
      '<div class="rep-body" id="rep-body-single" style="display:none;">' +
      '  <div class="rep-row">' +
      '    <label>页面链接：</label>' +
      '    <input id="rep-single-url" type="text" style="width:100%;box-sizing:border-box;" />' +
      '  </div>' +
      '  <div class="rep-row">' +
      '    <button type="button" class="rep-btn" id="rep-single-collect-links">收集本页链接</button>' +
      '    <label style="margin-left:8px;">前</label>' +
      '    <input id="rep-single-limit" type="number" min="1" style="width:80px" placeholder="全部" />' +
      '    <label>条</label>' +
      '  </div>' +
      '  <div class="rep-row">' +
      '    <label>年份范围：</label>' +
      '    <input id="rep-single-year-min" type="number" style="width:96px" value="' + defaultMin + '" /> - ' +
      '    <input id="rep-single-year-max" type="number" style="width:96px" value="' + defaultMax + '" />' +
      '  </div>' +
      '  <div class="rep-row">' +
      '    <label>标题包含：</label>' +
      '    <input id="rep-single-title-filter" type="text" style="width:260px" placeholder="例如：社会消费品 零售 主要数据" />' +
      '  </div>' +
      '  <div class="rep-row">' +
      '    <label><input id="rep-single-use-related-dataset" type="checkbox" checked /> 优先使用“相关数据表”下载的Excel</label>' +
      '  </div>' +
      '  <textarea id="rep-single-links" class="rep-textarea" placeholder="每行一个链接，支持从列表页收集或手动粘贴"></textarea>' +
      '  <div class="rep-row">' +
      '    <button type="button" class="rep-btn primary" id="rep-single-export">抓取该页首表并导出（.xls）</button>' +
      '  </div>' +
      '  <div class="rep-row">' +
      '    <button type="button" class="rep-btn primary" id="rep-single-batch-export">批量抓取并分表导出（.xls）</button>' +
      '  </div>' +
      '  <div class="rep-row">' +
      '    <button type="button" class="rep-btn" id="rep-single-batch-export-one">批量逐页单表导出（.xls，多文件）</button>' +
      '  </div>' +
      '  <div class="rep-tips">说明：将打开链接并提取页面中面积最大的表格为Excel。若存在“相关数据表”可优先使用表格内容。</div>' +
      '</div>';

    document.documentElement.appendChild(panel);
    
    // 初始隐藏面板
    panel.style.display = 'none';

    document.getElementById('rep-close').addEventListener('click', function () {
      panel.style.display = 'none';
    }, false);

    // tabs
    document.getElementById('rep-tab-table').addEventListener('click', function(){
      document.getElementById('rep-body-table').style.display = 'block';
      document.getElementById('rep-body-text').style.display = 'none';
      this.className = 'rep-tab rep-tab-active';
      document.getElementById('rep-tab-text').className = 'rep-tab';
    }, false);
    document.getElementById('rep-tab-text').addEventListener('click', function(){
      document.getElementById('rep-body-table').style.display = 'none';
      document.getElementById('rep-body-text').style.display = 'block';
      document.getElementById('rep-body-single').style.display = 'none';
      this.className = 'rep-tab rep-tab-active';
      document.getElementById('rep-tab-table').className = 'rep-tab';
      document.getElementById('rep-tab-single').className = 'rep-tab';
    }, false);

    document.getElementById('rep-tab-single').addEventListener('click', function(){
      document.getElementById('rep-body-table').style.display = 'none';
      document.getElementById('rep-body-text').style.display = 'none';
      document.getElementById('rep-body-single').style.display = 'block';
      this.className = 'rep-tab rep-tab-active';
      document.getElementById('rep-tab-table').className = 'rep-tab';
      document.getElementById('rep-tab-text').className = 'rep-tab';
    }, false);

    document.getElementById('rep-export-current').addEventListener('click', function () {
      var table = findRetailTable(document);
      if (!table) {
        alert('未找到可导出的表格');
        return;
      }
      exportTableAsXls(table, buildDefaultFilename());
    }, false);

    document.getElementById('rep-collect-links').addEventListener('click', function () {
      var minYear = parseInt(document.getElementById('rep-year-min').value, 10);
      var maxYear = parseInt(document.getElementById('rep-year-max').value, 10);
      if (isNaN(minYear) || isNaN(maxYear) || minYear > maxYear) {
        var now = new Date();
        maxYear = now.getFullYear();
        minYear = maxYear - 25;
      }
      var lim = parseInt(document.getElementById('rep-limit').value, 10);
      var links = collectLikelyBulletinLinksFiltered(minYear, maxYear, (isNaN(lim)?0:lim));
      var ta = document.getElementById('rep-links');
      ta.value = links.join('\n');
      alert('已收集（按年份 ' + minYear + '–' + maxYear + ' 过滤）' + links.length + ' 条链接');
    }, false);

    document.getElementById('rep-batch-export').addEventListener('click', function () {
      var cfg = readBatchConfig();
      if (!cfg.urls.length) { alert('请先粘贴或收集链接'); return; }
      batchFetchAndExportAsSheetsWithYearRange(cfg.urls, cfg.minYear, cfg.maxYear, cfg.titleFilter, cfg.preferRelated);
    }, false);

    document.getElementById('rep-batch-related-merge').addEventListener('click', function () {
      var cfg = readBatchConfig();
      if (!cfg.urls.length) { alert('请先粘贴或收集链接'); return; }
      batchDownloadRelatedAndMergeOneSheet(cfg.urls, cfg.minYear, cfg.maxYear, cfg.titleFilter);
    }, false);

    document.getElementById('rep-batch-related-raw').addEventListener('click', function () {
      var cfg = readBatchConfig();
      if (!cfg.urls.length) { alert('请先粘贴或收集链接'); return; }
      batchDownloadRelatedRaw(cfg.urls, cfg.minYear, cfg.maxYear, cfg.titleFilter);
    }, false);

    // text parsing actions
    document.getElementById('rep-text-export-current').addEventListener('click', function(){
      var rowsObj = extractEnergyStatsFromDoc(document);
      if (!rowsObj || (!rowsObj.mainRows.length && !rowsObj.varietyRows.length)) { alert('未解析到有效文本数据'); return; }
      var ym = extractYearMonthPeriod(document);
      var dateStr = ym ? (ym.year + '-' + ym.period) : extractDateForSheetName(document, location.href);
      var sheets = [];
      if (rowsObj.mainRows.length) sheets.push({ name: sanitizeSheetName('主要产品'), rows: rowsObj.mainRows, dateNum: 0 });
      var fname = (ym ? ('energy_'+ym.year+'-'+ym.period+'.xls') : buildRawFilename(dateStr, document.title, 'xls'));
      exportSheetsAsExcelXml(sheets, fname);
    }, false);

    document.getElementById('rep-text-batch-export').addEventListener('click', function(){
      var ta = document.getElementById('rep-text-links');
      var urls = (ta.value || '').split(/\n+/).map(function(s){return s.trim();}).filter(function(s){return !!s;});
      if (!urls.length) { alert('请先粘贴或收集链接'); return; }
      var minYear = parseInt(document.getElementById('rep-text-year-min').value, 10);
      var maxYear = parseInt(document.getElementById('rep-text-year-max').value, 10);
      if (isNaN(minYear) || isNaN(maxYear) || minYear > maxYear) { var now = new Date(); maxYear = now.getFullYear(); minYear = maxYear - 25; }
      var titleFilter = (document.getElementById('rep-text-title-filter').value || '').trim();
      batchParseTextAndExport(urls, minYear, maxYear, titleFilter);
    }, false);

    document.getElementById('rep-text-collect-links').addEventListener('click', function(){
      var minYear = parseInt(document.getElementById('rep-text-year-min').value, 10);
      var maxYear = parseInt(document.getElementById('rep-text-year-max').value, 10);
      if (isNaN(minYear) || isNaN(maxYear) || minYear > maxYear) {
        var now = new Date();
        maxYear = now.getFullYear();
        minYear = maxYear - 25;
      }
      var lim = parseInt(document.getElementById('rep-text-limit').value, 10);
      var links = collectLikelyBulletinLinksFiltered(minYear, maxYear, (isNaN(lim)?0:lim));
      var ta = document.getElementById('rep-text-links');
      ta.value = links.join('\n');
      alert('已收集（按年份 ' + minYear + '–' + maxYear + ' 过滤）' + links.length + ' 条链接');
    }, false);

    document.getElementById('rep-test-parse').addEventListener('click', function(){
      var testText = document.getElementById('rep-test-text').value.trim();
      if (!testText) { alert('请输入测试文本'); return; }
      
      // 模拟文档对象（从页面标题中提取日期信息）
      var realTitle = document.title || '';
      var mockDoc = {
        body: { innerText: testText },
        title: realTitle,
        querySelector: function(sel) { 
          if (sel === 'h1' || sel === 'h2') {
            var h = document.querySelector(sel);
            return h ? { textContent: h.textContent || '' } : null;
          }
          return null; 
        }
      };
      
      var result = extractEnergyStatsFromDoc(mockDoc);
      var output = '';
      if (result.mainRows && result.mainRows.length > 1) {
        output += '主要产品数据：\n';
        for (var i = 0; i < result.mainRows.length; i++) {
          output += result.mainRows[i].join('\t') + '\n';
        }
      } else {
        output += '未解析到主要产品数据\n';
      }
      
      document.getElementById('rep-test-result').textContent = output;
    }, false);

    // 指定页：预填用户给出的链接
    try { var preset = 'https://www.stats.gov.cn/sj/zxfb/202509/t20250912_1961169.html'; var inp = document.getElementById('rep-single-url'); if (inp && !inp.value) inp.value = preset; } catch (e) {}

    // 指定页导出逻辑
    document.getElementById('rep-single-export').addEventListener('click', function(){
      var url = (document.getElementById('rep-single-url').value || '').trim();
      if (!url) { alert('请先输入页面链接'); return; }
      fetchPage(url).then(function(page){
        var doc = page.doc; var base = page.url || url;
        var table = findRetailTable(doc);
        if (!table) { alert('未找到可导出的表格'); return; }
        var ym = extractYearMonthPeriod(doc);
        var dateStr = ym ? (ym.year + '-' + ym.period) : extractDateForSheetName(doc, base);
        exportTableAsXls(table, buildRawFilename(dateStr, doc.title, 'xls'));
      }).catch(function(){ alert('抓取失败，请检查链接是否可访问'); });
    }, false);

    // 指定页：收集本页链接（复制“表格导出”中的功能）
    document.getElementById('rep-single-collect-links').addEventListener('click', function () {
      var minYear = parseInt(document.getElementById('rep-single-year-min').value, 10);
      var maxYear = parseInt(document.getElementById('rep-single-year-max').value, 10);
      if (isNaN(minYear) || isNaN(maxYear) || minYear > maxYear) {
        var now2 = new Date();
        maxYear = now2.getFullYear();
        minYear = maxYear - 25;
      }
      var lim2 = parseInt(document.getElementById('rep-single-limit').value, 10);
      var links2 = collectLikelyBulletinLinksFiltered(minYear, maxYear, (isNaN(lim2)?0:lim2));
      var ta2 = document.getElementById('rep-single-links');
      ta2.value = links2.join('\n');
      alert('已收集（按年份 ' + minYear + '–' + maxYear + ' 过滤）' + links2.length + ' 条链接');
    }, false);

    // 指定页：批量导出
    document.getElementById('rep-single-batch-export').addEventListener('click', function () {
      var cfg2 = readSingleBatchConfig();
      if (!cfg2.urls.length) { alert('请先粘贴或收集链接'); return; }
      batchFetchAndExportAsSheetsWithYearRange(cfg2.urls, cfg2.minYear, cfg2.maxYear, cfg2.titleFilter, cfg2.preferRelated);
    }, false);

    // 指定页：批量逐页单表导出（每个链接生成一个文件）
    document.getElementById('rep-single-batch-export-one').addEventListener('click', function(){
      var cfg3 = readSingleBatchConfig();
      if (!cfg3.urls.length) { alert('请先粘贴或收集链接'); return; }
      batchExportSingleFiles(cfg3.urls, cfg3.minYear, cfg3.maxYear, cfg3.titleFilter, cfg3.preferRelated);
    }, false);
  }

  function readBatchConfig() {
    var ta = document.getElementById('rep-links');
    var raw = (ta.value || '').split(/\n+/).map(function (s) { return s.trim(); }).filter(function (s) { return !!s; });
    var minYear = parseInt(document.getElementById('rep-year-min').value, 10);
    var maxYear = parseInt(document.getElementById('rep-year-max').value, 10);
    if (isNaN(minYear) || isNaN(maxYear) || minYear > maxYear) { minYear = 1990; maxYear = (new Date()).getFullYear(); }
    var titleFilter = (document.getElementById('rep-title-filter').value || '').trim();
    var preferRelated = !!document.getElementById('rep-use-related-dataset').checked;
    return { urls: raw, minYear: minYear, maxYear: maxYear, titleFilter: titleFilter, preferRelated: preferRelated };
  }

  function readSingleBatchConfig() {
    var ta = document.getElementById('rep-single-links');
    var raw = (ta.value || '').split(/\n+/).map(function (s) { return s.trim(); }).filter(function (s) { return !!s; });
    var minYear = parseInt(document.getElementById('rep-single-year-min').value, 10);
    var maxYear = parseInt(document.getElementById('rep-single-year-max').value, 10);
    if (isNaN(minYear) || isNaN(maxYear) || minYear > maxYear) { var now = new Date(); maxYear = now.getFullYear(); minYear = maxYear - 25; }
    var titleFilter = (document.getElementById('rep-single-title-filter').value || '').trim();
    var preferRelated = !!document.getElementById('rep-single-use-related-dataset').checked;
    return { urls: raw, minYear: minYear, maxYear: maxYear, titleFilter: titleFilter, preferRelated: preferRelated };
  }

  // 批量逐页单表导出：每个链接导出一个excel；文件名从标题/头部提取“年份-月份”
  function batchExportSingleFiles(urls, minYear, maxYear, titleFilter, preferRelated){
    var pre = []; for (var i = 0; i < urls.length; i++) { var y = extractYearFromUrl(urls[i]); if (y === 0 || (y >= minYear && y <= maxYear)) pre.push(urls[i]); }
    if (!pre.length) { alert('无符合年份范围的链接'); return; }
    var keywords = parseKeywords(titleFilter);
    var idx = 0; var succ = 0; var skip = 0;
    function next(){
      if (idx >= pre.length) { alert('完成：成功 '+succ+' 条，跳过 '+skip+' 条'); return; }
      var pageUrl = pre[idx++];
      fetchPage(pageUrl).then(function(page){
        var doc = page.doc, base = page.url;
        if (keywords.length) { var t = extractPageTitleText(doc); if (!matchAllKeywords(t, keywords)) { skip++; next(); return; } }
        var ymx = extractYearMonthPeriod(doc);
        var dateStr = ymx ? (ymx.year + '-' + ymx.period) : extractDateForSheetName(doc, base);
        if (preferRelated) {
          var rel = findRelatedDatasetLink(doc, base);
          if (rel) {
            fetch(rel, { credentials: 'include' }).then(function(res){
              if (!res.ok) { // 回退到页面表格
                var t0 = findRetailTable(doc);
                if (t0) { exportTableAsXls(t0, buildRawFilename(dateStr, doc.title, 'xls')); succ++; next(); return; }
                skip++; next(); return;
              }
              res.blob().then(function(blob){
                var ext = guessExtFromHeaders(res) || guessExtFromUrl(rel) || 'xls';
                triggerBlobDownload(blob, buildRawFilename(dateStr, doc.title, ext));
                succ++; next();
              }).catch(function(){ var t1 = findRetailTable(doc); if (t1) { exportTableAsXls(t1, buildRawFilename(dateStr, doc.title, 'xls')); succ++; } else { skip++; } next(); });
            }).catch(function(){ var t2 = findRetailTable(doc); if (t2) { exportTableAsXls(t2, buildRawFilename(dateStr, doc.title, 'xls')); succ++; } else { skip++; } next(); });
            return;
          }
        }
        var table = findRetailTable(doc);
        if (table) { exportTableAsXls(table, buildRawFilename(dateStr, doc.title, 'xls')); succ++; } else { skip++; }
        next();
      }).catch(function(){ skip++; next(); });
    }
    next();
  }

  function collectLikelyBulletinLinks() {
    var anchors = document.querySelectorAll('a[href]');
    var list = [];
    for (var i = 0; i < anchors.length; i++) {
      var href = anchors[i].getAttribute('href') || '';
      var abs = toAbsoluteUrl(href);
      if (!abs) continue;
      if (/\/sj\//.test(abs) && /\d{4}\d{2}/.test(abs)) { list.push(abs); }
    }
    var map = {}; var unique = [];
    for (var j = 0; j < list.length; j++) { var u = list[j]; if (map[u]) continue; map[u] = true; unique.push(u); }
    return unique;
  }

  function collectLikelyBulletinLinksFiltered(minYear, maxYear, limit) {
    var all = collectLikelyBulletinLinks();
    var out = [];
    var cap = (typeof limit === 'number' && limit > 0) ? limit : 1000000000;
    for (var i = 0; i < all.length && out.length < cap; i++) {
      var y = extractYearFromUrl(all[i]);
      if (y === 0 || (y >= minYear && y <= maxYear)) out.push(all[i]);
    }
    return out;
  }

  function toAbsoluteUrl(href) {
    try { if (!href || /^javascript:/i.test(href)) return ''; var u = new URL(href, location.href); return u.href; } catch (e) { return ''; }
  }

  // === Added back: raw download, merge-to-single-xls, split export ===
  function batchDownloadRelatedRaw(urls, minYear, maxYear, titleFilter) {
    var pre = []; for (var i = 0; i < urls.length; i++) { var y = extractYearFromUrl(urls[i]); if (y === 0 || (y >= minYear && y <= maxYear)) pre.push(urls[i]); }
    if (!pre.length) { alert('无符合年份范围的链接'); return; }
    var keywords = parseKeywords(titleFilter);
    var idx = 0; var success = 0; var skipped = 0;
    function next(){
      if (idx >= pre.length) { alert('原样下载完成：成功 ' + success + ' 条，跳过 ' + skipped + ' 条'); return; }
      var pageUrl = pre[idx++];
      fetchPage(pageUrl).then(function(page){
        var doc = page.doc, base = page.url; if (keywords.length) { var t = extractPageTitleText(doc); if (!matchAllKeywords(t, keywords)) { skipped++; next(); return; } }
        var dateStr = extractDateForSheetName(doc, base); var rel = findRelatedDatasetLink(doc, base); if (!rel) { skipped++; next(); return; }
        fetch(rel, { credentials: 'include' }).then(function(res){ if (!res.ok) { window.open(rel, '_blank'); skipped++; next(); return; }
          res.blob().then(function(blob){ var ext = guessExtFromHeaders(res) || guessExtFromUrl(rel) || 'xls'; var name = buildRawFilename(dateStr, doc.title, ext); triggerBlobDownload(blob, name); success++; next(); }).catch(function(){ window.open(rel, '_blank'); skipped++; next(); });
        }).catch(function(){ window.open(rel, '_blank'); skipped++; next(); });
      }).catch(function(){ skipped++; next(); });
    }
    next();
  }

  function triggerBlobDownload(blob, filename) {
    try { var url = URL.createObjectURL(blob); var a = document.createElement('a'); a.href = url; a.download = filename || 'download'; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(url); if(a&&a.parentNode)a.parentNode.removeChild(a); }, 1000); } catch (e) {}
  }
  function buildRawFilename(dateStr, title, ext) { var base = (dateStr || '').replace(/[^0-9-]/g, ''); var t = (title || '').replace(/\s+/g,'').slice(0,40) || '相关数据表'; return (base?base+'_':'') + t + '.' + ext; }
  function guessExtFromHeaders(res){ try{ var ct = res.headers && res.headers.get && res.headers.get('content-type'); if(!ct) return ''; if(/officedocument\.spreadsheetml\.sheet/i.test(ct)) return 'xlsx'; if(/sheet|excel|spreadsheetml/i.test(ct)) return 'xls'; if(/csv/i.test(ct)) return 'csv'; if(/html/i.test(ct)) return 'xls'; return ''; }catch(e){ return ''; } }
  function guessExtFromUrl(url){ try{ var u = new URL(url, location.href); var m = (u.pathname||'').match(/\.([a-z0-9]+)$/i); return m&&m[1]?m[1].toLowerCase():''; }catch(e){ return ''; } }

  function batchDownloadRelatedAndMergeOneSheet(urls, minYear, maxYear, titleFilter) {
    var pre = []; for (var i = 0; i < urls.length; i++) { var y = extractYearFromUrl(urls[i]); if (y === 0 || (y >= minYear && y <= maxYear)) pre.push(urls[i]); }
    if (!pre.length) { alert('无符合年份范围的链接'); return; }
    var keywords = parseKeywords(titleFilter); var allRows = []; var idx = 0; var headerKey = '';
    function next(){
      if (idx >= pre.length) { if (!allRows.length) { alert('未获取到任何数据表'); return; } exportRowsAsSingleSheet(allRows, '相关数据表_合并_'+minYear+'-'+maxYear+'.xls'); return; }
      var pageUrl = pre[idx++];
      fetchPage(pageUrl).then(function(page){
        var doc = page.doc, base = page.url; if (keywords.length) { var t = extractPageTitleText(doc); if (!matchAllKeywords(t, keywords)) { next(); return; } }
        var ym2 = extractYearMonthPeriod(doc);
        var dateStr = ym2 ? (ym2.year + '-' + ym2.period) : extractDateForSheetName(doc, base);
        var y2 = dateStr?parseInt(dateStr.slice(0,4),10):0; if (y2 && (y2<minYear || y2>maxYear)) { next(); return; }
        var rel = findRelatedDatasetLink(doc, base); if (!rel) { next(); return; }
        fetch(rel, { credentials: 'include' }).then(function(res){ if (!res.ok) { next(); return; }
          res.arrayBuffer().then(function(buf){ parseExcelLikeRobust({ buf: buf, res: res }).then(function(rows){ if(rows && rows.length){ var d = dateStr || ''; for (var r=0;r<rows.length;r++){ var row = rows[r].slice(); if (r===0){ var key = row.join('|'); if (!headerKey){ headerKey = key; row.unshift('日期'); allRows.push(row); } else if (headerKey !== key){ row.unshift('日期'); allRows.push(row); } } else { row.unshift(d); allRows.push(row); } } } next(); }).catch(function(){ next(); }); }).catch(function(){ next(); });
        }).catch(function(){ next(); });
      }).catch(function(){ next(); });
    }
    next();
  }

  function exportRowsAsSingleSheet(rows, filename) {
    var xml=[]; xml.push('<?xml version="1.0" encoding="UTF-8"?>'); xml.push('<?mso-application progid="Excel.Sheet"?>'); xml.push('<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">'); xml.push('<Styles><Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center"/><Borders/><Font ss:FontName="Arial" ss:Size="10"/></Style></Styles>'); xml.push('<Worksheet ss:Name="合并数据"><Table>'); for (var r=0;r<rows.length;r++){ xml.push('<Row>'); var cells=rows[r]; for (var c=0;c<cells.length;c++){ xml.push('<Cell><Data ss:Type="String">'+String(cells[c]==null?'':cells[c]).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/\'/g,'&apos;')+'</Data></Cell>'); } xml.push('</Row>'); } xml.push('</Table></Worksheet></Workbook>'); var blob=new Blob(['\ufeff',xml.join('')],{type:'application/vnd.ms-excel;charset=utf-8'}); var url=URL.createObjectURL(blob); var a=document.createElement('a'); a.href=url; a.download=filename||'合并数据.xls'; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(url); if(a&&a.parentNode)a.parentNode.removeChild(a); },1000);
  }

  function batchFetchAndExportAsSheetsWithYearRange(urls, minYear, maxYear, titleFilter, preferRelated) {
    var pre = []; for (var i = 0; i < urls.length; i++) { var y = extractYearFromUrl(urls[i]); if (y === 0 || (y >= minYear && y <= maxYear)) pre.push(urls[i]); }
    if (!pre.length) { alert('无符合年份范围的链接'); return; }
    var keywords = parseKeywords(titleFilter); var sheets = []; var idx = 0;
    function next(){
      if (idx >= pre.length) { if (!sheets.length) { alert('未抓取到任何有效表格'); return; } sheets.sort(function(a,b){ return (a.dateNum||0)-(b.dateNum||0); }); exportSheetsAsExcelXml(sheets, '社会消费品零售总额_批量分表_'+minYear+'-'+maxYear+'.xls'); return; }
      var pageUrl = pre[idx++]; fetchPage(pageUrl).then(function(page){ var doc = page.doc, base = page.url; if (keywords.length) { var t = extractPageTitleText(doc); if (!matchAllKeywords(t, keywords)) { next(); return; } } var dateStr; var ymx = extractYearMonthPeriod(doc); dateStr = ymx ? (ymx.year + '-' + ymx.period) : extractDateForSheetName(doc, base); var y2=0, dateNum=0; if (dateStr && /^\d{4}-(?:\d{1,2}(?:-\d{1,2})?)$/.test(dateStr)) { y2 = parseInt(dateStr.slice(0,4),10); dateNum = parseInt(dateStr.replace(/-/g,''),10); } if (y2 && (y2<minYear || y2>maxYear)) { next(); return; } if (preferRelated) { var rel = findRelatedDatasetLink(doc, base); if (rel) { fetch(rel,{credentials:'include'}).then(function(res){ if(!res.ok){ var t0=findRetailTable(doc); if(t0) sheets.push({ name: sanitizeSheetName(dateStr||('Sheet'+idx)), rows: tableToRowsArray(t0), dateNum: dateNum }); next(); return; } parseExcelLikeRobust({buf:null,res:res}).then(function(){ res.arrayBuffer().then(function(buf){ parseExcelLikeRobust({buf:buf,res:res}).then(function(rows){ if(rows&&rows.length){ sheets.push({ name: sanitizeSheetName(dateStr||('Sheet'+idx)), rows: rows, dateNum: dateNum }); next(); return; } var t1 = findRetailTable(doc); if (t1) sheets.push({ name: sanitizeSheetName(dateStr||('Sheet'+idx)), rows: tableToRowsArray(t1), dateNum: dateNum }); next(); }); }).catch(function(){ next(); }); }).catch(function(){ next(); }); }).catch(function(){ var t3=findRetailTable(doc); if(t3) sheets.push({ name: sanitizeSheetName(dateStr||('Sheet'+idx)), rows: tableToRowsArray(t3), dateNum: dateNum }); next(); }); return; } } var table = findRetailTable(doc); if (table) { sheets.push({ name: sanitizeSheetName(dateStr||('Sheet'+idx)), rows: tableToRowsArray(table), dateNum: dateNum }); } next(); }).catch(function(){ next(); });
    }
    next();
  }

  function exportSheetsAsExcelXml(sheets, filename){ var used={}; for(var i=0;i<sheets.length;i++){ var base=sheets[i].name; var name=base; var k=1; while(used[name]){ name=base+'_'+(++k);} used[name]=true; sheets[i].name=name; } var xml=[]; xml.push('<?xml version="1.0" encoding="UTF-8"?>'); xml.push('<?mso-application progid="Excel.Sheet"?>'); xml.push('<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">'); xml.push('<Styles><Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center"/><Borders/><Font ss:FontName="Arial" ss:Size="10"/></Style></Styles>'); for (var s=0;s<sheets.length;s++){ var sh=sheets[s]; xml.push('<Worksheet ss:Name="'+String(sh.name).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/\'/g,'&apos;')+'"><Table>'); var rows=sh.rows||[]; for (var r=0;r<rows.length;r++){ xml.push('<Row>'); var cells=rows[r]; for (var c=0;c<cells.length;c++){ var v=cells[c]==null?'':String(cells[c]); xml.push('<Cell><Data ss:Type="String">'+v.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/\'/g,'&apos;')+'</Data></Cell>'); } xml.push('</Row>'); } xml.push('</Table></Worksheet>'); } xml.push('</Workbook>'); var content=xml.join(''); var blob=new Blob(['\ufeff',content],{type:'application/vnd.ms-excel;charset=utf-8'}); var url=URL.createObjectURL(blob); var a=document.createElement('a'); a.href=url; a.download=filename||'批量分表.xls'; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(url); if(a&&a.parentNode)a.parentNode.removeChild(a); },1000); }

  // === 文本解析：能源生产通稿 ===
  function extractEnergyStatsFromDoc(doc){
    var text = (doc.body && doc.body.innerText) || '';
    text = text.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
    var ym = extractYearMonthPeriod(doc);
    var dateStr = ym ? (ym.year + '-' + ym.period) : extractDateForSheetName(doc, location.href);

    var mainRows = [];
    var varietyRows = [];

    // header rows
    mainRows.push(['日期','类目','产量','日均','单位','增速']);
    varietyRows.push(['日期','分品种','同比增速','单位']);

    // 主要产品：原煤/原油/原油加工/天然气/发电量（更宽松提取，适配不同标点/措辞）
    var specs = [
      { key: '原煤', amountKey: '原煤产量' },
      { key: '原油', amountKey: '原油产量' },
      { key: '原油加工', amountKey: '原油加工量' },
      { key: '天然气', amountKey: '天然气产量' },
      { key: '发电量', amountKey: '发电量' }
    ];
    for (var sIdx=0; sIdx<specs.length; sIdx++){
      var spec = specs[sIdx];
      var amount = '', amountUnit = '', daily = '', dailyUnit = '';

      // 先在关键词附近的片段中提取，提高鲁棒性
      var pos = text.indexOf(spec.key);
      var windowText = '';
      if (pos !== -1) {
        var start = Math.max(0, pos - 150);
        var end = Math.min(text.length, pos + 300);
        windowText = text.slice(start, end);
      }

      function pick(src){
        // 优先匹配包含月份的数据（如"6月份，发电量7399亿千瓦时"或"1—2月份，发电量1234亿千瓦时"）
        var reMonthFirst = new RegExp('(\d{1,2}(?:—\d{1,2})?)月份[^。]*?' + (spec.amountKey||spec.key) + '\s*([0-9.,]+)\s*([亿万]?(?:吨|千瓦时|立方米|亿千瓦时|亿立方米))');
        var mMonth = src.match(reMonthFirst);
        
        // 如果没匹配到，尝试更宽松的月份匹配（包含"生产"、"加工"等动词）
        if (!mMonth) {
          if (spec.key === '原油加工') {
            // 优先匹配同句的"原油加工量"
            var reMonthSame = /(\d{1,2}(?:—\d{1,2})?)月份[^。]*?(?:原油加工量|加工原油)\s*([0-9.,]+)\s*([亿万]?(?:吨|千瓦时|立方米|亿千瓦时|亿立方米))/;
            mMonth = src.match(reMonthSame);
            // 如果没匹配到，尝试跨句号匹配
            if (!mMonth) {
              var reMonthVeryLoose = /(\d{1,2}(?:—\d{1,2})?)月份[^。]*?[。][^。]*?(?:原油加工量|加工原油)\s*([0-9.,]+)\s*([亿万]?(?:吨|千瓦时|立方米|亿千瓦时|亿立方米))/;
              mMonth = src.match(reMonthVeryLoose);
            }
          } else if (spec.key === '原煤') {
            var reMonthLoose = /(\d{1,2}(?:—\d{1,2})?)月份[^。]*?(?:生产原煤|原煤产量)\s*([0-9.,]+)\s*([亿万]?(?:吨|千瓦时|立方米|亿千瓦时|亿立方米))/;
            mMonth = src.match(reMonthLoose);
          } else if (spec.key === '原油') {
            var reMonthLoose = /(\d{1,2}(?:—\d{1,2})?)月份[^。]*?(?:生产原油|原油产量)\s*([0-9.,]+)\s*([亿万]?(?:吨|千瓦时|立方米|亿千瓦时|亿立方米))/;
            mMonth = src.match(reMonthLoose);
          } else if (spec.key === '天然气') {
            var reMonthLoose = /(\d{1,2}(?:—\d{1,2})?)月份[^。]*?(?:生产天然气|天然气产量)\s*([0-9.,]+)\s*([亿万]?(?:吨|千瓦时|立方米|亿千瓦时|亿立方米))/;
            mMonth = src.match(reMonthLoose);
          } else if (spec.key === '发电量') {
            var reMonthLoose = /(\d{1,2}(?:—\d{1,2})?)月份[^。]*?(?:发电量|发电)\s*([0-9.,]+)\s*([亿万]?(?:千瓦时|亿千瓦时))/;
            mMonth = src.match(reMonthLoose);
          }
        }
        
        if (mMonth) {
          // 检查匹配的具体句子是否为累计值
          var matchedText = mMonth[0] || '';
          var isCumulative = /上半年|累计|1-\d+月/.test(matchedText);
          if (!isCumulative) {
            amount = (mMonth[2]||'').replace(/,/g,'');
            amountUnit = (mMonth[3]||'').replace(/\s+/g,'');
          }
        } else {
          // 非月份回退：仅接受“当月/本月”明确指代的句式，避免把“上半年/全年”误当成当月
          var mAmt = null;
          var monthHint = /(当月|本月)/;
          if (monthHint.test(src)) {
            if (spec.key === '原油加工') {
              mAmt = src.match(/(?:当月|本月)[^。]*?加工原油\s*([0-9.,]+)\s*([亿万]?(?:吨))/);
            } else if (spec.key === '发电量') {
              mAmt = src.match(/(?:当月|本月)[^。]*?发电(?:量)?\s*([0-9.,]+)\s*([亿万]?(?:千瓦时|亿千瓦时))/);
            } else if (spec.key === '原煤') {
              mAmt = src.match(/(?:当月|本月)[^。]*?生产原煤\s*([0-9.,]+)\s*([亿万]?(?:吨))/) || src.match(/(?:当月|本月)[^。]*?原煤产量\s*([0-9.,]+)\s*([亿万]?(?:吨))/);
            } else if (spec.key === '原油') {
              mAmt = src.match(/(?:当月|本月)[^。]*?生产原油\s*([0-9.,]+)\s*([亿万]?(?:吨))/) || src.match(/(?:当月|本月)[^。]*?原油产量\s*([0-9.,]+)\s*([亿万]?(?:吨))/);
            } else if (spec.key === '天然气') {
              mAmt = src.match(/(?:当月|本月)[^。]*?生产天然气\s*([0-9.,]+)\s*([亿万]?(?:立方米|亿立方米))/) || src.match(/(?:当月|本月)[^。]*?天然气产量\s*([0-9.,]+)\s*([亿万]?(?:立方米|亿立方米))/);
            }
          }
          if (mAmt) {
            // 检查前后文是否包含累计相关词
            var context = src.slice(Math.max(0, mAmt.index - 50), Math.min(src.length, mAmt.index + 50));
            var isCumulative = /上半年|累计|1-\d+月|1—\d+月/.test(context);
            if (!isCumulative) {
              amount = (mAmt[1]||'').replace(/,/g,'');
              amountUnit = (mAmt[2]||'').replace(/\s+/g,'');
            }
          }
        }
        var mDaily = src.match(/日均(?:产量|加工|发电(?:量)?)?(?:首次突破)?(?:为|达)?\s*([0-9.,]+)\s*([亿万]?(?:吨|千瓦时|立方米|亿千瓦时|亿立方米))/);
        if (mDaily) {
          daily = (mDaily[1]||'').replace(/,/g,'');
          dailyUnit = (mDaily[2]||'').replace(/\s+/g,'');
        }
      }

      // 优先尝试窗口文本中的月份匹配
      if (windowText) pick(windowText);
      
      // 先在全文优先做月份匹配，其次窗口，再回退
      // 全文优先
      if (!amount) pick(text);
      // 其次窗口文本
      if (!amount && windowText) pick(windowText);
      
      if (amount){
        mainRows.push([dateStr, spec.key, amount, daily, dailyUnit || amountUnit, '']);
      }

      // 进口提取：仅对 原煤/原油/天然气 尝试
      if (spec.key === '原煤' || spec.key === '原油' || spec.key === '天然气') {
        var importAmount = '', importUnit = '';
        function pickImportMonth(src){
          var patt = null;
          if (spec.key === '原煤') {
            // 如：6月份，进口煤炭2.2亿吨 / 1—2月份，进口煤炭X万吨
            patt = /(\d{1,2}(?:—\d{1,2})?)月份[^。]*?进口(?:煤炭|原煤)[^0-9]*([0-9.,]+)\s*([亿万]?(?:吨))/;
          } else if (spec.key === '原油') {
            // 如：6月份，进口原油X万吨
            patt = /(\d{1,2}(?:—\d{1,2})?)月份[^。]*?进口原油[^0-9]*([0-9.,]+)\s*([亿万]?(?:吨))/;
          } else if (spec.key === '天然气') {
            // 如：6月份，进口天然气X亿立方米/万吨（口径可能不同，仅保留常见单位）
            patt = /(\d{1,2}(?:—\d{1,2})?)月份[^。]*?进口天然气[^0-9]*([0-9.,]+)\s*([亿万]?(?:吨|立方米|亿立方米))/;
          }
          if (patt) {
            var mImpM = src.match(patt);
            if (mImpM) {
              importAmount = (mImpM[2]||'').replace(/,/g,'');
              importUnit = (mImpM[3]||'').replace(/\s+/g,'');
            }
          }
          // 跨句号：如“6月份，……。进口原油X万吨”
          if (!importAmount && patt) {
            var patt2Str = patt.source.replace('[^。]*?', '[^。]*?[。][^。]*?');
            var patt2 = new RegExp(patt2Str);
            var m2 = src.match(patt2);
            if (m2) {
              importAmount = (m2[2]||'').replace(/,/g,'');
              importUnit = (m2[3]||'').replace(/\s+/g,'');
            }
          }
        }
        // 仅查找月份场景；如果未命中，不要回退到全年/上半年累计，避免误取
        if (windowText) pickImportMonth(windowText);
        if (!importAmount) pickImportMonth(text);
        if (importAmount) {
          mainRows.push([dateStr, spec.key + '-进口', importAmount, '', importUnit, '']);
        }

        // 同时追加累计（上半年/下半年）进口数据，以 H1/H2 形式保存
        var cumImpAmt = '', cumImpUnit = '', cumImpHalf = '';
        if (spec.key === '原煤') {
          var mmc = text.match(/(上半年|下半年)[^。]*?进口(?:煤炭|原煤)[^0-9]*([0-9.,]+)\s*([亿万]?(?:吨))/);
          if (mmc) { cumImpHalf = mmc[1]; cumImpAmt = (mmc[2]||'').replace(/,/g,''); cumImpUnit = (mmc[3]||'').replace(/\s+/g,''); }
        } else if (spec.key === '原油') {
          var mmc2 = text.match(/(上半年|下半年)[^。]*?进口原油[^0-9]*([0-9.,]+)\s*([亿万]?(?:吨))/);
          if (mmc2) { cumImpHalf = mmc2[1]; cumImpAmt = (mmc2[2]||'').replace(/,/g,''); cumImpUnit = (mmc2[3]||'').replace(/\s+/g,''); }
        } else if (spec.key === '天然气') {
          var mmc3 = text.match(/(上半年|下半年)[^。]*?进口天然气[^0-9]*([0-9.,]+)\s*([亿万]?(?:吨|立方米|亿立方米))/);
          if (mmc3) { cumImpHalf = mmc3[1]; cumImpAmt = (mmc3[2]||'').replace(/,/g,''); cumImpUnit = (mmc3[3]||'').replace(/\s+/g,''); }
        }
        if (cumImpAmt) {
          var yearForCum = (ym && ym.year) ? ym.year : (extractYearFromUrl(location.href) || (new Date()).getFullYear());
          var halfLabel = (cumImpHalf === '下半年') ? 'H2' : 'H1';
          var cumDateLabel = yearForCum + halfLabel;
          mainRows.push([cumDateLabel, spec.key + '-进口', cumImpAmt, '', cumImpUnit, '']);
        }
      }

      // 同时追加累计（上半年/下半年）产量数据（主产品与发电量）
      (function(){
        var cumAmt = '', cumUnit = '', cumHalf = '';
        if (spec.key === '原煤') {
          var mc1 = text.match(/(上半年|下半年)[^。]*?生产原煤\s*([0-9.,]+)\s*([亿万]?(?:吨))/);
          if (mc1) { cumHalf = mc1[1]; cumAmt = (mc1[2]||'').replace(/,/g,''); cumUnit = (mc1[3]||'').replace(/\s+/g,''); }
        } else if (spec.key === '原油') {
          var mc2 = text.match(/(上半年|下半年)[^。]*?生产原油\s*([0-9.,]+)\s*([亿万]?(?:吨))/);
          if (mc2) { cumHalf = mc2[1]; cumAmt = (mc2[2]||'').replace(/,/g,''); cumUnit = (mc2[3]||'').replace(/\s+/g,''); }
        } else if (spec.key === '原油加工') {
          var mc3 = text.match(/(上半年|下半年)[^。]*?[。][^。]*?[。][^。]*?加工原油\s*([0-9.,]+)\s*([亿万]?(?:吨))/);
          if (mc3) { cumHalf = mc3[1]; cumAmt = (mc3[2]||'').replace(/,/g,''); cumUnit = (mc3[3]||'').replace(/\s+/g,''); }
        } else if (spec.key === '天然气') {
          var mc4 = text.match(/(上半年|下半年)[^。]*?生产天然气\s*([0-9.,]+)\s*([亿万]?(?:立方米|亿立方米))/);
          if (mc4) { cumHalf = mc4[1]; cumAmt = (mc4[2]||'').replace(/,/g,''); cumUnit = (mc4[3]||'').replace(/\s+/g,''); }
        } else if (spec.key === '发电量') {
          var mc5 = text.match(/(上半年|下半年)[^。]*?发电量\s*([0-9.,]+)\s*([亿万]?(?:千瓦时|亿千瓦时))/);
          if (mc5) { cumHalf = mc5[1]; cumAmt = (mc5[2]||'').replace(/,/g,''); cumUnit = (mc5[3]||'').replace(/\s+/g,''); }
        }
        if (cumAmt) {
          var yearForCum2 = (ym && ym.year) ? ym.year : (extractYearFromUrl(location.href) || (new Date()).getFullYear());
          var halfLabel2 = (cumHalf === '下半年') ? 'H2' : 'H1';
          var cumDateLabel2 = yearForCum2 + halfLabel2;
          mainRows.push([cumDateLabel2, spec.key, cumAmt, '', cumUnit, '']);
        }
      })();
    }

    // 分品种：火电/水电/核电/风电/太阳能发电 增长/下降 x%
    var varietyBlockMatch = text.match(/分品种看[^。]*?。([^。]*。)?/);
    var vtext = varietyBlockMatch ? varietyBlockMatch[0] : text;
    var varieties = ['火电','水电','核电','风电','太阳能发电'];
    for (var j=0;j<varieties.length;j++){
      var name = varieties[j];
      var re = new RegExp(name + '(?:[^。]*?)(增长|下降)\s*([0-9.]+)\%');
      var mm = vtext.match(re);
      if (mm){
        var sign = (mm[1] === '下降') ? -1 : 1;
        var val = String(sign * parseFloat(mm[2] || '0'));
        varietyRows.push([dateStr, name, val, '%']);
        // 同步到主要产品下，作为“发电量-细分”行（仅记录同比增速，产量/日均留空，增速单独列）
        mainRows.push([dateStr, '发电量-' + name, '', '', '%', val]);
      }
    }

    // 去除只有表头无数据情况
    if (mainRows.length === 1) mainRows = [];
    if (varietyRows.length === 1) varietyRows = [];
    return { mainRows: mainRows, varietyRows: varietyRows };
  }

  function batchParseTextAndExport(urls, minYear, maxYear, titleFilter){
    var pre = []; for (var i = 0; i < urls.length; i++) { var y = extractYearFromUrl(urls[i]); if (y === 0 || (y >= minYear && y <= maxYear)) pre.push(urls[i]); }
    if (!pre.length) { alert('无符合年份范围的链接'); return; }
    var keywords = parseKeywords(titleFilter);
    var idx = 0;
    var allMain = [['日期','类目','产量','日均','单位','增速']];
    var allVar = [['日期','分品种','同比增速','单位']];
    function next(){
      if (idx >= pre.length) {
        var sheets = [];
        if (allMain.length > 1) sheets.push({ name: sanitizeSheetName('主要产品'), rows: allMain, dateNum: 0 });
        if (!sheets.length) { alert('未解析到任何文本数据'); return; }
        exportSheetsAsExcelXml(sheets, 'energy_'+minYear+'-'+maxYear+'.xls');
        return;
      }
      var pageUrl = pre[idx++];
      fetchPage(pageUrl).then(function(page){
        var doc = page.doc, base = page.url;
        if (keywords.length) { var t = extractPageTitleText(doc); if (!matchAllKeywords(t, keywords)) { next(); return; } }
        var rowsObj = extractEnergyStatsFromDoc(doc);
        for (var i1=0;i1<(rowsObj.mainRows||[]).length;i1++){
          if (rowsObj.mainRows[i1][0] !== '日期') allMain.push(rowsObj.mainRows[i1]);
        }
        next();
      }).catch(function(){ next(); });
    }
    next();
  }

  // 提取标题中的年份与"月份/月份区间"（如：2025年8月份、2025年1—2月份）
  function extractYearMonthPeriod(doc){
    try {
      var title = (doc.title || '');
      var h = doc.querySelector('h1,h2');
      var ht = h ? (h.textContent || '') : '';
      var src = (title + ' ' + ht).replace(/\s+/g,'');
      // 2025年8月份 / 2025年1—2月份 / 2025年1-2月份
      var m = src.match(/(\d{4})年(\d{1,2})(?:[—\-－–至到~～](\d{1,2}))?月份/);
      if (m){
        var year = m[1];
        var m1 = String(parseInt(m[2],10));
        var m2 = m[3] ? String(parseInt(m[3],10)) : '';
        var period = m2 ? (m1 + '-' + m2) : m1;
        return { year: year, period: period };
      }
      // 2023年上半年 -> 2023-6, 2023年下半年 -> 2023-12
      var mHalf = src.match(/(\d{4})年(上|下)半年/);
      if (mHalf) {
        var year = mHalf[1];
        var half = mHalf[2];
        var period = half === '上' ? '6' : '12';
        return { year: year, period: period };
      }
      return null;
    } catch(e){ return null; }
  }

  // helpers
  function sanitizeSheetName(name) { var n = (name || 'Sheet').replace(/[:\\\/?*\[\]]/g, '-'); if (n.length > 31) n = n.slice(0, 31); return n; }
  function parseKeywords(s) { if (!s) return []; var arr = s.split(/\s+/).map(function (t) { return t.trim(); }).filter(function (t) { return !!t; }); return arr; }
  function matchAllKeywords(text, list) { var t = (text || '').replace(/\s+/g, ''); for (var i = 0; i < list.length; i++) { if (t.indexOf(list[i].replace(/\s+/g, '')) === -1) return false; } return true; }
  function extractPageTitleText(doc) { var title = (doc.title || ''); var h = doc.querySelector('h1,h2'); var ht = h ? (h.textContent || '') : ''; return (title + ' ' + ht).trim(); }
  function findRelatedDatasetLink(doc, baseUrl) { var scope = doc || document; var anchors = scope.querySelectorAll('a[href],button'); for (var i = 0; i < anchors.length; i++) { var el = anchors[i]; var txt = (el.textContent || el.innerText || '').replace(/\s+/g, ''); if (/相关数据表/.test(txt)) { var href = el.getAttribute('href'); if (href) { try { return new URL(href, baseUrl).href; } catch (e) {} } var dataUrl = el.getAttribute('data-url') || el.getAttribute('data-href'); if (dataUrl) { try { return new URL(dataUrl, baseUrl).href; } catch (e) {} } } } return ''; }
  function fetchPage(url) { return fetch(url, { credentials: 'include' }).then(function (res) { return res.text().then(function (html) { return { html: html, url: res.url || url }; }); }).then(function (o) { var parser = new DOMParser(); var doc = parser.parseFromString(o.html, 'text/html'); return { doc: doc, url: o.url }; }); }
  function extractDateForSheetName(doc, url) { var text = (doc.body && doc.body.innerText) || ''; text = text.replace(/\s+/g, ''); var m1 = text.match(/(\d{4})[\/.年-](\d{1,2})[\/.月-](\d{1,2})[日]?/); if (m1 && m1[1] && m1[2] && m1[3]) { return pad4(m1[1]) + '-' + pad2(m1[2]) + '-' + pad2(m1[3]); } var m2 = (url || '').match(/t(\d{8})/i); if (m2 && m2[1]) { var y = m2[1].slice(0, 4); var mo = m2[1].slice(4, 6); var d = m2[1].slice(6, 8); return y + '-' + mo + '-' + d; } var m3 = (url || '').match(/\/(\d{6})\//); if (m3 && m3[1]) { var y2 = m3[1].slice(0, 4); var mo2 = m3[1].slice(4, 6); return y2 + '-' + mo2 + '-01'; } return ''; }
  function extractYearFromUrl(url) { if (!url) return 0; var m2 = url.match(/t(\d{8})/i); if (m2 && m2[1]) return parseInt(m2[1].slice(0, 4), 10); var m3 = url.match(/\/(\d{6})\//); if (m3 && m3[1]) return parseInt(m3[1].slice(0, 4), 10); var m4 = url.match(/\/(\d{4})\//); if (m4 && m4[1]) return parseInt(m4[1], 10); return 0; }
  function pad2(s) { s = String(s); return s.length === 1 ? '0' + s : s; } function pad4(s) { s = String(s); while (s.length < 4) s = '0' + s; return s; }
  function cleanupTable(table) { 
    // 只清理脚本和样式，保留链接文本内容
    var nodes = table.querySelectorAll('script,style,button,input,select,textarea'); 
    for (var i = 0; i < nodes.length; i++) { 
      var n = nodes[i]; 
      if (n.parentNode) n.parentNode.removeChild(n); 
    }
    // 对于链接，保留文本内容但移除链接属性
    var links = table.querySelectorAll('a');
    for (var j = 0; j < links.length; j++) {
      var link = links[j];
      var text = link.textContent || link.innerText || '';
      var parent = link.parentNode;
      if (parent && text.trim()) {
        parent.replaceChild(document.createTextNode(text), link);
      }
    }
  }
  function tableToRowsArray(table) { 
    var rows = []; 
    var trList = table.querySelectorAll('tr'); 
    for (var i = 0; i < trList.length; i++) { 
      var tr = trList[i]; 
      var row = []; 
      var cells = tr.querySelectorAll('th,td'); 
      for (var j = 0; j < cells.length; j++) { 
        var cell = cells[j];
        // 获取单元格文本，优先使用textContent，然后innerText
        var txt = (cell.textContent || cell.innerText || '').replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
        // 如果单元格为空，检查是否有子元素
        if (!txt && cell.children.length > 0) {
          txt = Array.from(cell.children).map(function(child) {
            return (child.textContent || child.innerText || '').trim();
          }).filter(function(t) { return t; }).join(' ');
        }
        row.push(txt || ''); 
      } 
      rows.push(row); 
    } 
    return rows; 
  }
  function findRetailTable(rootDoc) {
    var scope = rootDoc || document;
    var tables = scope.querySelectorAll('table');
    var best = null; var bestScore = -1;
    for (var i = 0; i < tables.length; i++) {
      var t = tables[i];
      var rect = t.getBoundingClientRect ? t.getBoundingClientRect() : { width: t.offsetWidth || 0, height: t.offsetHeight || 0 };
      var score = (rect.width || 0) * (rect.height || 0) + (t.rows ? t.rows.length * 100 : 0);
      if (score > bestScore) { bestScore = score; best = t; }
    }
    if (best) return best;
    var near = scope.querySelector('h1,h2,h3,h4,h5,h6');
    if (near) { return near.querySelector('table') || nextTableSibling(near); }
    return null;
  }
  function nextTableSibling(start) { var node = start; var guard = 0; while (node && guard < 50) { node = node.nextElementSibling; if (!node) break; if (node.tagName && node.tagName.toLowerCase() === 'table') return node; var inner = node.querySelector && node.querySelector('table'); if (inner) return inner; guard++; } return null; }

  if (!document.getElementById('retail-export-btn-202508')) { createExportButton(); }
})();
