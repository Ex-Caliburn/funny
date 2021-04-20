// 给定一个字符串，你需要反转字符串中每个单词的字符顺序，同时仍保留空格和单词的初始顺序。

// 示例：

// 输入："Let's take LeetCode contest"
// 输出："s'teL ekat edoCteeL tsetnoc"

// 链接：https://leetcode-cn.com/problems/reverse-words-in-a-string-iii
/**
 * @param {string} s
 * @return {string}
 */
var reverseWords = function (s) {
  return s
    .split(' ')
    .map((item) => item.split('').reverse().join(''), '')
    .join(' ')
}

console.log(reverseWords("Let's take LeetCode contest"))

// 双指针
var reverseWords2 = function (s) {
  let arr = s.split('')
  arr.push(' ')
  let st = 0
  let ed = 0
  let len = arr.length
  for (let i = 0; i < len; i++) {
    if (arr[i] === ' ') {
      ed = i - 1
      while (ed > st) {
        swap(arr, st, ed)
        st++
        ed--
      }
      st = i + 1
    }
  }
  arr.pop()
  return arr.join('')
}
function swap(arr, st, ed) {
  ;[arr[st], arr[ed]] = [arr[ed], arr[st]]
}
console.log(reverseWords2("Let's take LeetCode contest"))

// 双指针
var reverseWords3 = function (s) {
  s += ' '
  let str = ''
  let temp = ''
  let len = s.length
  for (let i = 0; i < len; i++) {
    if (s.charAt(i) === ' ') {
      str += temp + ' '
      temp = ''
    } else {
      temp = s.charAt(i) + temp
    }
  }
  return str.trim()
}

console.log(reverseWords3("Let's take LeetCode contest"))
