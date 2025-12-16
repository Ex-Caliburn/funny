# 华阳股份数据文件说明

## 数据文件

### 1. `huayang_data.json` - 原始数据

- **来源**：从 PDF 文件自动解析生成（`scripts/stock-reports/huayang_report_parse.js`）
- **内容**：
  - `allData`：详细的提取数据，包含所有匹配项和上下文信息
  - `summary`：汇总数据，但单位不统一
    - `cost`、`revenue`：单位是**元**（如 5574000000 元）
    - `purchase`、`production`、`sales`、`inventory`：单位是**万吨**
- **用途**：保留原始提取数据，用于追溯和调试
- **更新**：每次运行解析脚本时自动更新

### 2. `huayang_data_corrected.json` - 修正后的数据

- **来源**：手动修正后的数据
- **内容**：
  - `rawData`：修正后的累计数据数组
  - 单位统一：
    - `cost`、`revenue`：单位是**亿元**（如 55.74）
    - `purchase`、`production`、`sales`、`inventory`：单位是**万吨**
- **用途**：HTML 页面使用，用于数据展示和分析
- **更新**：手动更新，包含所有修正和调整

## 数据修正说明

修正后的数据包含以下调整：

1. **单位统一**：将成本和营收从元转换为亿元
2. **数据修正**：修正了部分提取错误的数据（如注释中的"修正：1,240万吨"）
3. **数据清空**：清空了2021年Q3的数据（2021年1-9月）

## 使用方式

### HTML 页面

`huayang_coal_analysis.html` 会自动从 `huayang_data_corrected.json` 加载数据。

如果 JSON 文件加载失败，会使用 HTML 中硬编码的临时数据作为后备。

### 更新修正数据

1. 编辑 `huayang_data_corrected.json` 文件
2. 或者修改 HTML 中的 `tempRawData` 数组，然后运行脚本生成 JSON

## 数据格式

### 修正后的数据格式

```json
{
  "rawData": [
    {
      "period": "2021年1-3月",
      "year": 2021,
      "month": 3,
      "type": "cumulative",
      "cost": 86.27,        // 亿元
      "purchase": null,      // 万吨
      "revenue": 101.93,    // 亿元
      "production": 1240,   // 万吨
      "sales": 2346,        // 万吨
      "inventory": 15.56    // 万吨
    }
  ]
}
```
