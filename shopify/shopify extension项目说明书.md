# 项目运行流程说明书

## 一、项目简介

goals-bar 是基于 [Remix](https://remix.run) 框架开发的 Shopify App，支持多种促销目标（如满减、满赠、进度条等），并通过 Shopify Functions、App Bridge、Polaris 组件库等实现前后端一体化开发，支持扩展插件（如 discount-goal、cart-theme）。

---

## 二、项目整体架构

- **前端**：Remix + React + Polaris（Shopify 官方 UI 组件库）
- **后端**：Node.js（Remix SSR）、Shopify App Bridge、Prisma（数据库 ORM）
- **数据库**：默认 SQLite（可扩展为 MySQL/PostgreSQL 等）
- **扩展插件**：`/extensions` 目录下的 Functions、Theme Extension
- **容器化支持**：Dockerfile 提供一键部署能力

---

## 三、主要模块与目录结构

- `/app`：主应用目录（前后端同构，Remix 路由、组件、API、上下文等）
- `/extensions`：Shopify Functions、Theme Extension 插件
- `/prisma`：数据库 schema 及迁移
- `/public`：静态资源
- `/src`、`/assets`：主题扩展相关 JS/CSS
- `Dockerfile`：容器化部署脚本
- `README.md`：官方启动、开发、部署说明

---

## 四、app 目录与 extensions 目录关系详解

### 1. app 目录结构与文件关系

`app` 目录是 Remix 应用的主目录，负责整个 Shopify App 的**前后端同构渲染**、**业务路由**、**API 处理**、**全局上下文**等。主要结构和作用如下：

- **components/**  
  业务和基础组件库，供页面和路由复用。例如：Application、GoalList、BaseTable 等。

- **context/**  
  全局 React Context 和自定义 Hook，管理全局状态、数据处理逻辑。

- **db.server.js**  
  数据库服务端入口，通常用于 Prisma ORM 实例化，供全局调用。

- **entry.server.jsx**  
  Remix 服务端渲染（SSR）入口，处理所有 HTTP 请求，负责 React 组件的服务端渲染。

- **global.css**  
  全局样式文件，所有页面和组件共享。

- **hook/**  
  自定义 Hook 目录，封装常用数据处理、业务逻辑。

- **models/**  
  数据模型、配置等后端逻辑代码。

- **root.jsx**  
  Remix 应用的根组件，负责全局 HTML 结构、Meta、Links、Outlet（页面内容）、全局脚本等。

- **routes/**  
  Remix 路由目录，所有页面、API、webhook 路由都在这里自动注册。  
  例如：`app.routes.app.goals-bar.$functionId.new.jsx` 是新建目标的页面，`api/` 目录下是后端 API 路由。

- **shopify.server.js**  
  Shopify App 服务端集成入口，负责 OAuth、Session、Webhook 注册、API 调用等。

- **util/**  
  工具函数、类型定义等。

### 2. extensions 目录的作用与 app 的关系

- **extensions/**  
  存放 Shopify App 的扩展插件（Extension），如 Functions（订单折扣逻辑）、Theme Extension（购物车 UI 逻辑）等。每个子目录为一个独立插件，和主应用解耦，单独开发、构建、部署。

#### 关系说明

- **数据流/交互**  
  - `app` 负责**后台管理**、**配置界面**、**业务逻辑**、**API**，如目标的创建、配置、管理等。
  - `extensions` 负责**前台功能扩展**，如订单结算时的折扣逻辑（discount-goal）、购物车页面的 UI 组件（cart-theme）等。
  - `app` 通过 UI 配置页面，将参数写入 metafield（元字段），`extensions` 读取这些配置并在 Shopify 平台实际生效。

- **部署与生命周期**  
  - `app` 作为主应用，始终运行，负责管理和配置所有扩展。
  - `extensions` 作为插件，按需被 Shopify 平台调用（如结算、渲染购物车时），生命周期独立。

- **代码解耦**  
  - `app` 和 `extensions` 通过 Shopify 的 metafield、API、webhook 等机制进行数据和事件交互，代码层面高度解耦，便于独立开发和维护。

#### 总结

- `app` 目录 = 主应用（后台管理、配置、API、全局逻辑、页面渲染）
- `extensions` 目录 = 插件/扩展（订单折扣、主题扩展等，独立于主应用）
- 两者通过 Shopify 平台的**配置、API、metafield**等机制进行数据和功能协作，保证了灵活性和可扩展性。

---

## 五、运行与启动流程

### 1. 本地开发

1. **依赖安装**

   ```bash
   npm install
   # 或 yarn install / pnpm install
   ```

2. **数据库初始化**

   ```bash
   npm run setup
   # 等价于 prisma generate && prisma migrate deploy
   ```

3. **本地开发启动**

   ```bash
   npm run dev
   # 启动 Remix + Shopify CLI + Gulp 监听
   ```

4. **访问开发地址**
   - 按 CLI 提示访问本地 tunnel 地址，安装到 Shopify 测试店铺

### 2. 构建与部署

- **构建**

  ```bash
  npm run build
  # Remix 构建产物
  ```

- **Docker 部署**

  ```dockerfile
  FROM node:18-alpine
  WORKDIR /app
  COPY . .
  RUN npm install
  RUN npm run build
  RUN rm prisma/dev.sqlite
  RUN npx prisma migrate dev --name init
  CMD ["npm", "run", "start"]
  ```

- **生产环境启动**

  ```bash
  npm run start
  # remix-serve build
  ```

---

## 六、核心数据流与请求流程

### 1. 前端（Remix + React）

- 入口：`app/root.jsx`  
  - 渲染全局 `<Meta> <Links> <Outlet> <Scripts>` 等
- 路由：`app/routes/`  
  - 业务页面、API 路由、webhook 路由等
- 状态管理：`app/context/`  
  - 全局上下文、数据处理 hook

### 2. 服务端（Remix SSR）

- 入口：`app/entry.server.jsx`  
  - 处理所有 HTTP 请求，服务端渲染 React 组件
  - 支持 bot 检测、流式渲染、错误处理

### 3. Shopify 集成

- 认证与 API：`app/shopify.server.js`  
  - Shopify App 初始化、OAuth、Session 存储、Webhook 注册
  - 提供 `shopify.authenticate`、`shopify.registerWebhooks` 等方法
- 数据查询：通过 `shopify.authenticate.admin(request)` 获取 API 实例，GraphQL/REST 查询店铺数据

### 4. 数据库

- ORM：Prisma
- Schema：`prisma/schema.prisma`
- 默认 SQLite，支持扩展

### 5. 插件与扩展

- **Functions**（如 discount-goal）：订单结算时由 Shopify 调用，返回折扣等业务逻辑
- **Theme Extension**（如 cart-theme）：注入购物车 UI、进度条、优惠券等前端交互

---

## 七、常见开发与运维流程

- **本地开发**：`npm run dev`，自动监听代码变更，热更新
- **数据库迁移**：`npx prisma migrate dev --name <desc>`
- **扩展开发**：`/extensions` 目录下独立开发、测试、构建
- **环境变量**：通过 `.env` 或云端配置
- **Shopify CLI**：用于本地 tunnel、环境变量同步、扩展生成与部署

---

## 八、注意事项

- Remix 路由跳转请使用 `<Link>` 组件，避免 `<a>` 标签导致认证丢失
- 数据库表不存在时需先执行 `npm run setup`
- 插件/扩展变更需重新构建并部署
- 生产环境建议更换为持久化数据库（如 MySQL/PostgreSQL）

---

## 九、参考资源

- [Remix 官方文档](https://remix.run/docs/en/v1)
- [Shopify App 开发文档](https://shopify.dev/docs/apps/getting-started)
- [Shopify App Remix](https://github.com/Shopify/shopify-app-js/blob/main/packages/shopify-app-remix/README.md)
- [Polaris 组件库](https://polaris.shopify.com/)

---

如需补充详细模块说明、插件开发流程或 CI/CD 流程，请进一步说明需求。
