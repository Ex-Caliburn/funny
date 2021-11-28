# 异步组件

## 前言

普通函数异步组件

```js
Vue.component('aa', function(resolve, reject) {
    setTimeout(function() {
        resolve({
            template: '<div><p>{{aa}}<span>{{bb}}</span></p></div>',
            data() {
                return {
                    aa: '欢迎',
                    bb: 'Vue'
                }
            }
        })
    }, 1000)
})

```

Promise 异步组件

```js
Vue.component('aa', () => import('./aa.js') ) 
```

高级异步组件

```js
const aa = () => ({
    // 需要加载的组件。应当是一个 Promise
    component: import('./aa.vue'),
    // 加载中应当渲染的组件
    loading: LoadingComp,
    // 出错时渲染的组件
    error: ErrorComp,
    // 渲染加载中组件前的等待时间。默认：200ms。
    delay: 200,
    // 最长等待时间。超出此时间则渲染错误组件。默认：Infinity
    timeout: 3000
})
Vue.component('aa', aa)
```

### 流程

```js
Ctor = resolveAsyncComponent(asyncFactory, baseCtor);
if (Ctor === undefined) {
    return createAsyncPlaceholder(asyncFactory, data, context, children, tag)
}



function createAsyncPlaceholder(factory, data, context, children, tag) {
    var node = createEmptyVNode();
    node.asyncFactory = factory;
    node.asyncMeta = {
        data: data,
        context: context,
        children: children,
        tag: tag
    };
    return node
}

```

执行resolveAsyncComponent方法后返回一个组件构造函数赋值给Ctor。就这么结束了吗。当然不是了，不知你有没有注意到在Vue.component定义的第二参数中，resolve(//...)外层还有一个setTimeout定时器，是个异步任务。JavaScript 是单线程的，异步任务要等所有同步任务都执行完才能执行。故此时resolveAsyncComponent方法中的resolve函数是不执行，factory.resolved应该为 undefined 。那么Ctor为 undefined ，要执行return createAsyncPlaceholder(asyncFactory, data, context, children, tag)。createAsyncPlaceholder方法是用来创建一个注释节点vnode作为占位符。

```js
function createAsyncPlaceholder(factory, data, context, children, tag) {
    var node = createEmptyVNode();
    node.asyncFactory = factory;
    node.asyncMeta = {
        data: data,
        context: context,
        children: children,
        tag: tag
    };
    return node
}
```

此时createComponent方法生成的一个注释节点vnode，而不是一个组件vnode，那组件要怎么渲染，不着急，再回到resolveAsyncComponent方法中，在 return 之前执行sync = false，在1000ms后resolve函数执行，会执行forceRender(true)，来看一下forceRender函数。

```js
var resolve = once(function(res) {
    factory.resolved = ensureCtor(res, baseCtor);
    if (!sync) {
        forceRender(true);
    } else {
        owners.length = 0;
    }
})
var owner = currentRenderingInstance;
if (owner && isDef(factory.owners) && factory.owners.indexOf(owner) === -1) {
    factory.owners.push(owner);
}
if (owner && !isDef(factory.owners)) {
    var owners = factory.owners = [owner];
    var forceRender = function(renderCompleted) {
        for (var i = 0, l = owners.length; i < l; i++) {
            (owners[i]).$forceUpdate();
        }
        if (renderCompleted) {
            owners.length = 0;
        }
    };
}

```

currentRenderingInstance是使用异步组件的当前 Vue 实例，赋值给owner。
如果同一个异步组件在很多个地方局部注册。这样要重复执行很多次相同的resolve函数。所以在这里做了个优化。
异步组件是以一个工厂函数factory来定义组件，在factory定义一个属性owners，来存储使用异步组件的当前 Vue 实例，也就是调用factory函数的上下文环境。
若owner有值和factory.owners不存在，则说明factory函数是第一次执行。若owner有值和factory.owners有值，则说明factory函数已经执行过了。执行factory.owners.indexOf(owner) === -1判断factory.owners中有没有当前 Vue 实例，若没有，则把当前 Vue 实例添加到factory.owners中。
回到forceRender函数中，执行(owners[i]).$forceUpdate()相当执行vm.$forceUpdate()这个实例方法。这是因为异步组件加载过程中是没有数据发生变化的，所以要通过执行vm.$forceUpdate()迫使 Vue 实例重新渲染一次。

执行vm._watcher.update()相当执行mountComponent方法中的vm._update(vm._render(), hydrating)，在执行vm._render()过程中调用createComponent方法又执行到以下逻辑。

```js
// async component
var asyncFactory;
if (isUndef(Ctor.cid)) {
    asyncFactory = Ctor;
    Ctor = resolveAsyncComponent(asyncFactory, baseCtor);
    if (Ctor === undefined) {
        return createAsyncPlaceholder(asyncFactory, data, context, children, tag)
    }
}
```

再次执行resolveAsyncComponent(asyncFactory, baseCtor)时，1000ms已过，故异步组件注册的工厂函数factory中的resolve函数已经执行完毕，故factory.resolved有值，直接返回factory.resolved。

```js
function resolveAsyncComponent(factory, baseCtor) {
    if (isDef(factory.resolved)) {
        return factory.resolved
    }
}
```

返回值factory.resolved是一个异步组件构造函数赋值给Ctor，Ctor的值获取到后，生成组件vnode，再执行vm._update，进入 patch 过程，把原先生成的组件占位注释节点替换成真正的组件 DOM 内容 ，这里不介绍组件更新的 patch 过程，后续会开一个单章来介绍。到这里普通函数异步组件的使用原理介绍完毕，下面来介绍Promise 异步组件的使用原理。

## 总结

1. () => import('./aa.js') 产生一个promise
2. 创建一个注释节点vnode
3. 等待一部完成 继续渲染

### 参考文献

1. <https://juejin.cn/post/6880152826803290119#heading-2>
