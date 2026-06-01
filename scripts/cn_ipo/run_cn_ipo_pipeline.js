/**
 * A 股 IPO 看板一键流水线
 *
 * 1. 拉取东方财富新股申购/上市列表
 * 2. 合并 AI 分析 + 生成 HTML 看板
 *
 * 用法:
 *   node scripts/cn_ipo/run_cn_ipo_pipeline.js
 *   npm run cn-ipo
 *
 * 可选:
 *   --html-only   仅重新生成 HTML
 *   --skip-fetch  跳过列表拉取
 *   --days 180    拉取最近 N 天新股
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
  const skipFetch = args.includes('--skip-fetch');
  const daysIdx = args.indexOf('--days');
  const daysArg = daysIdx >= 0 ? ` --days ${args[daysIdx + 1]}` : '';

  console.log('🇨🇳 A 股 IPO 看板流水线');

  if (htmlOnly) {
    run('生成 HTML 看板', 'node scripts/cn_ipo/analyze_cn_ipo.js --html');
    console.log('\n✅ 完成 → stock/html/cn_ipo_analysis.html');
    return;
  }

  if (!skipFetch) {
    run('1/2 拉取 A 股新股列表', `node scripts/cn_ipo/fetch_cn_ipo_list.js${daysArg}`);
  }

  run('2/2 生成分析看板', 'node scripts/cn_ipo/analyze_cn_ipo.js');

  console.log('\n✅ 流水线完成');
  console.log('   看板: stock/html/cn_ipo_analysis.html');
  console.log('   数据: stock/cleaned_data/cn_ipo_analysis.json');
}

main();
