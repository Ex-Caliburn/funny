# 路径迁移完成报告

## 📅 迁移时间

2024年12月16日

## 🎯 迁移目标

将所有脚本目录的中文路径改为英文路径，提高跨平台兼容性。

## 📊 路径映射表

| 原路径（中文） | 新路径（英文） | 说明 |
|---------------|---------------|------|
| `股票财报/` | `stock-reports/` | 股票财报下载和解析脚本 |
| `爬虫/` | `crawler/` | 爬虫系统主目录 |
| `爬虫/通用框架/` | `crawler/framework/` | 爬虫核心框架 |
| `爬虫/数据提取器/` | `crawler/extractors/` | 各类数据提取器 |
| `工具/` | `tools/` | 数据解析和处理工具 |
| `文档/` | `docs/` | 使用文档和调试文件 |

## 🗂️ 最终目录结构

```
scripts/
├── README.md                           # 总览文档
├── MIGRATION_SUMMARY.md                # 迁移总结
├── PATH_MIGRATION.md                   # 本文件
│
├── stock-reports/                      # 股票财报
│   ├── README.md
│   ├── batch_download_reports.js
│   ├── download_all_reports.js
│   ├── download_hk_reports.js
│   ├── remove_scan_mark.js
│   ├── chuanheng_report_parse.js
│   ├── huayang_report_parse.js
│   ├── shanmei_report_parse.js
│   ├── tongling_report_parse.js
│   └── xyyx_report_parse.js
│
├── crawler/                            # 爬虫系统
│   ├── README.md
│   ├── framework/                      # 核心框架
│   │   ├── crawler_main.js
│   │   ├── crawler_config.js
│   │   ├── generic_crawler.js
│   │   └── automated_crawler.js
│   └── extractors/                     # 数据提取器
│       ├── goods_price_extractor.js
│       ├── energy_data_extractor.js
│       ├── retail_data_extractor.js
│       ├── invest_data_extractor.js
│       ├── house_data_extractor.js
│       ├── profits_data_extractor.js
│       ├── industry_profits_extractor.js
│       └── capacity_utilization_extractor.js
│
├── tools/                              # 工具脚本
│   ├── README.md
│   ├── goods_price_parse.js
│   ├── energy_parser.js
│   ├── house_parse.js
│   ├── retail_parse.js
│   ├── invest_parse.js
│   ├── profits_parse.js
│   ├── industry_profits_parse.js
│   ├── capacity_utilization_parser.js
│   └── search_multiple_keywords.js
│
└── docs/                               # 文档
    ├── README.md
    ├── 上市公司财报下载工具.md
    ├── 港股业绩报下载指南.md
    ├── README_CRAWLER.md
    ├── HK_REPORTS_SETUP.md
    ├── 港股数据下载方案汇总.md
    ├── 港股下载测试指南.md
    ├── download_hk_reports_playwright.py
    ├── setup_hk_download.sh
    ├── hk_debug_page.html
    ├── hk_debug_response.html
    └── hk_debug_screenshot.png
```

## 🔄 代码更新详情

### 0. package.json - npm 脚本命令

**更新前：**

```json
"scripts": {
  "retail:parse": "node scripts/retail_parse.js",
  "crawl:goods": "node scripts/crawler_main.js goodsPrice"
}
```

**更新后：**

```json
"scripts": {
  "retail:parse": "node scripts/tools/retail_parse.js",
  "crawl:goods": "node scripts/crawler/framework/crawler_main.js goodsPrice",
  "download:reports": "node scripts/stock-reports/batch_download_reports.js",
  "download:hk": "node scripts/stock-reports/download_hk_reports.js"
}
```

**影响范围：**

- 所有 parse 命令（8个）
- 所有 crawl 命令（10个）
- 新增 download 命令（2个）

### 1. 爬虫框架 (crawler/framework/)

**generic_crawler.js**

```javascript
// 更新前
require('../数据提取器/goods_price_extractor')
// 更新后
require('../extractors/goods_price_extractor')

// 更新前
path.join(__dirname, '../../工具', scriptName)
// 更新后
path.join(__dirname, '../../tools', scriptName)
```

**automated_crawler.js**

```javascript
// 更新前
path.join(__dirname, '../../工具/goods_price_parse.js')
// 更新后
path.join(__dirname, '../../tools/goods_price_parse.js')
```

### 2. 股票财报 (stock-reports/)

**download_hk_reports.js**

```javascript
// 更新前
path.join(__dirname, '../文档/hk_debug_response.html')
// 更新后
path.join(__dirname, '../docs/hk_debug_response.html')
```

### 3. 项目文档更新

**项目根目录：**

- `CRAWLER_SETUP.md` - 爬虫配置文档
- `package.json` - npm 脚本命令

**stock/ 目录：**

- `stock/industry_profits/README_industry_profits.md`
- `stock/profits/README_profits.md`
- `stock/energy/README_energy.md`
- `stock/capacity_utilization/README_capacity_utilization.md`
- `stock/report_analysis/山煤国际/README.md`
- `stock/report_analysis/华阳股份/README_DATA.md`

