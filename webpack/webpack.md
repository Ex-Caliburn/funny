# webpack 链式调用

## 前言

vue-cli 的 webpack 配置维护使用 webpack-chain,该库在原生webpack 配置上加了一层抽象， 可以去命名 loader 和 插件，然后通过"tap" 进入他们规则里面修改他们的配置

The internal webpack config is maintained using webpack-chain. The library provides an abstraction over the raw webpack config, with the ability to define named loader rules and named plugins, and later "tap" into those rules and modify their options.

### 含义

config.module.rule 和 config.module.use 都是创建一个名字，无实际作用

```js
// Create named rules which can be modified later
config.module
  .rule('lint')
    .test(/\.js$/)
    .pre()
    .include
      .add('src')
      .end()
    // Even create named uses (loaders)
    .use('eslint')
      .loader('eslint-loader')
      .options({
        rules: {
          semi: 'off'
        }
      });
```

### 打印

```js
config
  .module
    .rule('compile')
      .test(/\.js$/)
      .use('babel')
        .loader('babel-loader');

config.toString();

/*
{
  module: {
    rules: [
      /* config.module.rule('compile') */
      {
        test: /\.js$/,
        use: [
          /* config.module.rule('compile').use('babel') */
          {
            loader: 'babel-loader'
          }
        ]
      }
    ]
  }
}
*/

  config.module
      .rule('istanbul')
      .test(/\.js$|\.jsx$/)
      .pre()
      .use('istanbul-instrumenter-loader')
      .loader('istanbul-instrumenter-loader')
      .options({
        esModules: true
      })
      .end()

      /* config.module.rule('istanbul') */
      {
        test: /\.js$|\.jsx$/,
        enforce: 'pre',
        use: [
          /* config.module.rule('istanbul').use('istanbul-instrumenter-loader') */
          {
            loader: 'istanbul-instrumenter-loader',
            options: {
              esModules: true
            }
          }
        ]
      }
```

## 总结

多使用inspect看看源码

1. vue-cli-service inspect
2. vue inspect > output.js

### 参考文献

1. <https://github.com/neutrinojs/webpack-chain>
2. <https://github.com/vuejs/vue-cli/blob/dev/docs/guide/webpack.md#replacing-loaders-of-a-rule>
