# watcher和compute的区别

## 前言

![alt](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2019/8/28/16cd84f0f6fe4f13~tplv-t2oaga2asx-watermark.awebp)

官方没有分类
我觉得可以分为3类

1. user-watcher
2. render-watcher
3. computed-watcher

### watch

```js
$watch
{string | Function} source
{Function | Object} callback
{Object} [options]
    {boolean} deep
    {boolean} immediate
    {string} flush
```

选项：flush

flush 选项可以更好地控制回调的时间。它可以设置为 'pre'、'post' 或 'sync'。

默认值是 'pre'，指定的回调应该在渲染前被调用。它允许回调在模板运行前更新了其他值。

'post' 值是可以用来将回调推迟到渲染之后的。如果回调需要通过 $refs 访问更新的 DOM 或子组件，那么则使用该值。

如果 flush 被设置为 'sync'，一旦值发生了变化，回调将被同步调用。

对于 'pre' 和 'post'，回调使用队列进行缓冲。回调只被添加到队列中一次，即使观察值变化了多次。值的中间变化将被跳过，不会传递给回调。

缓冲回调不仅可以提高性能，还有助于保证数据的一致性。在执行数据更新的代码完成之前，侦听器不会被触发。

'sync' 侦听器应少用，因为它们没有这些好处。

### 副作用刷新时机

Vue 的响应性系统会缓存副作用函数，并异步地刷新它们，这样可以避免同一个“tick” 中多个状态改变导致的不必要的重复调用。在核心的具体实现中，组件的 update 函数也是一个被侦听的副作用。当一个用户定义的副作用函数进入队列时，默认情况下，会在所有的组件 update 前执行：

```vue
<template>
  <div>{{ count }}</div>
</template>

<script>
export default {
  setup() {
    const count = ref(0)

    watchEffect(() => {
      console.log(count.value)
    })

    return {
      count
    }
  }
}
</script>
```

在这个例子中：

count 会在初始运行时同步打印出来
更改 count 时，将在组件更新前执行副作用。
如果需要在组件更新(例如：当与模板引用一起)后重新运行侦听器副作用，我们可以传递带有 flush 选项的附加 options 对象 (默认为 'pre')：

// 在组件更新后触发，这样你就可以访问更新的 DOM。
// 注意：这也将推迟副作用的初始运行，直到组件的首次渲染完成。

```vue
watchEffect(
  () => {
    /*...*/
  },
  {
    flush: 'post'
  }
)
```

flush 选项还接受 sync，这将强制效果始终同步触发。然而，这是低效的，应该很少需要。

这里说明了为什么watch和this.$watch的实现是一致的，以及简单解释它的原理就是为需要观察的数据创建并收集user-watcher，当数据改变时通知到user-watcher将新值和旧值传递给用户自己定义的回调函数。最后分析了定义watch时会被使用到的三个参数：sync、immediate、deep它们的实现原理。简单说明它们的实现原理就是：sync是不将watcher加入到nextTick队列而同步的更新、immediate是立即以得到的值执行一次回调函数、deep是递归的对它的子值进行依赖收集。

### computed

这里还是按照惯例，将定义的computed属性的每一项使用Watcher类进行实例化，不过这里是按照computed-watcher的形式，来看下如何实例化的：

![alt](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2019/8/29/16cd933ab474c866~tplv-t2oaga2asx-watermark.awebp)

```vue
<p>{{ calculateBooksMessage() }}</p>
// 在组件中
methods: {
  calculateBooksMessage() {
    return this.author.books.length > 0 ? 'Yes' : 'No'
  }
}
```

我们可以将同一函数定义为一个方法而不是一个计算属性。两种方式的最终结果确实是完全相同的。然而，不同的是计算属性是基于它们的响应依赖关系缓存的。计算属性只在相关响应式依赖发生改变时它们才会重新求值。这就意味着只要 author.books 还没有发生改变，多次访问 publishedBookMessage 计算属性会立即返回之前的计算结果，而不必再次执行函数。

这也同样意味着下面的计算属性将不再更新，因为 Date.now () 不是响应式依赖：

```vue
computed: {
  now() {
    return Date.now()
  }
}
```

相比之下，每当触发重新渲染时，调用方法将总会再次执行函数。

我们为什么需要缓存？假设我们有一个性能开销比较大的计算属性 list，它需要遍历一个巨大的数组并做大量的计算。然后我们可能有其他的计算属性依赖于 list。如果没有缓存，我们将不可避免的多次执行 list 的 getter！如果你不希望有缓存，请用 method 来替代。

为什么 computed 有缓存？
    this.dirty = this.lazy  // dirty为标记位，表示是否对computed计算

```js
Watcher.prototype.update = function update () {
  /* istanbul ignore else */
  if (this.lazy) {
    this.dirty = true;
  } else if (this.sync) {
    this.run();
  } else {
    queueWatcher(this);
  }
};

/**
 * Evaluate the value of the watcher.
 * This only gets called for lazy watchers.
 */
Watcher.prototype.evaluate = function evaluate () {
  this.value = this.get();
  this.dirty = false;
};

function createComputedGetter (key) {
  return function computedGetter () {
    var watcher = this._computedWatchers && this._computedWatchers[key];
    if (watcher) {
      if (watcher.dirty) {
        watcher.evaluate();
      }
      if (Dep.target) {
        watcher.depend();
      }
      return watcher.value
    }
  }
}
var computedWatcherOptions = { lazy: true };

function initComputed (vm, computed) {
  var watchers = vm._computedWatchers = Object.create(null);

  for (var key in computed) {
    var userDef = computed[key];
    var getter = typeof userDef === 'function' ? userDef : userDef.get;

    // create internal watcher for the computed property.
    watchers[key] = new Watcher(
    vm,
    getter || noop,
    noop,
    computedWatcherOptions
    );

    // component-defined computed properties are already defined on the
    // component prototype. We only need to define computed properties defined
    // at instantiation here.
    if (!(key in vm)) {
      defineComputed(vm, key, userDef);
    }
  }
}
```

## 总结

使用 watch 选项允许我们执行异步操作 (访问一个 API)，限制我们执行该操作的频率，并在我们得到最终结果前，设置中间状态。这些都是计算属性无法做到的。

虽然计算属性在大多数情况下更合适，但有时也需要一个自定义的侦听器。这就是为什么 Vue 通过 watch 选项提供了一个更通用的方法，来响应数据的变化。当需要在数据变化时执行异步或开销较大的操作时，这个方式是最有用的。

```js
function createComputedGetter (key) {
  return function computedGetter () {
    var watcher = this._computedWatchers && this._computedWatchers[key];
    if (watcher) {
      if (watcher.dirty) {
        watcher.evaluate();
      }
      if (Dep.target) {
        watcher.depend();
      }
      return watcher.value
    }
  }
}
```

computed 因为是即时求值,不能使用异步
 watcher.evaluate();
  return watcher.value

### 参考文献

1. <https://juejin.cn/post/6844903926819454983>
2. <https://v3.cn.vuejs.org/api/instance-methods.html#watch>
3. <https://v3.cn.vuejs.org/guide/computed.html#%E8%AE%A1%E7%AE%97%E5%B1%9E%E6%80%A7%E7%BC%93%E5%AD%98-vs-%E6%96%B9%E6%B3%95>
