# Shopify Start

## 一、准备开发环境

- node 12.22.0
- yarn 1.22.17

## 二、快速开始

### 初始化使用 yarn 安装依赖

本环境采用 yarn 来管理依赖，请务必在本项目中使用 yarn，因为它可以保障跨平台依赖严格的一致。安装 yarn 请参考[安装 yarn](https://classic.yarnpkg.com/en/docs/getting-started)。

安装 Yarn 完毕后，在项目根目录下运行命令`yarn`，即可安装项目所有依赖。关于 yarn 的其他命令，请参考[yarn 与 yarn run 的命令比较](https://classic.yarnpkg.com/en/docs/cli/)。

### 本地开发

#### 方式一（本地构建与 Theme kit 集成)

在项目根目录下运行命令`yarn run start`。

1. 在开发模式下完成 Webpack 构建
2. Webpack 开始监听 sass、js 文件更改
3. Theme Kit 开始监听文件更改 dist/ 并同步到 shopify 主题 （config.yml 中配置的主题）
4. Theme Kit 在您的默认浏览器中打开您的开发主题

注意：新拉取代码后需要在项目根目录下运行命令`yarn run deploy`，手动将代码传至主题。此工作流程可参考[shopify webpack dev workflow](https://github.com/krjo/shopify-webpack-dev-workflow).

#### 方式二 （本地构建与 Theme kit 独立进行）

##### 监听 sass、js 文件更改

在项目根目录下运行命令`yarn run webpack --watch`监听 Sass、Typescript 文件变化。

##### 监听 dist 目录变化

若未授权 Shopify CLI 连接到商城的，进入项目`dist`目录下运行命令`shopify login [--store <DOMAIN>]`，具体如何传参，详见[Shopify CLI Authenticate](https://shopify.dev/themes/tools/cli/getting-started#authenticate)和[Shopify CLI Core commands: login](https://shopify.dev/themes/tools/cli/core-commands#login)。

经过授权后，在项目`dist`目录下运行命令`shopify theme serve`，如果命令没有报错，就可以正式开发了。若报错，请检查是否有其它项目也运行了`shopify theme serve`命令。

## 三、目录文件功能介绍

- src 目录下面只保留了 theme 和 assets 文件

- theme 文件下的目录结构 和 dist 完全一样，主要用来处理 shopify .liquid 文件以及各种配置工作

  - assets 中引入一些插件样式脚本，比如 lazysize.js。主要用来处理资源文件。

  - base
    - script 全局脚本
    - style 全局样式，引入 bootstrap 5.1 作为 UI 框架；
  - fonts 用来放字体文件；
  - images 不建议使用，图片尽量通过配置的形式将图片加载到页面；
  - layout 全局样式脚本入口
  - sections 一些功能复杂的模块会单独生成各自的样式脚本，这些样式脚本会在 section.liquid 中被引入 eg:section/example-modal.liquid
