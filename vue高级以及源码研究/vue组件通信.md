# 组件通信

## 前言

这个经常会遇到，比较下，各组件通信的优劣

### prop

最基本的父子组件通信方式，但是跨二层组件以上，就不太好

### eventBus

兄弟组件沟通方式，耦合性太强

export const EventBus = new Vue()

export const EventName = {
  RESET_MAIN_AREA: 'RESET_MAIN_AREA',
}

EventBus.$on(EventName.RESET_MAIN_AREA)
EventBus.$off(EventName.RESET_MAIN_AREA)

### vuex

大型数据响应式管理，方便管理，统一存放
缺点： 太重， 耦合性强，如果您不打算开发大型单页应用，使用 Vuex 可能是繁琐冗余的

### $parents, $children

直接访问自己父组件和子组件
$parents： 只有一个
$children：是一个数组

### provide inject

provide 选项允许我们指定我们想要提供给后代组件的数据/方法

```vue
<google-map>
  <google-map-region v-bind:shape="cityBoundaries">
    <google-map-markers v-bind:places="iceCreamShops"></google-map-markers>
  </google-map-region>
</google-map>
```

provide 选项允许我们指定我们想要提供给后代组件的数据/方法。在这个例子中，就是 <google-map> 内部的 getMap 方法：

```vue
provide: function () {
  return {
    getMap: this.getMap
  }
}
```

然后在任何后代组件里，我们都可以使用 inject 选项来接收指定的我们想要添加在这个实例上的 property：

```vue
inject: ['getMap']
```

你可以在这里看到完整的示例。相比 $parent 来说，这个用法可以让我们在任意后代组件中访问 getMap，而不需要暴露整个 <google-map> 实例。这允许我们更好的持续研发该组件，而不需要担心我们可能会改变/移除一些子组件依赖的东西。同时这些组件之间的接口是始终明确定义的，就和 props 一样。

你可以把依赖注入看作一部分“大范围有效的 prop”，除了：

    祖先组件不需要知道哪些后代组件使用它提供的 property
    后代组件不需要知道被注入的 property 来自哪里

## 总结

父子通信有多种，看具体场景，适合当前业务的

### 参考文献

1. <https://cn.vuejs.org/v2/guide/components-edge-cases.html#%E4%BE%9D%E8%B5%96%E6%B3%A8%E5%85%A5>
