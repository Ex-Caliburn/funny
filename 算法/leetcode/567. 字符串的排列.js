// 给你两个字符串 s1 和 s2 ，写一个函数来判断 s2 是否包含 s1 的排列。如果是，返回 true ；否则，返回 false 。
// 换句话说，s1 的排列之一是 s2 的 子串 。

// 输入：s1 = "ab" s2 = "eidbaooo"
// 输出：true
// 解释：s2 包含 s1 的排列之一 ("ba").
// 示例 2：

// 输入：s1= "ab" s2 = "eidboaoo"
// 输出：false

// 提示：
// 1 <= s1.length, s2.length <= 104
// s1 和 s2 仅包含小写字母

// 链接：https://leetcode-cn.com/problems/permutation-in-string

// 用数组收集字符个数，转换成字符串比较
// 不用操心顺序问题
var checkInclusion = function (s1, s2) {
  let l1 = s1.length
  let l2 = s2.length
  if (l1 > l2) return
  let arr1 = new Array(26).fill(0)
  let arr2 = new Array(26).fill(0)
  for (let i = 0; i < l1; i++) {
    ++arr1[s1[i].charCodeAt() - 'a'.charCodeAt()]
    ++arr2[s2[i].charCodeAt() - 'a'.charCodeAt()]
  }
  console.log(arr1, arr2)
  if (arr1.toString() === arr2.toString()) {
    return true
  }
  for (let i = l1; i < l2; i++) {
    ++arr2[s2[i].charCodeAt() - 'a'.charCodeAt()]
    --arr2[s2[i - l1].charCodeAt() - 'a'.charCodeAt()]
    if (arr1.toString() === arr2.toString()) {
      return true
    }
  }
  return false
}

// console.log(checkInclusion('ab', 'eidbaooo'))
// console.log(checkInclusion('ab', 'eidboaoo'))

var checkInclusion2 = function (s1, s2) {
  let l1 = s1.length
  let l2 = s2.length
  if (l1 > l2) return
  let arr1 = new Array(26).fill(0)
  let arr2 = new Array(26).fill(0)
  for (let i = 0; i < l1; i++) {
    ++arr1[s1[i].charCodeAt() - 'a'.charCodeAt()]
    ++arr2[s2[i].charCodeAt() - 'a'.charCodeAt()]
  }
  if (arr1.toString() === arr2.toString()) {
    return true
  }
  let diff = 0
  for (let i = 0; i < 26; i++) {
    diff += Math.abs(arr1[i] - arr2[i])
  }
  diff = diff / 2
  console.log(diff)
  for (let i = l1; i < l2; ++i) {
    // 对比下标也是一样
    let x = s2[i].charCodeAt() - 'a'.charCodeAt()
    let y = s2[i - l1].charCodeAt() - 'a'.charCodeAt()
    // 因为之前都不相等，既然是同一个符合上一个规律
    if (x === y) {
      continue
    }
    console.log(x, arr2[x], arr1[x])
    console.log(y, arr2[y], arr1[y])
    if (arr2[x] === arr1[x]) {
      ++diff
    }
    ++arr2[x]
    if (arr2[x] === arr1[x]) {
      --diff
    }
    if (arr2[y] === arr1[y]) {
      ++diff
    }
    --arr2[y]
    if (arr2[y] === arr1[y]) {
      --diff
    }
    console.log(diff)
    if (diff === 0) {
      return true
    }
  }
  return false
}

// console.log(checkInclusion2('ab', 'eidbaooo'))
// console.log(checkInclusion2('ab', 'eidb'))
// console.log(checkInclusion2('ab', 'aab'))

var checkInclusion3 = function (s1, s2) {
  let l1 = s1.length
  let l2 = s2.length
  if (l1 > l2) return
  let arr1 = new Array(26).fill(0)
  for (let i = 0; i < l1; i++) {
    --arr1[s1[i].charCodeAt() - 'a'.charCodeAt()]
    ++arr1[s2[i].charCodeAt() - 'a'.charCodeAt()]
  }
  let diff = 0
  for (const c of arr1) {
    if (c !== 0) {
      ++diff
    }
  }
  if (diff == 0) {
    return true
  }
  console.log(diff)
  for (let i = l1; i < l2; ++i) {
    // 对比下标也是一样
    let x = s2[i].charCodeAt() - 'a'.charCodeAt()
    let y = s2[i - l1].charCodeAt() - 'a'.charCodeAt()
    if (x === y) {
      continue
    }
    if (arr1[x] === 0) {
      ++diff
    }
    ++arr1[x]
    if (arr1[x] === 0) {
      --diff
    }
    if (arr1[y] === 0) {
      ++diff
    }
    --arr1[y]
    if (arr1[y] === 0) {
      --diff
    }
    console.log(diff)
    if (diff === 0) {
      return true
    }
  }
  return false
}
// console.log(checkInclusion3('ab', 'eidbaooo'))
// console.log(checkInclusion3('ab', 'eidb'))
// console.log(checkInclusion3('ab', 'aab'))

// 双指针
var checkInclusion4 = function (s1, s2) {
  let l1 = s1.length
  let l2 = s2.length
  if (l1 > l2) return
  let arr1 = new Array(26).fill(0)
  for (let i = 0; i < l1; i++) {
    --arr1[s1[i].charCodeAt() - 'a'.charCodeAt()]
    ++arr1[s2[i].charCodeAt() - 'a'.charCodeAt()]
  }
  let diff = 0
  for (const c of arr1) {
    if (c !== 0) {
      ++diff
    }
  }
  if (diff == 0) {
    return true
  }
  console.log(diff)
  for (let i = l1; i < l2; ++i) {
    // 对比下标也是一样
    let x = s2[i].charCodeAt() - 'a'.charCodeAt()
    let y = s2[i - l1].charCodeAt() - 'a'.charCodeAt()
    if (x === y) {
      continue
    }
    if (arr1[x] === 0) {
      ++diff
    }
    ++arr1[x]
    if (arr1[x] === 0) {
      --diff
    }
    if (arr1[y] === 0) {
      ++diff
    }
    --arr1[y]
    if (arr1[y] === 0) {
      --diff
    }
    console.log(diff)
    if (diff === 0) {
      return true
    }
  }
  return false
}
console.log(checkInclusion4('ab', 'eidbaooo'))
console.log(checkInclusion4('ab', 'eidb'))
console.log(checkInclusion4('ab', 'aab'))