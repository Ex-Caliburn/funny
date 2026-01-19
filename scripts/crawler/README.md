# 统计局数据自动爬虫系统

通用爬虫框架，用于自动抓取统计局等网站的数据。

## 📁 目录结构

```
crawler/
├── framework/              # 爬虫核心框架
│   ├── crawler_main.js           # 主入口文件
│   ├── crawler_config.js         # 配置文件
│   ├── generic_crawler.js        # 通用爬虫类
│   ├── automated_crawler.js      # 自动化爬虫（旧版）
│   └── example_usage.js          # 使用示例
└── extractors/            # 各类数据提取器
    ├── goods_price_extractor.js          # 商品价格提取器
    ├── energy_data_extractor.js          # 能源数据提取器
    ├── retail_data_extractor.js          # 零售数据提取器
    ├── invest_data_extractor.js          # 投资数据提取器
    ├── house_data_extractor.js           # 房地产数据提取器
    ├── industrial_value_added_extractor.js  # 工业增加值提取器
    ├── industry_profits_extractor.js     # 分行业利润提取器
    └── capacity_utilization_extractor.js # 产能利用率提取器
```

## 🚀 快速开始

### 1. 安装依赖

```bash
# 安装Node.js依赖
npm install

# 或者使用yarn
yarn install
```

### 2. 运行爬虫

```bash
# 方式一：使用 npm 脚本（推荐）
npm run crawl goodsPrice 2

# 方式二：直接使用 node 命令
node scripts/crawler/framework/crawler_main.js goodsPrice 2
```

### 3. 查看结果

爬取完成后，数据会保存在以下位置：

- **原始Excel文件**: `stock/goods_price/` 目录
- **解析后数据**: `stock/goods_price_cleaned.json` 文件

## 📖 详细使用说明

### 支持的数据类型

| 类型 | 说明 | 数据来源 | 命令示例 |
|------|------|---------|---------|
| `goodsPrice` | 流通领域重要生产资料市场价格变动情况 | 国家统计局 | `npm run crawl goodsPrice 3` |
| `energy` | 能源生产情况 | 国家统计局 | `npm run crawl energy 3` |
| `house` | 全国房地产市场基本情况 | 国家统计局 | `npm run crawl house 3` |
| `retail` | 社会消费品零售总额 | 国家统计局 | `npm run crawl retail 3` |
| `invest` | 全国固定资产投资 | 国家统计局 | `npm run crawl invest 3` |
| `profits` | 规模以上工业增加值 | 国家统计局 | `npm run crawl profits 3` |
| `industryProfits` | 分行业工业企业利润 | 国家统计局 | `npm run crawl industryProfits 3` |

### 命令行参数格式

```bash
# 基本格式
node scripts/crawler/framework/crawler_main.js [targetType] [pageRange]

# 示例
node scripts/crawler/framework/crawler_main.js goodsPrice 5              # 爬取第1-5页
node scripts/crawler/framework/crawler_main.js goodsPrice 2-5            # 爬取第2-5页
node scripts/crawler/framework/crawler_main.js energy 3                  # 爬取前3页
node scripts/crawler/framework/crawler_main.js all 3                     # 爬取所有类型的前3页

# 查看帮助
node scripts/crawler/framework/crawler_main.js --help
```

### 批量爬取

```bash
# 爬取所有类型数据
npm run crawl:all 3
```

### 单独解析数据

如果只想解析已有的Excel文件，可以单独运行解析脚本：

```bash
npm run goods:parse
npm run energy:parse
npm run stock:parse
npm run profits:parse
npm run industry:parse
```

## ⚙️ 配置说明

### 修改爬虫配置

编辑 `scripts/crawler/framework/crawler_config.js` 文件：

