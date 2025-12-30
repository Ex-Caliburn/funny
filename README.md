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
│   ├── stock-reports/         # 上市公司财报下载和解析
│   └── tools/                 # 数据解析和处理工具
│
├── stock/                     # 股票数据存储目录
│
├── 基础知识/                   # JavaScript 基础（变量、类型、原型链、异步、正则等）
│   ├── 原型继承/              # 原型和继承深究
│   └── 正则/                  # 正则表达式学习
│
├── es6+/                       # ES6 及更高版本特性
│
├── 浏览器/                     # 浏览器原理、DOM、Web API、存储
│
├── 网络/                       # 网络协议、Ajax、跨域、请求优化
│
├── 工程化/                     # Webpack、Vite、Babel、TS、模块化、微前端
│
├── 算法/                       # 算法实现、LeetCode 题解、加密算法
│
├── 设计模式/                   # 常见设计模式实现
│
├── 职场与成长/                 # 职业规划、管理心得、方法论、影响力
│   ├── 管理/                  # 团队管理、沟通、CR、重构
│   ├── 方法论/                # OKR、费曼学习法、GA、Markdown
│   └── 个人影响力/            # 博客设计、远程办公
│
├── 框架和库/                   # Vue、React、Lit、Petite-Vue 等
│   └── vue/                   # Vue 专题
│       └── base-components/   # Vue 基础组件库
│
├── css和动画/                  # CSS 布局、动画示例
│
├── 工具类/                     # 通用工具函数库
│
├── 安全/                       # 前端安全学习
│
├── 错误处理/                   # 错误捕获与监控
│
├── 项目优化/                   # 性能优化、渲染优化
│
├── 音视频/                     # 音视频处理、流媒体
│
├── 面试/                       # 面试题集锦
│
├── 移动端/                     # 移动端开发与适配
│
├── 可视化/                     # ECharts、3D 可视化
│
├── 二进制文件/                 # 二进制处理、Buffer、Blob
│
├── AI/                         # AI 相关学习示例
│
├── shopify/                    # Shopify 开发相关
│
├── lib/                        # 第三方库封装
│
├── git/                        # Git 使用指南
│
└── playground/                 # 临时测试与实验代码

## 🗺️ 学习路线图 (Roadmap)

为了帮助你更高效地浏览本仓库，建议遵循以下学习路径：

### 🟢 Phase 1: 夯实基础 (Basic)
*   **JavaScript**: [基础知识/](./基础知识/)、[es6+/](./es6+/)
*   **CSS**: [css和动画/](./css和动画/)
*   **版本控制**: [git/](./git/)

### 🟡 Phase 2: 深入原理 (Intermediate)
*   **运行环境**: [浏览器/](./浏览器/)、[网络/](./网络/)
*   **模式与逻辑**: [设计模式/](./设计模式/)、[算法/](./算法/)
*   **安全与稳定性**: [安全/](./安全/)、[错误处理/](./错误处理/)

### 🟠 Phase 3: 工程化与架构 (Advanced)
*   **提效方案**: [工程化/](./工程化/)、[工具类/](./工具类/)
*   **性能飞跃**: [项目优化/](./项目优化/)
*   **多维领域**: [音视频/](./音视频/)、[可视化/](./可视化/)、[二进制文件/](./二进制文件/)

### 🔴 Phase 4: 实战与职场 (Professional)
*   **框架深度**: [框架和库/](./框架和库/)
*   **职场进阶**: [职场与成长/](./职场与成长/)
*   **求职准备**: [面试/](./面试/)

## 🛠️ 维护命令

本仓库内置了一些自动化维护工具：

```bash
# 更新 README 项目统计信息
npm run stats

# 自动修复 Markdown 相对链接
npm run fix-links

# 统一格式化代码 (Prettier)
npm run format
```

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

- **算法题解**: 30+ 个示例文件
- **Webpack 示例**: 20+ 个配置示例
- **设计模式**: 22+ 个示例文件
- **学习文档**: 375+ 篇文档
- **代码示例**: 579+ 个示例文件

- **最后自动更新**: 2025/12/30

---

**最后更新**: 2024年
