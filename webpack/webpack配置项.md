# webpack

## 前言

ES2015 中的 import 和 export 语句已经被标准化。虽然大多数浏览器还无法支持它们，但是 webpack 却能够提供开箱即用般的支持。

### 启动

启动方式： npx  webpack-dev-server

### 遇到的问题

Cannot find module 'html-webpack-plugin' (beginner)
全局删除 webpack 没用， 本地重新安装webpack没用

### 规则

#### oneOf

webpack原本的loader是将每个文件都过一遍，比如有一个js文件 rules中有10个loader，第一个是处理js文件的loader，当第一个loader处理完成后webpack不会自动跳出，而是会继续拿着这个js文件去尝试匹配剩下的9个loader，相当于没有break。
而oneOf就相当于这个break

```js
 /* config.module.rule('scss') */
      {
        test: /\.scss$/,
        oneOf: [
          /* config.module.rule('scss').oneOf('vue-modules') */
         ...
          /* config.module.rule('scss').oneOf('vue') */
          {
            resourceQuery: /\?vue/,
            use: [
              /* config.module.rule('scss').oneOf('vue').use('vue-style-loader') */
              {
                loader: '/Users/lijiye/work/jdk_pc_front/node_modules/vue-style-loader/index.js',
                options: {
                  sourceMap: false,
                  shadowMode: false
                }
              },
              /* config.module.rule('scss').oneOf('vue').use('css-loader') */
              {
                loader: '/Users/lijiye/work/jdk_pc_front/node_modules/css-loader/dist/cjs.js',
                options: {
                  sourceMap: false,
                  importLoaders: 2
                }
              },
              /* config.module.rule('scss').oneOf('vue').use('postcss-loader') */
              {
                loader: '/Users/lijiye/work/jdk_pc_front/node_modules/postcss-loader/src/index.js',
                options: {
                  sourceMap: false
                }
              },
              /* config.module.rule('scss').oneOf('vue').use('sass-loader') */
              {
                loader: '/Users/lijiye/work/jdk_pc_front/node_modules/sass-loader/dist/cjs.js',
                options: {
                  sourceMap: false,
                  prependData: '@import "~@/assets/styles/_var.scss";@import "~@/assets/styles/mixin.scss";'
                }
              }
            ]
          },
          /* config.module.rule('scss').oneOf('normal-modules') */
          ...
          /* config.module.rule('scss').oneOf('normal') */
          ...
        ]
      },
```

#### enforce

loader的执行顺序是从下往上的，但是有时候我们想先执行某个loader 就要把它移到最后边这样非常的不方便。
enforce的作用是设置loader的优先级
enforce有以下几个配置项

pre 优先处理
normal 正常处理（默认）
inline 其次处理
post 最后处理
执行loader的时候会根据enforce的配置来安排顺序，如果设置了pre则会优先执行

```js
/* config.module.rule('eslint') */
      {
        enforce: 'pre',
        test: /\.(vue|(j|t)sx?)$/,
        exclude: [
          /node_modules/,
          '/Users/lijiye/work/jdk_pc_front/node_modules/@vue/cli-service/lib'
        ],
        use: [
          /* config.module.rule('eslint').use('eslint-loader') */
          {
            loader: '/Users/lijiye/work/jdk_pc_front/node_modules/eslint-loader/index.js',
            options: {
              extensions: [
                '.js',
                '.jsx',
                '.vue'
              ],
              cache: true,
              cacheIdentifier: '0a377872',
              emitWarning: true,
              emitError: false,
              eslintPath: '/Users/lijiye/work/jdk_pc_front/node_modules/eslint',
              formatter: undefined
            }
          }
        ]
      }
```

### js 处理

```js
/* config.module.rule('js') */
      {
        test: /\.m?jsx?$/,
        exclude: [
          function () { /* omitted long function */ }
        ],
        use: [
          /* config.module.rule('js').use('cache-loader') */
          {
            loader: '/Users/lijiye/work/jdk_pc_front/node_modules/cache-loader/dist/cjs.js',
            options: {
              cacheDirectory: '/Users/lijiye/work/jdk_pc_front/node_modules/.cache/babel-loader',
              cacheIdentifier: '0174ee98'
            }
          },
          /* config.module.rule('js').use('babel-loader') */
          {
            loader: '/Users/lijiye/work/jdk_pc_front/node_modules/babel-loader/lib/index.js'
          }
        ]
      }
```

### loader

所有普通 loader 可以通过在请求中加上 ! 前缀来忽略（覆盖）。

所有普通和前置 loader 可以通过在请求中加上 -! 前缀来忽略（覆盖）。

所有普通，后置和前置 loader 可以通过在请求中加上 !! 前缀来忽略（覆盖）。

```js
// 禁用普通 loaders
import { a } from '!./file1.js';

// 禁用前置和普通 loaders
import { b } from  '-!./file2.js';

// 禁用所有的 laoders
import { c } from  '!!./file3.js';
```

格式是所缩进模式，不需要{}

## 常用打包工具对比

> 侧重点不同：开发体验 与 生态与可扩展性 常常需要权衡。

### 场景／选择建议

| 场景 | 推荐 | 说明 |
| --- | --- | --- |
| 传统大型前端（复杂构建链、老项目迁移少） | Webpack／Rspack | 成熟生态与插件齐全；Rspack 兼容 Webpack 配置，构建更快 |
| 新项目，追求极速冷启动与 HMR | Vite | 以原生 ESM 开发，HMR 体验好，生产默认走 Rollup 打包 |
| 库／SDK 打包（输出多格式） | Rollup | 输出 UMD／CJS／ESM 友好，Tree Shaking 纯净 |
| 零配置快速上手 | Parcel | 开箱即用，自动化较强，适合中小项目 |
| 工具链脚手架、极致速度的构建脚本 | esbuild | 极快的构建与转译，可作为底层构件或辅助 |

### 核心能力对比

| 维度 | Webpack | Vite | Rollup | Parcel | esbuild | Rspack |
| --- | --- | --- | --- | --- | --- | --- |
| 开发启动速度 | 中 | 很快 | 慢（多用于库） | 中 | 很快 | 很快 |
| HMR 体验 | 好 | 很好 | 一般 | 好 | 一般 | 好 |
| 生产打包速度 | 中 | 快（基于 Rollup） | 中 | 中 | 很快 | 很快 |
| Tree Shaking | 好 | 好（依赖 Rollup） | 很好 | 好 | 好 | 好 |
| 代码分割 | 很好 | 好 | 好 | 好 | 一般 | 很好 |
| 插件生态 | 非常丰富 | 丰富（与 Rollup 生态部分互通） | 丰富 | 一般 | 一般 | 兼容大量 Webpack 插件 |
| 配置复杂度 | 高 | 低 | 中 | 低 | 低 | 中（与 Webpack 类似） |
| 兼容性（老项目／遗留配置） | 很好 | 中 | 中 | 中 | 中 | 很好 |
| TypeScript 支持 | 插件完善 | 原生友好 | 插件完善 | 内置不错 | 转译快，类型检查需独立 | 与 Webpack 流程一致 |
| 构建底层 | JS | Dev：原生 ESM；Prod：Rollup | JS | Rust＋JS | Go | Rust |

提示：若已有成熟 Webpack 配置且构建时间瓶颈明显，可优先评估 Rspack 以较低迁移成本提速；新项目默认选择 Vite 通常是平衡开发体验与生产质量的优选。
