function fun() {
    return null;
}
var name = fun();
console.log(name === fun());


// name 是什么？
// name 的数据类型是啥？
// DOMString 赋值 null 为什么会是值 "null" 而不是 null 或者是 ""？
// [LegacyNullToEmptyString] 是什么?
// DOM 值中，有哪些 DOMString 类型是标记了 [LegacyNullToEmptyString] 的？


// 可以用let const 取代 var，使用 const，let 声明的变量不会挂载到 window 全局对象当中, 通过chrome 查看存在 Script中，
// 函数作用域存放在local， 执行完消失


// https://www.zhihu.com/question/445260004?utm_source=ZHShareTargetIDMore&utm_medium=social&utm_oi=814819569112858624