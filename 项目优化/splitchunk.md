# SplitChunksPlugin

## 前言

多个页面引用了同一个组件，打包时页面都加载了这个组件

SplitChunksPlugin解决依赖重复引用的问题

### 实例

```javascript
module.exports = {
  //...
  optimization: {
    splitChunks: {
      chunks: 'async',
      minSize: 30000,
      minRemainingSize: 0,
      maxSize: 0,
      minChunks: 1,
      maxAsyncRequests: 6,
      maxInitialRequests: 4,
      automaticNameDelimiter: '~',
      cacheGroups: {
        defaultVendors: {
          test: /[\\/]node_modules[\\/]/,
          priority: -10
        },
        default: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true
        }
      }
    }
  }
};
```

## 总结

### 参考文献

1. <https://webpack.js.org/plugins/split-chunks-plugin/>
