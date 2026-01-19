# 工具脚本

数据解析和处理工具，用于清洗和格式化爬虫下载的原始数据。

## 📋 文件列表

| 文件名 | 功能说明 | 输入 | 输出 |
|--------|---------|------|------|
| `goods_price_parse.js` | 商品价格数据解析 | Excel 文件 | JSON 数据 |
| `energy_parser.js` | 能源数据解析 | Excel 文件 | JSON 数据 |
| `house_parse.js` | 房地产数据解析 | Excel 文件 | JSON 数据 |
| `retail_parse.js` | 零售数据解析 | Excel 文件 | JSON 数据 |
| `invest_parse.js` | 投资数据解析 | Excel 文件 | JSON 数据 |
| `industrial_value_added_parse.js` | 工业增加值数据解析 | Excel 文件 | JSON 数据 |
| `industry_profits_parse.js` | 分行业利润数据解析 | Excel 文件 | JSON 数据 |
| `capacity_utilization_parser.js` | 产能利用率数据解析 | Excel 文件 | JSON 数据 |
| `search_multiple_keywords.js` | 关键词搜索工具 | PDF/Excel 文件 | 搜索结果 |

## 🚀 使用方法

### 1. 基本用法

解析脚本通常在爬虫完成后自动运行，也可以手动执行：

```bash
# 解析商品价格数据
node scripts/tools/goods_price_parse.js

# 解析能源数据
node scripts/tools/energy_parser.js

# 解析房地产数据
node scripts/tools/house_parse.js
```

### 2. 关键词搜索

使用 `search_multiple_keywords.js` 在财报中搜索关键词：

```bash
node scripts/tools/search_multiple_keywords.js
```

默认配置可在文件中修改：

```javascript
const config = {
  reportDir: path.join(__dirname, '../../stock/report_analysis/华阳股份'),
  keywords: ['煤炭产量', '发电量', '营业收入'],
  outputFile: 'search_results.json'
};
```

## 📊 数据处理流程

```
原始 Excel 文件
   ↓
读取文件内容
   ↓
解析表格结构
   ↓
提取关键数据
   ↓
数据清洗和格式化
   ↓
生成 JSON 格式
   ↓
保存到 cleaned_data/
```

## 🔧 解析器详细说明

### goods_price_parse.js - 商品价格解析

**功能：**
- 解析流通领域重要生产资料市场价格数据
- 提取商品名称、单位、价格、涨跌幅等信息
- 按时间序列组织数据

**输入目录：** `stock/goods_price/`  
**输出文件：** `stock/cleaned_data/goods_price_cleaned.json`

**输出格式：**
```json
{
  "updateTime": "2024-12-16",
  "data": [
    {
      "date": "2024-12",
      "category": "煤炭",
      "items": [
        {
          "name": "无烟煤",
          "unit": "元/吨",
          "price": 1234.5,
          "change": "+2.3%"
        }
      ]
    }
  ]
}
```

### energy_parser.js - 能源数据解析

**功能：**
- 解析能源生产情况数据
- 提取原煤、原油、天然气、发电量等数据
- 计算同比增长率

**输入目录：** `stock/energy/`  
**输出文件：** `stock/cleaned_data/energy_cleaned.json`

**输出格式：**
```json
{
  "updateTime": "2024-12-16",
  "data": [
    {
      "period": "2024年11月",
      "coal": {
        "value": 123456,
        "unit": "万吨",
        "growth": "+5.2%"
      },
      "electricity": {
        "value": 7890,
        "unit": "亿千瓦时",
        "growth": "+3.8%"
      }
    }
  ]
}
```

### house_parse.js - 房地产数据解析

**功能：**
- 解析全国房地产市场基本情况
- 提取投资额、销售面积、销售额等数据
- 按地区和时间组织数据

**输入目录：** `stock/house/`  
**输出文件：** `stock/cleaned_data/house_cleaned.json`

### retail_parse.js - 零售数据解析

**功能：**
- 解析社会消费品零售总额数据
- 提取总额、增长率、分类数据
- 按时间序列组织

**输入目录：** `stock/retail/`  
**输出文件：** `stock/cleaned_data/retail_cleaned.json`

### invest_parse.js - 投资数据解析

