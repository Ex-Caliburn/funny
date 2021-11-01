/**
 * @param {number[]} numbers
 * @return {number}
 */
// 不难但是有很多边界
// 最小的一个数 在第一个
// 所有数都一样
// 就一个数
var minArray = function (numbers) {
  for (let i = 0; i < numbers.length; i++) {
    if (numbers[i + 1] < numbers[i]) {
      return numbers[i + 1]
    }
  }
  return numbers[0]
}

// console.log(minArray([3, 4, 5, 1, 2]))
// console.log(minArray([2, 2, 2, 0, 1]))
// console.log(minArray([1, 3, 5]))

// 追求极致，二分法
// 因为是一个有序数组 ，二分法时 左边必须比右边小
// 空间换时间
var minArray2 = function (numbers) {
  let start = 0
  let end = numbers.length - 1
  let res
  let num = searchMid(start, end)
  return typeof num !== 'undefined' ? num : numbers[0]
  function searchMid(start, end) {
    if (start === end) return
    let mid = Math.floor(start + (end - start) / 2)
    if (start <= mid - 1) {
      if (numbers[mid] >= numbers[mid - 1]) {
        res = searchMid(start, mid - 1)
        if (typeof res !== 'undefined') {
          return res
        }
      } else {
        return numbers[mid]
      }
    }
    if (end >= mid + 1) {
      if (numbers[mid] <= numbers[mid + 1]) {
        res = searchMid(mid + 1, end)
        if (typeof res !== 'undefined') {
          return res
        }
      } else {
        return numbers[mid + 1]
      }
    }
  }
}

// console.log(minArray2([3, 4, 5, 1, 2]))
// console.log(minArray2([2, 2, 2, 0, 1]))
// console.log(minArray2([1, 3, 5]))
// console.log(minArray2([-1, -1, -1, -1]))
console.log(minArray2([3, 1]))

// 我们将中轴元素 numbers[pivot]numbers[pivot] 与右边界元素 numbers[high]numbers[high] 进行比较，可能会有以下的三种情况：
// pivot = (low + high )/ 2
// 1 numbers[high] > numbers[pivot]  high  = pivot
// 1 numbers[high] < numbers[pivot]  low = pivot + 1
// 1 numbers[high] === numbers[pivot]  无法确定  high--
// 太巧妙了，思路的，判断high 从而可以获取到最小值
// 先把图画出来
var minArray3 = function (numbers) {
  let low = 0
  let high = numbers.length - 1
  while (low < high) {
    const pivot = low + Math.floor((high - low) / 2) // 防止加法溢出
    if (numbers[pivot] < numbers[high]) {
      high = pivot
    } else if (numbers[pivot] > numbers[high]) {
      low = pivot + 1
    } else {
      high -= 1
    }
  }
  return numbers[low]
}
console.log(minArray2([4, 1]))

