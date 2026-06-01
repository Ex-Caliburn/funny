/**
 * 港股 IPO 看板一键流水线
 *
 * 1. 拉取 IPO 列表 + 下载 PHIP 全文 PDF
 * 2. 从 PHIP 解析招股详情（基石/绿鞋等 + 手动补充合并）
 * 3. 计算 A/H 折价率
 * 4. 生成 HTML 看板
 *
 * 用法:
 *   node scripts/hk_ipo/run_hk_ipo_pipeline.js
 *   npm run hk-ipo
 *
 * 可选跳过:
 *   --skip-download   跳过列表拉取与 PDF 下载
 *   --skip-offering   跳过 PHIP 招股解析
 *   --skip-ah         跳过 A/H 折价
 *   --html-only       仅重新生成 HTML（等同 analyze --html）
 */

const { execSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '../..');

function run(label, cmd) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`▶ ${label}`);
  console.log(`${'='.repeat(60)}\n`);
  execSync(cmd, { stdio: 'inherit', cwd: ROOT });
}

function main() {
  const args = process.argv.slice(2);
  const htmlOnly = args.includes('--html-only');
  const skipDownload = args.includes('--skip-download');
  const skipOffering = args.includes('--skip-offering');
  const skipAh = args.includes('--skip-ah');

  console.log('🏦 港股 IPO 看板流水线');

  if (htmlOnly) {
    run('生成 HTML 看板', 'node scripts/hk_ipo/analyze_hk_ipo.js --html');
    console.log('\n✅ 完成 → stock/html/hk_ipo_analysis.html');
    return;
  }

  if (!skipDownload) {
    run('1/4 拉取 IPO 列表 + 下载 PHIP PDF', 'node scripts/hk_ipo/fetch_hk_ipo_list.js --download');
  }

  if (!skipOffering) {
    run('2/4 解析 PHIP 招股详情', 'node scripts/hk_ipo/fetch_offering_from_phip.js');
  }

  if (!skipAh) {
    run('3/4 计算 A/H 折价率', 'node scripts/hk_ipo/fetch_ah_discount.js');
  }

  run('4/4 生成分析看板', 'node scripts/hk_ipo/analyze_hk_ipo.js');

  console.log('\n✅ 流水线完成');
  console.log('   看板: stock/html/hk_ipo_analysis.html');
  console.log('   数据: stock/cleaned_data/hk_ipo_analysis.json');
}

main();
