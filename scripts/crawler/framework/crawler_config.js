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
        // 同一年份会多次更新，文件名不变，需覆盖下载才能拿到最新数据
        forceDownload: true,
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
      // 上海出口集装箱运价指数
      scfi: {
        name: '上海出口集装箱运价指数',
        indexType: 'scfi',
        url: 'https://www.sse.net.cn/index/singleIndex?indexType=scfi',
        compositeKey: '综合指数',
        dataFile: 'scfi.json',
      },
      // 上海出口集装箱结算运价指数（欧洲/美西两条航线）
      scfis: {
        name: '上海出口集装箱结算运价指数',
        indexType: 'scfis',
        url: 'https://www.sse.net.cn/index/singleIndex?indexType=scfis',
        dataFile: 'scfis.json',
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

  // 中国铝业（Chalco）产品报价 — 铝锭 & 氧化铝
  chalcoAluminum: {
    // 列表页基础 URL，分页规律：index.html / index_1.html / index_2.html ...
    listBaseUrl: 'https://www.chalco.com.cn/cpyfw/cpbj/2020bj',
    delayBetweenRequests: 2500,
    maxRetries: 3,
    timeout: 30000,

    // 数据存储目录（相对于 stock/）
    dataDir: 'aluminum',

    /** 按年份翻页全量爬取时使用的年份（node ... --full 或未传年份但传了 --full 时用；也可命令行直接传 2026 覆盖） */
    crawlYears: [2025, 2026],

    /** 默认增量：首页列表中取日期最新的若干天（按日期去重；与 --full / 传年份互斥） */
    defaultRecentDays: 3,

    targets: {
      aluminumIngot: {
        name: '铝锭现货价（华东/华南/西南/中原）',
        dataFile: 'aluminum_ingot.json',
        // 价格区间过滤（元/吨）
        priceMin: 10000,
        priceMax: 60000,
        // 区域顺序
        regions: ['east', 'south', 'southwest', 'central'],
        regionNames: ['华东市场', '华南市场', '西南市场', '中原市场'],
      },
      alumina: {
        name: '氧化铝现货价（山东/河南/山西/贵州/广西）',
        dataFile: 'alumina.json',
        // 价格区间过滤（元/吨）
        priceMin: 500,
        priceMax: 8000,
        regions: ['shandong', 'henan', 'shanxi', 'guizhou', 'guangxi'],
        regionNames: ['山东地区', '河南地区', '山西地区', '贵州地区', '广西地区'],
      },
    },
  },

  /**
   * 海关总署 — 出口主要商品量值表（静态年份目录版）
   * 页面规律：切换 URL 中的年份即可，无需分页
   * 脚本：scripts/crawler/customs_export/customs_export_crawler.js
   */
  customsExport: {
    /**
     * 年份列表页模板，{path} 替换为年份路径段
     * 2026 年用年份本身，其余年份为海关网站内部 ID（见爬虫中 YEAR_PATH_MAP）
     */
    listUrlTemplate:
      'http://www.customs.gov.cn/customs/302249/zfxxgk/fdzdgknr/302274/302277/{path}/index.html',
    delayBetweenRequests: 1500,
    maxRetries: 3,
    timeout: 30000,
    /** 相对于 stock/ 的下载目录 */
    downloadDirRel: 'customs_export',
    /** 默认年份范围（闭区间）；CLI 未传参时仅当前年 */
    yearRange: {
      startYear: new Date().getFullYear(),
      endYear: new Date().getFullYear(),
    },
    /** 链接文字需同时包含下列关键词 */
    titleKeywords: ['出口', '商品', '量值'],
    /** 含任意排除词则跳过（过滤美元值版本及贸易方式量值表） */
    excludeKeywords: ['美元值', '美元', '贸易方式', '部分出口商品', '部分进口商品'],
  },

  /**
   * 海关总署 — 出口重点商品量值表（人民币值）等 .xls 附件
   * 列表分页采用 eportal 动态 API（共约 250 页，每页 10 条，按发布时间倒序）
   * 脚本：scripts/crawler/china_export/china_export_crawler.js
   */
  chinaExport: {
    listUrlTemplate:
      'http://www.customs.gov.cn/eportal/ui?pageId=302275&moduleId=9f806879368d4feabb9644105dcdeba3&staticRequest=yes&currentPage={page}',
    /** axios 下载成功/校验间隔（毫秒） */
    delayBetweenRequests: 800,
    /** page.goto 后额外等待 DOM 渲染（毫秒），过短可能拿不到链接 */
    afterPageLoadMs: 550,
    /** load 通常比 networkidle 快很多；站点异常时可改回 networkidle */
    pageGotoWaitUntil: 'load',
    maxRetries: 3,
    timeout: 30000,
    /** 相对于 stock/ 的下载目录 */
    downloadDirRel: 'china_export',
    pagination: {
      startPage: 1,
      /** 列表按发布时间倒序，前两页通常为最近数据 */
      endPage: 2,
    },
    /** minYear/maxYear 为 null 表示 CLI 未传参时由爬虫默认为当前年；筛选依赖标题中的「YYYY年MM月」 */
    yearRange: {
      minYear: null,
      maxYear: null,
    },
    /** 列表链接文字需同时包含下列关键词（「出口主要商品量值表」「出口重点商品量值表」均可匹配） */
    titleKeywords: ['出口', '商品', '量值'],
    /** 链接文字包含下列任意词则跳过（排除美元值版本） */
    excludeKeywords: ['美元值', '美元'],
  },

  /**
   * 上海有色金属网（SMM）— 有色金属现货均价
   * 页面：https://www.smm.com.cn/price
   * 脚本：scripts/crawler/smm/smm_crawler.js
   * 数据写入：stock/smm/smm_metal_prices.json
   *
   * 每次爬取当日价格快照，按日期去重增量追加
   */
  smmMetalPrices: {
    pageUrl: 'https://www.smm.com.cn/price',
    delayBetweenRequests: 2000,
    maxRetries: 3,
    timeout: 30000,

    // 数据存储目录（相对于 stock/）
    dataDir: 'smm',
    dataFile: 'smm_metal_prices.json',

    /**
     * 需要追踪的品种配置
     * key       → JSON 字段名
     * name      → 页面中 "名称" 列的文字（支持部分匹配）
     * category  → 所属大类（铜/铝/铅/锌/镍/锡/其他）
     * unit      → 单位（元/吨 或 元/千克）
     */
    targets: {
      copper: { name: 'SMM 1#电解铜', category: '铜', unit: '元/吨' },
      yangshan_premium_warrant: {
        name: '洋山铜溢价(仓单)',
        category: '铜',
        unit: '美元/吨',
      },
      yangshan_premium_bl: { name: '洋山铜溢价(提单)', category: '铜', unit: '美元/吨' },
      copper_concentrate_index: {
        name: '进口铜精矿指数(月)',
        category: '铜',
        unit: '美元/干吨',
      },
      copper_rod_fee: {
        name: 'SMM鹰潭8mm铜杆加工费(月度)',
        category: '铜',
        unit: '元/吨',
      },
      aluminum: { name: 'SMM A00铝', category: '铝', unit: '元/吨' },
      lead: { name: 'SMM 1#铅锭', category: '铅', unit: '元/吨' },
      zinc: { name: 'SMM 0#锌锭', category: '锌', unit: '元/吨' },
      nickel: { name: 'SMM 1#电解镍', category: '镍', unit: '元/吨' },
      tin: { name: 'SMM 1#锡', category: '锡', unit: '元/吨' },
      nickel_sulfate: { name: 'SMM电池级硫酸镍指数', category: '镍', unit: '元/吨' },
      cobalt: { name: '电解钴', category: '其他', unit: '元/吨' },
      cobalt_sulfate: { name: '硫酸钴', category: '其他', unit: '元/吨' },
      lithium_carbonate: { name: '电池级碳酸锂', category: '其他', unit: '元/吨' },
      antimony: { name: '2#低铋锑锭', category: '其他', unit: '元/吨' },
      manganese_sulfate: { name: 'SMM电池级硫酸锰指数', category: '其他', unit: '元/吨' },
      indium: { name: '精铟', category: '其他', unit: '元/千克' },
    },
  },

  // 澳门博彩监察协调局（DICJ）每月幸运博彩毛收入
  macauGaming: {
    // 基础 URL，{year} 替换为实际年份
    baseUrl:
      'https://www.dicj.gov.mo/web/cn/information/DadosEstat_mensal/{year}/index.html',
    delayBetweenRequests: 2000,
    maxRetries: 3,
    timeout: 30000,

    // 数据存储目录（相对于 stock/）
    dataDir: 'macau_gaming',
    dataFile: 'monthly_gross_revenue.json',

    // 月份中文映射
    monthNames: [
      '一月',
      '二月',
      '三月',
      '四月',
      '五月',
      '六月',
      '七月',
      '八月',
      '九月',
      '十月',
      '十一月',
      '十二月',
    ],
  },

  /**
   * 磷化工产品价格（周度，元/吨）
   * 接口：https://cms.p2o5.com/p2o5/pd/zh/list.jhtml
   * 脚本：scripts/crawler/phosphorus_chemical/phosphorus_chemical_crawler.js
   * 数据写入：stock/phosphorus_chemical/weekly_prices.json
   *
   * 接口一次返回所有历史记录，按 recordDate 分组后增量写入
   */
  phosphorusChemicalPrices: {
    apiUrl: 'https://cms.p2o5.com/p2o5/pd/zh/list.jhtml',
    referer: 'https://p2o5.com/zh/',
    maxRetries: 3,
    timeout: 30000,
    delayBetweenRequests: 2000,

    // 数据存储目录（相对于 stock/）
    dataDir: 'phosphorus_chemical',
    dataFile: 'weekly_prices.json',

    /**
     * 需要追踪的品种配置
     * key         → JSON 字段名
     * displayName → 输出 JSON 中的品种名称
     * match       → 接口返回 products 字段的前缀匹配字符串
     * unit        → 单位
     */
    targets: {
      phosphate_ore: { displayName: '磷矿石（30%P2O5）', match: '磷矿石', unit: '元/吨' },
      yellow_phosphorus: { displayName: '黄磷（优等品）', match: '黄磷', unit: '元/吨' },
      phosphoric_acid_40: {
        displayName: '磷酸（40%P2O5/定制级）',
        match: '磷酸（40%P2O5',
        unit: '元/吨',
      },
      phosphoric_acid_52: {
        displayName: '磷酸（52%P2O5/优等品）',
        match: '磷酸（52%P2O5',
        unit: '元/吨',
      },
      phosphoric_acid_85i: {
        displayName: '磷酸（85%H3PO4/工业级/热法）',
        match: '磷酸（85%H3PO4/工业级',
        unit: '元/吨',
      },
      phosphoric_acid_85f: {
        displayName: '磷酸（85%H3PO4/食品级/湿法）',
        match: '磷酸(85%H3PO4/食品',
        unit: '元/吨',
      },
      map_11_44: {
        displayName: '磷酸一铵（11-44）',
        match: '磷酸一铵（11-44）',
        unit: '元/吨',
      },
      map_11_61: {
        displayName: '工业磷酸一铵（11-61）',
        match: '工业磷酸一铵（11-61）',
        unit: '元/吨',
      },
      mcp_feed: {
        displayName: '磷酸二氢钙（饲料级）',
        match: '磷酸二氢钙（饲料级）',
        unit: '元/吨',
      },
    },
  },

  /**
   * EIA 美国 SPR 原油库存（周频，千桶）
   * 页面：https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?n=PET&s=WCSSTUS1&f=W
   * 脚本：scripts/crawler/oil/oil_spr_crawler.js
   * 解析：scripts/tools/oil_spr_parse.js
   */
  oilSpr: {
    leafUrl: 'https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?n=PET&s=WCSSTUS1&f=W',
    downloadUrl: 'https://www.eia.gov/dnav/pet/hist_xls/WCSSTUS1w.xls',
    downloadDir: 'oil',
    fileName: 'WCSSTUS1w.xls',
    jsonFile: 'spr_stocks.json',
    delayBetweenRequests: 1000,
    maxRetries: 3,
    timeout: 30000,
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
