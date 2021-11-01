# babel

## 前言

Babel 是一个 JavaScript 编译器。他把最新版的javascript编译成当下可以执行的版本，简言之，利用babel就可以让我们在当前的项目中随意的使用这些新最新的es6，甚至es7的语法。

### Babel担任的角色

起初，JavaScript 与服务器语言不同，它没有办法保证对每个用户都有相同的支持，因为用户可能使用支持程度不同的浏览器（尤其是旧版本的 Internet Explorer）。如果开发人员想要使用新语法（例如 class A {}），旧浏览器上的用户只会因为 SyntaxError 的错误而出现屏幕空白的情况。

Babel 为开发人员提供了一种使用最新 JavaScript 语法的方式，同时使得他们不必担心如何进行向后兼容，如（class A {} 转译成 var A = function A() {}）。

由于它能转译 JavaScript 代码，它还可用于实现新的功能：因此它已成为帮助 TC39（制订 JavaScript 语法的委员会）获得有关 JavaScript 提案意见反馈的桥梁，并让社区对语言的未来发展发表自己的见解。

Babel 如今已成为 JavaScript 开发的基础。GitHub 目前有超过 130 万个仓库依赖 Babel，每月 npm 下载量达 1700 万次，还拥有数百个用户，其中包括许多主要框架（React，Vue，Ember，Polymer）以及著名公司（Facebook，Netflix，Airbnb）等。它已成为 JavaScript 开发的基础，许多人甚至不知道它正在被使用。即使你自己没有使用它，但你的依赖很可能正在使用 Babel。

### Babel的运行原理

