#!/usr/bin/env node
/**
 * 为 stock/html/*_chart.html 批量应用 tooltip 优化
 */
const fs = require('fs');
const path = require('path');

const HTML_DIR = path.join(__dirname, '../stock/html');
const HELPER_SNIPPET = '<script src="chart_tooltip_helpers.js"></script>';

const files = fs.readdirSync(HTML_DIR).filter((f) => f.endsWith('_chart.html'));

function patch(content, filename) {
  let c = content;

  if (!c.includes('chart_tooltip_helpers.js')) {
    c = c.replace(
      /(<script src="[^"]*echarts[^"]*\.min\.js"><\/script>)\s*/i,
      `$1\n  ${HELPER_SNIPPET}\n`
    );
  }

  // goods_price 内联 helper 移除
  if (filename === 'goods_price_chart.html') {
    c = c.replace(
      /\s*\/\*\* tooltip 最大高度[\s\S]*?return out;\s*\}\s*\n/,
      '\n'
    );
  }

  // 简单单行 tooltip
  c = c.replace(
    /tooltip:\s*\{\s*trigger:\s*["']axis["'],\s*valueFormatter:/g,
    'tooltip: buildConfinedTooltip({ trigger: "axis", valueFormatter:'
  );
  c = c.replace(
    /tooltip:\s*\{\s*trigger:\s*['"]axis['"],\s*valueFormatter:/g,
    'tooltip: buildConfinedTooltip({ trigger: "axis", valueFormatter:'
  );

  // tooltip: { trigger: 'axis', backgroundColor -> buildConfinedTooltip + axisPointer
  c = c.replace(
    /tooltip:\s*\{\s*\n(\s*)trigger:\s*['"]axis['"],\s*\n\s*backgroundColor:/g,
    'tooltip: buildConfinedTooltip({\n$1trigger: \'axis\',\n$1axisPointer: { type: \'line\', lineStyle: { color: \'#64748b\', type: \'dashed\' } },\n$1backgroundColor:'
  );

  // 单行内联 dashboard option 里的 tooltip
  c = c.replace(
    /tooltip:\s*\{\s*trigger:\s*['"]axis['"],\s*backgroundColor:\s*'rgba\(15,\s*23,\s*42,\s*0\.95\)',\s*borderColor:\s*'#1f2937',\s*textStyle:\s*\{[^}]+\},\s*formatter:/g,
    'tooltip: buildConfinedTooltip({ trigger: \'axis\', axisPointer: { type: \'line\', lineStyle: { color: \'#64748b\', type: \'dashed\' } }, backgroundColor: \'rgba(15, 23, 42, 0.95)\', borderColor: \'#1f2937\', textStyle: { color: \'#e2e8f0\' }, formatter:'
  );

  // formatter 行加 marker（跳过已有 marker）
  c = c.replace(
    /(\s+)s \+= p\.seriesName/g,
    (m, indent) => {
      const idx = c.indexOf(m);
      const before = c.slice(Math.max(0, idx - 80), idx);
      if (before.includes('p.marker')) return m;
      return `${indent}s += (p.marker || '') + p.seriesName`;
    }
  );

  // goods_price 已有 marker 的 renderTable 行保持 — 上面 replace 可能误伤 goods_price 837 已有 marker
  // 修复双重 marker
  c = c.replace(/\(p\.marker \|\| ''\) \+ \(p\.marker \|\| ''\) \+ p\.seriesName/g, '(p.marker || \'\') + p.seriesName');
  c = c.replace(/\(p\.marker \|\| ''\) \+ p\.marker \+ p\.seriesName/g, '(p.marker || \'\') + p.seriesName');

  // 多行 tooltip 块结尾：buildConfinedTooltip 需 `}),` 而非 `},`
  c = c.replace(
    /(formatter:\s*function\s*\([^)]*\)\s*\{[\s\S]*?return s;\s*\}\s*)\n(\s*)\}\n(\s*)\};/g,
    '$1\n$2}),\n$3};'
  );

  // 单行内联：return s; } } }; -> return s; } }), };
  c = c.replace(/return s; \} \} \};/g, 'return s; } }), };');

  // buildConfinedTooltip 后直接跟 legend：} }, -> } }),
  c = c.replace(/(return html;\s*\}\s*)\n(\s*)\},\n(\s*)(legend)/g, '$1\n$2}),\n$3$4');

  // 闭合 valueFormatter 单行
  c = c.replace(
    /(buildConfinedTooltip\(\{\s*trigger:\s*["']axis["'],\s*valueFormatter:[^}]+\})\s*,/g,
    '$1 }),'
  );

  // series.push 多折线：在 data: 前插入 emphasis（若无 emphasis）
  c = c.replace(
    /(series\.push\(\{[\s\S]*?type:\s*['"]line['"][\s\S]*?)(data:\s*)/g,
    (block, head, dataKey) => {
      if (head.includes('emphasis:')) return block;
      return head + 'emphasis: { focus: \'series\', lineStyle: { width: 3 }, itemStyle: { borderColor: \'#fff\', borderWidth: 1 } }, blur: { lineStyle: { opacity: 0.12 }, itemStyle: { opacity: 0.12 } }, ' + dataKey;
    }
  );

  // 其它 tooltip: { 未处理的（trigger item 等）
  c = c.replace(
    /(\n\s*)tooltip:\s*\{\s*\n(\s*)trigger:\s*['"]item['"]/g,
    '$1tooltip: buildConfinedTooltip({\n$2trigger: \'item\''
  );
  c = c.replace(
    /(\n\s*)tooltip:\s*\{\s*\n(\s*)trigger:\s*['"]axis['"],\s*\n(?!\s*axisPointer)/g,
    '$1tooltip: buildConfinedTooltip({\n$2trigger: \'axis\',\n$2axisPointer: { type: \'line\', lineStyle: { color: \'#64748b\', type: \'dashed\' } },\n'
  );

  return c;
}

for (const file of files) {
  const fp = path.join(HTML_DIR, file);
  const orig = fs.readFileSync(fp, 'utf8');
  const next = patch(orig, file);
  if (next !== orig) {
    fs.writeFileSync(fp, next);
    console.log('patched', file);
  } else {
    console.log('skip', file);
  }
}
