// 数字 n 代表生成括号的对数，请你设计一个函数，用于能够生成所有可能的并且 有效的 括号组合。

// 示例 1：

// 输入：n = 3
// 输出：["((()))","(()())","(())()","()(())","()()()"]
// 示例 2：

// 输入：n = 1
// 输出：["()"]

// 提示：

// 1 <= n <= 8

// 链接：https://leetcode-cn.com/problems/generate-parentheses

/**
 * @param {number} n
 * @return {string[]}
 */
// 思路1  遍历所有可能，看多少中可能合规，感觉挺傻的，但是我没想到 , 可能性 2 * 几位 2^2n, 然后排除不符合规则的
// 产生所有可能性 2判断正确性，剔除错误
// 超出时间限制
var generateParenthesis = function (n) {
  if (n === 0) return []
  let res = ['(', ')']
  let temp
  let times = 2 * n - 1
  while (times > 0) {
    temp = []
    for (let i = 0; i < res.length; i++) {
      temp.push(res[i] + '(', res[i] + ')')
    }
    res = temp
    times--
  }
  helper2(res)
  return res
}

function helper(res) {
  let stack = []
  for (let i = 0; i < res.length; i++) {
    stack = []
    for (let j = 0; j < res[i].length; j++) {
      if (res[i].charAt(j) === '(') {
        stack.push('(')
      } else {
        if (!stack.pop()) {
          res.splice(i, 1)
          i--
          break
        }
      }
    }
    if (stack.length) {
      res.splice(i, 1)
      i--
    }
  }
}

// 优化对正确性的判断  balance
function helper2(res) {
  let balance
  for (let i = 0; i < res.length; i++) {
    if (!res[i]) return
    balance = 0
    for (let j = 0; j < res[i].length; j++) {
      if (res[i].charAt(j) === '(') {
        balance++
      } else {
        balance--
        if (balance < 0) {
          break
        }
      }
    }
    if (balance) {
      res.splice(i, 1)
      i--
    }
  }
}

// 递归版本
var generateParenthesis2 = function (n) {
  if (n === 0) return []
  let res = ['']
  _generateParenthesis(res, 2 * n)
  console.log(res)
  helper2(res)
  return res
}

function _generateParenthesis(arr, n) {
  if (n === 0) return
  let len = arr.length
  for (let i = 0; i < len; i++) {
    arr.push(arr[i] + ')')
    arr[i] += '('
  }
  return _generateParenthesis(arr, n - 1)
}

// console.log(generateParenthesis(1))
// console.log(generateParenthesis(2))
// console.log(generateParenthesis(3))
// console.log(generateParenthesis(4))

// console.log(generateParenthesis2(1))
// console.log(generateParenthesis2(2))
// console.log(generateParenthesis2(3))
// console.log(generateParenthesis2(4))

// 方法一还有改进的余地：我们可以只在序列仍然保持有效时才添加 '(' or ')'，而不是像 方法一 那样每次添加。
// 我们可以通过跟踪到目前为止放置的左括号和右括号的数目来做到这一点，

// 如果左括号数量不大于 nn，我们可以放一个左括号。如果右括号数量小于左括号的数量，我们可以放一个右括号。

var generateParenthesis3 = function (n) {
  if (n === 0) return []
  let res = []
  _generate(res, '', 0, 0, n)
  helper2(res)
  return res
}

function _generate(arr, target, open, close, max) {
  if (close === max && open === max) {
    arr.push(target)
    return
  }
  if (open < max) {
    _generate(arr, target + '(', open + 1, close, max)
  }
  // 因为 open 只可能小于等于 max 所以 close < max 可以去掉
  if (close < open) {
    _generate(arr, target + ')', open, close + 1, max)
  }
}
console.log(generateParenthesis3(1))
console.log(generateParenthesis3(2))
console.log(generateParenthesis3(3))
console.log(generateParenthesis3(4))

// 方法三：按括号序列的长度递归
// 思路与算法

// 任何一个括号序列都一定是由 ( 开头，并且第一个 ( 一定有一个唯一与之对应的 )。这样一来，每一个括号序列可以用 (a)b 来表示，其中 a 与 b 分别是一个合法的括号序列（可以为空）。

// 那么，要生成所有长度为 2 * n 的括号序列，我们定义一个函数 generate(n) 来返回所有可能的括号序列。那么在函数 generate(n) 的过程中：

// 我们需要枚举与第一个 ( 对应的 ) 的位置 2 * i + 1；
// 递归调用 generate(i) 即可计算 a 的所有可能性；
// 递归调用 generate(n - i - 1) 即可计算 b 的所有可能性；
// 遍历 a 与 b 的所有可能性并拼接，即可得到所有长度为 2 * n 的括号序列。
// 为了节省计算时间，我们在每次 generate(i) 函数返回之前，把返回值存储起来，下次再调用 generate(i) 时可以直接返回，不需要再递归计算。
