/**
 * 港股 IPO 数据路径（与 stock/coal、stock/shipping 等模块一致，JSON 存 stock/ 下）
 */
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const DATA_DIR = path.join(ROOT, 'stock/hk_ipo');

module.exports = {
  ROOT,
  DATA_DIR,
  HISTORY_DIR: path.join(DATA_DIR, 'history'),
  ipoList: path.join(DATA_DIR, 'active_ap-phip_sehk.json'),
  listed: path.join(DATA_DIR, 'listed_sehk.json'),
  changelog: path.join(DATA_DIR, 'changelog.json'),
  analysis: path.join(DATA_DIR, 'analysis.json'),
  offeringFromPhip: path.join(DATA_DIR, 'offering_from_phip.json'),
  offeringMerged: path.join(DATA_DIR, 'offering_merged.json'),
  ahDiscount: path.join(DATA_DIR, 'ah_discount.json'),
  outputJson: path.join(DATA_DIR, 'hk_ipo_analysis.json'),
  outputHtml: path.join(ROOT, 'stock/html/hk_ipo_analysis.html'),
  prospectusDir: path.join(DATA_DIR, 'prospectus'),
  phipTextDir: path.join(DATA_DIR, 'phip_text'),
};