```javascript
module.exports = {
  statsGov: {
    baseUrl: 'https://www.stats.gov.cn',
    maxPages: 5,                    // 默认最大页数
    delayBetweenRequests: 1000,     // 请求间延迟(毫秒)
    maxRetries: 3,                  // 最大重试次数
    timeout: 30000,                 // 请求超时(毫秒)
    targets: {
      goodsPrice: {
        name: '流通领域重要生产资料市场价格变动情况',
        keywords: ['流通领域重要生产资料市场价格变动情况', '生产资料价格'],
        extractor: 'goods_price_extractor.js',
        parser: 'goods_price_parse.js',
        downloadDir: 'goods_price'
      },
      // ... 其他配置
    }
  },
  // 修改最大页数限制
  pagination: {
    maxAllowedPages: 50,  // 默认50页
    pageRangePattern: /^(\d+)-(\d+)$/
  }
};
```

### 自定义关键词

在配置文件中添加或修改关键词来匹配不同的数据：

```javascript
targets: {
  newType: {
    name: '新数据类型',
    keywords: ['关键词1', '关键词2'],
    extractor: 'new_type_extractor.js',
    parser: 'new_type_parser.js',
    downloadDir: 'new_type'
  }
}
```

### 请求延迟设置

在各个提取器中可以调整请求延迟：

```javascript
this.delayBetweenRequests = 1000; // 1秒延迟
```

## 📊 工作流程

```
1. crawler_main.js 接收命令行参数
   ↓
2. 创建 GenericCrawler 实例
   ↓
3. 获取分页 URL 列表
   ↓
4. 遍历每个页面，提取相关链接
   ↓
5. 访问详情页，调用对应的数据提取器
   ↓
6. 提取器下载并解析数据，保存为 Excel
   ↓
7. 自动运行解析脚本（在 tools/ 目录）
   ↓
8. 生成清理后的 JSON 数据
```

## 🔧 核心组件说明

### crawler_main.js - 主入口

命令行工具，负责解析参数并启动爬虫流程。

### crawler_config.js - 配置文件

包含所有爬虫的配置信息，包括目标网站URL、数据类型配置、爬取参数等。

### generic_crawler.js - 通用爬虫类

核心爬虫实现，提供以下功能：

- 自动分页爬取
- 智能链接提取
- 数据提取和保存
- 自动运行解析脚本
- 错误处理和重试

**使用示例：**

```javascript
const GenericCrawler = require('./framework/generic_crawler');

// 创建爬虫实例
const crawler = new GenericCrawler('goodsPrice');

// 爬取并解析数据
const result = await crawler.crawlAndParse(1, 5); // 爬取第1-5页

console.log(`下载了 ${result.downloadedFiles} 个文件`);
```

### 数据提取器

每个数据提取器负责从统计局网站提取特定类型的数据。

#### 提取器基本结构

```javascript
class DataExtractor {
  constructor() {
    this.downloadDir = path.join(__dirname, '../../../stock/[类型]');
  }

  // 处理详情页
  async processDetailPage(detailUrl) {
    // 1. 访问详情页
    // 2. 提取数据
    // 3. 保存为 Excel
    // 4. 返回结果
  }
}
```

#### 自定义提取器

如需添加新的数据类型：

1. 在 `extractors/` 目录创建新的提取器文件
2. 继承或参考现有提取器的结构
3. 在 `crawler_config.js` 中添加配置
4. 在 `generic_crawler.js` 中添加对应的提取方法
5. 创建对应的解析脚本（在 `tools/` 目录）

## 🔧 高级功能

### 1. 只下载不解析

```javascript
const GenericCrawler = require('./framework/generic_crawler');

const crawler = new GenericCrawler('goodsPrice');

// 获取页面链接
const pageUrls = crawler.getPageUrls(1);
const links = await crawler.extractRelevantLinks(pageUrls[0]);

// 只下载文件
const files = await crawler.downloadExcelFromDetailPage(links[0].url);
```

### 2. 批量爬取多种类型

```javascript
const GenericCrawler = require('./framework/generic_crawler');

const targets = ['goodsPrice', 'energy', 'house'];

for (const target of targets) {
  const crawler = new GenericCrawler(target);
  await crawler.crawlAndParse(1, 3);
  
  // 添加延迟
  await new Promise(resolve => setTimeout(resolve, 2000));
}
```

### 3. 自定义输出目录

修改提取器中的 `downloadDir`：

```javascript
this.downloadDir = path.join(__dirname, '../../../custom/output/dir');
```

