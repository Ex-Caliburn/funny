## composition APi

### 动机
1. 复杂组件的代码随着功能的开发越来越难理解， 特别是当非作者阅读代码时。主要原因时 vue现存的api迫使通过option 去组织代码，但是大多数情况下， 通过逻辑组织代码更合理
2. 在不同组件之前，缺乏干净和低成本的机制去提取和服用逻辑

3. 更好的类型提示：之前methods 方法都是挂在this上的，这给ts识别制造了很多麻烦，很多用户使用vue-class-component去使用ts，但是这种方法必须依赖decorators，它是一个不稳定的2级草案，它的执行细节有许多不确定性，以它为基础会有很大的风险。composition 提示友好，在ts和js中更有辨识度，非ts 用户也能享受到它的好处
4. 


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

#Usage Alongside Existing API

### 参考文献