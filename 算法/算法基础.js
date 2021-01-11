// 题目描述
// 斐波那契数列是一位意大利的数学家，他闲着没事去研究兔子繁殖的过程，研究着就发现，可以写成这么一个序列：1，1，2，3，5，8，13，21… 也就是每个数等于它前两个数之和。那么给你第 n 个数，问 F(n) 是多少。

// f(n) = f(n-1) + f(n-2)

function fib(n) {
  if (n <= 0) return 0
  if (n === 1) return 1
  return fib(n - 1) + fib(n - 2)
}

// console.log(fib(1), fib(5))

//         5
//      4  3
//    3  2  2  1
//  2 1 1 0 1 0  1
// 1 0 1 1 0 1 0  1

// 优化算法

// 这里很明显了，可以用之前讲过的 HashMap 或者用一个数组来存：

// Index	0	1	2	3	4	5
// F(n)	    0	1	1	2	3	5

function fib2(n) {
  if (n <= 0) return 0
  if (n === 1) return 1
  let arr = [0, 1]
  for (let i = 2; i <= n; i++) {
    arr[i] = arr[i - 1] + arr[i - 2]
  }
  return arr[n]
}

console.log(fib2(1), fib2(5))

// 那其实每项的计算只取决于它前面的两项，所以只用保留这两个就好了。

// 那我们可以用一个长度为 2 的数组来计算，或者就用 2 个变量。

function fib3(n) {
  let a = 0
  let b = 1
  let temp
  if (n <= 0) return a
  if (n === 1) return b
  for (let i = 2; i < n; i++) {
    temp = a + b
    a = b
    b = temp
  }
  return a + b
}
console.log(fib3(1), fib3(5))

// tail recursion 尾递归：就是递归的这句话是整个方法的最后一句话。

// 那这个有什么特别之处呢？

// 尾递归的特点就是我们可以很容易的把它转成 iterative 的写法，当然有些智能的编译器会自动帮我们做了（不是说显性的转化，而是在运行时按照 iterative 的方式去运行，实际消耗的空间是 O(1)）

// 我的理解 把计算放在一个函数里，尾递归就是最后一个函数做完所有事情，不分成两部分，只保留一个调用记录，复杂度 O(1) 。

function fib4(n, a = 0, b = 1) {
  if (n <= 0) return a
  if (n === 1) return b
  return fib4(n - 1, b, a + b)
}
console.log(fib4(5))
