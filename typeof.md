# typeof

## 前言

typeof null  === 'object' // 为什么?

### typeof 官方解释

1. Let val be the result of evaluating UnaryExpression.
2. If Type(val) is Reference, then
3. If IsUnresolvableReference(val) is true, return "undefined".
4. Let val be GetValue(val).
5. ReturnIfAbrupt(val). //  One of normal, break, continue, return, or throw
6. Return a String according to 下表.

| Type of val | Result |
| :-----| ----: |
|Undefined |"undefined"|
|Null| "object"|
|Boolean |"boolean"|
|Number |"number"|
|String |"string"|
|Symbol| "symbol"|
|Object (ordinary and does not implement [[Call]]) |"object"|
|Object (standard exotic and does not implement [[Call]]) | "object"|
|Object (implements [[Call]])| "function"|
|Object (non-standard exotic and does not implement [[Call]]) | Implementation-defined. Must not be "undefined", "boolean", "function", "number", "symbol", or "string".|

### NOTE

Implementations are discouraged from defining new typeof result values for non-standard exotic objects. If possible "object"should be used for such objects.
不鼓励typeof为非标准奇异对象定义新的结果值的实现。如果可能的话，"object"应使用此类物体

### 历史原因

带着这个问题，我们来看一点 JavaScript 的历史。
大家都知道 "typeof null" 的 bug，它是在 JavaScript 的第一版就存在的。在这个版本中，值以 32 位的单位存储，包括一个小型类型标记（1-3 位）和值的实际数据。类型标记存储在单元的较低位上。一共有 5 种类型：

000: object，表示这个数据是一个对象的引用。
1: int，表示这个数据是一个 31 位的有符号整型。
010: double，表示这个数据是一个双精度浮点数的引用。
100: string，表示这个数据是一个字符串的引用。
110: boolean，表示这个数据是一个布尔值。

两个值比较特殊：

undefined (JSVAL_VOID) 的值是 −2^30 整型（一个超出整型范围的数）。

null (JSVAL_NULL) 是机器码空指针。或者是：一个对象类型标记加上一个为0的引用。详情参考下面的源码。

现在应该很清楚为什么 typeof 认为 null 是一个对象了：它检查了类型标记和类型标记表示的对象。

## 总结

1、typeof null 返回 "object"，是因为 JS 内部把值的低位为 0x0 的标记定义成对象类型，而 null 被计算成了一个低位具有对象类型标记的值，所以就返回了 "object"；
2、typeof 返回 "function"，只要一个对象有一个不为 0 的 call 属性/方法，或者是 js_FunctionClass 类型，也就是这个对象里面有 "Function" 标记，那么就返回 "function"，其它情况都返回 "object"；

## ES6 是如何解释的

我们再来看一下现在 ES6 的 typeof 是如何对待函数和对象类型的：

如果一个对象（Object）没有实现 [[Call]] 内部方法，那么它就返回 object
如果一个对象（Object）实现了 [[Call]] 内部方法，那么它就返回 function

这跟源码中是否存在 call 很类似。

## [[Call]] 是什么

执行与此对象关联的代码。通过函数调用表达式调用。内部方法的参数是一个 this 值和一个包含调用表达式传递给函数的参数的列表。实现此内部方法的对象是可调用的。

这是翻译的原话，简单点说，一个对象如果支持了内部的 [[Call]] 方法，那么它就可以被调用，就变成了函数，所以叫做函数对象。
相应地，如果一个函数对象支持了内部的 [[Construct]] 方法，那么它就可以使用 new 或 super 来调用，这时我们就可以把这个函数对象称为：构造函数。

### 参考文献

1. <https://juejin.im/post/5df3d255f265da33f030237e#heading-10>
2. <https://2ality.com/2013/10/typeof-null.html>
3. <http://www.ecma-international.org/ecma-262/6.0/#sec-typeof-operator>
