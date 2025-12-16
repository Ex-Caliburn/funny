# 爬虫系统

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
    ├── profits_data_extractor.js         # 工业利润提取器
    ├── industry_profits_extractor.js     # 分行业利润提取器
    └── capacity_utilization_extractor.js # 产能利用率提取器
```

## 🚀 快速开始

### 1. 基本用法

```bash
# 爬取商品价格数据（前5页）
node scripts/crawler/framework/crawler_main.js goodsPrice 5

# 爬取能源数据（前3页）
node scripts/crawler/framework/crawler_main.js energy 3

# 爬取房地产数据（第2-5页）
node scripts/crawler/framework/crawler_main.js house 2-5
```

### 2. 支持的数据类型

| 类型 | 说明 | 数据来源 |
|------|------|---------|
| `goodsPrice` | 流通领域重要生产资料市场价格变动情况 | 国家统计局 |
| `energy` | 能源生产情况 | 国家统计局 |
| `house` | 全国房地产市场基本情况 | 国家统计局 |
| `retail` | 社会消费品零售总额 | 国家统计局 |
| `invest` | 全国固定资产投资 | 国家统计局 |
| `profits` | 全国规模以上工业企业利润 | 国家统计局 |
| `industryProfits` | 分行业工业企业利润 | 国家统计局 |

### 3. 爬取所有类型

```bash
# 爬取所有类型数据的前3页
node scripts/crawler/framework/crawler_main.js all 3
```

## 📖 详细说明

### 通用框架

#### crawler_main.js - 主入口

命令行工具，支持多种参数格式：

```bash
# 基本格式
node crawler_main.js [targetType] [pageRange]

# 示例
node crawler_main.js goodsPrice 5              # 爬取第1-5页
node crawler_main.js goodsPrice 2-5            # 爬取第2-5页
node crawler_main.js energy --page-range 3-8   # 爬取第3-8页
node crawler_main.js all 3                     # 爬取所有类型的前3页

# 查看帮助
node crawler_main.js --help
```

#### crawler_config.js - 配置文件

包含所有爬虫的配置信息：

```javascript
module.exports = {
  statsGov: {
    baseUrl: 'https://www.stats.gov.cn',
    targets: {
      goodsPrice: {
        name: '流通领域重要生产资料市场价格变动情况',
        keywords: ['流通领域重要生产资料市场价格变动情况'],
        extractor: 'goods_price_extractor.js',
        parser: 'goods_price_parse.js'
      },
      // ... 其他配置
    }
  }
};
```

#### generic_crawler.js - 通用爬虫类

核心爬虫实现，提供以下功能：

- 自动分页爬取
- 智能链接提取
- 数据提取和保存
- 自动运行解析脚本
- 错误处理和重试

**使用示例：**

```javascript
const GenericCrawler = require('./generic_crawler');

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

## ⚙️ 配置说明

### 修改爬取配置

编辑 `framework/crawler_config.js`：

```javascript
// 修改最大页数限制
pagination: {
  maxAllowedPages: 50,  // 默认50页
  pageRangePattern: /^(\d+)-(\d+)$/
}

// 添加新的数据类型
targets: {
  newType: {
    name: '新数据类型',
    keywords: ['关键词1', '关键词2'],
    extractor: 'new_type_extractor.js',
    parser: 'new_type_parser.js'
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

## 🔧 高级功能

### 1. 只下载不解析

```javascript
const crawler = new GenericCrawler('goodsPrice');

// 获取页面链接
const pageUrls = crawler.getPageUrls(1);
const links = await crawler.extractRelevantLinks(pageUrls[0]);

// 只下载文件
const files = await crawler.downloadExcelFromDetailPage(links[0].url);
```

### 2. 批量爬取多种类型

```javascript
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

## 📝 注意事项

1. **遵守网站规则**：
   - 爬虫包含延迟机制，避免频繁请求
   - 请遵守目标网站的 robots.txt
   - 建议在非高峰时段运行

2. **数据存储**：
   - 原始数据保存在 `stock/[类型]/` 目录
   - 清理后的数据保存在 `stock/cleaned_data/` 目录

3. **错误处理**：
   - 爬虫包含自动重试机制
   - 详细日志输出便于排查问题
   - 失败的请求会记录并跳过

4. **性能优化**：
   - 避免爬取过多页面
   - 适当调整延迟时间
   - 定期清理旧数据

## 🐛 常见问题

### 1. 请求超时
- 检查网络连接
- 增加超时时间（在提取器中修改）
- 减少并发请求

### 2. 数据提取失败
- 检查目标网站结构是否变化
- 查看日志中的错误信息
- 更新提取器的选择器

### 3. 文件保存失败
- 确认输出目录存在且可写
- 检查磁盘空间
- 查看文件名是否包含非法字符

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

## 📄 许可

本项目仅供学习和研究使用。

