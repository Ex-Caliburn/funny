const ProfitsDataExtractor = require('./profits_data_extractor');
const path = require('path');

/**
 * 分行业工业企业利润数据提取器
 * 继承自工业企业利润数据提取器，只是保存到不同的目录
 */
class IndustryProfitsExtractor extends ProfitsDataExtractor {
  constructor() {
    super();
    this.downloadDir = path.join(__dirname, '../stock/industry_profits');
    this.ensureDownloadDir();
  }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  const extractor = new IndustryProfitsExtractor();
  
  // 测试URL
  const testUrls = [
    'https://www.stats.gov.cn/sj/zxfb/202509/t20250927_1961400.html'
  ];
  
  extractor.processMultiplePages(testUrls).then(results => {
    console.log('提取结果:', results);
  }).catch(error => {
    console.error('测试失败:', error);
  });
}

module.exports = IndustryProfitsExtractor;
