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

### 3. 分页区间功能 ⭐ 新功能

爬虫系统支持**分页区间选择**功能，可以灵活指定要爬取的页码范围，而不仅限于从第1页开始。

#### 支持的格式

**单个数字（从第1页开始）**：

```bash
node crawler_main.js goodsPrice 5
# 爬取第1-5页
```

**区间范围（简化格式）⭐ 推荐**：

```bash
node crawler_main.js goodsPrice 2-5
# 爬取第2-5页
```

**区间范围（带前缀）**：

```bash
node crawler_main.js goodsPrice --page-range 2-5
# 爬取第2-5页
```

#### 使用示例

```bash
# 示例 1: 爬取商品价格数据（第1-5页）
node crawler_main.js goodsPrice 5

# 示例 2: 爬取能源数据（第2-5页）
node crawler_main.js energy 2-5

# 示例 3: 爬取房地产数据（第3-8页）
node crawler_main.js house --page-range 3-8

# 示例 4: 爬取所有类型数据（前3页）
node crawler_main.js all 3

# 示例 5: 爬取所有类型数据（第2-4页）
node crawler_main.js all 2-4

# 示例 6: 只爬取单页
node crawler_main.js retail 3-3
# 只爬取第3页
```

#### 参数验证

系统会自动验证以下规则：

1. ✓ 起始页码必须 ≥ 1
2. ✓ 结束页码必须 ≥ 起始页码
3. ✓ 结束页码不能超过最大允许页数（默认100）
4. ✓ 参数格式必须正确（数字或 "数字-数字"）

**错误示例**：

```bash
# ❌ 起始页码小于1
node crawler_main.js goodsPrice 0

# ❌ 结束页码小于起始页码
node crawler_main.js goodsPrice 5-2

# ❌ 超过最大允许页数
node crawler_main.js goodsPrice 1-200

# ❌ 非数字格式
node crawler_main.js goodsPrice abc
```

#### 向后兼容

新功能**完全向后兼容**旧版本的使用方式：

```bash
# 旧版本写法（仍然支持）
node crawler_main.js goodsPrice 5

# 等同于新版本
node crawler_main.js goodsPrice 1-5
```

### 4. 单独运行解析脚本

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
  },
  pagination: {
    defaultStartPage: 1,            // 默认起始页码
    defaultEndPage: 3,              // 默认结束页码
    maxAllowedPages: 100,           // 最大允许页数
    pageRangePattern: /^(\d+)-(\d+)$/  // 区间格式验证正则
  }
}
```

### 自定义配置

你可以修改 `scripts/crawler_config.js` 文件来调整爬虫行为：

- 修改 `maxPages` 来调整默认爬取页数
- 修改 `delayBetweenRequests` 来调整请求延迟
- 修改 `pagination.maxAllowedPages` 来调整最大允许页数
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

### 分页区间功能技术实现

#### 修改的文件

1. **crawler_config.js** - 添加分页区间配置
2. **generic_crawler.js** - 修改 `getPageUrls()` 方法支持起始页和结束页
3. **crawler_main.js** - 添加 `parsePageRange()` 方法解析新参数格式

#### 核心方法

**parsePageRange(pageRangeStr)**

```javascript
/**
 * 解析分页参数
 * @param {string} pageRangeStr - 页码范围字符串
 * @returns {Object|false} {start, end} 或 false（如果无效）
 * 
 * 支持格式:
 * - "5" → {start: 1, end: 5}
 * - "2-5" → {start: 2, end: 5}
 */
```

**getPageUrls(startPage, endPage)**

```javascript
/**
 * 获取分页URL列表
 * @param {number} startPage - 起始页码
 * @param {number} endPage - 结束页码
 * @returns {Array} URL列表
 */
```

#### 测试结果

所有测试用例均已通过 ✅

- ✅ 单个数字解析
- ✅ 区间格式解析
- ✅ 单页区间
- ✅ 无效参数识别
- ✅ 边界值验证
- ✅ 格式错误处理

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
