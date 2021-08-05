// 通过 chrome 工具栏 call stack 查看
// console.trace() 查看

// 这是一段递归代码，可以通过传入参数 n，让代码递归执行 n 次，也就意味着调用栈的深度能达到 n，
// 当输入一个较大的数时，比如 50000，就会出现栈溢出的问题，那么你能优化下这段代码，以解决栈溢出的问题吗？

function runStack(n) {
  if (n === 0) return 100
  return runStack(n - 2)
}
runStack(50000)

let a = 0
function runStack2(n) {
  if (n === 0) return 100
  a++
  console.log(a)
  return runStack(n - 2)
}
runStack2(50000)

// chrome 会报错
// Safari不会报错， 这是一个尾调用优化，chrome 没有对此进行优化

// 如果 runStack(1)，这就是一个无限循环
// 通过a 计算栈的深度 10428

// 我想的是循环代替递归

function runStack(n) {
  if (n === 0) return 100
  return runStack.bind(null, n - 2) // 返回自身的一个版本
}

// 蹦床函数，避免递归
function trampoline(f) {
  while (f && f instanceof Function) {
    f = f()
  }
  return f
}
trampoline(runStack(1000000))

