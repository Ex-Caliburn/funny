# 分页区间功能说明

## 📋 功能概述

爬虫系统现已支持**分页区间选择**功能，可以灵活指定要爬取的页码范围，而不仅限于从第1页开始。

## 🎯 支持的格式

### 1. 单个数字（从第1页开始）
```bash
node crawler_main.js goodsPrice 5
# 爬取第1-5页
```

### 2. 区间范围（简化格式）⭐ 推荐
```bash
node crawler_main.js goodsPrice 2-5
# 爬取第2-5页
```

### 3. 区间范围（带前缀）
```bash
node crawler_main.js goodsPrice --page-range 2-5
# 爬取第2-5页
```

## 💡 使用示例

### 示例 1: 爬取商品价格数据（第1-5页）
```bash
node crawler_main.js goodsPrice 5
```

### 示例 2: 爬取能源数据（第2-5页）
```bash
node crawler_main.js energy 2-5
```

### 示例 3: 爬取房地产数据（第3-8页）
```bash
node crawler_main.js house --page-range 3-8
```

### 示例 4: 爬取所有类型数据（前3页）
```bash
node crawler_main.js all 3
```

### 示例 5: 爬取所有类型数据（第2-4页）
```bash
node crawler_main.js all 2-4
```

### 示例 6: 只爬取单页
```bash
node crawler_main.js retail 3-3
# 只爬取第3页
```

## ⚙️ 配置说明

在 `crawler_config.js` 中新增了分页配置：

```javascript
pagination: {
  defaultStartPage: 1,        // 默认起始页码
  defaultEndPage: 3,          // 默认结束页码
  maxAllowedPages: 100,       // 最大允许页数
  pageRangePattern: /^(\d+)-(\d+)$/  // 区间格式验证正则
}
```

## ✅ 参数验证

系统会自动验证以下规则：

1. ✓ 起始页码必须 ≥ 1
2. ✓ 结束页码必须 ≥ 起始页码
3. ✓ 结束页码不能超过最大允许页数（默认100）
4. ✓ 参数格式必须正确（数字或 "数字-数字"）

### 错误示例

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

## 🔄 向后兼容

新功能**完全向后兼容**旧版本的使用方式：

```bash
# 旧版本写法（仍然支持）
node crawler_main.js goodsPrice 5

# 等同于新版本
node crawler_main.js goodsPrice 1-5
```

## 📝 技术实现

### 修改的文件

1. **crawler_config.js** - 添加分页区间配置
2. **generic_crawler.js** - 修改 `getPageUrls()` 方法支持起始页和结束页
3. **crawler_main.js** - 添加 `parsePageRange()` 方法解析新参数格式

### 核心方法

#### parsePageRange(pageRangeStr)
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

#### getPageUrls(startPage, endPage)
```javascript
/**
 * 获取分页URL列表
 * @param {number} startPage - 起始页码
 * @param {number} endPage - 结束页码
 * @returns {Array} URL列表
 */
```

## 🎨 命名方案选择

最终采用**方案1：区间范围**

- ✅ 参数名：`page-range` 或 `pageRange`
- ✅ 变量名：`startPage`、`endPage`
- ✅ 格式：`2-5`（数字-数字）

优点：
- 直观清晰，符合中文习惯
- 使用简洁，易于理解
- 减少参数数量（一个参数包含两个信息）

## 📊 测试结果

所有测试用例均已通过 ✅

- ✅ 单个数字解析
- ✅ 区间格式解析
- ✅ 单页区间
- ✅ 无效参数识别
- ✅ 边界值验证
- ✅ 格式错误处理

## 🚀 快速开始

1. 查看帮助信息：
```bash
node crawler_main.js --help
```

2. 测试基本功能（爬取前2页）：
```bash
node crawler_main.js goodsPrice 2
```

3. 测试区间功能（爬取第2-3页）：
```bash
node crawler_main.js goodsPrice 2-3
```

## 📌 注意事项

- 爬取过程会有延迟，避免对服务器造成压力
- 下载的文件会保存在 `stock/` 目录下对应的子目录中
- 爬取完成后会自动运行解析脚本生成清理后的数据
- 建议先用小范围测试（如 1-2 页），确认无误后再大规模爬取

## 📅 更新日期

2025-11-11

## 👨‍💻 功能状态

✅ 已完成并通过测试

