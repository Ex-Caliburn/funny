# 全国规模以上工业产能利用率数据

## 数据来源

国家统计局官方网站：https://www.stats.gov.cn/sj/zxfb/202510/t20251020_1961598.html

## 数据说明

产能利用率是指实际产出与生产能力（均以价值量计量）的比率。该指标反映了工业企业设备利用程度。

### 数据内容

- **按行业分类**：工业总体、采矿业、制造业、电力热力燃气及水生产和供应业等
- **主要行业**：煤炭开采、食品制造、纺织、化学原料、非金属矿物制品、黑色金属冶炼、汽车制造、电气机械、计算机通信等
- **数据维度**：
  - 当季产能利用率（%）
  - 比上年同期增减（百分点）
  - 累计产能利用率（前三季度）

## 使用方法

### 1. 爬取数据

```bash
# 爬取最近3页的产能利用率数据
npm run crawl:capacity 3

# 或使用完整命令
node scripts/crawler_main.js capacityUtilization 3
```

**文件命名格式**：`YYYY-MM-DD_文章标题-国家统计局.xlsx`
- 例如：`2025-10-20_2025年三季度全国规模以上工业产能利用率为74.6%-国家统计局.xlsx`
- 日期为文章发布日期，从URL中自动提取
- 标题为页面标题，自动获取

### 2. 解析数据

爬虫会自动调用解析脚本，也可以手动运行：

```bash
npm run capacity:parse
```

解析后的数据保存在：`stock/cleaned_data/capacity_utilization_cleaned.json`

### 3. 查看图表

用浏览器打开：`stock/html/capacity_utilization_chart.html`

## 图表功能

### 单指标视图
- 选择特定行业查看产能利用率趋势
- 显示产能利用率和同比变化
- 支持复制行业名称

### 总表视图
- 网格布局展示所有行业小图
- 支持关键字过滤
- 可切换显示/隐藏同比曲线
- 可切换显示/隐藏历史年份
- 点击放大图标查看详细视图

### 趋势图视图
- 多行业对比展示
- 支持图例选择和反选
- 支持关键字过滤
- 支持缩放和拖动

## 数据更新频率

国家统计局通常在每季度结束后的次月中旬发布上一季度的产能利用率数据：
- Q1数据：4月中旬
- Q2数据：7月中旬
- Q3数据：10月中旬
- Q4数据（全年数据）：次年1月中旬

## 注意事项

1. 产能利用率数据按季度发布，不是月度数据
2. 同比变化单位为"百分点"而非"百分比"
3. 数据文件格式可能包含多个工作表，解析器会自动识别
4. 历史数据需要逐页爬取，建议爬取页数不要太多

## 技术实现

- **爬虫**：`scripts/capacity_utilization_extractor.js`
- **解析器**：`scripts/capacity_utilization_parser.js`
- **图表**：`stock/html/capacity_utilization_chart.html`
- **配置**：在 `scripts/crawler_config.js` 中的 `capacityUtilization` 配置项

## 示例数据

```json
{
  "yearMonth": "2025-Q3",
  "industry": "工业",
  "period": "quarter",
  "periodName": "三季度",
  "value": 74.6,
  "yoy": -0.5,
  "unit": "%"
}
```

## 常见问题

### Q: 为什么没有找到数据？
A: 检查网站URL是否有变化，或者关键词配置是否准确。可以在 `crawler_config.js` 中调整关键词。

### Q: 如何查看更多历史数据？
A: 增加爬取页数，例如：`npm run crawl:capacity 5`

### Q: 图表显示为空怎么办？
A: 确认 `cleaned_data/capacity_utilization_cleaned.json` 文件存在且包含有效数据。

## 相关链接

- [国家统计局官网](https://www.stats.gov.cn/)
- [数据发布日程表](https://www.stats.gov.cn/sj/sjfb/index.html)

