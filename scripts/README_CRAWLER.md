# 统计局数据自动爬虫系统

这是一个用于自动抓取国家统计局网站数据的Node.js爬虫系统，支持多种数据类型的分页抓取、Excel文件下载和自动解析。

## 功能特点

- 🔄 **自动分页爬取**: 支持多页数据抓取，避免遗漏
- 📊 **多数据类型支持**: 支持7种不同的统计局数据类型
- 💾 **自动文件下载**: 自动识别并下载Excel文件
- 🔧 **自动解析**: 下载完成后自动运行对应的解析脚本
- ⚡ **智能重试**: 网络请求失败时自动重试
- 🛡️ **友好延迟**: 请求间自动延迟，避免对服务器造成压力

## 支持的数据类型

| 类型 | 名称 | 关键词 |
|------|------|--------|
| `goodsPrice` | 流通领域重要生产资料市场价格变动情况 | 流通领域重要生产资料市场价格变动情况 |
| `energy` | 能源生产情况 | 能源生产情况、发电量、原煤、原油、天然气 |
| `house` | 全国房地产市场基本情况 | 全国房地产市场基本情况、房地产开发投资 |
| `retail` | 社会消费品零售总额 | 社会消费品零售总额、消费品零售 |
| `invest` | 全国固定资产投资 | 全国固定资产投资、固定资产投资 |
| `profits` | 全国规模以上工业企业利润 | 全国规模以上工业企业利润、工业企业利润 |
| `industryProfits` | 分行业工业企业利润 | 全国规模以上工业企业利润、分行业利润 |

## 安装依赖

```bash
npm install
```

## 使用方法

### 1. 基本用法

```bash
# 爬取商品价格数据（默认3页）
npm run crawl

# 爬取特定类型数据
npm run crawl goodsPrice 5

# 爬取所有类型数据
npm run crawl:all
```

### 2. 直接使用Node.js

```bash
# 爬取商品价格数据，最多5页
node scripts/crawler_main.js goodsPrice 5

# 爬取能源数据，最多3页
node scripts/crawler_main.js energy 3

# 爬取所有类型数据
node scripts/crawler_main.js all 5

# 查看帮助信息
node scripts/crawler_main.js --help
```

### 3. 单独运行解析脚本

```bash
# 解析商品价格数据
npm run goods:parse

# 解析能源数据
npm run energy:parse

# 解析其他类型数据
npm run stock:parse
npm run profits:parse
npm run industry:parse
```

## 输出文件结构

```
stock/
├── goods_price/          # 商品价格Excel文件
│   ├── 2024-01-15_商品价格.xls
│   └── ...
├── energy/               # 能源数据Excel文件
│   ├── 2024-01-15_能源生产.xls
│   └── ...
├── house/                # 房地产数据Excel文件
├── retail/               # 消费数据Excel文件
├── invest/               # 投资数据Excel文件
├── profits/              # 利润数据Excel文件
├── industry_profits/     # 分行业利润数据Excel文件
├── cleaned_data/               # 解析后的数据文件
│   ├── goods_price_cleaned.json
│   ├── energy_cleaned.json
│   ├── house_cleaned.json
│   ├── retail_cleaned.json
│   ├── invest_cleaned.json
│   ├── profits_cleaned.json
│   └── industry_profits_cleaned.json
```

## 配置说明

### 爬虫配置 (scripts/crawler_config.js)

```javascript
{
  statsGov: {
    baseUrl: 'https://www.stats.gov.cn/sj/zxfb/index.html',
    maxPages: 5,                    // 默认最大页数
    delayBetweenRequests: 1000,     // 请求间延迟(毫秒)
    maxRetries: 3,                  // 最大重试次数
    timeout: 30000,                 // 请求超时(毫秒)
  }
}
```

### 自定义配置

你可以修改 `scripts/crawler_config.js` 文件来调整爬虫行为：

- 修改 `maxPages` 来调整默认爬取页数
- 修改 `delayBetweenRequests` 来调整请求延迟
- 添加新的目标类型或关键词

## 注意事项

1. **网络延迟**: 爬取过程会有适当的延迟，避免对统计局服务器造成压力
2. **文件重复**: 系统会自动检测已下载的文件，避免重复下载
3. **错误处理**: 网络请求失败时会自动重试，单个文件下载失败不会影响整体流程
4. **数据解析**: 下载完成后会自动运行对应的解析脚本，生成清理后的JSON数据

## 故障排除

### 常见问题

1. **网络连接超时**
   - 检查网络连接
   - 尝试减少 `maxPages` 参数
   - 增加 `timeout` 配置

2. **找不到Excel文件**
   - 检查统计局网站结构是否发生变化
   - 更新关键词配置

3. **解析脚本失败**
   - 检查Excel文件格式是否正确
   - 查看具体的错误信息

### 调试模式

```bash
# 查看详细的执行日志
DEBUG=* node scripts/crawler_main.js goodsPrice 2
```

## 扩展开发

### 添加新的数据类型

1. 在 `scripts/crawler_config.js` 中添加新的目标配置
2. 创建对应的解析脚本（如果不存在）
3. 在 `scripts/generic_crawler.js` 的 `scriptMap` 中添加映射关系

### 自定义解析逻辑

每个数据类型的解析逻辑都在对应的脚本文件中，你可以根据需要修改：

- `scripts/goods_price_parse.js` - 商品价格数据解析
- `scripts/energy_parser.js` - 能源数据解析
- `scripts/house_parse.js` - 房地产数据解析
- 等等...

## 许可证

ISC License
