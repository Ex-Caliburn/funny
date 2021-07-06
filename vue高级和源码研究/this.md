# this

## 前言

this 之前记得都是碎片的知识，而且不完整，总结归纳所有情况

1. this谁调用是谁
2. call，bind， apply区别
3. 浏览器环境和node 环境的区别
4. 箭头函数this指向外部函数

### 浏览器

```js
console.log(this)  // window


let a = function() {
    console.log(this) // window
}
a()


let module = {
  x: 42,
  y: 42,
  getX: function() {
    console.log(this)
    return this.x;
  },
  getY() {
    console.log(this)
    return this.y;
  },
}
console.log(module.getX(), module.getY())

let unboundGetX = module.getX;
console.log(unboundGetX()) // window undefined
```

#### 全局上下文

无论是否在严格模式下，在全局执行环境中（在任何函数体外部）this 都指向全局对象。

// 在浏览器中, window 对象同时也是全局对象：

```js
console.log(this === window); // true
```

#### 函数上下文

在函数内部，this的值取决于函数被调用的方式。

因为下面的代码不在严格模式下，且 this 的值不是由该调用设置的，所以 this 的值默认指向全局对象，浏览器中就是 window。

```js
function f1(){
  return this;
}
//在浏览器中：
f1() === window;   //在浏览器中，全局对象是window

//在Node中：
f1() === globalThis;
```

然而，在严格模式下，如果进入执行环境时没有设置 this 的值，this 会保持为 undefined，如下：

#### 类上下文

this 在 类 中的表现与在函数中类似，因为类本质上也是函数，但也有一些区别和注意事项。

在类的构造函数中，this 是一个常规对象。类中所有非静态的方法都会被添加到 this 的原型中：

```js

class Example {
  constructor() {
    const proto = Object.getPrototypeOf(this);
    console.log(Object.getOwnPropertyNames(proto));
  }
  first(){}
  second(){}
  static third(){}
}

new Example(); // ['constructor', 'first', 'second']
```

注意：静态方法不是 this 的属性，它们只是类自身的属性。

#### 作为一个DOM事件处理函数

当函数被用作事件处理函数时，它的 this 指向触发事件的元素（一些浏览器在使用非 addEventListener 的函数动态地添加监听函数时不遵守这个约定）。

```js
// 被调用时，将关联的元素变成蓝色
function bluify(e){
  console.log(this === e.currentTarget); // 总是 true

  // 当 currentTarget 和 target 是同一个对象时为 true
  console.log(this === e.target);
  this.style.backgroundColor = '#A5D9F3';
}

// 获取文档中的所有元素的列表
var elements = document.getElementsByTagName('*');

// 将bluify作为元素的点击监听函数，当元素被点击时，就会变成蓝色
for(var i=0 ; i<elements.length ; i++){
  elements[i].addEventListener('click', bluify, false);
}
```

#### 作为一个内联事件处理函数

当代码被内联 on-event 处理函数 调用时，它的this指向监听器所在的DOM元素：

```js
<button onclick="alert(this.tagName.toLowerCase());">
  Show this
</button>
```

上面的 alert 会显示 button。注意只有外层代码中的 this 是这样设置的：

```js
<button onclick="alert((function(){return this})());">
  Show inner this
</button>
```

在这种情况下，没有设置内部函数的 this，所以它指向 global/window 对象（即非严格模式下调用的函数未设置 this 时指向的默认对象）。

#### 派生类

不像基类的构造函数，派生类的构造函数没有初始的 this 绑定。在构造函数中调用 super() 会生成一个 this 绑定，并相当于执行如下代码，Base为基类：

```js
this = new Base();
```

警告：在调用 super() 之前引用 this 会抛出错误。

派生类不能在调用 super() 之前返回，除非其构造函数返回的是一个对象，或者根本没有构造函数。

```js
class Base {}
class Good extends Base {}
class AlsoGood extends Base {
  constructor() {
    return {a: 5};
  }
}
class Bad extends Base {
  constructor() {}
}

new Good();
new AlsoGood();
new Bad(); // ReferenceError
```

### use strict

'use strict';
之前this默认指向window都会变成undefined

### bind call apply区别

bind() 方法创建一个新的函数，在 bind() 被调用时，这个新函数的 this 被指定为 bind() 的第一个参数，而其余参数将作为新函数的参数，供调用时使用。
调用f.bind(someObject)会创建一个与f具有相同函数体和作用域的函数，但是在这个新函数中，this将永久地被绑定到了bind的第一个参数，无论这个函数是如何被调用的。

```js
let module = {
  x: 42,
  y: 42,
  getX: function() {
    console.log(this)
    return this.x;
  },
  getY() {
    console.log(this)
    return this.y;
  },
}
console.log(module.getX(), module.getY())

let unboundGetX = module.getX;
console.log(unboundGetX().bind(module)) // module 42
```

call,apply, 调用一次，将this的指向，第一个参数，第二个参数，就是参数类型不一样，apply 是 数组，call单个数组

### 箭头函数

箭头函数和 普通函数

```js
 obj = {c:1}
let a = () => {
     console.log(this) //undefined 指向最外部，实际调用 a.call(obj)，bind, call，apply 无法改变 arrow function的指向
     return {}
 }
a.bind(obj)()

let b = function() {
     console.log(this) //undefined 指向最外部，实际调用 a.call(obj)，call，apply 无法改变 arrow function的指向
     return {}
 }

```

通过 call 或 apply 调用
由于 箭头函数没有自己的this指针，通过 call() 或 apply() 方法调用一个函数时，只能传递参数（不能绑定this---译者注），他们的第一个参数会被忽略。（这种现象对于bind方法同样成立）

## 总结

### 参考文献
