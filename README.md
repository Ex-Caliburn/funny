# Funny - 前端学习与实践项目

这是一个前端学习和实践项目，包含大量前端知识点、示例代码、学习笔记、算法实现、设计模式示例，以及股票数据分析工具。

## 📋 项目简介

本项目是一个综合性的前端学习仓库，涵盖了从基础语法到高级框架、从算法实现到工程化实践的各个方面。同时包含实用的数据爬取和分析工具，可用于股票数据研究。

## 🛠️ 技术栈

- **前端框架**: Vue 2/3, React (部分示例)
- **构建工具**: Webpack, Vite (部分示例)
- **语言**: JavaScript (ES6+), TypeScript
- **样式**: CSS, SCSS, Less
- **后端**: Node.js (用于爬虫和数据处理)
- **数据可视化**: ECharts
- **其他**: Lit, Petite-Vue (学习示例)

## 📁 目录结构

```text
funny/
├── scripts/                    # 自动化脚本目录
│   ├── crawler/               # 通用爬虫框架
│   │   ├── framework/         # 爬虫核心框架
│   │   └── extractors/        # 各类数据提取器
│   ├── stock-reports/         # 上市公司财报下载和解析
│   ├── tools/                 # 数据解析和处理工具
│   └── docs/                  # 使用文档和调试文件
│
├── stock/                     # 股票数据存储目录
│   └── [各类数据文件]         # Excel、PDF、JSON 等数据文件
│
├── 工程化/                    # 工程化相关学习
│   ├── webpack/               # Webpack 学习示例（17个示例）
│   ├── ts/                    # TypeScript 学习
│   ├── bable/                 # Babel 学习
│   ├── learn_ast/             # AST 学习
│   ├── 模块化/                # 模块化学习
│   └── 微前端/                # 微前端学习
│
├── 算法/                      # 算法实现
│   ├── leetcode/              # LeetCode 题解
│   ├── 排序算法/               # 各种排序算法实现
│   ├── 树结构/                 # 树相关算法
│   ├── 动态规划/               # 动态规划算法
│   └── [其他算法实现]
│
├── 设计模式/                   # 设计模式示例
│   └── [各种设计模式实现]
│
├── 框架和库/                   # 框架学习
│   └── [Vue、React 等框架示例]
│
├── css和动画/                  # CSS 和动画示例
│   └── [75个示例文件]
│
├── 工具类/                     # 工具函数库
│   ├── util.js                # 通用工具函数
│   ├── dom.js                 # DOM 操作工具
│   ├── validate.js            # 表单验证
│   ├── 防抖和节流.js          # 防抖节流实现
│   └── [其他工具函数]
│
├── 原型继承/                   # 原型和继承学习
│   └── [相关示例和文档]
│
├── 浏览器/                     # 浏览器相关学习
│   └── [浏览器原理、性能优化等]
│
├── http/                       # HTTP 协议学习
│   └── [HTTP 相关文档和示例]
│
├── 安全/                       # 前端安全学习
│   └── [安全相关文档]
│
├── 错误处理/                   # 错误处理和监控
│   └── [错误捕获、上报系统等]
│
├── 项目优化/                   # 项目优化实践
│   └── [性能优化、打包优化等]
│
├── 面试/                       # 面试题和解答
│   └── [面试题集合]
│
├── 移动端/                     # 移动端开发
│   └── [移动端相关文档]
│
├── 音视频/                     # 音视频处理
│   └── [音视频相关示例]
│
├── 可视化/                     # 数据可视化
│   └── [3D 可视化示例]
│
├── 二进制文件/                 # 二进制文件处理
│   └── [二进制处理示例]
│
├── AI/                         # AI 相关学习
│   └── [AI 相关示例]
│
├── shopify/                    # Shopify 开发
│   └── [Shopify 相关文档]
│
├── 个人影响力/                 # 个人成长相关
│   └── [博客系统设计、远程办公等]
│
├── 管理/                       # 项目管理相关
│   └── [项目管理文档]
│
├── lib/                        # 第三方库封装
│   └── [封装的库文件]
│
├── vue Base component/        # Vue 基础组件
│   └── [Vue 组件示例]
│
├── es6+/                       # ES6+ 新特性学习
│   └── [ES6+ 相关文档和示例]
│
├── 正则/                       # 正则表达式学习
│   └── [正则表达式示例]
│
├── git/                        # Git 学习
│   └── [Git 相关文档]
│
├── 后端和服务器/               # 后端和服务器学习
│   ├── nodejs/                 # Node.js 示例
│   └── 服务器/                 # 服务器相关文档
│
└── [根目录文件]                # 各种学习示例和笔记
    ├── *.html                  # HTML 示例文件
    ├── *.js                    # JavaScript 示例文件
    └── *.md                    # Markdown 文档
```

