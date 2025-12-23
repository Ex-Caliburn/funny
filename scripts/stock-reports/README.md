# 股票财报脚本

本目录包含上市公司财报下载和解析的相关脚本，支持 A 股和港股。

## 📋 文件列表

### 下载工具

| 文件名 | 功能说明 | 使用场景 |
|--------|---------|---------|
| `batch_download_reports.js` | 批量下载多家公司财报 | 一次性下载多家公司的财报 |
| `download_all_reports.js` | 下载单个公司的所有类型财报 | 下载单个公司的年报、半年报、季报等 |
| `download_hk_reports.js` | 下载港股公司财报 | 专门用于港股公司财报下载 |
| `remove_scan_mark.js` | 移除 PDF 扫描水印 | 清理下载的 PDF 文件中的扫描标记 |

### 解析工具

| 文件名 | 功能说明 | 对应公司 |
|--------|---------|---------|
| `chuanheng_report_parse.js` | 川恒股份财报解析 | 川恒股份（600227） |
| `huayang_report_parse.js` | 华阳股份财报解析 | 华阳股份（600348） |
| `shanmei_report_parse.js` | 山煤国际财报解析 | 山煤国际（600546） |
| `tongling_report_parse.js` | 铜陵有色财报解析 | 铜陵有色（000630） |
| `xyyx_report_parse.js` | 兴业银锡财报解析 | 兴业银锡（000426） |

## 🚀 使用方法

### 1. 批量下载财报

最简单的方式是使用 `batch_download_reports.js`：

```bash
# 使用默认配置（下载年报和生产经营数据公告）
node scripts/stock-reports/batch_download_reports.js

# 使用自定义配置文件
node scripts/stock-reports/batch_download_reports.js --config config.json
```

**配置文件示例 (config.json):**

```json
{
  "companies": [
    { "code": "600348", "name": "华阳股份" },
    { "code": "600546", "name": "山煤国际" }
  ],
  "years": [2023, 2024],
  "outputBase": "../../stock/report_analysis",
  "reportTypes": ["annual", "production"],
  "keywords": ["生产经营数据公告"]
}
```

**支持的报告类型：**

- `"all"`: 年报 + 半年报 + 季报
- `"annual"`: 年度报告
- `"semi"`: 半年度报告
- `"quarterly"`: 季度报告（Q1+Q3）
- `"q1"`: 第一季度报告
- `"q3"`: 第三季度报告
- `"production"`: 生产经营数据公告

可以同时指定多个类型，如：`["annual", "production"]`

### 2. 下载单个公司财报

使用 `download_all_reports.js` 下载单个公司的财报：

```bash
# 基本用法
node scripts/stock-reports/download_all_reports.js \
  --code 600348 \
  --name 华阳股份 \
  --years 2023,2024 \
  --types annual,production

# 指定输出目录
node scripts/stock-reports/download_all_reports.js \
  --code 600348 \
  --name 华阳股份 \
  --years 2023,2024 \
  --types annual \
  --output ../../stock/report_analysis/华阳股份

# 下载生产经营数据公告（指定关键词）
node scripts/stock-reports/download_all_reports.js \
  --code 600348 \
  --name 华阳股份 \
  --years 2024 \
  --types production \
  --keywords 生产经营数据公告
```

### 3. 下载港股财报

使用 `download_hk_reports.js` 下载港股公司财报：

```bash
# 下载港股公司年报
node scripts/stock-reports/download_hk_reports.js \
  --code 00883 \
  --name 中国海洋石油 \
  --years 2023,2024

# 启用调试模式
DEBUG_HK=1 node scripts/stock-reports/download_hk_reports.js \
  --code 00883 \
  --name 中国海洋石油 \
  --years 2024
```

详细说明请查看：[港股业绩报下载指南](../docs/港股业绩报下载指南.md)

### 4. 解析财报数据

下载完成后，使用对应的解析脚本提取数据：

```bash
# 解析华阳股份财报
node scripts/stock-reports/huayang_report_parse.js

# 解析山煤国际财报
node scripts/stock-reports/shanmei_report_parse.js

# 解析川恒股份财报
node scripts/stock-reports/chuanheng_report_parse.js

# 解析铜陵有色财报
node scripts/stock-reports/tongling_report_parse.js
```

