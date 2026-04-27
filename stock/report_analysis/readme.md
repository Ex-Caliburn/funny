# 股票分析方法论

本文档总结了股票财报数据提取与分析的标准流程和方法，方便后续为新股票编写代码。

## 📁 目录结构规范

每个股票分析项目应遵循以下目录结构：

```
stock/report_analysis/
├── [股票名称]/                    # 股票目录（如：铜陵有色、川恒股份）
│   ├── [股票名称]YYYY年年度报告.pdf
│   ├── [股票名称]YYYY年半年度报告.pdf
│   ├── [股票名称]YYYY年第一季度报告.pdf
│   ├── [股票名称]YYYY年第三季度报告.pdf
│   ├── [股票名称]_data.json        # 提取的数据（JSON格式）
│   ├── [股票名称]_[产品]_analysis.html  # 可视化分析页面
│   └── README.md                   # 可选：该股票的说明文档
└── readme.md                       # 本方法论文档
```

### 文件命名规范

- **PDF文件**：`[股票名称]YYYY年[报告类型].pdf`
  - 报告类型：年度报告、半年度报告、第一季度报告、第三季度报告
- **JSON数据文件**：`[股票代码或拼音]_data.json`
  - 示例：`tongling_data.json`、`chuanheng_data.json`
- **HTML分析页面**：`[股票代码或拼音]_[产品]_analysis.html`
  - 示例：`tongling_copper_analysis.html`、`chuanheng_phosphorus_analysis.html`

## 🔧 数据提取脚本编写规范

### 1. 脚本位置

所有数据提取脚本统一放在 `scripts/stock-reports/` 目录下，命名格式：

```
[股票代码或拼音]_report_parse.js
```

### 2. 脚本基本结构

```javascript
const { PDFParse } = require('pdf-parse');
const fs = require('fs');
const path = require('path');

/**
 * [股票名称]年报数据提取脚本
 * 提取[产品]相关的成本、营收、产量、销量数据
 */

// 1. 定义关键词
const keywords = {
  cost: ['成本', '营业成本', '[产品]成本', '生产成本', '[产品]销售成本', '主营业务成本'],
  revenue: ['营收', '营业收入', '[产品]营收', '[产品]收入', '主营业务收入', '[产品]销售收入'],
  production: ['[产品]产量', '产量', '生产量', '[具体产品]产量'],
  sales: ['[产品]销量', '销量', '销售量', '销售[产品]', '[具体产品]销量'],
  inventory: ['库存量', '库存', '[产品]库存']
};

// 2. 数据提取模式
const patterns = {
  number: /([\d,，]+\.?\d*)\s*(?:万元|亿元|元|万|亿)?/g,
  year: /(20\d{2})/g,
  percent: /([\d,，]+\.?\d*)\s*%/g
};

// 3. 数值提取函数
function extractNumber(text) { /* ... */ }
function extractNumberInWanTons(text) { /* ... */ }

// 4. 从"主要产品"表格提取数据
function extractInventoryFromMainProducts(text, extractedData) { /* ... */ }

// 5. 从PDF解析数据
async function parsePDF(filePath) { /* ... */ }

// 6. 处理所有PDF文件
async function processAllPDFs() { /* ... */ }

// 7. 生成汇总数据
function generateSummary(allData) { /* ... */ }

// 8. 主函数
async function main() { /* ... */ }

// 9. 导出模块（如果被其他脚本引用）
module.exports = { parsePDF, processAllPDFs, generateSummary };

// 10. 执行主函数
if (require.main === module) {
  main().catch(console.error);
}
```

### 3. 关键实现要点

#### 3.1 关键词定义

根据股票的主营产品定义关键词，例如：

- **铜陵有色**：铜产品相关关键词（铜成本、铜营收、铜产量、铜销量）
- **川恒股份**：磷产品相关关键词（磷成本、磷营收、磷产量、磷销量）
- **紫金矿业**：铜和金产品相关关键词

#### 3.2 数据提取策略

**优先级顺序**：

1. **主要产品表格**：从"主要产品"表格中提取（最准确）
2. **分产品表格**：从"分产品"或"主营业务分行业"表格中提取
3. **文字描述**：从报告文字描述中提取（需要更严格的验证）

**数据验证**：

- 产量/销量：通常在 0.5-100000 万吨之间
- 营收/成本：通常在 100万-500亿之间（根据公司规模调整）
- 过滤掉百分比、页码等误提取数据

**重要规范：价格数量判断不要写死数字**

在实现数据验证函数时，**禁止硬编码具体的数值范围**，应使用可配置的常量或基于历史数据动态计算。这样可以提高代码的可维护性和适应性。

