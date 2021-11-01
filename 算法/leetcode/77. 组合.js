// 给定两个整数 n 和 k，返回 1 ... n 中所有可能的 k 个数的组合。
// 示例:

// 输入: n = 4, k = 2
// 输出:
// [
//   [2,4],
//   [3,4],
//   [2,3],
//   [1,2],
//   [1,3],
//   [1,4],
// ]

// 链接：https://leetcode-cn.com/problems/combinations

/**
 * @param {number} n
 * @param {number} k
 * @return {number[][]}
 */
//  多少坑，然后用几个数填，主要数字不能重复，刚开开始想用字符串，发现不行
var combine = function (n, k) {
  let res = []
  let nums = []
  for (let i = 1; i <= n; i++) {
    nums.push(i)
  }
  _generate(res, [], nums, k)
  return res
}
function _generate(arr, target, nums, k) {
  if (k === 0) {
    arr.push(target)
    return
  }
  let _nums
  let _target
  for (let i = 0; i < nums.length; i++) {
    _nums = nums.slice()
    _nums.splice(i, 1)
    _target = target.slice()
    _target.push(nums[i])
    _generate(arr, _target, _nums, k - 1)
  }
}

// console.log(combine(4, 2))

// 思路 不能重复， 画图，假如选两个， 第一个循环然后先选1个，然后下一个熏黄再余下中选一个，第二次循环，就不用考虑第一个了
// 剪植，我之前只剪掉了最外围的枝叶，构造他们的上限， 原来最里面也有，剩余的数字，也要限制，比如 [3,2] 你还要选三个数，直接就可以舍弃了 ，推出条件j <= n - k + 1
// https://leetcode-cn.com/problems/combinations/solution/hui-su-suan-fa-jian-zhi-python-dai-ma-java-dai-ma-/
var combine2 = function (n, k) {
  if (k > n) return []
  let res = []
  for (let i = 1; i <= n - k + 1; i++) {
    _generate2(res, [i], i + 1, n, k - 1)
  }
  return res
}

function _generate2(res, target, st, n, k) {
  if (k === 0) {
    res.push(target)
    return
  }
  let temp
  for (let j = st; j <= n - k + 1; j++) {
    temp = target.slice()
    temp.push(j)
    _generate2(res, temp, j + 1, n, k - 1)
  }
}
console.log(combine2(4, 2))
// console.log(combine2(4, 1))
// console.log(combine2(7, 4))