**功能：**
- 解析全国固定资产投资数据
- 提取投资总额、增长率、分行业数据
- 计算累计值和同比增长

**输入目录：** `stock/invest/`  
**输出文件：** `stock/cleaned_data/invest_cleaned.json`

### industrial_value_added_parse.js - 工业增加值解析

**功能：**
- 解析规模以上工业增加值数据
- 提取指标名称、绝对值、环比增长率、同比增长率
- 按时间序列组织

**输入目录：** `stock/profits/`  
**输出文件：** `stock/cleaned_data/industrial_value_added_cleaned.json`

### industry_profits_parse.js - 分行业利润解析

**功能：**
- 解析分行业工业企业利润数据
- 提取各行业的利润、收入、成本等数据
- 按行业和时间组织

**输入目录：** `stock/industry_profits/`  
**输出文件：** `stock/cleaned_data/industry_profits_cleaned.json`

### capacity_utilization_parser.js - 产能利用率解析

**功能：**
- 解析工业产能利用率数据
- 提取各行业的产能利用率
- 按季度和行业组织

**输入目录：** `stock/capacity_utilization/`  
**输出文件：** `stock/cleaned_data/capacity_utilization_cleaned.json`

## 🛠️ 自定义解析器

### 创建新的解析器

1. **基本结构：**

```javascript
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

class DataParser {
  constructor() {
    this.inputDir = path.join(__dirname, '../../stock/[类型]');
    this.outputFile = path.join(__dirname, '../../stock/cleaned_data/[类型]_cleaned.json');
  }

  // 读取 Excel 文件
  readExcelFile(filePath) {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    return xlsx.utils.sheet_to_json(sheet);
  }

  // 解析数据
  parseData(rawData) {
    // 实现解析逻辑
    return cleanedData;
  }

  // 保存数据
  saveData(data) {
    fs.writeFileSync(this.outputFile, JSON.stringify(data, null, 2));
  }

  // 主流程
  async run() {
    const files = fs.readdirSync(this.inputDir);
    const allData = [];

    for (const file of files) {
      if (file.endsWith('.xlsx') || file.endsWith('.xls')) {
        const filePath = path.join(this.inputDir, file);
        const rawData = this.readExcelFile(filePath);
        const parsed = this.parseData(rawData);
        allData.push(parsed);
      }
    }

    this.saveData(allData);
  }
}

// 运行
if (require.main === module) {
  const parser = new DataParser();
  parser.run().catch(console.error);
}

module.exports = DataParser;
```

2. **添加到爬虫配置：**

在 `crawler/framework/crawler_config.js` 中添加：

```javascript
newType: {
  name: '新数据类型',
  keywords: ['关键词'],
  extractor: 'new_type_extractor.js',
  parser: 'new_type_parser.js'  // 指向新的解析器
}
```

## 📝 注意事项

1. **数据格式**：
   - 确保输入的 Excel 文件格式正确
   - 某些文件可能需要手动调整格式

2. **错误处理**：
   - 解析器包含基本的错误处理
   - 遇到无法解析的文件会跳过并记录

3. **性能优化**：
   - 大文件解析可能需要较长时间
   - 可以考虑分批处理

4. **数据验证**：
   - 解析后建议检查数据的完整性
   - 注意数值的单位和格式

## 🐛 常见问题

### 1. Excel 文件读取失败
- 检查文件是否损坏
- 确认文件格式（.xls vs .xlsx）
- 尝试手动打开文件验证

### 2. 数据解析错误
- 检查 Excel 表格结构是否符合预期
- 查看日志中的错误信息
- 某些特殊格式可能需要调整解析逻辑

### 3. 输出文件为空
- 确认输入目录中有有效的 Excel 文件
- 检查文件权限
- 查看是否有错误日志

### 4. 中文乱码
- 确保文件编码为 UTF-8
- 检查 Excel 文件的保存格式
- 使用正确的字符编码读取

## 📚 相关文档

- [爬虫系统说明](../crawler/README.md)
- [数据提取器说明](../crawler/extractors/)

## 🤝 贡献

欢迎改进现有解析器或添加新的解析器！

改进建议：
- 增强错误处理
- 优化解析性能
- 支持更多数据格式
- 添加数据验证

## 📄 许可

本项目仅供学习和研究使用。