**错误示例**（❌ 不推荐）：

```javascript
// ❌ 硬编码数值范围
function isValidValue(value, type) {
  switch (type) {
    case 'revenue':
    case 'cost':
      return value >= 1000000;  // 硬编码：100万元
    case 'production':
    case 'sales':
      return value >= 0.1;      // 硬编码：0.1万吨
  }
}

// ❌ 硬编码价格范围
if (isOilPrice && priceValue >= 20 && priceValue <= 200) {
  // 硬编码：20-200美元
}
```

**正确示例**（✅ 推荐）：

```javascript
// ✅ 使用配置常量
const VALIDATION_THRESHOLDS = {
  revenue: {
    min: 1000000,  // 100万元（可根据公司规模调整）
    max: 50000000000  // 500亿元
  },
  cost: {
    min: 1000000,
    max: 50000000000
  },
  production: {
    min: 0.1,  // 0.1万吨
    max: 100000  // 10亿吨
  },
  sales: {
    min: 0.1,
    max: 100000
  }
};

// 或者基于历史数据动态计算
function getValidationRange(type, historicalData) {
  if (!historicalData || historicalData.length === 0) {
    // 如果没有历史数据，使用默认配置
    return VALIDATION_THRESHOLDS[type] || { min: 0, max: Infinity };
  }
  
  // 基于历史数据计算合理范围（如：历史最小值的10% 到 历史最大值的10倍）
  const values = historicalData.map(d => d[type]).filter(v => v != null);
  const min = Math.min(...values);
  const max = Math.max(...values);
  
  return {
    min: min * 0.1,  // 允许10%的波动下限
    max: max * 10     // 允许10倍的波动上限
  };
}

function isValidValue(value, type, historicalData = null) {
  if (!value || isNaN(value) || value <= 0) {
    return false;
  }
  
  const range = getValidationRange(type, historicalData);
  return value >= range.min && value <= range.max;
}
```

**价格判断示例**：

```javascript
// ✅ 使用配置常量
const PRICE_RANGES = {
  oil: { min: 20, max: 200 },      // 美元/桶（可根据市场情况调整）
  gas: { min: 1, max: 20 },         // 美元/千立方英尺
  copper: { min: 3000, max: 15000 }, // 元/吨
  gold: { min: 200, max: 600 }      // 元/克
};

function isValidPrice(price, productType) {
  const range = PRICE_RANGES[productType];
  if (!range) return true;  // 未知产品类型，不限制
  
  return price >= range.min && price <= range.max;
}
```

**实施建议**：

1. **配置化**：将验证阈值提取为配置常量，放在文件顶部或单独的配置文件中
2. **可调整**：根据公司规模、产品特性、市场情况等因素调整阈值
3. **动态计算**：如果可能，基于历史数据动态计算合理范围
4. **文档化**：在代码注释中说明阈值的选择依据和调整方法

#### 3.3 库存数据提取

**重要说明**：库存数据只在**年度报告**中提取，季度报告和半年度报告通常不包含库存数据。

**提取来源**：从"主要产品"表格中的**库存量**列提取（而非库存金额）

**表格格式示例**：

```
主要产品    单位    生产量    销售量    库存量
矿山产金    千克    68,275    67,786    1,734
矿山产铜    吨      837,570   824,317   18,105
```

**实现要点**：

1. **报告类型判断**：

   ```javascript
   // 只在年度报告中提取库存（排除半年度报告）
   const isAnnualReport = filename && filename.match(/\d{4}年年度报告/);
   if (isAnnualReport) {
     extractInventoryFromMainProducts(text, extractedData);
   }
   ```

2. **正则表达式匹配**：

   ```javascript
   // 铜产品：匹配"矿山产铜 吨 生产量 销售量 库存量"格式
   /矿[山产]*铜[\s\t]+吨[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g
   
   // 金产品：匹配"矿山产金 千克 生产量 销售量 库存量"格式
   /矿[山产]*金[\s\t]+千克[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)[\s\t]+([\d,，]+\.?\d*)/g
   ```

3. **数据提取**：

   ```javascript
   const productionStr = match[1].replace(/[,，]/g, '');
   const salesStr = match[2].replace(/[,，]/g, '');
   const inventoryStr = match[3].replace(/[,，]/g, '');  // 第三列为库存量
   
   const inventory = parseFloat(inventoryStr);
   if (!isNaN(inventory) && inventory > 0) {
     extractedData.inventory.push({
       keyword: '主要产品-库存量',
       value: inventory  // 单位：吨或千克（根据产品而定）
     });
   }
   ```