**scripts/ 目录：**
所有 README.md 文件中的路径引用已批量更新：

- `股票财报/` → `stock-reports/`
- `爬虫/` → `crawler/`
- `通用框架/` → `framework/`
- `数据提取器/` → `extractors/`
- `工具/` → `tools/`
- `文档/` → `docs/`

## ✅ 验证清单

### 目录结构

- [x] 所有文件夹名改为英文
- [x] 子目录结构保持一致
- [x] 文件数量无遗漏

### 代码引用

- [x] crawler/framework/ 中的引用已更新
- [x] stock-reports/ 中的引用已更新
- [x] 所有 require() 路径已更新
- [x] 所有 path.join() 路径已更新

### 文档更新

- [x] 主 README.md 已更新
- [x] 所有子目录 README.md 已更新
- [x] MIGRATION_SUMMARY.md 已更新
- [x] PATH_MIGRATION.md 已创建
- [x] 示例代码中的路径已更新
- [x] package.json 已更新
- [x] stock/ 目录文档已更新
- [x] 项目根目录文档已更新

## 🚀 使用说明

### npm 快捷命令（推荐）

**数据解析：**

```bash
npm run goods:parse      # 解析商品价格数据
npm run energy:parse     # 解析能源数据
npm run retail:parse     # 解析零售数据
npm run invest:parse     # 解析投资数据
npm run house:parse      # 解析房地产数据
npm run profits:parse    # 解析工业利润数据
npm run industry:parse   # 解析分行业利润数据
npm run capacity:parse   # 解析产能利用率数据
```

**爬虫运行：**

```bash
npm run crawl:goods      # 爬取商品价格
npm run crawl:energy     # 爬取能源数据
npm run crawl:retail     # 爬取零售数据
npm run crawl:invest     # 爬取投资数据
npm run crawl:house      # 爬取房地产数据
npm run crawl:profits    # 爬取工业利润
npm run crawl:industry   # 爬取分行业利润
npm run crawl:all        # 爬取所有类型数据
```

**财报下载：**

```bash
npm run download:reports # 批量下载A股财报
npm run download:hk      # 下载港股财报
```

### 直接命令格式

**股票财报下载**

```bash
# 旧命令
node scripts/股票财报/batch_download_reports.js

# 新命令
node scripts/stock-reports/batch_download_reports.js
```

**爬虫运行**

```bash
# 旧命令
node scripts/爬虫/通用框架/crawler_main.js goodsPrice 5

# 新命令
node scripts/crawler/framework/crawler_main.js goodsPrice 5
```

**数据解析**

```bash
# 旧命令
node scripts/工具/goods_price_parse.js

# 新命令
node scripts/tools/goods_price_parse.js
```

**查看文档**

```bash
# 旧命令
cat scripts/文档/上市公司财报下载工具.md

# 新命令
cat scripts/docs/上市公司财报下载工具.md
```

## 📝 注意事项

### 1. 数据存储路径未改变

以下路径保持中文，因为它们是数据存储路径，不是脚本路径：

- `stock/report_analysis/华阳股份/`
- `stock/report_analysis/山煤国际/`
- 等公司名称目录

### 2. 文档文件名未改变

`docs/` 目录下的中文文档文件名保持不变：

- `上市公司财报下载工具.md`
- `港股业绩报下载指南.md`
- 等

### 3. 兼容性提升

使用英文路径后的优势：

- ✅ 更好的跨平台兼容性
- ✅ 避免编码问题
- ✅ 符合编程规范
- ✅ 便于版本控制
- ✅ 更易于自动化处理

## 🎉 迁移优势

### 1. 跨平台兼容

- Windows、macOS、Linux 都能正常使用
- 避免了中文路径在某些系统上的问题

### 2. 编码问题

- 消除了可能的编码问题
- 在终端中更易于输入和操作

### 3. 开发规范

- 符合国际化开发规范
- 便于团队协作
- 更易于 CI/CD 集成

### 4. 工具支持

- 更好的 IDE 支持
- 更好的命令行工具支持
- 更好的版本控制系统支持

## 🔮 后续工作

### 可选优化

- [ ] 考虑是否将中文文档文件名也改为英文
- [ ] 添加路径别名配置
- [ ] 创建快捷命令脚本

### 维护建议

- 新增脚本时使用英文命名
- 保持目录结构的一致性
- 及时更新文档

## 📞 问题反馈

如遇到路径相关问题：

1. 检查是否使用了旧的中文路径
2. 查看本文档的路径映射表
3. 参考新的使用示例
4. 查看各目录的 README.md

## 📚 相关文档

- [主 README](./README.md)
- [迁移总结](./MIGRATION_SUMMARY.md)
- [股票财报 README](./stock-reports/README.md)
- [爬虫 README](./crawler/README.md)
- [工具 README](./tools/README.md)
- [文档 README](./docs/README.md)

---

**迁移完成时间**: 2024年12月16日  
**迁移人员**: AI Assistant  
**版本**: v2.0 (英文路径版本)
