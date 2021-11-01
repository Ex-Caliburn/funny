function fib(n) {
  if (n <= 0) return 0
  if (n === 1) return 1
  return fib(n - 1) + fib(n - 2)
}

// 每次都会重复用到，f1， f2， 用一个表把他装起来

//  i    0 1 1 2
// f(i)  0 1 1 2

// 这样子一个函数就搞定了，只是一个循环，
function fib(n) {
  if (n <= 0) return 0
  if (n === 1) return 1
  let cache = [0, 1]
  for (let i = 2; i <= n; i++) {
    cache[i] = cache[i - 1] + cache[i - 2]
  }
  return cache[n]
}

// 空间O(1), 时间 O（n）

// 那其实每项的计算只取决于它前面的两项，所以只用保留这两个就好了。

// 那我们可以用一个长度为 2 的数组来计算，或者就用 2 个变量。

function fib(n) {
  if (n <= 0) return 0
  if (n === 1) return 1
  let cache = [0, 1]
  for (let i = 2; i <= n; i++) {
    cache[i] = cache[0] + cache[1]
    cache[0] = cache[1]
    cache[1] = cache[i]
  }
  return cache[n]
}

// 常量替代 dp 动态优化，做好草稿，每次优化
function fib(n) {
  let a = 0
  let b = 1
  let res = 0
  if (n <= 0) return 0
  if (n === 1) return 1
  for (let i = 2; i <= n; i++) {
    res = a + b
    a = b
    b = res
  }
  return res
}

// 尾递归，不用保存递归栈， 计算放在参数和传参时计算, 逆向思维
function fib(n, a = 0, b = 1) {
  if (n <= 0) return a
  if (n === 1) return b
  return fib(n - 1, b, a + b)
}
