# px2rem

## 前言

px2rem-postcss 做了什么

vue-loader 将
将 *.vue 文件变成*.bundle.js，然后放入浏览器运行
 vue文件提取出style，template，script三部分，后续在进行下一步操作

### 样式loader

style-loader 将模块的导出作为样式添加到 DOM 中
css-loader 解析 CSS 文件后，使用 import 加载，并且返回 CSS 代码
less-loader 加载和转译 LESS 文件
sass-loader 加载和转译 SASS/SCSS 文件
postcss-loader 使用 PostCSS 加载和转译 CSS/SSS 文件
stylus-loader 加载和转译 Stylus 文件

### 基本配置项

```js
{
    rootValue: 100, //换算基数， 默认100  ，这样的话把根标签的字体规定为1rem为50px,这样就可以从设计稿上量出多少个px直接在代码中写多上px了。
    unitPrecision: 5, //允许REM单位增长到的十进制数字。
    propWhiteList: [], //默认值是一个空数组，这意味着禁用白名单并启用所有属性。
    propBlackList: [], //黑名单
    exclude: /node_module\/(?!vant)/i, //默认false，可以（reg）利用正则表达式排除某些文件夹的方法，例如/(node_module)\/如果想把前端UI框架内的px也转换成rem，请把此属性设为默认值
    selectorBlackList: ['px', 'icon'], //要忽略并保留为px的选择器
    propList: ['border'],
    // ignoreIdentifier: false,  //（boolean/string）忽略单个属性的方法，启用ignoreidentifier后，replace将自动设置为true。
    // replace: true, // （布尔值）替换包含REM的规则，而不是添加回退。
    mediaQuery: false, //（布尔值）允许在媒体查询中转换px。
    minPixelValue: 2 //设置要替换的最小像素值(3px会被转rem)。 默认 0
}
```

### postcss

作用

- 把 CSS 解析成 JavaScript 可以操作的 AST
- 调用插件来处理 AST 并得到结果。因此，不能简单的把 PostCSS 归类成 CSS 预处理或后处理工具。PostCSS 所能执行的任务非常多，同时涵盖了传统意义上的预处理和后处理

#### 调用时机

webpack use数组是从右至左
postcss-loader 在 css-loader 和 style-loader 之后，但是在 sass|less|stylus-loader 之前

```js
module: {
    rules: [
      // 详细loader配置
      {
        // 匹配那些文件
        test: /\.css$/,
        // 使用那些loader进行处理
        use: [
          //  use 数组loader执行顺序，从右到左 依次执行
          // 创建style标签，将js中的样式资源进行，添加到head中
          'style-loader',
          // 将css文件变成commonjs模块加载在js中，里面的内容是样式字符串
          'css-loader',
        ]
      },
      {
        test: /\.scss$|\.sass$/,
        use: [
          'style-loader',
          'css-loader',
          'sass-loader',
        ]
      }
    ]
  }
```

### vue

vue-style-loader 相当于 style-loader，基于此修改

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

## 总结

1. 如果使用了 scss-loader 现将scss 转换css
2. px2rem-postcss 触发，先过滤规则exclude，属性和选择器黑名单，是否已经设置了rem，通过正则将px转换为rem，然后在直接替换原来的css
3. css-loader 将css文件变成commonjs模块加载在js中，里面的内容是样式字符串
4. style-loader 创建style标签，将js中的样式资源进行，添加到head中

### 参考文献

1. <https://github.com/songsiqi/px2rem>
2. <https://github.com/songsiqi/px2rem-postcss>
3. <https://www.webpackjs.com/loaders/>
