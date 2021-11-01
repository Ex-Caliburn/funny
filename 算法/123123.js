// Input: ab eidbaooo  aabb  ab aabb
function findStr(target, str) {
  let arr = target.split('')
  let strArr = str.split('')
  let used = new Array(strArr.length)
  for (let i = 0; i < arr.length; i++) {
    console.log(
      '11',
      used.find((item) => item)
    )
    if (!strArr.includes(arr[i]) && used.find((item) => item)) {
      used.map((item) => {
        item = ''
        return item
      })
      continue
    }
    let index = strArr.indexOf(arr[i])
    if (index > -1) {
      if (used[index]) {
        used.map((item) => {
          item = ''
          return item
        })
        used[index] = 1
      } else {
        used[index] = 1
      }
    }
  }
  return used.every((item) => item)
}

// console.log(findStr('eidbaooo', 'oe'))

// 找到所有可能性，然后匹配
// function findStr2(target, str) {
//   let strArr = str.split('')
//   for (let i = 0; i < strArr.length; i++) {
//     dfs(0, 0, str)
//   }
//   function dfs(start, end, str) {
//     if (condition) {
//     }
//   }
// }

// JS:顺时针打印二维数组

// 将二维数组按照顺时针的顺序打印出来。例如

// const arr = [
//     [1  2  3  4  5],
//     [6  7  8  9  10],
//     [11 12 13 14 15],
//     [16 17 18 19 20],
// ]

// 应该输出1 2 3 4 5 10 15 20 19 18 17 16 11 6 7 8 9 14 13 12

// 一个used 放存过的下表 11
// 11  12 13 14  24 34 44  43 42 41  31 21  22 23

// 主要是标界情况的考虑
function sortByOrder(arr) {
  if (!arr.length || !arr[0].length) return ''
  let i = 0 // y
  let j = 0 // x
  let x = arr[0].length
  let y = arr.length 
  let count = x * y
  let res = []
  let used = {}
  let dir = 'right' // left up down
  for (let z = 0; z < count; z++) {
    console.log(dir, i, j, x, y, count,  arr[i][j])
    res.push(arr[i][j])
    used[i + '.' + j] = 1
    if (dir === 'right') {
      j++
      if (j === x) {
        dir = 'down'
        j--
        i++
      }
    } else if (dir === 'left') {
      j--
      if (j < 0  || used[i + '.' + j]) {
        dir = 'up'
        j++
        i--
      }
    } else if (dir === 'down') {
      i++
      if (i === y) {
        dir = 'left'
        i--
        j--
      }
    } else if (dir === 'up') {
      i--
      if (i < 0 || used[i + '.' + j]) {
        dir = 'right'
        i++
        j++
      }
    }
  }
  return res.join(',')
}

console.log(
  sortByOrder([
    [1, 2, 3, 4],
    [5, 6, 7, 8],
    [9, 10, 11, 12]
  ])
)

// JS: 找出字符串中最长有效单词的长度

// 实现函数 findLongestWordLen(str) {}
// 输入：str = "abc adfd aa0aa afd"
// 输出：4

// 1. 注意：有效单词的组成是连续的大小写字符串
// 2. 考察点：正则、ES6中的数组函数、箭头函数

// 问题没办法判别 在中间 大写的 ,找规律写正则
function findLongestWordLen2(str) {
  let arr = str.match(/^[A-Z][a-z]+\s?|\s[a-z]+\s/g)
  return arr.reduce(
    (pre, next) => (next.trim().length > pre ? next.trim().length : pre),
    0
  )
}

// console.log(findLongestWordLen2('May 1the Force be with1 you'))

// An apple
function findLongestWordLen3(str) {
  // 比较蠢
  let reg = /^[A-Z]$|^[A-Z][a-z]+$|^[A-Z][a-z]+\s|\s[a-z]+\s?/g
  let arr = str.match(reg) || []
  console.log(arr)
  return arr.reduce(
    (pre, next) => (next.trim().length > pre ? next.trim().length : pre),
    0
  )
}

// console.log(findLongestWordLen3('May1'))
// console.log(findLongestWordLen3('May'))
// console.log(findLongestWordLen3('May 1the Force be with1 you'))
// console.log(findLongestWordLen3('A'))
// console.log(findLongestWordLen3('a'))
// console.log(findLongestWordLen3('1'))
// console.log(findLongestWordLen3('A1'))
// console.log(findLongestWordLen3('An apple'))
