# this

## 前言

为什么 myName 不是"time.geekbang.com" ?

```js
var bar = {
    myName:"time.geekbang.com",
    printName: function () {
        console.log(myName)
    }    
}
let myName = "极客邦";
bar.printName()

```

不过按照常理来说，调用bar.printName方法时，该方法内部的变量 myName 应该使用 bar 对象中的，因为它们是一个整体，大多数面向对象语言都是这样设计的

所以在对象内部的方法中使用对象内部的属性是一个非常普遍的需求。但是 JavaScript 的作用域机制并不支持这一点，基于这个需求，JavaScript 又搞出来另外一套 this 机制。

作用域链和 this 是两套不同的系统，它们之间基本没太多联系。

除了在全局 非严格模式下 this指向 window 和 作用域指向window 有共同之处

### 缺陷

#### 嵌套函数中的 this 不会从外层函数中继承

嵌套函数中的 this 不会从外层函数中继承我认为这是一个严重的设计错误，并影响了后来的很多开发者，让他们“前赴后继”迷失在该错误中。如开头所示

```js
var myObj = {
  name: '极客时间',
  showThis: function () {
    console.log(this)
    function bar() {
      console.log(this)
    }
    bar()
  }
}
myObj.showThis()
```

如果你是刚接触 JavaScript，那么你可能会很自然地觉得，bar 中的 this 应该和其外层 showThis 函数中的 this 是一致的，都是指向 myObj 对象的，这很符合人的直觉。但实际情况却并非如此，执行这段代码后，你会发现函数 bar 中的 this 指向的是全局 window 对象，而函数 showThis 中的 this 指向的是 myObj 对象。这就是 JavaScript 中非常容易让人迷惑的地方之一，也是很多问题的源头。

即便我没有学习其他java 面对对象语言，很多次我再看到还是犯了相同的错误，我要深深的记在脑海里

#### 普通函数中的 this 默认指向全局对象

 window上面我们已经介绍过了，在默认情况下调用一个函数，其执行上下文中的 this 是默认指向全局对象 window 的。

 不过这个设计也是一种缺陷，因为在实际工作中，我们并不希望函数执行上下文中的 this 默认指向全局对象，因为这样会打破数据的边界，造成一些误操作。如果要让函数执行上下文中的 this 指向某个对象，最好的方式是通过 call 方法来显示调用。

 这个问题可以通过设置 JavaScript 的“严格模式”来解决。在严格模式下，默认执行一个函数，其函数的执行上下文中的 this 值是 undefined，这就解决上面的问题了。

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

然而，在严格模式下，如果进入执行环境时没有设置 this 的值，this 会保持为 undefined

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

this 之前记得都是碎片的知识，而且不完整，总结归纳常用情况

1. this谁调用是谁
2. call，bind， apply区别
3. 浏览器环境和node 环境的区别
4. 箭头函数this指向外部函数
5. new 构造函数中的this
6. 严格模式下的this 值是 undefined

### 练习

```js
let userInfo = {
  name: 'jack.ma',
  age: 13,
  sex: 'male',
  updateInfo: function () {
    setTimeout(function () {
      this.name = 'pony.ma'
      this.age = 39
      this.sex = 'female'
    }, 100)
  }
}
userInfo.updateInfo()
```

我想通过 updateInfo 来更新 userInfo 里面的数据信息，但是这段代码存在一些问题，你能修复这段代码吗？

1. 剪头函数
2. bing， call， apply
3. _this 缓存 this

```js
let userInfo = {
  name: 'jack.ma',
  age: 13,
  sex: 'male',
  updateInfo: function () {
    setTimeout(function () {
      this.name = 'pony.ma'
      this.age = 39
      this.sex = 'female'
    }.bing(this), 100)
  }
}
userInfo.updateInfo()

let userInfo = {
  name:"jack.ma",
  age:13,
  sex:'male',
  update: function() {
    this.name = "pony.ma"
    this.age = 39
    this.sex = 'female'
  },
  updateInfo:function(){
    setTimeout(this.update.bind(this), 100)
  }
}

let userInfo = {
  name: "jack.ma",
  age: 13,
  sex: "male",
  updateInfo: function () {
    setTimeout(function (_this) {
      console.log(_this.name)
    }, 100, this)
  }
}

userInfo.updateInfo()
```

### 参考文献
