# vuex

## 前言

Vuex 是一个专为 Vue.js 应用程序开发的状态管理模式。它采用集中式存储管理应用的所有组件的状态，并以相应的规则保证状态以一种可预测的方式发生变化

### 表现

vuex 实现 $store挂在每个vue实例下面

```js
    Vue.use(Vuex)
    // 实际调用 `Vuex.install(Vue)`
```

源码

```js
    function install (_Vue) {
    if (Vue &&_Vue === Vue) {
      {
        console.error(
          '[vuex] already installed. Vue.use(Vuex) should be called only once.'
        );
      }
      return
    }
    Vue = _Vue;
    applyMixin(Vue);
  }

```

### 实现

vuex的store是如何挂载注入到组件中呢？

```javascript
    // 1. 先初始化
    export default new Vuex.Store({
    app,
    getters,
    })

    // 2. 注入 store 绑定在 this.$options 上
    new Vue({
        router,
        store,
        render: h => h(App)
    }).$mount('#app')

    function Vue (options) {
        // ...省略
        this._init(options);
    }

    function initMixin (Vue) {
  Vue.prototype._init = function (options) {
    // ...省略
    // 组件用
    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      initInternalComponent(vm, options);
    } else {
    // vue 首次初始化$options， store 绑定在 this.$options 上
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      );
    }
            // ...省略
  };
}

      Vue.mixin({ beforeCreate: vuexInit });

     // 初始化钩子，在每个实例初始化 beforeCreate 的时候注入vuex
    function vuexInit () {
      var options = this.$options;
      // store injection store 绑定在root vue 上，子孙组件都是引用同一份store
      if (options.store) {
        this.$store = typeof options.store === 'function'
          ? options.store()
          : options.store;
      } else if (options.parent && options.parent.$store) {
        this.$store = options.parent.$store;
      }
    }

```

### 数据绑定

```js
    // 初始化 store vm, 数据绑定
    var state = this._modules.root.state; // state的引用
  resetStoreVM(this, state); // this: 是指 this.options.$store

  function resetStoreVM (store, state, hot) {
  var oldVm = store._vm;

  // 绑定全局 getters
  store.getters = {};
  var wrappedGetters = store._wrappedGetters;
  var computed = {};
  forEachValue(wrappedGetters, function (fn, key) {
    // use computed to leverage its lazy-caching mechanism
    // direct inline function use will lead to closure preserving oldVm.
    // using partial to return function with only arguments preserved in closure environment.
    // 计算函数保存子啊闭包环境下
    computed[key] = partial(fn, store);
    // 数据绑定， 实际访问的是 store._vm 上的值
    Object.defineProperty(store.getters, key, {
      get: function () { return store._vm[key]; },
      enumerable: true // for local getters
    });
  });

  // use a Vue instance to store the state tree
  // suppress warnings just in case the user has added
  // some funky global mixins
  var silent = Vue.config.silent;
  Vue.config.silent = true;
  // 保存的state引用，利用vue计算属性，实现数据双向绑定，state变化，computed也会更新
  store._vm = new Vue({
    data: {
      $$state: state
    },
    computed: computed
  });
  Vue.config.silent = silent;

  // enable strict mode for new vm
  if (store.strict) {
    enableStrictMode(store);
  }

  if (oldVm) {
    if (hot) {
      // dispatch changes in all subscribed watchers
      // to force getter re-evaluation for hot reloading.
      store._withCommit(function () {
        oldVm._data.$$state = null;
      });
    }
    Vue.nextTick(function () { return oldVm.$destroy(); });
  }
}

// 保存运行函数环境
function partial (fn, arg) {
  return function () {
    return fn(arg)
  }
}
```

### subscribe

```js

subscribe(handler: Function): Function
```

订阅 store 的 mutation。handler 会在每个 mutation 完成后调用，接收 mutation 和经过 mutation 后的状态作为参数：

```js
store.subscribe((mutation, state) => {
  console.log(mutation.type)
  console.log(mutation.payload)
})
```

要停止订阅，调用此方法返回的函数即可停止订阅。

## 总结

vuex

### 参考文献

1. <https://vuex.vuejs.org/zh/api/#subscribe>
