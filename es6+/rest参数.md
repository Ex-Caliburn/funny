# rest参数

## 前言

```js
function f(a, b, ...theArgs) {
  // ...
}
```

rest 参数可以以数组的方式接收无限的arguments

### 描述

```js
function myFun(a,  b, ...manyMoreArgs) {
  console.log("a", a)
  console.log("b", b)
  console.log("manyMoreArgs", manyMoreArgs)
}

myFun("one", "two", "three", "four", "five", "six")

// Console Output:
// a, one
// b, two
// manyMoreArgs, ["three", "four", "five", "six"]

```

### 注意

1. 函数只能有一个...restParam
2. 必须是最后一个参数

### 和arguments的区别

1. arguments 不是一个真正的数组
2. arguments object has additional functionality specific to itself (like the callee property). arguments 有着额外的函数式描述，像 callee属性
3. rest包含所有未命名的的参数的单个数组， arguments对象包含了所哟参数

## 总结

### 参考文献
