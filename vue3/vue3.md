# vue3

## composition APi

### 动机

1. 复杂组件的代码随着功能的开发越来越难理解， 特别是当非作者阅读代码时。主要原因时 vue现存的api迫使通过option 去组织代码，但是大多数情况下， 通过逻辑组织代码更合理
2. 在不同组件之前，缺乏干净和低成本的机制去提取和服用逻辑

3. 更好的类型提示：之前methods 方法都是挂在this上的，这给ts识别制造了很多麻烦，很多用户使用vue-class-component去使用ts，但是这种方法必须依赖decorators，它是一个不稳定的2级草案，它的执行细节有许多不确定性，以它为基础会有很大的风险。composition 提示友好，在ts和js中更有辨识度，非ts 用户也能享受到它的好处

### 与mixins 比较

1. 当我们阅读组件时，不知道特定属性是那个mixins 注入的
2. 命名空间冲突

Unclear sources for properties exposed on the render context. For example, when reading the template of a component using multiple mixins, it can be difficult to tell from which mixin a specific property was injected from.

Namespace clashing. Mixins can potentially clash on property and method names, while HOCs can clash on expected prop names.

Performance. HOCs and renderless components require extra stateful component instances that come at a performance cost.

In comparison, with Composition API:

Properties exposed to the template have clear sources since they are values returned from composition functions.

Returned values from composition functions can be arbitrarily named so there is no namespace collision.

There are no unnecessary component instances created just for logic reuse.

### vue3 和 vue2 比较

1. 天然支持ts
2. 当一个组件中使用了多个 mixin 的时候，光看模版会很难分清一个属性到底是来自哪一个 mixin
3. 命名空间冲突。由不同开发者开发的 mixin 无法保证不会正好用到一样的属性或是方法名。HOC 在注入的 props 中也存在类似问题
4. 双向数据绑定优化，该用proxy 能代理对象的访问提供了钩子如set(), get() and deleteProperty()，代码精简，速度提升
5. 区分静态节点，避免重复渲染， 从而大大提高内存使用率并减少垃圾回收的频率。
6. diff 做了缓存机制，之前diff算法，如果是父元素不同的key，子元素直接抛弃，不检查
7. 让复用逻辑更加清晰和简单，让抽取逻辑变得非常简单 —— 就跟在普通的代码中抽取函数一样。也就是说，我们不必只在需要复用逻辑的时候才抽取函数，也可以单纯为了更好地组织代码去抽取函数

### 为什么舍弃decorator

1. ES 的 decorator 提案仍然在 stage-2 且极其不稳定。过去一年内已经经历了两次彻底大改，且和 TS 现有的实现已经完全脱节。现在引入一个基于 TS decorator 实现的 API 风险太大。
2. Decorator 只能声明 class this 上的属性，却无法将某一类 decorator 声明的属性归并到一个对象上（比如 $props)，这就导致 this.$props 无法被推导，且影响 TSX 的使用。
3. 用户很可能会觉得可以用 @prop message: string = 'foo'这样的写法去声明默认值，但事实上技术层面无法做到符合语义的实现。
4. class 还有一个问题，那就是目前 class method 不支持参数的 contextual typing，也就是说我们无法基于 class 本身的 fields 来推导某个 method 的参数类型，需要用户自己去声明

#### Proxy

```js
data = new Proxy(data_without_proxy, {
    get(obj, key) {
        console.log(obj, key)
    },
    set(obj, key, newVal) {
        console.log(obj, key, newVal)
    },
    deleteProperty(obj, key, newVal) {
        console.log(obj, key, newVal)
    }
})
```

### 参考文献

1. <https://zhuanlan.zhihu.com/p/68477600>
