# vue生命周期

## 前言

parent 和 child 生命周期渲染过程有什么区别
我以为是父组件事件权调用完，然后调用子组件，事实在啪啪打脸

```html
<parent>
    <child/>  
</parent>
```

### 加载顺序如下

    beforeCreate parent
    created parent
    beforeMount parent
    beforeCreate child
    created child
    beforeMount child
    mounted child
    mounted parent

### 销毁顺序

    beforeDestroy parent
    beforeDestroy child
    destroyed child
    destroyed parent

### 看了源码

```
    var LIFECYCLE_HOOKS = [
    'beforeCreate',
    'created',
    'beforeMount',
    'mounted',
    'beforeUpdate',
    'updated',
    'beforeDestroy',
    'destroyed',
    'activated',
    'deactivated',
    'errorCaptured',
    'serverPrefetch'
    ];

    initLifecycle(vm) // 初始化生命周期状态
    initEvents(vm) // 初始事件
    initRender(vm) // 初始选染
    // 自定义重定向 校验参数 路由权限 vuex初始化就是在 beforeCreate干的
    callHook(vm, 'beforeCreate') // beforeCreate 能访问实例，但是访问不到实例上的 data prop
    initInjections(vm) // resolve injections before data/props
    initState(vm) // 初始化 data/props/methods/computed/watch
    initProvide(vm) // resolve provide after data/props
    callHook(vm, 'created') // created

    // 最外层
    if (vm.$options.el) {
        vm.$mount(vm.$options.el)
    }

```

## 总结

### 参考文献