![alt](https://mmbiz.qpic.cn/mmbiz_png/Z6bicxIx5naIHzTVz2UnkrzvJvoS4sziaib2UwOBUvQVlmnTwm3icOWicxHibqibMqebWwkWCbdOZIO7p89rQUF6ficJXA/640?wx_fmt=png&tp=webp&wxfrom=5&wx_lazy=1&wx_co=1)

解析步骤接收代码并输出 AST。这个步骤分为两个阶段：词法分析（Lexical Analysis） 和 语法分析（Syntactic Analysis）。

#### 词法分析

词法分析阶段把字符串形式的代码转换为 `令牌（tokens）` 流。

你可以把令牌看作是一个扁平的语法片段数组：

```js
n * n

[
  {
    type: { ...},
    value: 'n',
    start: 0,
    end: 1,
    loc: { ...}
  },

  {
    type: { ...},
    value: '*',
    start: 2,
    end: 3,
    loc: { ...}
  },

  {
    type: { ...},
    value: 'n',
    start: 4,
    end: 5,
    loc: { ...}
  }
]
```

每一个 type 有一组属性来描述该令牌：

```

a = {
  type: {
    label: 'name',
    keyword: undefined,
    beforeExpr: false,
    startsExpr: true,
    rightAssociative: false,
    isLoop: false,
    isAssign: false,
    prefix: false,
    postfix: false,
    binop: null,
    updateContext: null
  }
}
```

和 AST 节点一样它们也有 start，end，loc 属性。

#### 语法分析

语法分析阶段会把一个令牌流转换成 AST 的形式。这个阶段会使用令牌中的信息把它们转换成一个 `AST 的表述结构`，这样更易于后续的操作。

简单来说，解析阶段就是

code(字符串形式代码)->tokens(令牌流)-> AST（抽象语法树）

Babel 使用 @babel/parser 解析代码，输入的 js 代码字符串根据 ESTree 规范生成 AST（抽象语法树）。Babel 使用的解析器是 babylon。

#### 转换

转换步骤接收 AST 并对其进行遍历，在此过程中对节点进行添加、更新及移除等操作。这是 Babel 或是其他编译器中最复杂的过程。

Babel提供了`@babel/traverse(遍历)`方法维护这AST树的整体状态，并且可完成对其的替换，删除或者增加节点，这个方法的参数为原始AST和自定义的转换规则，返回结果为转换后的AST。

#### 生成

代码生成步骤把最终（经过一系列转换之后）的 AST 转换成字符串形式的代码，同时还会创建`源码映射（source maps）`。

代码生成其实很简单：深度优先遍历整个 AST，然后构建可以表示转换后代码的字符串。

Babel使用 `@babel/generator` 将修改后的 AST 转换成代码，生成过程可以对是否压缩以及是否删除注释等进行配置，并且支持 sourceMap。

![alt](https://mmbiz.qpic.cn/mmbiz_png/C527icpHV4scib6NWPyVH9X5PNZkeibV5GYfp63cFbxLhTIr9GwKoBQ8icMn1NrickomzE5TROJcufic1Avnya7L3E9Q/640?wx_fmt=png&tp=webp&wxfrom=5&wx_lazy=1&wx_co=1)

![alt]()

### babel-core

babel-core是Babel的核心包,里面存放着诸多核心API,这里说下transform。

transform : 用于字符串转码得到AST 。

```js
babel.transform("code();", options, function(err, result) {
  result.code;
  result.map; // 源映射 sourceMap
  result.ast;
});
```

### babel/traverse

AST 开发的核心，95% 以上的代码量都是通过 @babel/traverse 在写 visitor。

```js
const ast = parse(`function square(num) {
  return num * num;
}`);

traverse(ast, { // 进行 ast 转换
    Identifier(path) { // 遍历变量的visitor
      // ...
    },
    // 其他的visitor遍历器
  } 
)
```

visitor 的第一个参数是 path，path 不直接等于 node（节点），path 的属性和重要方法组成如下：

![alt](https://mmbiz.qpic.cn/mmbiz_png/Z6bicxIx5naIHzTVz2UnkrzvJvoS4sziaibACriaibss4xBwlxicJjqT4cfmuAN42L22icadhZAzNiarAPSOnFvlJUDEAQ/640?wx_fmt=png&tp=webp&wxfrom=5&wx_lazy=1&wx_co=1)

### babel-types

Babel Types模块是一个用于 AST 节点的 Lodash 式工具库（译注：Lodash 是一个 JavaScript 函数工具库，提供了基于函数式编程风格的众多工具函数）， 它包含了构造、验证以及变换 AST 节点的方法。该工具库包含考虑周到的工具方法，对编写处理AST逻辑非常有用

```js

// is开头的用于判断节点
types.isObjectProperty(node);
types.isObjectMethod(node);

// 创建 null 节点
const nullNode = types.nullLiteral();
// 创建 square 变量节点
const squareNode = types.identifier('square');
```

### Visitors (访问者)

当我们谈及“进入”一个节点，实际上是说我们在访问它们， 之所以使用这样的术语是因为有一个访问者模式（visitor）的概念。

访问者是一个用于 AST 遍历的跨语言的模式。简单的说它们就是一个对象，定义了用于在一个树状结构中获取具体节点的方法。这么说有些抽象所以让我们来看一个例子。

### Paths（路径）

AST 通常会有许多节点，那么节点直接如何相互关联呢？我们可以使用一个可操作和访问的巨大可变对象表示节点之间的关联关系，或者也可以用Paths（路径）来简化这件事情。

Path 是表示两个节点之间连接的对象。

在某种意义上，路径是一个节点在树中的位置以及关于该节点各种信息的响应式 Reactive 表示。当你调用一个修改树的方法后，路径信息也会被更新。Babel 帮你管理这一切，从而使得节点操作简单，尽可能做到无状态。

### Paths in Visitors（存在于访问者中的路径）

当你有一个 Identifier() 成员方法的访问者时，你实际上是在访问路径而非节点。通过这种方式，你操作的就是节点的响应式表示（译注：即路径）而非节点本身。

### Babel插件规则

Babel的插件模块需要我们暴露一个function,function内返回visitor对象。

```js
//函数参数接受整个Babel对象,这里将它进行解构获取babel-types模块,用来操作AST。

module.exports = function ({ types: t }) {
  return
  {
    visitor: {
    }
  }
}
```

### demo

在 babel 文件下

## 总结

code > parse > transform > generate > code

parse 分为两步

1. 词法分析， 字符串转换成tokens流
2. 语法分析，tokens流转换成 AST 表述结构

transform

1. 对AST中的各个节点做相关操作，如新增、删除、替换、追加。业务开发 95%的代码都在这里。

generate 会生成

1. 将AST转换成字符串
2. 生辰 source-map

### 参考文献

1. <https://mp.weixin.qq.com/s/IzYrDbMLplf4JOlpf8pLeQ>
2. <https://www.babeljs.cn/docs/babel-core>
