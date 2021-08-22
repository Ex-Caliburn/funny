/**
 * 
假设有一组｛9, 1, 2, 5, 7, 4, 8, 6, 3, 5｝无需序列。

第一趟排序： 设 gap1 = N / 2 = 5，即相隔距离为 5 的元素组成一组，可以分为 5 组。接下来，按照直接插入排序的方法对每个组进行排序。
第二趟排序：
将上次的 gap 缩小一半，即 gap2 = gap1 / 2 = 2 (取整数)。这样每相隔距离为 2 的元素组成一组，可以分为2组。按照直接插入排序的方法对每个组进行排序。
第三趟排序：
再次把 gap 缩小一半，即gap3 = gap2 / 2 = 1。 这样相隔距离为1的元素组成一组，即只有一组。按照直接插入排序的方法对每个组进行排序。此时，排序已经结束
 */

// for (let i = 1; i < arr.length; i++) {
//   for (let j = i + gap - 2; j >= 0; j--) {
//     console.log(i, j, arr[i], arr[j], arr)
//     if (arr[i] >= arr[j]) {
//       arr.splice(j + 1, 0, arr.splice(i, 1)[0])
//       break
//     } else if (j === 0 || j === i - gap + 1) {
//       arr.splice(j, 0, arr.splice(i, 1)[0])
//       break
//     }
//   }
// }
// 第一次写，写得啥玩意，连原理都没有理解
function sort(arr) {
  if (!arr || arr.length < 2) {
    return arr
  }
  return _sort(arr, Math.floor(arr.length / 2))
}
function _sort(arr, gap) {
  while (gap > 0) {
    for (let i = 0; i < arr.length - gap; i++) {
      for (let j = i + 1; j < i + gap + 1; j++) {
        for (let z = i; z >= i; z--) {
          // console.log(i, j, z, arr[j], arr[z], arr)
          if (arr[j] >= arr[z]) {
            arr.splice(z + 1, 0, arr.splice(j, 1)[0])
            break
          } else if (z === 0 || z === i) {
            arr.splice(z, 0, arr.splice(j, 1)[0])
            break
          }
        }
      }
    }
    gap = Math.floor(gap / 2)
  }
  return arr
}

let arr = [9, 1, 2, 5, 7, 4]
// console.log(sort(arr))

// 设定好步长，比如说 2， 两个两个进行插入排序，最后进行1个个排序

// 性能分析
// 平均时间复杂度：O(Nlog2N)
// 最佳时间复杂度：
// 最差时间复杂度：O(N^2)
// 空间复杂度：O(1)
// 稳定性：不稳定
// 复杂性：较复杂
// 希尔排序的效率取决于增量值gap的选取，时间复杂度并不是一个定值。

// 开始时，gap取值较大，子序列中的元素较少，排序速度快，克服了直接插入排序的缺点；其次，gap值逐渐变小后，虽然子序列的元素逐渐变多，但大多元素已基本有序，所以继承了直接插入排序的优点，能以近线性的速度排好序。

// 最优的空间复杂度为开始元素已排序，则空间复杂度为 0；最差的空间复杂度为开始元素为逆排序，
// 则空间复杂度为 O(N);平均的空间复杂度为O(1)希尔排序并不只是相邻元素的比较，有许多跳跃式的比较，
// 难免会出现相同元素之间的相对位置发生变化。比如上面的例子中希尔排序中相等数据5就交换了位置，所以希尔排序是不稳定的算法。

// 先分组， 加入是对半分， [9, 7, 4，5]，n/2 就是 2，下标差为2的组成组一组 [9 4] [7, 5],排序 [4, 9], [5, 7],然后 2/2 ，按下标差 1
// [4, 9 , 5, 7]  [ 4, 9] [5, 9] [7, 9]
// 先对数组粗略的分组，大小数比较规整
function sort2(arr) {
  if (!arr || arr.length < 2) {
    return arr
  }
  return _sort2(arr, Math.ceil(arr.length / 2))
}
function _sort2(arr, gap) {
  while (gap > 0) {
    for (let i = 0; i <= arr.length - 1 - gap; i++) {
      console.log(i, gap)
      if (arr[i + gap] < arr[i]) {
        ;[arr[i + gap], arr[i]] = [arr[i], arr[i + gap]]
      }
    }
    if (gap === 1) {
      break
    } else {
      gap = Math.ceil(gap / 2)
    }
  }
  return arr
}

// let arr2 = [9, 7, 4]
// [9 7 4]
// [4, 7, 9]

// let arr2 = [9, 1, 2, 5, 7, 4]
// console.log(sort2(arr2))

// 简化优化 我还是理解错了，步长为2 ，是所有 2分为一组，但是我这中是什么算法，反正也能算出来
function sort3(arr) {
  for (let gap = Math.ceil(arr.length / 2); gap > 0; gap = Math.ceil(gap / 2)) {
    for (let i = 0; i <= arr.length - 1 - gap; i++) {
      console.log(i, gap, JSON.stringify(arr))
      if (arr[i + gap] < arr[i]) {
        ;[arr[i + gap], arr[i]] = [arr[i], arr[i + gap]]
      }
    }
    if (gap === 1) {
      break
    }
  }
  return arr
}

// let arr2 = [9, 7, 4]
// // [9 7 4]
// // [4, 7, 9]

let arr3 = [35, 33, 42, 10, 14, 19, 27, 44]
console.log(sort3(arr3))

// ①步长序列：n/2i 最坏情况复杂度：O(n^2)
// ②步长序列：2k-1 最坏情况复杂度：O(n^3/2)
// ③步长序列：2i3j 最坏情况复杂度：O(nlog2n)

// Hibbard的增量序列如下：
// 1，3，7，15......
// 通项公式 2^k-1
// 利用此种增量方式的希尔排序，最坏时间复杂度是O（n^(3/2)）

// Sedgewick的增量序列如下：
// 1, 5, 19, 41, 109......
// 通项公式 9*4^k - 9*2^k + 1 或者 4^k - 3*2^k + 1
// 利用此种增量方式的希尔排序，最坏时间复杂度是O（n^(4/3)）



// 总结
// 希尔排序通过将比较的全部元素分为几个区域来提升插入排序的性能，交换不相邻的元素以对数组的局部进行排序，
// 最终用插入排序将局部有序的数组排序。

// 希尔排序时效分析很难，关键码的比较次数与记录移动次数依赖于增量因子序列d的选取，
// 特定情况下可以准确估算出关键码的比较次数和记录的移动次数。目前还没有人给出选取最好的增量因子序列的方法
// 。增量因子序列可以有各种取法，有取奇数的，也有取质数的，但需要注意：增量因子中除1外没有公因子，
// 且最后一个增量因子必须为1。希尔排序方法是一个不稳定的排序方法

// 最终版 之前还是理解错了
function sort3(arr) {
  let len = arr.length
  temp
  gap = 1
  if (N > 3) {
    
  }
  for (let gap = Math.ceil(arr.length / 2); gap > 0; gap = Math.ceil(gap / 2)) {
    for (let i = 0; i <= arr.length - 1 - gap; i =+ gap) {
      if (arr[i + gap] < arr[i]) {
        ;[arr[i + gap], arr[i]] = [arr[i], arr[i + gap]]
      }
    }
    if (gap === 1) {
      break
    }
  }
  return arr
}

// let arr2 = [9, 7, 4]
// // [9 7 4]
// // [4, 7, 9]

let arr3 = [35, 33, 42, 10, 14, 19, 27, 44]
console.log(sort3(arr3))