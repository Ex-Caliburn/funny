// 给你一个数字，和排序过的数组
// 主要找到中间值， 比较左右大小

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
      return halfDeep(num, arr.slice(currentIndex+1, arr.length))
    }
  }
  return halfDeep(num, arr)
}

// 非递归 双指针
function getIndex(num, arr) {
  let st = 0
  let ed = arr.length -1
  let mid
  while (st <= ed) {
    mid = Math.floor((st+ed)/2)
    console.log(st, ed, mid)
    if (arr[mid] === num) {
      return mid
    } else if(arr[mid] > num) {
      ed = mid - 1
    } else {
      st = mid + 1
    }
  }
  return -1
}

// 测试
half(19, [0, 1, 2, 9, 19, 123])
half(0, [0, 1, 2, 9, 19, 123])

getIndex(0, [0,1,2])