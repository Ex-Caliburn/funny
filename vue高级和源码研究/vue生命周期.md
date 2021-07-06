# vue生命周期

## 前言

parent 和 child 生命周期渲染过程有什么区别
我以为是父组件事件权调用完，然后调用子组件，事实在啪啪打脸

```html
<parent>
    <child>
        <grandson>
        </grandson>  
    </child>  
</parent>
```

### 加载顺序如下

```
 beforeCreate
 created
 beforeMount
 Child beforeCreate
 Child created
 Child beforeMount
 grandson beforeCreate
 grandson created
 grandson beforeMount
 grandson mounted
 Child mounted
 mounted
```

  源码中运行步骤

```
    new Vue
    parent 完成
    Vue.prototype._init
    beforeCreate
    created
    beforeMount

    $mount // 首次挂载触发
    mountComponent
    new Watcher(根组件)
    触发Watcher 的get()
    updateComponent
    vm._update(vm._render(), hydrating);
    vm.__patch__(vm.$el, vnode, hydrating, false /* removeOnly */);
    createElm
    createChildren(vnode, children, insertedVnodeQueue);
    createElm
    createComponent (vnode, insertedVnodeQueue, parentElm, refElm)
    组件init
    createComponentInstanceForVnode
    new vnode.componentOptions.Ctor(options)
    this._init(options); // Vue.extend 中
    Vue.prototype._init
    完成子组件的
    beforeCreate
    created
    beforeMount
    child.$mount(hydrating ? vnode.elm : undefined, hydrating);
    $mount
    mountComponent
    // 又开始了，循环往复，一直到最底层的树枝组件
    invokeCreateHooks
     if (isDef(i.insert)) { insertedVnodeQueue.push(vnode); }
    invokeInsertHook(vnode, insertedVnodeQueue, isInitialPatch); // 触发子组件的insert ，也就是mounted
    for (var i = 0; i < queue.length; ++i) {
          queue[i].data.hook.insert(queue[i]);
        }
    insert
     callHook(componentInstance, 'mounted');
```

### 销毁顺序

```
    beforeDestroy parent
    beforeDestroy child
    destroyed child
    destroyed parent
```

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
