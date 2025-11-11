
// PDD 2025年Q3财报数据录入
// 请根据官方财报填入以下数据
// 数据来源: https://investor.pinduoduo.com/financial-information/quarterly-results

const PDDDataExtractor = require('./pdd_data_extractor');

const data = {
  year: 2025,
  quarter: 3,
  reportDate: '2025-09-31',
  
  financials: {
    revenue: 0,              // 总营收（百万元）
    operatingIncome: 0,      // 营业利润（百万元）
    netIncome: 0,            // 净利润（百万元）
    gmv: 0,                  // GMV（百万元）
    
    revenueYoY: 0,           // 营收同比增长(%)
    operatingIncomeYoY: 0,   // 营业利润同比增长(%)
    netIncomeYoY: 0,         // 净利润同比增长(%)
    gmvYoY: 0,               // GMV同比增长(%)
    
    grossMargin: 0,          // 毛利率(%)
    operatingMargin: 0,      // 营业利润率(%)
    netMargin: 0             // 净利率(%)
  },
  
  users: {
    activeUsers: 0,          // 年活跃买家数（百万）
    activeUsersYoY: 0,       // 同比增长(%)
    avgRevenuePerUser: 0     // 人均消费（元）
  },
  
  highlights: [
    // '业务亮点1',
    // '业务亮点2'
  ],
  
  source: 'manual',
  sourceUrl: 'https://investor.pinduoduo.com/financial-information/quarterly-results',
  extractedAt: new Date().toISOString()
};

// 保存数据
const extractor = new PDDDataExtractor();
extractor.saveData(data).then(() => {
  console.log('数据保存成功！');
}).catch(err => {
  console.error('保存失败:', err);
});
