# with

## 前言

javaScript查找某个未使用命名空间的变量时，会通过作用域链来查找，作用域链是跟执行代码的context或者包含这个变量的函数有关。'with'语句將某个对象添加到作用域链的顶部，如果在statement中有某个未使用命名空间的变量，跟作用域链中的某个属性同名，则这个变量将指向这个属性值。如果沒有同名的属性，则将拋出ReferenceError异常。

不推荐使用with，在 ECMAScript 5 严格模式中该标签已被禁止。推荐的替代方案是声明一个临时变量来承载你所需要的属性。

### 性能方面的利与弊

利：with语句可以在不造成性能损失的情況下，减少变量的长度。其造成的附加计算量很少。使用'with'可以减少不必要的指针路径解析运算。需要注意的是，很多情況下，也可以不使用with语句，而是使用一个临时变量来保存指针，来达到同样的效果。

弊：with语句使得程序在查找变量值时，都是先在指定的对象中查找。所以那些本来不是这个对象的属性的变量，查找起来将会很慢。如果是在对性能要求较高的场合，'with'下面的statement语句中的变量，只应该包含这个指定对象的属性。

### 语义不明的弊端

弊端：with语句使得代码不易阅读，同时使得JavaScript编译器难以在作用域链上查找某个变量，难以决定应该在哪个对象上来取值。请看下面的例子：

```js

function f(x, o) {
  with (o)
    console.log(x)
}
f(undefined,2) // undefined
f(1,2) // 1
f(1,{x: 3}) // 3

```

f被调用时，x有可能能取到值，也可能是undefined，如果能取到, 有可能是在o上取的值，也可能是函数的第一个参数x的值（如果o中没有这个属性的话）。如果你忘记在作为第二个参数的对象o中定义x这个属性，程序并不会报错，只是取到另一个值而已。

弊端：使用with语句的代码，无法向前兼容，特別是在使用一些原生数据类型的时候。看下面的例子：

```js

function f(foo, values) {
    with (foo) {
        console.log(values)
    }
}
f([1,2,3], {})
```

如果是在ECMAScript 5环境调用f([1,2,3], obj)，则with语句中变量values将指向函数的第二个参数values。但是，ECMAScript 6标准给Array.prototype添加了一个新属性values，所有数组实例将继承这个属性。所以在ECMAScript 6环境中，with语句中变量values将指向[1,2,3].values。

```js
let qs = location.search.substring(1);
    let hostName = location.hostname;
    let url = location.href;

with (location){
    let qs = search.substring(1);
    let hostName = hostname;
    let url = href;
  }
```

### 为什么vue 模版渲染使用with

1. `with` 不允许在严格模式下或者ES2015某块内使用，但这并不意味着它已被弃用或它是无效的
2. `with`大大简化了编译器，而无需进行表达式解析/重写和范围分析。这样就可以使编译器最小为`6kb min+gzipped`
3. 除非捆绑程序将整个应用程序捆绑程序包装在“使用严格”功能范围内，否则 `with`的存在不会引起任何问题。实际上，它在官方的`vue-cli` `webpack`模板中可以正常工作。因此

## 总结

弄懂来龙去脉，才能更好的理解

### 参考文献

1. <https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Statements/with>
2. <https://github.com/vuejs/vue/issues/3923>
