# 原始值

## primitives

js 允许 我们操作原始值，即使它们曾经是对象，它们提供了调用方法

How do you think, will it work? What will be shown?

```
let str = "Hello";

str.test = 5;

alert(str.test);
```

### primitive

1. 原始值类型的值
2. 7中原始值类型 string, number, bigint, boolean, symbol, null and undefined.

### An object

1. 对象的属性能可以多种值
2. 能被{}创建，能存贮function

### primitive 作为对象的初衷和解决方案

这是js的创建者面临的悖论

1. 有需要方法需要对原始值进行操作，那些最好作为它们的方法
2. 原始值必须尽可能的快速和轻量

解决方法看起来有点别扭

1. 原始值依旧是原始值，如期望一样
2. 允许我们去访问 strings, numbers, booleans and symbols的方法和属性
3. 为了上述有效，一种特殊的 object wrapper(包装对象) ，它负责创建时可以提供额外的功能，然后被销毁

```
let str = "Hello";

alert( str.toUpperCase() ); // HELLO
```

发生了什么

1. str 是原始值，当访问str的属性时，特殊的对象被创建，它知道str的值，拥有一些有用的方法，如toUpperCase
2. 这个方法返回一个新字符串
3. 特殊对象被销毁，只留下原始值str

原始值提供了方法，也保持了轻量，js优化这一个过程，它甚至跳过了创建额外的对象，但是它遵循着设计原则表现得像创建一样

### Constructors 仅限内部使用

可能历史原因，极力不推荐，在某些地方会变得很疯狂

```
alert( typeof 0 ); // "number"

alert( typeof new Number(0) ); // "object"!
```

另一方面， 使用相同的functions而不是new 是有效的，可以把值转换成对应的值

```
let num = Number("123"); // convert a string to number
```

null/undefined have no methods

```
alert(null.test); // error
```

再来看

```
let str = "Hello";

str.test = 5; // (*)

alert(str.test);
```

取决于是否采用了严格模式

1. undefined (no strict mode)
2. An error (strict mode).

Why? Let’s replay what’s happening at line (*):
str的属性被访问时，“wrapper object”被创建，严格模式会报错，其他情况 操作会执行，对象获得test属性，但是“wrapper object” 消失，所以最后str没有跟踪到test属性

这个例子清晰的展示 初始值不是对象不能存放额外的数据

### 参考文献

1. <https://javascript.info/primitives-methods>