4. **单位说明**：
   - 库存量单位与产品单位一致（如铜为"吨"，金为"千克"）
   - 在数据汇总时可能需要单位转换（如千克转吨、吨转万吨）

#### 3.4 单位处理

- **产量/销量**：保持原始单位（如"万吨"、"吨"、"千克"），根据产品特性决定
- **库存**：
  - 只在年度报告中提取
  - 单位与产量/销量保持一致
  - 从"主要产品"表格的"库存量"列提取（数量，非金额）
- **营收/成本**：统一转换为"元"（处理"万元"、"亿元"等单位）
- **售价/单位成本**：通过 `营收/销量` 和 `成本/销量` 计算

#### 3.5 汇总数据生成

`generateSummary` 函数应生成以下结构：

```javascript
{
  year: "2024",
  filename: "股票名称2024年年度报告.pdf",
  cost: 70026800824.21,        // 成本（元）
  revenue: 76079875664.31,     // 营收（元）
  production: 123.45,          // 产量（万吨）
  sales: 120.30,                // 销量（万吨）
  inventory: 5.67,              // 库存（万吨，仅年报有数据）
  grossMargin: 8.5,             // 毛利率（%）
  productSales: {               // 分产品销量（可选）
    product1: 80.5,
    product2: 39.8
  }
}
```

**注意**：

- `inventory` 字段只在年度报告中有值，季度报告和半年度报告中为 `null`
- 库存数据来源于"主要产品"表格的"库存量"列（数量，非金额）

### 4. 脚本执行

```bash
# 在项目根目录执行
node scripts/stock-reports/[股票代码]_report_parse.js
```

脚本应自动：

1. 扫描 `stock/report_analysis/[股票名称]/` 目录下的所有PDF文件
2. 提取数据并生成 `[股票代码]_data.json` 文件
3. 输出提取进度和结果统计

## 🔧 数据修正规范

### 数据流程

```
PDF报告 → 自动提取(_data.json) → 增量更新(_data_corrected.json) → 手动修正 → 页面展示
```

**核心原则**：

- `_data.json`：自动生成，可以重新生成
- `_data_corrected.json`：手动维护，**不会被覆盖**
- 提取脚本运行时自动增量更新修正文件

### 修正标记说明

| 标记 | 字段 | 页面显示 |
|------|------|----------|
| ✏️ | `_corrected: true` | 手动修正 |
| ✓ | `_verified: true` | 已验证 |
| ℹ️ | `_notes: "说明"` | 悬停显示备注 |

### HTML页面集成

HTML页面从 `*_data_corrected.json` 加载数据，自动显示修正标记（✏️ ✓ ℹ️）。

### 新增报告时的更新流程

```bash
# 1. 下载新PDF到对应目录

# 2. 运行提取脚本（自动完成所有更新）
node scripts/stock-reports/zijin_report_parse.js

# 脚本自动：
# - 提取数据 → zijin_data.json
# - 增量更新 → zijin_data_corrected.json（不覆盖已有数据）

# 3. 手动修正新数据
# 打开 zijin_data_corrected.json
# 修正错误，设置 _corrected: true, _verified: true, _notes: "说明"
```

## 📊 JSON 数据格式规范

### 原始数据结构（`_data.json`）

```json
{
  "allData": [
    {
      "year": "2024",
      "filename": "股票名称2024年年度报告.pdf",
      "cost": [
        {
          "keyword": "成本",
          "line": "营业成本 \t70,026,800,824.21",
          "context": "上下文信息...",
          "value": 70026800824.21,
          "allValues": [70026800824.21, 65409119953.65]
        }
      ],
      "revenue": [...],
      "production": [...],
      "sales": [...],
      "inventory": [...],
      "grossMargin": 8.5
    }
  ],
  "summary": [
    {
      "year": "2024",
      "filename": "股票名称2024年年度报告.pdf",
      "cost": 70026800824.21,
      "revenue": 76079875664.31,
      "production": 123.45,
      "sales": 120.30,
      "inventory": 5.67,
      "grossMargin": 8.5
    }
  ]
}
```

### 字段说明

- **allData**：详细的提取数据，包含所有匹配项和上下文，用于调试和验证
- **summary**：汇总数据，每个报告期一条记录，用于HTML页面展示

## 🎨 HTML 分析页面编写规范

### 1. 基本结构

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>[股票名称][产品]数据对比分析</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <style>
        /* 样式定义 */
    </style>
