# vue mini

## 前言

源码分为3块

- 工具方法
- API
- AST

### 需要的

  响应式
  模板引擎
  指令语法
  虚拟dom，diff算法
  Vue3可以使用reactive 当作状态管理

### 剔除的

  ssr，hydrate
  mixins 相关
  composition Api
  runtime 代码，需要template 编译

### 生产不需要的

devtool
validateProps
各种报错提示，console

### 压缩

uglifyjs --compress --mangle -o vue.esm-browser.min.js   -- vue.esm-browser.js

## 总结

使用官方框架

### 参考文献