## 🚀 快速开始

### 1. 安装依赖

```bash
# 克隆项目
git clone https://github.com/Ex-Caliburn/funny.git

# 进入项目目录
cd funny

# 安装依赖
npm install
```

### 2. 运行爬虫（股票数据）

```bash
# 爬取商品价格数据
npm run crawl goodsPrice 3

# 爬取所有类型数据
npm run crawl:all 3

# 查看所有可用命令
npm run
```

### 3. 下载股票财报

```bash
# 批量下载财报
npm run download:reports

# 下载港股财报
npm run download:hk
```

### 4. 数据解析

```bash
# 解析商品价格数据
npm run goods:parse

# 解析能源数据
npm run energy:parse

# 解析利润数据
npm run profits:parse
```

## 📚 主要功能模块

### 1. 数据爬取系统

**位置**: `scripts/crawler/`

支持爬取国家统计局多种数据类型：

- 商品价格数据
- 能源数据
- 房地产数据
- 消费数据
- 投资数据
- 利润数据
- 分行业利润数据

**详细文档**: [scripts/crawler/README.md](./scripts/crawler/README.md)

### 2. 股票财报下载工具

**位置**: `scripts/stock-reports/`

功能：

- 批量下载 A 股和港股公司财报
- 支持年报、半年报、季报
- 自动解析财报数据

**详细文档**: [scripts/README.md](./scripts/README.md)

### 3. Webpack 学习示例

**位置**: `工程化/webpack/`

包含 17 个 Webpack 配置示例：

- 基础配置
- 样式处理
- 图片和字体打包
- 开发服务器
- HMR（热模块替换）
- Source Map
- 生产环境配置
- 插件开发

### 4. 算法实现

**位置**: `算法/`

包含：

- LeetCode 题解（30+ 道题）
- 排序算法（快排、归并、堆排等）
- 树结构算法（遍历、构建等）
- 动态规划
- 链表操作
- 其他经典算法

### 5. 设计模式

**位置**: `设计模式/`

包含常见设计模式的 JavaScript 实现和说明文档。

### 6. 工具函数库

**位置**: `工具类/`

提供常用的工具函数：

- DOM 操作
- 表单验证
- 日期处理
- 防抖和节流
- 数据格式化
- 正则表达式

## 📖 使用说明

### 学习示例

项目中的 HTML 文件可以直接在浏览器中打开查看效果，JavaScript 文件可以在 Node.js 环境中运行。

### 爬虫使用

```bash
# 基本用法
node scripts/crawler/framework/crawler_main.js [数据类型] [页数]

# 示例
node scripts/crawler/framework/crawler_main.js goodsPrice 5
node scripts/crawler/framework/crawler_main.js energy 3
node scripts/crawler/framework/crawler_main.js all 3
```

### 数据存储

- **原始数据**: `stock/[类型]/` 目录
- **解析后数据**: `stock/[类型]_cleaned.json` 文件

## 🔧 开发指南

### 添加新的爬虫类型

1. 在 `scripts/crawler/extractors/` 创建新的提取器
2. 在 `scripts/crawler/framework/crawler_config.js` 添加配置
3. 在 `scripts/tools/` 创建对应的解析脚本
4. 在 `package.json` 添加对应的 npm 脚本

### 代码规范

- 使用 ES6+ 语法
- 优先使用中文注释（项目包含大量学习笔记）
- 遵循项目的命名规范

## 📝 注意事项

1. **爬虫使用**: 请遵守目标网站的使用条款，避免频繁请求
2. **数据使用**: 下载的数据仅供学习研究使用
3. **学习目的**: 本项目主要用于学习和实践，部分代码可能不是生产环境最佳实践
4. **依赖管理**: 部分子目录（如 webpack 示例）有独立的 `package.json`

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可

本项目仅供学习和研究使用。

## 🔗 相关链接

- [GitHub 仓库](https://github.com/Ex-Caliburn/funny)
- [Issues](https://github.com/Ex-Caliburn/funny/issues)

## 📊 项目统计

- **文件总数**: 1000+ 文件
- **代码示例**: 500+ 个示例文件
- **学习文档**: 200+ 篇文档
- **算法题解**: 30+ 道 LeetCode 题
- **Webpack 示例**: 17 个配置示例
- **设计模式**: 20+ 种设计模式实现

---

**最后更新**: 2024年
