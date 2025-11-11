/**
 * 爬虫配置文件
 */

module.exports = {
  // 统计局网站配置
  statsGov: {
    baseUrl: 'https://www.stats.gov.cn/sj/zxfb/index.html',
    maxPages: 5,
    delayBetweenRequests: 1000, // 请求间延迟(毫秒)
    maxRetries: 3,
    timeout: 30000, // 请求超时(毫秒)
    
    // 目标数据配置
    targets: {
      goodsPrice: {
        name: '流通领域重要生产资料市场价格变动情况',
        keywords: ['流通领域重要生产资料市场价格变动情况', '生产资料价格'],
        downloadDir: 'goods_price',
        extractor: 'goods_price_extractor.js',
        parseScript: 'goods_price_parse.js'
      },
      energy: {
        name: '能源生产情况',
        keywords: ['能源生产情况', '发电量', '原煤', '原油', '天然气'],
        downloadDir: 'energy',
        extractor: 'energy_data_extractor.js',
        parseScript: 'energy_parser.js'
      },
      house: {
        name: '全国房地产市场基本情况',
        keywords: ['全国房地产市场基本情况', '房地产开发投资', '商品房销售'],
        downloadDir: 'house',
        extractor: 'house_data_extractor.js',
        parseScript: 'house_parse.js'
      },
      retail: {
        name: '社会消费品零售总额',
        keywords: ['社会消费品零售总额', '消费品零售'],
        downloadDir: 'retail',
        extractor: 'retail_data_extractor.js',
        parseScript: 'retail_parse.js'
      },
      invest: {
        name: '全国固定资产投资',
        keywords: ['全国固定资产投资', '固定资产投资'],
        downloadDir: 'invest',
        extractor: 'invest_data_extractor.js',
        parseScript: 'invest_parse.js'
      },
      profits: {
        name: '规模以上工业增加值',
        keywords: ['规模以上工业增加值增长', '工业增加值增长'],
        downloadDir: 'profits',
        extractor: 'profits_data_extractor.js',
        parseScript: 'profits_parse.js'
      },
      industryProfits: {
        name: '全国规模以上工业企业利润',
        keywords: ['全国规模以上工业企业利润', '分行业利润'],
        downloadDir: 'industry_profits',
        extractor: 'industry_profits_extractor.js',
        parseScript: 'industry_profits_parse.js'
      }
    }
  },
  
  // 文件处理配置
  fileProcessing: {
    allowedExtensions: ['.xls', '.xlsx', '.csv'],
    maxFileSize: 50 * 1024 * 1024, // 50MB
    backupOriginal: true,
    cleanTempFiles: true
  },
  
  // 日志配置
  logging: {
    level: 'info', // debug, info, warn, error
    console: true,
    file: false,
    filePath: './logs/crawler.log'
  },
  
  // 通知配置
  notifications: {
    enabled: false,
    webhook: null, // 可以配置webhook URL用于通知
    email: null
  }
};
