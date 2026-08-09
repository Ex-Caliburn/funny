#!/usr/bin/env node

/**
 * EIA 美国 SPR 原油库存周报（WCSSTUS1）下载与解析
 *
 * 数据来源：
 *   https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?n=PET&s=WCSSTUS1&f=W
 * 下载地址：
 *   https://www.eia.gov/dnav/pet/hist_xls/WCSSTUS1w.xls
 *
 * 输出：
 *   stock/oil/WCSSTUS1w.xls
 *   stock/oil/spr_stocks.json
 *
 * 用法：
 *   node scripts/crawler/oil/oil_spr_crawler.js
 *   node scripts/crawler/oil/oil_spr_crawler.js --no-parse
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');
const config = require('../framework/crawler_config.js').oilSpr;

const PROJECT_ROOT = path.join(__dirname, '../../..');
const OUTPUT_XLS = path.join(PROJECT_ROOT, 'stock', config.downloadDir, config.fileName);
const PARSE_SCRIPT = path.join(PROJECT_ROOT, 'scripts/tools/oil_spr_parse.js');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 带重试下载 Excel
 * @returns {Promise<string>} 保存路径
 */
async function downloadXls() {
  const maxRetries = config.maxRetries || 3;
  let lastErr;

  fs.mkdirSync(path.dirname(OUTPUT_XLS), { recursive: true });

  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`正在下载 (${i + 1}/${maxRetries}): ${config.downloadUrl}`);
      const response = await axios.get(config.downloadUrl, {
        timeout: config.timeout || 30000,
        responseType: 'arraybuffer',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/vnd.ms-excel,application/octet-stream,*/*',
          Referer: config.leafUrl,
        },
        validateStatus: (status) => status === 200,
      });

      fs.writeFileSync(OUTPUT_XLS, Buffer.from(response.data));
      const sizeKb = (fs.statSync(OUTPUT_XLS).size / 1024).toFixed(1);
      console.log(`已覆盖保存: ${OUTPUT_XLS} (${sizeKb} KB)`);
      await sleep(config.delayBetweenRequests || 1000);
      return OUTPUT_XLS;
    } catch (err) {
      lastErr = err;
      console.warn(`下载失败: ${err.message}`);
      if (i < maxRetries - 1) await sleep(2000 * (i + 1));
    }
  }

  throw lastErr;
}

/**
 * 运行解析脚本
 * @returns {Promise<void>}
 */
function runParseScript() {
  return new Promise((resolve, reject) => {
    console.log('\n开始解析 → stock/oil/spr_stocks.json');
    const child = spawn('node', [PARSE_SCRIPT, OUTPUT_XLS], {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
    });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`parse 退出码 ${code}`));
    });
    child.on('error', reject);
  });
}

async function main() {
  const noParse = process.argv.includes('--no-parse');

  console.log('========================================');
  console.log('  EIA 美国 SPR 原油库存周报');
  console.log('========================================');

  await downloadXls();

  if (!noParse) {
    await runParseScript();
  }

  console.log('\n完成');
}

if (require.main === module) {
  main().catch((err) => {
    console.error('执行失败:', err.message);
    process.exit(1);
  });
}

module.exports = { downloadXls, runParseScript, OUTPUT_XLS };
