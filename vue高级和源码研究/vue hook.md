# vue hook

## 前言

不想修改组件源码的情况去hook组件的生命周期，不入侵代码

### 写法

组件内用

```js
mounted () {
  window.addEventListener('online', this.handleOnline)
  this.$once('hook:beforeDestroy', function () {
    window.removeEventListener('online', this.handleOnline)
  })
}
```

```html
//父组件中这样写
<rl-child
  :value="40"
  @hook:mounted="handleChildMounted"
/>

// 子组件中不用写东西
mounted () {},
```

## 总结

组件周期触发之后用也没用，你要知道组件hook触发顺序,不能在mounted hook mounted

```js
mounted () {
  this.$once('hook:mounted', function () {
  })
}
```

### 参考文献
