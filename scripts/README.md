# Scripts 脚本目录

本目录包含项目中所有的自动化脚本，按功能分类组织。

## 📁 目录结构

```
scripts/
├── stock-reports/     # 上市公司财报下载和解析脚本
├── crawler/           # 通用爬虫框架和数据提取器
│   ├── framework/     # 爬虫核心框架
│   └── extractors/    # 各类数据提取器
├── tools/             # 数据解析和处理工具
├── docs/              # 使用文档和调试文件
└── README.md          # 本文件
```

## 📚 各目录说明

### stock-reports/
包含上市公司财报下载和解析的相关脚本。

**主要功能：**
- 批量下载 A 股和港股公司财报
- 解析财报数据并提取关键信息
- 支持年报、半年报、季报、生产经营数据公告

**详细文档：** 查看 [stock-reports/README.md](./stock-reports/README.md)

### crawler/
通用爬虫框架，用于抓取统计局等网站的数据。

**主要功能：**
- 自动抓取国家统计局数据
- 支持多种数据类型（商品价格、能源、房地产等）
- 可配置的爬虫框架

**详细文档：** 查看 [crawler/README.md](./crawler/README.md)

### tools/
数据解析和处理工具脚本。

**主要功能：**
- Excel 文件解析
- 数据清洗和格式化
- 关键词搜索工具

**详细文档：** 查看 [tools/README.md](./tools/README.md)

### docs/
使用文档、配置指南和调试文件。

**包含内容：**
- 详细的使用说明文档
- 配置指南
- 调试文件和示例

## 🚀 快速开始

### 1. 安装依赖

```bash
cd /path/to/funny
npm install
```

### 2. 下载股票财报

```bash
# 批量下载多家公司财报
node scripts/stock-reports/batch_download_reports.js

# 下载单个公司财报
node scripts/stock-reports/download_all_reports.js --code 600348 --name 华阳股份 --years 2023,2024
```

### 3. 运行爬虫

```bash
# 爬取商品价格数据
node scripts/crawler/framework/crawler_main.js goodsPrice 5

# 爬取能源数据
node scripts/crawler/framework/crawler_main.js energy 3
```

### 4. 数据解析

```bash
# 解析商品价格数据
node scripts/tools/goods_price_parse.js

# 解析能源数据
node scripts/tools/energy_parser.js
```

## 📖 详细文档

- [上市公司财报下载工具](./docs/上市公司财报下载工具.md)
- [港股业绩报下载指南](./docs/港股业绩报下载指南.md)
- [爬虫系统说明](./docs/README_CRAWLER.md)
- [港股报告配置](./docs/HK_REPORTS_SETUP.md)

## ⚙️ 配置说明

### 环境变量

部分脚本支持环境变量配置：

- `DEBUG_HK`: 启用港股下载调试模式
- `NODE_ENV`: 运行环境（development/production）

### 配置文件

爬虫配置文件位于：`crawler/framework/crawler_config.js`

## 🔧 常见问题

### 1. 路径问题
所有脚本已更新为相对路径，可以在任何位置运行。

### 2. 依赖问题
确保安装了所有必要的依赖：
```bash
npm install axios cheerio xlsx pdf-parse dayjs
```

### 3. 权限问题
某些脚本需要写入文件权限，确保 `stock/` 目录可写。

## 📝 注意事项

1. **爬虫使用**：使用爬虫时请遵守目标网站的使用条款，避免频繁请求
2. **数据安全**：下载的财报数据仅供学习研究使用
3. **路径配置**：所有脚本已更新为相对路径，无需手动配置
4. **错误处理**：脚本包含完善的错误处理和重试机制

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可

本项目仅供学习和研究使用。