解析脚本会：

1. 读取下载的 PDF 和 Excel 文件
2. 提取关键财务数据
3. 生成 JSON 格式的结构化数据
4. 保存到 `stock/report_analysis/[公司名]/` 目录

**数据文件说明：**

- 解析脚本会生成两个文件：
  - `[公司名]_data.json`：原始提取数据（元单位），用于调试和验证
  - `[公司名]_data_corrected.json`：修正后的数据（亿元单位），**用于页面展示**
- HTML 分析页面**直接读取** `*_data_corrected.json`，**不使用回退方案**
- `corrected.json` 文件支持增量更新，不会覆盖已手动修正的数据（标记 `_corrected: true`）
- 数据格式：`corrected.json` 中的数据已经是**亿元单位**，无需转换
- **重要**：所有新开发的解析脚本和 HTML 页面都应遵循此规范，直接使用 `corrected.json`，避免冗余的回退逻辑

**页面展示规范：**

- HTML 分析页面**只显示累计数据**（年报、半年报），不显示单季度数据
- 累计数据**只显示同比**，不显示环比（环比仅适用于单季度数据）
- 毛利率等计算字段通常由脚本自动计算，不需要标记 `_source` 字段
- 页面不提供 Tab 切换功能，直接展示累计数据表格和分产品数据表格

## 📊 输出数据结构

解析后的数据保存为 JSON 格式，通常包含：

```json
{
  "company": "华阳股份",
  "code": "600348",
  "reports": [
    {
      "year": 2024,
      "quarter": "Q1",
      "type": "季度报告",
      "data": {
        "revenue": 1234567890,
        "profit": 123456789,
        "production": {
          "coal": 1000000,
          "electricity": 500000
        }
      }
    }
  ]
}
```

## 🔧 高级功能

### 自定义下载配置

在 `batch_download_reports.js` 中修改 `DEFAULT_CONFIG`：

```javascript
const DEFAULT_CONFIG = {
  companies: [
    { "code": "600348", "name": "华阳股份" },
    // 添加更多公司...
  ],
  years: [2022, 2023, 2024],
  outputBase: '../../stock/report_analysis',
  reportTypes: ['annual', 'production'],
  keywords: ['生产经营数据公告']
};
```

### 移除 PDF 水印

某些下载的 PDF 可能包含扫描标记，使用 `remove_scan_mark.js` 清理：

```bash
node scripts/stock-reports/remove_scan_mark.js [pdf文件路径]
```

## 📝 注意事项

1. **数据来源**：
   - A 股数据来自巨潮资讯网（cninfo.com.cn）
   - 港股数据来自香港交易所（hkexnews.hk）

2. **下载限制**：
   - 脚本包含延迟机制，避免频繁请求
   - 建议在非高峰时段运行

3. **文件存储**：
   - 默认保存到 `stock/report_analysis/[公司名]/` 目录
   - 可通过 `--output` 参数自定义

4. **错误处理**：
   - 脚本会自动重试失败的下载
   - 详细日志输出便于排查问题

5. **数据使用**：
   - 下载的数据仅供学习研究使用
   - 请遵守相关网站的使用条款

## 🐛 常见问题

### 1. 下载失败

- 检查网络连接
- 确认公司代码和名称正确
- 查看是否有对应年份的报告

### 2. 解析错误

- 确认 PDF/Excel 文件完整下载
- 检查文件格式是否正确
- 某些报告格式可能需要调整解析逻辑

### 3. 路径问题

- 所有脚本使用相对路径，已自动适配新的目录结构
- 确保从项目根目录或脚本所在目录运行

## 📚 相关文档

- [上市公司财报下载工具详细说明](../docs/上市公司财报下载工具.md)
- [港股业绩报下载指南](../docs/港股业绩报下载指南.md)
- [HK_REPORTS_SETUP](../docs/HK_REPORTS_SETUP.md)

## 🤝 贡献

如需添加新公司的解析脚本：

1. 参考现有的解析脚本（如 `huayang_report_parse.js`）
2. 根据该公司的报告格式调整解析逻辑
3. 测试并提交

欢迎提交 Issue 和 Pull Request！
