# 统计局数据自动爬虫系统 - 安装和使用指南

## 快速开始

### 1. 安装依赖

```bash
# 安装Node.js依赖
npm install

# 或者使用yarn
yarn install
```

### 2. 运行爬虫

```bash
# 爬取商品价格数据（推荐首次使用）
npm run crawl goodsPrice 2

# 或者直接使用node命令
node scripts/crawler_main.js goodsPrice 2
```

### 3. 查看结果

爬取完成后，数据会保存在以下位置：

- **原始Excel文件**: `stock/goods_price/` 目录
- **解析后数据**: `stock/goods_price_cleaned.json` 文件

## 详细使用说明

### 支持的数据类型

| 命令 | 数据类型 | 说明 |
|------|----------|------|
| `npm run crawl goodsPrice 3` | 商品价格 | 流通领域重要生产资料市场价格变动情况 |
| `npm run crawl energy 3` | 能源数据 | 能源生产情况 |
| `npm run crawl house 3` | 房地产数据 | 全国房地产市场基本情况 |
| `npm run crawl retail 3` | 消费数据 | 社会消费品零售总额 |
| `npm run crawl invest 3` | 投资数据 | 全国固定资产投资 |
| `npm run crawl profits 3` | 利润数据 | 全国规模以上工业企业利润 |
| `npm run crawl industryProfits 3` | 分行业利润 | 分行业工业企业利润 |

### 批量爬取

```bash
# 爬取所有类型数据
npm run crawl:all 3
```

### 单独解析数据

```bash
# 如果只想解析已有的Excel文件，可以单独运行解析脚本
npm run goods:parse
npm run energy:parse
npm run stock:parse
npm run profits:parse
npm run industry:parse
```

## 配置选项

### 修改爬虫配置

编辑 `scripts/crawler_config.js` 文件：

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

### 自定义关键词

在配置文件中添加或修改关键词来匹配不同的数据：

```javascript
targets: {
  goodsPrice: {
    name: '流通领域重要生产资料市场价格变动情况',
    keywords: ['流通领域重要生产资料市场价格变动情况', '生产资料价格'],
    downloadDir: 'goods_price'
  }
}
```

## 故障排除

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

### 调试模式

```bash
# 启用详细日志
DEBUG=* node scripts/crawler_main.js goodsPrice 1

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

## 高级用法

### 定时任务

可以使用cron设置定时任务：

```bash
# 每天凌晨2点自动爬取商品价格数据
0 2 * * * cd /path/to/your/project && npm run crawl goodsPrice 3
```

### 自定义脚本

创建自定义爬虫脚本：

```javascript
const GenericCrawler = require('./scripts/generic_crawler');

async function customCrawl() {
  const crawler = new GenericCrawler('goodsPrice');
  const result = await crawler.crawlAndParse(5);
  console.log('爬取完成:', result);
}

customCrawl();
```

### 数据可视化

爬取的数据可以用于生成图表：

```bash
# 启动本地服务器查看数据
npm run serve

# 访问 http://localhost:8080 查看数据文件
```

## 注意事项

1. **遵守网站规则**: 爬取时请遵守统计局的robots.txt和使用条款
2. **合理频率**: 不要过于频繁地请求，避免对服务器造成压力
3. **数据使用**: 请合理使用爬取的数据，遵守相关法律法规
4. **备份数据**: 建议定期备份重要的数据文件

## 技术支持

如果遇到问题，可以：

1. 查看 `scripts/README_CRAWLER.md` 获取详细文档
2. 运行测试脚本检查环境配置
3. 检查控制台输出的错误信息
4. 查看生成的日志文件

## 更新日志

- v1.0.0: 初始版本，支持7种数据类型的基本爬取功能
- 支持分页爬取、自动下载、解析脚本集成
- 包含错误处理和重试机制
