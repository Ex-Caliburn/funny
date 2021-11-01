// 假设你正在爬楼梯。需要 n 阶你才能到达楼顶。

// 每次你可以爬 1 或 2 个台阶。你有多少种不同的方法可以爬到楼顶呢？

// 注意：给定 n 是一个正整数。

// 示例 1：

// 输入： 2
// 输出： 2
// 解释： 有两种方法可以爬到楼顶。
// 1.  1 阶 + 1 阶
// 2.  2 阶

// 链接：https://leetcode-cn.com/problems/climbing-stairs

/**
 * @param {number} n
 * @return {number}
 */
var climbStairs = function (n) {
  if (n <= 2) {
    return n
  }
  return climbStairs(n - 1) + climbStairs(n - 2)
}

console.log(climbStairs(10))

var climbStairs2 = function (n) {
  let arr = [0, 1, 2]
  for (let i = 3; i <= n; i++) {
    arr[i] = arr[i - 1] + arr[i - 2]
  }
  return arr[n]
}
console.log(climbStairs2(10))

var climbStairs3 = function (n) {
  if (n <= 2) return n
  let a = 1
  let b = 2
  let res = 0
  for (let i = 3; i <= n; i++) {
    res = a + b
    a = b
    b = res
  }
  return res
}
console.log(climbStairs3(4))
