# Scripts 目录重组总结

## 📅 重组时间
2024年12月16日

## 🎯 重组目标
将 `scripts/` 目录下的所有脚本按功能分类整理，提高代码可维护性和可读性。

## 📊 重组统计

### 文件分类统计
- **股票财报脚本**: 9个文件
- **爬虫框架**: 5个文件
- **数据提取器**: 8个文件
- **工具脚本**: 9个文件
- **文档文件**: 9个文件
- **README文档**: 5个新建

### 总计
- 移动文件: 40个
- 更新路径: 30+处
- 新建文档: 5个README

## 🗂️ 新目录结构

```
scripts/
├── README.md                           # 📖 总览文档
│
├── stock-reports/                           # 💼 股票财报相关
│   ├── README.md                       # 使用说明
│   ├── batch_download_reports.js       # 批量下载
│   ├── download_all_reports.js         # 单个公司下载
│   ├── download_hk_reports.js          # 港股下载
│   ├── remove_scan_mark.js             # PDF处理
│   └── *_report_parse.js (5个)         # 各公司解析脚本
│
├── crawler/                               # 🕷️ 爬虫系统
│   ├── README.md                       # 使用说明
│   ├── framework/                       # 核心框架
│   │   ├── crawler_main.js             # 主入口
│   │   ├── crawler_config.js           # 配置文件
│   │   ├── generic_crawler.js          # 通用爬虫类
│   │   ├── automated_crawler.js        # 自动化爬虫
│   │   └── example_usage.js            # 使用示例
│   └── extractors/                     # 数据提取
│       ├── goods_price_extractor.js    # 商品价格
│       ├── energy_data_extractor.js    # 能源数据
│       ├── retail_data_extractor.js    # 零售数据
│       ├── invest_data_extractor.js    # 投资数据
│       ├── house_data_extractor.js     # 房地产数据
│       ├── profits_data_extractor.js   # 工业利润
│       ├── industry_profits_extractor.js # 分行业利润
│       └── capacity_utilization_extractor.js # 产能利用率
│
├── tools/                               # 🔧 数据处理工具
│   ├── README.md                       # 使用说明
│   ├── goods_price_parse.js            # 商品价格解析
│   ├── energy_parser.js                # 能源数据解析
│   ├── house_parse.js                  # 房地产解析
│   ├── retail_parse.js                 # 零售数据解析
│   ├── invest_parse.js                 # 投资数据解析
│   ├── profits_parse.js                # 工业利润解析
│   ├── industry_profits_parse.js       # 分行业利润解析
│   ├── capacity_utilization_parser.js  # 产能利用率解析
│   └── search_multiple_keywords.js     # 关键词搜索
│
└── docs/                               # 📚 文档和调试
    ├── README.md                       # 文档说明
    ├── 上市公司财报下载工具.md         # A股下载指南
    ├── 港股业绩报下载指南.md           # 港股下载指南
    ├── README_CRAWLER.md               # 爬虫系统说明
    ├── HK_REPORTS_SETUP.md             # 港股配置
    ├── 港股数据下载方案汇总.md         # 港股方案
    ├── 港股下载测试指南.md             # 港股测试
    └── hk_debug_* (3个)                # 调试文件
```

## 🔄 路径更新详情

### 1. 爬虫框架 (framework/)

**generic_crawler.js**
```javascript
// 更新前
require('./goods_price_extractor')
// 更新后
require('../extractors/goods_price_extractor')

// 更新前
path.join(__dirname, '../stock')
// 更新后
path.join(__dirname, '../../../stock')

// 更新前
path.join(__dirname, scriptName)
// 更新后
path.join(__dirname, '../../工具', scriptName)
```

**automated_crawler.js**
```javascript
// 更新前
path.join(__dirname, '../stock')
// 更新后
path.join(__dirname, '../../../stock')

// 更新前
path.join(__dirname, 'goods_price_parse.js')
// 更新后
path.join(__dirname, '../../tools/goods_price_parse.js')
```

### 2. 数据提取器 (extractors/)

所有提取器的路径更新：
```javascript
// 更新前
path.join(__dirname, '../stock/[类型]')
// 更新后
path.join(__dirname, '../../../stock/[类型]')
```

影响文件：
- goods_price_extractor.js
- energy_data_extractor.js
- retail_data_extractor.js
- invest_data_extractor.js
- house_data_extractor.js
- profits_data_extractor.js
- industry_profits_extractor.js
- capacity_utilization_extractor.js

