# 规模以上工业增加值数据可视化

## 文件说明

- `html/profits_chart.html` - 规模以上工业增加值数据可视化页面
- `cleaned_data/profits_cleaned.json` - 清洗后的数据文件
- `../scripts/tools/profits_parse.js` - 数据解析脚本
- `../scripts/crawler/extractors/profits_data_extractor.js` - 数据提取器

## 数据说明

**规模以上工业增加值**是反映工业生产规模和速度的重要指标，包括：

- 工业总产值
- 各类工业产品产量
- 同比、环比增长率

## 功能特性

参考 `html/retail_chart.html` 的设计，提供三个视图：

1. **单指标** - 显示单个指标的月度趋势，包括绝对值和同比增长率
2. **数值总表** - 所有有具体数值的指标小图展示
3. **增长率总表** - 只有增长率的指标小图展示
4. **趋势图** - 多指标合并曲线，支持图例选择和过滤

## 数据来源

从 `profits/` 目录中的Excel文件解析：

- 数据来源：国家统计局月度发布
- 更新频率：每月15日左右
- 数据类型：工业增加值、产量、增长率

## 使用方法

```bash
# 爬取规模以上工业增加值数据
npm run crawl:profits 3

# 解析数据（自动在爬取后执行）
npm run profits:parse

# 启动本地服务器查看
npm run serve
# 访问 http://localhost:8080/html/profits_chart.html
```

## 主要指标示例

- 规模以上工业增加值
- 采矿业
- 制造业
- 电力、热力、燃气及水生产和供应业
- 国有控股企业
- 股份制企业
- 外商及港澳台商投资企业
- 私营企业
- 各类工业产品产量

## 文件命名规则

参考 `stats-export-extension` 的命名规则：

```
日期_页面标题.ext
```

示例：

```
2024-08-15_2024年7月份规模以上工业增加值增长5.1%-国家统计局.xlsx
2024-09-14_2024年8月份规模以上工业增加值增长4.5%-国家统计局.xlsx
```

## 数据更新

数据来源于国家统计局发布的月度工业增加值报告。更新数据时：

1. 运行爬虫获取最新数据：`npm run crawl:profits 1`
2. 系统会自动解析并更新JSON数据
3. 刷新网页查看最新数据

## 技术实现

- **数据提取**：`profits_data_extractor.js` 参考 `stats-export-extension` 逻辑
- **数据解析**：`profits_parse.js` 提取指标、绝对值、环比、同比
- **数据格式**：JSON 输出适配 ECharts 可视化
- **前端展示**：ECharts + 深色主题

## 与 industry_profits 的区别

- **profits**: 规模以上工业**增加值**数据（生产总值、产量指标）
- **industry_profits**: 规模以上工业企业**利润**数据（营收、成本、利润，按42个行业分类）

两者数据来源和内容完全不同，请注意区分。
