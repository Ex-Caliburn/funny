# 项目搭建

## 前言

lint 工具就是工具，工程化就是要标准化，消除差异，大家行为一致，并不是限制大家，只是限制在框架内其他随意发挥，一些不推荐的方法，样式，书写规范
帮你梳理

项目创建的时候选择 eslint + .prettier

### eslint

vue-cli 创建项目时，选择  eslint + Prettier，为什么不是 eslint + Airbnb config ，刚开始我也是用Airbnb，但是Prettier限制更多，限制代码长度，一切都设置好了，不可以改动，可配置项少，一些规则基本就钉死了

依赖什么的vue-cli都会帮你装好

vue-cli 自定义项目配置存在  ~/.vuerc

#### 自定义配置项

根目录下创建 .eslintrc.js
rule 下可以添加规则  正式环境不能添加 debugger
 'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',

### npm

注意设置yarn和npm 仓库 为 淘宝镜像

```shell
npm config set registry https://registry.npm.taobao.org
npm config set sass_binary_site https://npm.taobao.org/mirrors/node-sass/
npm config get registry // 查看 registry

yarn config set registry https://registry.npm.taobao.org -g
yarn config set sass_binary_site https://npm.taobao.org/mirrors/node-sass/ -g
yarn config get registry // 查看 registry
```

配置文件 .npmrc和.yarnrc文件

win: C:\Users\用户名 下
mac: ~/.yarnrc  和  ~/.npmrc

### stylelint

安装配置 参考 [运用Stylelint 养成好习惯](https://dotblogs.com.tw/explooosion/2018/09/30/141005)

并设置 stylelintrc.json

 package.json修改

```js
{
 "scripts": {
    "stylelint": "stylelint src/**/*.{vue,html,css,scss} --syntax --cache --cache-location '/.stylelintcache' --fix"
  }
}
```

lint：语法为stylelint [ 目录 ] --syntax [ 语法种类 ]，也可以直接省略--syntax不写，自动侦测文件类型。
vue 文件还是不要指定 --syntax， 不然会报错 CssSyntaxError
目录其实可以根据您的环境进行修改，由于避免目录很多层而漏掉，因此用了许多/**/。
lint:fix：这个指令与上一个没有多大差别，但最重要的是多了--fix，顾名思义就是可以自动修正错误（谨慎使用）。
--cache --cache-location 设置缓存地址，快速stylelint，节约时间,npm 运行可能没有修改文件的权限如果没有

vue.config.js 添加  stylelint

```js
configureWebpack: config => {
    config.plugins.push(
      new StyleLintPlugin({
        configFile: './.stylelintrc.json', // 自定义配置文件位置
        files: ['src/**/*.{vue,html,css,scss}'], // StyleLint文件目录
        failOnError: false,
        cache: true,
        maxWarnings: 20,
        fix: true
      })
    )
  },
```

### typescript eslint-typescript

无法找到模块“lodash.debounce”的声明文件

src/shims-vue.d.ts

declare module 'lodash.debounce'

vue 文件 加上 lang="ts" 使用ts
vue 文件引入需要加上.vue后缀

```js
<script lang="ts"></script>
```

```js
declare module 'vue/types/vue' {
  interface Vue {
  }
}
```

### lint-staged

lint-staged   可以阻止我们git commit, git push ，提交糟糕的代码

package.json修改

```js
{
  "gitHooks": {
    "pre-commit": "lint-staged"
  },
  "lint-staged": {
    "*.{js,vue}": [
      "vue-cli-service lint",
    ],
    "*.{scss,vue}": [
      "npm run stylelint",
    ]
  }
}
```

pre-commit：当我们进行git commit的时候，会先执行lint检测，如果没有通过，则会被阻挡下来拒绝提交
vue-cli-service lint: lint
npm run stylelint： 运行设置好的 stylelint

`git add` 不需要添加 lint-staged 会自动提交 commit 到暂存库

Some of your tasks use `git add` command. Please remove it from the config since all modifications made by tasks will be automatically added to the git commit index

## 总结

项目搭建完成，如何像vue-cli 不需要每次都配置
如何自定义脚手架？
如何使用docker规避开发环境不同导致代码运行不起来的影响？

### 参考文献

1. [运用Stylelint 养成好习惯](https://dotblogs.com.tw/explooosion/2018/09/30/141005)
2. [stylelint](https://stylelint.io/user-guide/usage/cli)
