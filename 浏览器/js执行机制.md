# js执行机制

## 前言

JavaScript 代码执行过程中，需要先做变量提升，而之所以需要实现变量提升，是因为 JavaScript 代码在执行之前需要先编译。

在编译阶段，变量和函数会被存放到变量环境中，变量的默认值会被设置为 undefined；在代码执行阶段，JavaScript 引擎会从变量环境中去查找自定义的变量和函数。

如果在编译阶段，存在两个相同的函数，那么最终存放在变量环境中的是最后定义的那个，这是因为后定义的会覆盖掉之前定义的。

 JavaScript 的执行机制：先编译，再执

### 变量环境

在执行上下文中存在一个变量环境的对象（Viriable Environment）

### 例子

```js
showName()
var showName = function() {
    console.log(2)
}
function showName() {
    console.log(1)
}
```

下面是关于同名变量和函数的几点处理原则：

1:如果是同名的函数，JavaScript编译阶段会选择最后声明的那个。

2:如果变量和函数同名，那么在编译阶段，变量的声明会被忽略
    1. 编译阶段 先遇到 var，现将变量置于undefined，然后遇到同属性名的函数，被覆盖，指向head堆空间
    2. 编译阶段 先遇到函数，开辟head堆空间，然后遇到 var， var的声明会被忽略

3.如果换成用 let 或 const 声明变量，就会使用let,const规则，出现语法错误 SyntaxError: Identifier 'showName' has already been declared

编译阶段 先解析，创建一个head开辟内存存放函数 showName，遇到var showName，变量的声明会被忽略
所以showName还是不变
执行阶段， showName() 打印 1

## 总结

### 参考文献
