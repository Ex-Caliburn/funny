/**
 * A 股 IPO 数据路径（JSON 存 stock/cn_ipo/）
 */
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const DATA_DIR = path.join(ROOT, 'stock/cn_ipo');

module.exports = {
  ROOT,
  DATA_DIR,
  HISTORY_DIR: path.join(DATA_DIR, 'history'),
  ipoList: path.join(DATA_DIR, 'ipo_list.json'),
  analysis: path.join(DATA_DIR, 'analysis.json'),
  outputJson: path.join(DATA_DIR, 'cn_ipo_analysis.json'),
  outputHtml: path.join(ROOT, 'stock/html/cn_ipo_analysis.html'),
};
