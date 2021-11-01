// 1. 生成长度为n的int型随机数组，数组元素范围为0~n-1，每个元素都是唯一的。只使用基本数据类型。

// function genRandomArr(length) {
//   let obj = {}
//   let res = []
//   for (let i = 0; i < length; i++) {
//     let num = Math.floor(Math.random() * length)
//     if (!obj[num]) {
//       res.push(num)
//       obj[num] = 1
//     } else {
//       --i
//     }
//   }
//   return res
// }


// console.log(genRandomArr(10))
// console.log(genRandomArr(0))
// console.log(genRandomArr(1))
// console.log(genRandomArr(-1))
// console.log(genRandomArr(100000))

// 2. 给两个大整数, 用字符串表示, 比如" 2154365543", "4332656442",
// 都可能超过1万位, 写一个函数输出他们之和. 需要自己实现加法过程, 不能用某些语言自带的高精度加法函数.

function add(str1, str2) {
  let sum = 0
  let up = 0
  let temp = []
  let arr1 = str1.split('')
  let arr2 = str2.split('')
  while (arr1.length && arr2.length) {
    sum = +arr1.pop() + +arr2.pop() + up
    if (sum >= 10) {
      temp.push(sum - 10)
      up = 1
    } else {
      temp.push(sum)
      up = 0
    }
  }
  if (up) {
    arr1.length
      ? (arr1[arr1.length - 1] = +arr1[arr1.length - 1] + 1)
      : (arr2[arr2.length - 1] = +arr2[arr2.length - 1] + 1)
  }
  return arr1
    .concat(arr2, temp.reverse())
    .join('')
    .toString()
}

console.log(add('999', '888888'))
console.log(add('2154365543', '4332656442'))
console.log(999 + 888888)
console.log(2154365543 + 4332656442)
