/**
 * 批量下载多个公司的年报
 * 使用配置文件或命令行参数
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// 默认配置：可以修改这里来批量下载
const DEFAULT_CONFIG = {
  companies: [
    { code: '600348', name: '华阳股份' },
    { code: '600519', name: '贵州茅台' },
    { code: '000858', name: '五粮液' }
  ],
  years: [2022, 2023, 2024],
  outputBase: '../stock/report_analysis'
};

/**
 * 执行单个下载任务
 */
function downloadCompanyReports(company, years, outputBase) {
  return new Promise((resolve, reject) => {
    const args = [
      path.join(__dirname, 'download_all_reports.js'), // 使用全功能版本
      '--code', company.code,
      '--name', company.name,
      '--years', years.join(',')
    ];

    if (outputBase) {
      const outputDir = path.join(__dirname, outputBase, company.name);
      args.push('--output', outputDir);
    }

    console.log(`\n${'='.repeat(70)}`);
    console.log(`🚀 开始下载: ${company.name} (${company.code})`);
    console.log(`${'='.repeat(70)}\n`);

    const child = spawn('node', args, {
      stdio: 'inherit',
      shell: true
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`\n✅ ${company.name} 下载完成\n`);
        resolve({ company, success: true });
      } else {
        console.error(`\n❌ ${company.name} 下载失败 (退出码: ${code})\n`);
        resolve({ company, success: false, code });
      }
    });

    child.on('error', (err) => {
      console.error(`\n❌ ${company.name} 执行出错: ${err.message}\n`);
      reject({ company, error: err.message });
    });
  });
}

/**
 * 延迟函数
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 从配置文件加载
 */
function loadConfigFile(configPath) {
  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error(`❌ 读取配置文件失败: ${err.message}`);
    return null;
  }
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  let config = DEFAULT_CONFIG;

  // 检查是否指定了配置文件
  if (args[0] === '--config' && args[1]) {
    const configPath = path.resolve(args[1]);
    const loadedConfig = loadConfigFile(configPath);
    if (loadedConfig) {
      config = loadedConfig;
    } else {
      console.log('⚠️  使用默认配置');
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('📦 批量下载年报工具');
  console.log('='.repeat(70));
  console.log(`\n📋 下载配置:`);
  console.log(`   公司数量: ${config.companies.length} 家`);
  console.log(`   年份: ${config.years.join(', ')}`);
  console.log(`   公司列表:`);
  config.companies.forEach((company, index) => {
    console.log(`     ${index + 1}. ${company.name} (${company.code})`);
  });
  console.log('');

  const results = [];

  // 串行下载每个公司的年报
  for (let i = 0; i < config.companies.length; i++) {
    const company = config.companies[i];
    
    try {
      const result = await downloadCompanyReports(
        company,
        config.years,
        config.outputBase
      );
      results.push(result);
    } catch (error) {
      results.push({ company, success: false, error });
    }

    // 在下载间隔休息一下
    if (i < config.companies.length - 1) {
      console.log(`⏳ 等待 3 秒后继续下载下一家公司...\n`);
      await delay(3000);
    }
  }

  // 输出总结
  console.log('\n' + '='.repeat(70));
  console.log('📊 批量下载总结');
  console.log('='.repeat(70));

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`\n✅ 成功: ${successful.length} 家公司`);
  successful.forEach(r => {
    console.log(`   ✓ ${r.company.name}`);
  });

  if (failed.length > 0) {
    console.log(`\n❌ 失败: ${failed.length} 家公司`);
    failed.forEach(r => {
      console.log(`   ✗ ${r.company.name}`);
    });
  }

  console.log('\n' + '='.repeat(70) + '\n');
}

// 运行
main().catch(err => {
  console.error(`\n❌ 批量下载出错: ${err.message}\n`);
  process.exit(1);
});

