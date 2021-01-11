// 给你一个数字，和排序过的数组,找到在数组中的位置
// 思路: 主要找到中间值， 比较左右大小

// 第一次的思路 递归
// 先拿到数组中间那一项，然后比较大小
// 如果相等直接返回
// 如果大于，截取左边的数组，然后重复第二步
// 如果小于，截取右边的数组，然后重复第二步
function half(num, arr) {
  let index = 0
  if (!arr.length) {
    return -1
  }
  function halfDeep(num, arr) {
    if (arr.length === 1) {
      if (arr[0] !== num) {
        return -1
      } else {
        return index
      }
    }
    let currentIndex = Math.floor(arr.length / 2)
    console.log(num, arr, arr[currentIndex])
    if (num === arr[currentIndex]) {
      return index + currentIndex
    } else if (num < arr[currentIndex]) {
      return halfDeep(num, arr.slice(0, currentIndex))
    } else if (num > arr[currentIndex]) {
      index += currentIndex + 1
      return halfDeep(num, arr.slice(currentIndex + 1, arr.length))
    }
  }
  return halfDeep(num, arr)
}

// 非递归 双指针
// 思路是和你递归一样，实现很巧妙，但是代码更清晰且易读，
// 设置两个指针，开始指针，结束指针，
// 第二步，然后获取两个指针的中间值，比较中间值和 目标的大小，
// 相等返回
// 中间值大于目标，移动结束指针为 中间值前一位，重复第二步
// 中间值小于目标，移动开始指针为 中间值后一位，重复第二步

function getIndex(target, arr) {
  let st = 0
  let ed = arr.length - 1
  let mid
  while (st <= ed) {
    mid = Math.floor((st + ed) / 2)
    if (arr[mid] === target) {
      return mid
    } else if (arr[mid] > target) {
      ed = mid - 1
    } else {
      st = mid + 1
    }
  }
  return -1
}

// 测试
// half(19, [0, 1, 2, 9, 19, 123])
// half(0, [0, 1, 2, 9, 19, 123])

// console.log(getIndex(0, [0,1,2]))

// 优化版，1.处理异常输入，
//  2. 如果首项和尾项就是目标元素，提前返回，而不是等到循环最后才发现
function getIndex2(target, arr) {
  if (typeof target === 'undefined' || arr instanceof Array) {
    return -1
  }
  let st = 0
  let ed = arr.length - 1
  let mid
  if (arr[st] === target) return arr[st]
  if (arr[ed] === target) return arr[ed]
  while (st <= ed) {
    mid = Math.floor((st + ed) / 2)
    if (arr[mid] === target) {
      return mid
    } else if (arr[mid] > target) {
      ed = mid - 1
      if (arr[ed] === target) return arr[ed]
    } else {
      st = mid + 1
      if (arr[st] === target) return arr[st]
    }
  }
  return -1
}

console.log(getIndex(0, [0, 1, 2]))
console.log(getIndex(2, [0, 1, 2]))
console.log(getIndex(1, [0, 1, 2]))
console.log(getIndex(3, [0, 1, 2]))
console.log(getIndex(3, [0, 1, 2, 3, 4]))