</head>
<body>
    <div class="container">
        <h1>[股票名称][产品]数据对比分析</h1>
        <!-- 控制按钮 -->
        <!-- 数据表格 -->
        <!-- 图表容器 -->
    </div>
    <script>
        // 数据加载和渲染逻辑
    </script>
</body>
</html>
```

### 2. 核心功能

#### 2.1 数据加载

```javascript
// 从JSON文件加载数据
async function loadData() {
    try {
        const response = await fetch('[股票代码]_data.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const jsonData = await response.json();
        const summary = jsonData.summary || [];
        // 处理数据...
    } catch (error) {
        console.error('加载数据失败:', error);
    }
}
```

#### 2.2 视图切换

- **单季度视图**：显示每个报告期的独立数据
- **累计视图**：显示累计数据（1-3月、1-6月、1-9月、全年）
- **同比/环比分析**：计算同比增长率和环比增长率

#### 2.3 数据表格

表格应包含以下列：

- 报告期（如：2024年1-3月、2024年上半年）
- 成本（亿元）
- 营收（亿元）
- 产量（万吨）
- 销量（万吨）
- 库存（万吨）
- 售价（元/吨）= 营收 / 销量
- 单位成本（元/吨）= 成本 / 销量
- 毛利率（%）
- 同比/环比增长率

#### 2.4 图表展示

使用 Chart.js 实现：

- 点击表头可查看该指标的趋势图
- 支持多指标对比
- 响应式设计，适配不同屏幕尺寸

### 3. 样式规范

- 使用现代化的渐变背景和卡片式设计
- 表格使用斑马纹和悬停效果
- 按钮使用激活状态区分
- 响应式布局，支持移动端

## 🔄 完整工作流程

### 步骤 1：准备PDF文件

1. 下载股票的年报、半年报、季报PDF文件
2. 按照命名规范重命名文件
3. 放入 `stock/report_analysis/[股票名称]/` 目录

### 步骤 2：编写数据提取脚本

1. 在 `scripts/stock-reports/` 目录下创建脚本文件
2. 参考现有脚本（如 `tongling_report_parse.js`）的结构
3. 根据股票的主营产品定义关键词
4. 实现数据提取逻辑
5. 实现汇总数据生成逻辑

### 步骤 3：运行脚本提取数据

```bash
node scripts/stock-reports/[股票代码]_report_parse.js
```

检查生成的 `[股票代码]_data.json` 文件，验证数据准确性。

### 步骤 4：数据修正（新增）

**数据流程**：PDF报告 → 自动提取(`_data.json`) → 增量更新(`_data_corrected.json`) → 手动修正 → 页面展示

#### 4.1 首次创建修正文件

第一次创建修正数据文件时，手动创建 `*_data_corrected.json`：

```json
{
  "_metadata": {
    "stockName": "紫金矿业",
    "stockCode": "601899",
    "description": "此文件包含修正后的数据，用于页面展示。手动修正的数据会被标记。",
    "dataSource": "zijin_data.json",
    "lastUpdated": "2025-12-21",
    "products": ["copper", "gold"],
    "dataFlow": "PDF报告 → 自动提取 → 手动修正 → 页面展示"
  },
  "summary": []
}
```

#### 4.2 新增报告时更新数据

当有新的季报/年报发布时：

1. **运行提取脚本**，更新原始数据：

   ```bash
   node scripts/stock-reports/zijin_report_parse.js
   ```

2. **运行更新脚本**，增量添加新数据（不覆盖已有数据）：

   ```bash
   node scripts/stock-reports/update_corrected_data.js 紫金矿业 copper,gold
   ```

3. **手动修正新数据**：
   - 打开 `zijin_data_corrected.json`
   - 检查新增的数据项
   - 修正错误数据，设置 `_corrected: true`
   - 验证后设置 `_verified: true`
   - 添加 `_notes` 说明

#### 4.3 修正数据格式

   ```json
   {
     "_metadata": {
       "stockName": "股票名称",
       "stockCode": "股票代码",
       "dataSource": "原始数据文件名",
       "lastUpdated": "2024-12-21",
       "dataFlow": "PDF报告 → 自动提取 → 手动修正 → 页面展示"
     },
     "summary": [
       {
         "period": "2024年全年",
         "year": "2024",
         "copper": {
           "production": 83.76,
           "sales": 82.43,
           "_corrected": false,
           "_verified": true,
           "_notes": "数据已验证正确"
         }
       }
     ]
   }
   ```

1. **修正标记说明**：
   - `_corrected: true`：此行包含手动修正的数据，页面显示 ✏️
   - `_verified: true`：此行数据已验证，页面显示 ✓
   - `_corrections`：记录修正日志（原始值、修正值、原因、来源、时间）
   - `_notes`：备注说明，页面显示 ℹ️

### 步骤 5：编写HTML分析页面

1. 在股票目录下创建HTML文件
2. 参考现有HTML页面（如 `zijin_copper_gold_analysis.html`）的结构
3. **重要**：HTML页面应从 `[股票代码]_data_corrected.json` 加载数据
4. 根据产品特点调整表格列和图表
5. 实现数据加载和渲染逻辑
6. 实现修正标记显示逻辑

### 步骤 6：验证和优化

1. 在浏览器中打开HTML文件，检查数据展示
2. 验证数据计算的正确性（售价、单位成本、增长率等）
3. 检查修正标记是否正确显示
4. 检查图表展示是否正常
5. 优化样式和交互体验

## 📝 参考示例

### 已完成的股票分析

1. **铜陵有色** (`tongling_report_parse.js`)
   - 产品：铜
   - 数据：成本、营收、产量、销量、库存
   - HTML：`tongling_copper_analysis.html`

2. **川恒股份** (`chuanheng_report_parse.js`)
   - 产品：磷
   - 数据：成本、营收、产量、销量、库存
   - HTML：`chuanheng_phosphorus_analysis.html`

3. **紫金矿业** (`zijin_report_parse.js`)
   - 产品：铜、金
   - 数据：成本、营收、产量、销量、库存（双产品）
   - HTML：`zijin_copper_gold_analysis.html`
   - 特点：
     - 库存数据只在年度报告中提取
     - 从"主要产品"表格提取库存量（铜：吨，金：千克）
     - 金产品数据通过聚合"金锭"和"金精矿"计算
     - 铜产品数据通过聚合"铜精矿"、"电积铜"和"电解铜"计算

4. **山煤国际** (`shanmei_report_parse.js`)
   - 产品：煤炭
   - 数据：成本、营收、产量、销量、库存
   - 特点：区分自产煤和贸易煤，有详细的数据标记系统

5. **中国海洋石油** (`cnooc_report_parse.js`)
   - 产品：石油、天然气
   - 数据：成本、营收、产量、销量（双产品）
   - HTML：`cnooc_oil_gas_analysis.html`
   - node scripts/stock-reports/cnooc_report_parse.js

## ⚠️ 注意事项

### 1. 数据准确性

- PDF格式可能因年份或报告类型不同而变化，需要调整提取逻辑
- 建议对提取的数据进行合理性验证
- 保留 `allData` 字段，方便调试和验证

### 2. 单位统一

- 确保所有数据的单位统一（产量/销量用万吨，营收/成本用元）
- 在HTML页面中显示单位时，可以转换为更易读的格式（如亿元）

### 3. 数据缺失处理

- **值为0的处理**：如果提取到的成本值为 0 或 0.0，会被视为无效数据，自动设置为 `null`
  - 这是因为成本不可能为0，0值通常是数据提取错误或报告中该字段为空
  - 对于半年度报告，如果没有直接的总成本数据，会使用单位成本×销量来计算
- **库存数据**：只在年度报告中出现，季度报告和半年度报告中为 `null`
  - 库存数据来源于"主要产品"表格的"库存量"列
  - 提取的是数量（如吨、千克），而非金额
- **其他数据**：某些报告期可能缺少部分财务数据
- 在HTML页面中，缺失数据应显示为 "-" 或空单元格
- 在单季度视图中，库存列应隐藏（因为单季度不计算库存）

### 4. 性能优化

- 如果PDF文件很大，考虑分批处理
- HTML页面加载大量数据时，考虑分页或虚拟滚动

### 5. 代码复用

- 提取数值、处理单位等通用函数可以提取到公共工具文件中
- HTML页面的通用样式和逻辑可以提取为模板

## 🚀 快速开始模板

### 新股票分析项目检查清单

- [ ] 创建股票目录 `stock/report_analysis/[股票名称]/`
- [ ] 下载并命名PDF文件
- [ ] 创建数据提取脚本 `scripts/stock-reports/[股票代码]_report_parse.js`
- [ ] 定义关键词和提取逻辑
- [ ] 运行脚本生成JSON数据文件
- [ ] 验证JSON数据准确性
- [ ] 创建HTML分析页面
- [ ] 实现数据加载和渲染
- [ ] 测试所有功能
- [ ] 优化样式和交互

## 📚 相关文档

- 各股票目录下的使用指南（如 `紫金矿业/DATA_UPDATE_GUIDE.md`）
- 脚本文件中的注释说明

---

**最后更新**：2024-12-10  
**维护者**：项目团队  
**版本**：v1.0