### 4. 定时任务

可以使用cron设置定时任务：

```bash
# 每天凌晨2点自动爬取商品价格数据
0 2 * * * cd /path/to/your/project && npm run crawl goodsPrice 3
```

### 5. 自定义脚本

创建自定义爬虫脚本：

```javascript
const GenericCrawler = require('./framework/generic_crawler');

async function customCrawl() {
  const crawler = new GenericCrawler('goodsPrice');
  const result = await crawler.crawlAndParse(5);
  console.log('爬取完成:', result);
}

customCrawl();
```

### 6. 数据可视化

爬取的数据可以用于生成图表：

```bash
# 启动本地服务器查看数据
npm run serve

# 访问 http://localhost:8080 查看数据文件
```

## 🐛 故障排除

### 常见问题

1. **网络连接问题**

   ```
   错误: 请求失败 (尝试 1/3): timeout of 30000ms exceeded
   ```

   - 检查网络连接
   - 尝试增加 `timeout` 配置值
   - 减少爬取页数

2. **找不到数据**

   ```
   没有找到相关链接，流程结束
   ```

   - 检查统计局网站是否更新了页面结构
   - 更新关键词配置
   - 尝试访问网站确认数据是否存在

3. **下载失败**

   ```
   下载文件失败: 404 Not Found
   ```

   - 检查Excel文件链接是否有效
   - 可能是网站结构变化导致

4. **解析脚本失败**

   ```
   解析脚本执行失败，退出码: 1
   ```

   - 检查Excel文件格式是否正确
   - 查看具体的解析脚本错误信息

5. **请求超时**

   - 检查网络连接
   - 增加超时时间（在提取器中修改）
   - 减少并发请求

6. **数据提取失败**

   - 检查目标网站结构是否变化
   - 查看日志中的错误信息
   - 更新提取器的选择器

7. **文件保存失败**

   - 确认输出目录存在且可写
   - 检查磁盘空间
   - 查看文件名是否包含非法字符

### 调试模式

```bash
# 启用详细日志
DEBUG=* node scripts/crawler/framework/crawler_main.js goodsPrice 1

# 测试单个功能
node scripts/crawler/framework/crawler_main.js
```

### 手动检查

1. **检查网络连接**

   ```bash
   curl -I https://www.stats.gov.cn/sj/zxfb/index.html
   ```

2. **检查依赖安装**

   ```bash
   npm list axios cheerio xlsx
   ```

3. **检查目录权限**

   ```bash
   ls -la stock/
   ```

## 📝 注意事项

1. **遵守网站规则**：
   - 爬虫包含延迟机制，避免频繁请求
   - 请遵守目标网站的 robots.txt 和使用条款
   - 建议在非高峰时段运行

2. **合理频率**：
   - 不要过于频繁地请求，避免对服务器造成压力
   - 适当调整延迟时间

3. **数据使用**：
   - 请合理使用爬取的数据，遵守相关法律法规

4. **数据存储**：
   - 原始数据保存在 `stock/[类型]/` 目录
   - 清理后的数据保存在 `stock/cleaned_data/` 目录
   - 建议定期备份重要的数据文件

5. **错误处理**：
   - 爬虫包含自动重试机制
   - 详细日志输出便于排查问题
   - 失败的请求会记录并跳过

6. **性能优化**：
   - 避免爬取过多页面
   - 适当调整延迟时间
   - 定期清理旧数据

## 📚 相关文档

- [爬虫系统详细说明](../docs/README_CRAWLER.md)
- [工具脚本说明](../tools/README.md)

## 🤝 贡献

欢迎添加新的数据提取器和功能！

步骤：
1. 创建新的提取器文件
2. 在配置文件中添加配置
3. 在 generic_crawler.js 中添加提取方法
4. 创建对应的解析脚本（在 tools/ 目录）
5. 测试并提交

## 📄 更新日志

- **v1.0.0**: 初始版本，支持7种数据类型的基本爬取功能
- 支持分页爬取、自动下载、解析脚本集成
- 包含错误处理和重试机制

## 📄 许可

本项目仅供学习和研究使用。