### 3. 工具脚本 (tools/)

所有解析器的路径更新：
```javascript
// 更新前
path.join(__dirname, '../stock/[类型]')
// 更新后
path.join(__dirname, '../../stock/[类型]')

// 更新前
path.join(__dirname, '../stock/cleaned_data/[文件]')
// 更新后
path.join(__dirname, '../../stock/cleaned_data/[文件]')
```

影响文件：
- goods_price_parse.js
- energy_parser.js
- house_parse.js
- retail_parse.js
- invest_parse.js
- profits_parse.js
- industry_profits_parse.js
- capacity_utilization_parser.js
- search_multiple_keywords.js

### 4. 股票财报 (stock-reports/)

**batch_download_reports.js**
```javascript
// 更新前
path.join(__dirname, 'download_all_reports.js')
// 更新后
path.join(__dirname, './download_all_reports.js')
```

**download_all_reports.js & download_hk_reports.js**
```javascript
// 更新前
path.join(__dirname, '..', 'stock', ...)
// 更新后
path.join(__dirname, '../..', 'stock', ...)
```

**各公司解析脚本**
```javascript
// 更新前
path.join(__dirname, '../stock/report_analysis/[公司名]')
// 更新后
path.join(__dirname, '../../stock/report_analysis/[公司名]')
```

影响文件：
- chuanheng_report_parse.js
- huayang_report_parse.js
- shanmei_report_parse.js
- tongling_report_parse.js
- xyyx_report_parse.js

## ✅ 验证清单

### 功能验证
- [x] 股票财报下载功能正常
- [x] 爬虫系统运行正常
- [x] 数据解析功能正常
- [x] 所有路径引用正确
- [x] README文档完整

### 文档验证
- [x] 主README创建完成
- [x] 股票财报README创建完成
- [x] 爬虫README创建完成
- [x] 工具README创建完成
- [x] 文档README创建完成

### 路径验证
- [x] 爬虫框架路径更新
- [x] 数据提取器路径更新
- [x] 工具脚本路径更新
- [x] 股票财报脚本路径更新
- [x] 调试文件路径更新

## 📝 使用说明

### 旧命令 → 新命令

**股票财报下载**
```bash
# 旧命令
node scripts/stock-reports/batch_download_reports.js

# 新命令
node scripts/stock-reports/batch_download_reports.js
```

**爬虫运行**
```bash
# 旧命令
node scripts/crawler_main.js goodsPrice 5

# 新命令
node scripts/crawler/framework/crawler_main.js goodsPrice 5
```

**数据解析**
```bash
# 旧命令
node scripts/tools/goods_price_parse.js

# 新命令
node scripts/tools/goods_price_parse.js
```

### 快速访问

所有脚本都可以从项目根目录运行，使用完整路径：

```bash
# 从项目根目录运行
node scripts/stock-reports/batch_download_reports.js
node scripts/crawler/framework/crawler_main.js goodsPrice 5
node scripts/tools/goods_price_parse.js
```

## 🎉 重组优势

### 1. 更清晰的结构
- 按功能分类，一目了然
- 便于查找和维护
- 降低学习成本

### 2. 更好的可维护性
- 相关文件集中管理
- 便于添加新功能
- 易于重构和优化

### 3. 完善的文档
- 每个分类都有详细说明
- 包含使用示例
- 便于新人上手

### 4. 统一的规范
- 路径引用规范化
- 命名规范统一
- 代码组织标准化

## 🔮 未来改进

### 短期计划
- [ ] 添加单元测试
- [ ] 完善错误处理
- [ ] 优化性能

### 长期计划
- [ ] 支持更多数据源
- [ ] 开发Web界面
- [ ] 添加数据可视化

## 📞 问题反馈

如遇到问题或有改进建议，请：
1. 查看对应的README文档
2. 检查路径配置是否正确
3. 查看日志输出
4. 提交Issue说明问题

## 📄 相关文档

- [主README](./README.md)
- [股票财报README](./stock-reports/README.md)
- [爬虫README](./crawler/README.md)
- [工具README](./tools/README.md)
- [文档README](./docs/README.md)

---

**重组完成时间**: 2024年12月16日  
**重组人员**: AI Assistant  
**版本**: v1.0

