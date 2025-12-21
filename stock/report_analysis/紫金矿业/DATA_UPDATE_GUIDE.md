# 紫金矿业数据更新指南

## 📊 数据文件说明

### 1. `zijin_data.json` - 原始数据

- **来源**：自动从PDF提取
- **更新方式**：运行提取脚本
- **可以覆盖**：每次运行脚本都会重新生成

### 2. `zijin_data_corrected.json` - 修正数据

- **来源**：基于原始数据，手动修正
- **更新方式**：增量更新（不覆盖已有数据）
- **不能覆盖**：保留所有手动修正
- **用途**：HTML页面展示

## 🔄 新增季报/年报时的更新流程

### 步骤 1：下载新PDF

将新的PDF报告放入 `stock/report_analysis/紫金矿业/` 目录

### 步骤 2：运行提取脚本（自动完成所有更新）

```bash
cd /Users/lijiye/work/funny
node scripts/stock-reports/zijin_report_parse.js
```

**脚本会自动完成两件事**：

1. 更新 `zijin_data.json`（原始数据）
2. **自动增量更新 `zijin_data_corrected.json`**（只添加新数据，不覆盖已有数据）

**输出示例**：

```
数据已保存到: .../zijin_data.json

============================================================
开始更新修正数据文件...
找到现有修正数据文件，包含 15 条记录
✅ 添加新数据: 2025年全年
✅ 修正数据文件更新完成！
   总记录数: 16
   新增记录: 1 条
   跳过记录: 15 条（已存在）

📝 提示: 请检查并手动修正新增的数据
============================================================
```

**注意**：

- 如果是第一次运行，会自动创建 `zijin_data_corrected.json`
- 已存在的数据**不会被覆盖**，保留所有手动修正

### 步骤 3：手动修正新数据

打开 `zijin_data_corrected.json`，找到新增的数据项（通常在文件开头）：

```json
{
  "period": "2025年全年",
  "year": "2025",
  "filename": "紫金矿业2025年年度报告.pdf",
  "copper": {
    "production": 100.5,
    "sales": 98.3,
    "inventory": 2.5,
    "revenue": 450.2,
    "cost": 180.5,
    "unitPrice": 4.58,
    "unitCost": 1.84,
    "unitGrossProfit": 2.74,
    "grossMargin": 59.9,
    "_corrected": false,  // ← 如果需要修正，改为 true
    "_verified": false,   // ← 验证后改为 true
    "_notes": null        // ← 添加说明
  },
  "gold": {
    // ... 同样处理
  }
}
```

**修正示例**：

```json
{
  "copper": {
    "production": 100.5,
    "sales": 98.3,
    "_corrected": true,   // ✏️ 已修正
    "_verified": true,    // ✓ 已验证
    "_notes": "产量数据有误，根据年报主要产品表格修正"
  }
}
```

### 步骤 4：在浏览器中验证

打开 `zijin_copper_gold_analysis.html`，检查：

- 新数据是否正确显示
- 修正标记是否显示（✏️ ✓ ℹ️）
- 计算的指标是否正确

## 🔧 常见修正场景

### 场景 1：PDF编码错误，数据缺失

```json
{
  "copper": {
    "production": null,  // ← 原始数据缺失
    "_corrected": false,
    "_verified": false,
    "_notes": null
  }
}
```

**修正**：

```json
{
  "copper": {
    "production": 100.5,  // ← 手动填入
    "_corrected": true,
    "_verified": true,
    "_notes": "PDF编码错误，根据年报手动填入"
  }
}
```

### 场景 2：单位错误

```json
{
  "copper": {
    "production": 1000000,  // ← 单位错误（吨 vs 万吨）
    "_corrected": false
  }
}
```

**修正**：

```json
{
  "copper": {
    "production": 100,  // ← 修正为万吨
    "_corrected": true,
    "_verified": true,
    "_notes": "单位错误，从吨转换为万吨"
  }
}
```

### 场景 3：数据验证（无需修正）

```json
{
  "copper": {
    "production": 100.5,
    "sales": 98.3,
    "_corrected": false,  // ← 数据正确，无需修正
    "_verified": false    // ← 但需要标记为已验证
  }
}
```

**修正**：

```json
{
  "copper": {
    "production": 100.5,
    "sales": 98.3,
    "_corrected": false,  // ← 保持 false
    "_verified": true,    // ← 改为 true
    "_notes": null        // ← 可以不加说明
  }
}
```

## ⚠️ 重要提示

### ✅ 可以做的事情

1. 手动修改 `zijin_data_corrected.json` 中的任何数据
2. 添加修正标记和说明
3. 运行更新脚本增量添加新数据

### ❌ 不要做的事情

1. **不要直接修改 `zijin_data.json`**（会被覆盖）
2. **不要删除 `zijin_data_corrected.json` 中的已有数据**
3. **不要手动复制粘贴数据**（使用更新脚本）

## 📝 修正标记说明

| 标记 | 字段 | 含义 | 页面显示 |
|------|------|------|----------|
| ✏️ | `_corrected: true` | 包含手动修正 | 橙色笔 |
| ✓ | `_verified: true` | 已验证正确 | 绿色勾 |
| ℹ️ | `_notes: "说明"` | 备注说明 | 蓝色图标（悬停显示） |

## 🚀 快速命令

```bash
# 完整更新流程（一键执行）
cd /Users/lijiye/work/funny && \
node scripts/stock-reports/zijin_report_parse.js

# 脚本会自动：
# 1. 提取PDF数据 → zijin_data.json
# 2. 增量更新 → zijin_data_corrected.json（不覆盖已有数据）
# 
# 然后手动修正 zijin_data_corrected.json 中的新数据
```

---

**最后更新**：2025-12-21
