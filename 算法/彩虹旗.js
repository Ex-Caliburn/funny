// 因为荷兰旗就三种颜色嘛，那这道题的问题就是给你三种颜色，按照给定的顺序排好。

// 当然了，题目的问法各种各样，有的给数字，有的给字母，但本质都是一样的。

// 比如给你一个只含有三个数字的数组：312312312231111122113，
// 要求按照 1 2 3 的顺序排好，即：111111111222222222223333333333

// 挡板法， i，j，k, jk 之间是未排序的数字
// i 第二个数字的下标， j， 移动的下标， k， 第三个数字的下标， 循环结束时间， j > k,
function sort(arr, order) {
  order = order.split('')
  let i = 0,
    j = 0,
    k = arr.length - 1
  while (j <= k) {
    if (arr[j] === order[0]) {
      swap(arr, i, j)
      j++
      i++
    } else if (arr[j] === order[1]) {
      j++
    } else {
      swap(arr, j, k)
      k--
    }
  }
  return arr
}

function swap(arr, st, ed) {
  ;[arr[st], arr[ed]] = [arr[ed], arr[st]]
}

arr = '312312312231111122113'
arr = '3123'
// 3123 i 0, j 0, k 3
// 3123 i 1, j 1, k 3
// 3321 i 1, j 1, k 2
// 3321  i 2, j 2, k 2
// 3321  i 2, j 3, k 2

arr = arr.split('')
console.log(sort(arr, '321'))
// 什么时候做到bug free ，自己跑一遍
