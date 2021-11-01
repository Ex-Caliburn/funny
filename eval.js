function fn1() {
  const a = 1
  const b = 2
  return function () {
    const c = 3
    console.log(a, b, c)
  }
}
const f1 = fn1()

function fn2() {
  const a = 1
  const b = 2
  return function () {
    const c = 3
    eval(`console.log(a, b, c)`)
  }
}
const f2 = fn2()
console.log(f2)

// 再来思考一个问题： 闭包需要扫描函数内的标识符，做静态分析，那 eval 怎么办，他有可能内容是从网络记载的，从磁盘读取的等等，内容是动态的。用静态去分析动态是不可能没 bug 的。怎么办？
// 没错，eval 确实没法分析外部引用，也就没法打包闭包，这种就特殊处理一下，打包整个作用域就好了。

// 这个就是 eval 的实现，因为没法静态分析动态内容所以全部打包成闭包了，本来闭包就是为了不保存全部的作用域链的内容，结果 eval 导致全部保存了，所以尽量不要用 eval。会导致闭包保存内容过多。

// 但是 JS 引擎只处理了直接调用，也就是说直接调用 eval 才会打包整个作用域，如果不直接调用 eval，就没法分析引用，也就没法形成闭包了。
// 这种特殊情况有的时候还能用来完成一些黑魔法，比如利用不直接调用 eval 不会生成闭包，会在全局上下文执行的特性。

