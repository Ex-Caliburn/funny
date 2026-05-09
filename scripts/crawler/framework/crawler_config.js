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

    // 分页区间配置
    pagination: {
      defaultStartPage: 1,
      defaultEndPage: 3,
      maxAllowedPages: 100,
      pageRangePattern: /^(\d+)-(\d+)$/, // 验证格式 "1-5"
    },

    // 目标数据配置
    targets: {
      goodsPrice: {
        name: '流通领域重要生产资料市场价格变动情况',
        keywords: ['流通领域重要生产资料市场价格变动情况', '生产资料价格'],
        downloadDir: 'goods_price',
        extractor: 'goods_price_extractor.js',
        parseScript: 'goods_price_parse.js',
      },
      energy: {
        name: '能源生产情况',
        keywords: ['能源生产情况', '发电量', '原煤', '原油', '天然气'],
        downloadDir: 'energy',
        extractor: 'energy_data_extractor.js',
        parseScript: 'energy_parser.js',
      },
      house: {
        name: '全国房地产市场基本情况',
        keywords: ['全国房地产市场基本情况', '房地产开发投资', '商品房销售'],
        downloadDir: 'house',
        extractor: 'house_data_extractor.js',
        parseScript: 'house_parse.js',
      },
      retail: {
        name: '社会消费品零售总额',
        keywords: ['社会消费品零售总额', '消费品零售'],
        downloadDir: 'retail',
        extractor: 'retail_data_extractor.js',
        parseScript: 'retail_parse.js',
      },
      invest: {
        name: '全国固定资产投资',
        keywords: ['全国固定资产投资', '固定资产投资'],
        downloadDir: 'invest',
        extractor: 'invest_data_extractor.js',
        parseScript: 'invest_parse.js',
      },
      profits: {
        name: '规模以上工业增加值',
        keywords: ['规模以上工业增加值增长', '工业增加值增长'],
        downloadDir: 'profits',
        extractor: 'industrial_value_added_extractor.js',
        parseScript: 'industrial_value_added_parse.js',
      },
      industryProfits: {
        name: '全国规模以上工业企业利润',
        keywords: ['全国规模以上工业企业利润', '分行业利润'],
        downloadDir: 'industry_profits',
        extractor: 'industry_profits_extractor.js',
        parseScript: 'industry_profits_parse.js',
      },
      capacityUtilization: {
        name: '全国规模以上工业产能利用率',
        keywords: ['全国规模以上工业产能利用率', '产能利用率', '工业产能利用率'],
        downloadDir: 'capacity_utilization',
        extractor: 'capacity_utilization_extractor.js',
        parseScript: 'capacity_utilization_parser.js',
      },
    },
  },

  // 国家外汇管理局网站配置（黄金储备数据）
  safeGov: {
    // 外汇储备列表页
    reserveIndexUrl: 'https://www.safe.gov.cn/safe/whcb/index.html',
    delayBetweenRequests: 1500,
    maxRetries: 3,
    timeout: 30000,

    targets: {
      // 官方储备资产（含黄金）
      officialReserveAssets: {
        name: '官方储备资产',
        // 匹配"官方储备资产（YYYY年）"的链接文字
        linkPattern: /官方储备资产（(\d{4})年）/,
        downloadDir: 'gold',
        // 以年份命名，如 2026.xlsx
        filenameByYear: true,
      },
    },
  },

  // 上海航运交易所运价指数配置
  sseShipping: {
    baseUrl: 'https://www.sse.net.cn',
    delayBetweenRequests: 2000,
    maxRetries: 3,
    timeout: 30000,

    targets: {
      // 中国出口集装箱运价指数
      ccfi: {
        name: '中国出口集装箱运价指数',
        indexType: 'ccfi',
        url: 'https://www.sse.net.cn/index/singleIndex?indexType=ccfi',
        // 综合指数行的航线名称
        compositeKey: '中国出口集装箱运价综合指数',
        dataFile: 'ccfi.json',
      },
      // 东南亚集装箱运价指数
      seafi: {
        name: '东南亚集装箱运价指数',
        indexType: 'seafi',
        url: 'https://www.sse.net.cn/index/singleIndex?indexType=seafi',
        compositeKey: '综合指数',
        dataFile: 'seafi.json',
      },
      // 中国沿海煤炭运价指数
      cbcfi: {
        name: '中国沿海煤炭运价指数',
        indexType: 'cbcfi',
        url: 'https://www.sse.net.cn/index/singleIndex?indexType=cbcfi',
        compositeKey: '综合指数',
        dataFile: 'cbcfi.json',
      },
    },

    // 数据存储目录（相对于 stock/）
    dataDir: 'shipping',
  },

  // CCTD 秦皇岛动力煤价格配置
  cctdCoal: {
    // 综合交易价页面（GBK 编码）
    pageUrl:
      'https://www.cctd.com.cn/index.php?m=content&c=index&a=lists&catid=454&data=CCTD%C7%D8%BB%CA%B5%BA%B6%AF%C1%A6%C3%BA%BC%DB%B8%F1&name=CCTD%C7%D8%BB%CA%B5%BA%B6%AF%C1%A6%C3%BA%BC%DB%B8%F1',
    delayBetweenRequests: 2000,
    maxRetries: 3,
    timeout: 30000,

    targets: {
      // 综合交易 5500 大卡价格
      composite5500: {
        name: 'CCTD 秦皇岛动力煤综合交易 5500 大卡',
        dataFile: 'qhd_coal_5500k.json',
        // 页面中用于定位当前价格的关键词
        priceLabel: '综合交易5500',
      },
    },

    // 数据存储目录（相对于 stock/）
    dataDir: 'coal',
  },

  /**
   * 中国太原煤炭交易中心（ctctc）— 山西产地价格周度数据
   * 专题页：https://cj.ctctc.cn/newjgzs/rest/jgzsfl/v3/getPriceInfo（HTML，非 JSON）
   * 全量历史接口：zhIndexDataAll（页面内 echarts 同源使用）
   */
  ctctcShanxiCoal: {
    baseUrl: 'https://cj.ctctc.cn',
    indexPageUrl: 'https://cj.ctctc.cn/newjgzs/rest/jgzsfl/v3/getPriceInfo',
    historyUrl: 'https://cj.ctctc.cn/newjgzs/rest/jgzsfl/v3/zhIndexDataAll',
    delayBetweenRequests: 1500,
    maxRetries: 3,
    timeout: 30000,

    targets: {
      thermal5500: {
        name: '山西动力煤 5500',
        indexCode: 'sxdl5500',
        dataFile: 'shanxi_coal_5500k.json',
      },
      thermal5000: {
        name: '山西动力煤 5000',
        indexCode: 'sxdl5000',
        dataFile: 'shanxi_coal_5000k.json',
      },
      thermal4500: {
        name: '山西动力煤 4500',
        indexCode: 'sxdl4500',
        dataFile: 'shanxi_coal_4500k.json',
      },
      lowSulfurCoking: {
        name: '山西低硫焦精煤',
        indexCode: 'sxdljm',
        dataFile: 'shanxi_coking_coal.json',
      },
      lowSulfurLeanMeager: {
        name: '山西低硫贫瘦精煤',
        indexCode: 'sxdlpsm',
        dataFile: 'shanxi_dlps_coking.json',
      },
      lowSulfurOneThirdCoking: {
        name: '山西低硫1/3焦精煤',
        indexCode: 'sxdl1/3jm',
        dataFile: 'shanxi_one_third_coking.json',
      },
      pci: {
        name: '山西喷吹煤',
        indexCode: 'sxpcm',
        dataFile: 'shanxi_pci_coal.json',
      },
      sinter: {
        name: '山西烧结煤',
        indexCode: 'sxsjm',
        dataFile: 'shanxi_sinter_coal.json',
      },
      anthraciteLump: {
        name: '山西无烟块煤',
        indexCode: 'sxwykm',
        dataFile: 'shanxi_wykm_coal.json',
      },
    },

    dataDir: 'coal',
  },

  // 文件处理配置
  fileProcessing: {
    allowedExtensions: ['.xls', '.xlsx', '.csv'],
    maxFileSize: 50 * 1024 * 1024, // 50MB
    backupOriginal: true,
    cleanTempFiles: true,
    skipExistingFiles: true, // 如果文件已存在，跳过下载（默认开启）
  },

  // 日志配置
  logging: {
    level: 'info', // debug, info, warn, error
    console: true,
    file: false,
    filePath: './logs/crawler.log',
  },

  // 通知配置
  notifications: {
    enabled: false,
    webhook: null, // 可以配置webhook URL用于通知
    email: null,
  },
}
