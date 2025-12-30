// https://leetcode-cn.com/problems/kth-largest-element-in-an-array/
// 在未排序的数组中找到第 k 个最大的元素。请注意，你需要找的是数组排序后的第 k 个最大的元素，而不是第 k 个不同的元素。

// 示例 1:

// 输入: [3,2,1,5,6,4] 和 k = 2
// 输出: 5
// 示例 2:

// 输入: [3,2,3,1,2,4,5,5,6] 和 k = 4
// 输出: 4
// 说明:

// 你可以假设 k 总是有效的，且 1 ≤ k ≤ 数组的长度。

function findKthLargest(nums, k) {
  let end = Math.min(nums.length - 1, k)
  let len = nums.length - 1
  for (let j = 0; j < end; j++) {
    for (let i = len; i > j; i--) {
      if (nums[i] > nums[i - 1]) {
        swap(nums, i, i - 1)
      }
    }
  }
  return nums[k - 1]
}

function swap(arr, st, ed) {
  ;[arr[st], arr[ed]] = [arr[ed], arr[st]]
}

arr = [3, 2, 3, 1, 2, 4, 5, 5, 6]
//  k = 4
arr2 = [3, 2, 1, 5, 6, 4]

// console.log(findKthLargest(arr, 4))
// console.log(findKthLargest(arr2, 2))

// 快排思路 速度提升 是 冒泡的三倍
// 先把目标拿出来，放在最后，然后使用快排，挡板法
function findKthLargest2(nums, k) {
  sort(nums, 0, nums.length - 1, k - 1)
  return nums[k - 1]
}

function sort(arr, start, end, target) {
  if (start >= end) {
    return
  }
  let temp = arr[target]
  if (end !== target) {
    swap(arr, end, target)
  }
  let st = start
  let ed = end - 1

  while (st <= ed) {
    if (arr[st] > temp) {
      st++
    } else {
      swap(arr, ed, st)
      ed--
    }
  }
  swap(arr, ++ed, end)
  if (st === target) {
    return
  } else if (st > target) {
    sort(arr, start, st - 1, target)
  } else {
    sort(arr, ed + 1, end, target)
  }
}

function swap(arr, st, ed) {
  ;[arr[st], arr[ed]] = [arr[ed], arr[st]]
}

arr = [3, 2, 3, 1, 2, 4, 5, 5, 6]

arr2 = [3, 2, 1, 5, 6, 4]

arr3 = [1, 2, 3]

arr4 = [3, 2, 3, 1, 2, 4, 5, 5, 6]

arr5 = [3,2,1,5,6,4]

console.log(findKthLargest(arr, 4))
console.log(findKthLargest(arr2, 2))
console.log(findKthLargest2(arr3, 2))
console.log(findKthLargest2(arr4, 4))
console.log(findKthLargest2(arr5, 2), arr5)
