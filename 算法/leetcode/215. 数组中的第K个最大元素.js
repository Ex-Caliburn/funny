// 给定整数数组 nums 和整数 k，请返回数组中第 k 个最大的元素。

// 请注意，你需要找的是数组排序后的第 k 个最大的元素，而不是第 k 个不同的元素。

//

// 示例 1:

// 输入: [3,2,1,5,6,4] 和 k = 2
// 输出: 5
// 示例 2:

// 输入: [3,2,3,1,2,4,5,5,6] 和 k = 4
// 输出: 4

// 链接：https://leetcode-cn.com/problems/kth-largest-element-in-an-array
/**
 * @param {number[]} nums
 * @param {number} k
 * @return {number}
 */
// 先排序
// 堆的算法不懂
var findKthLargest = function (nums, k) {
  if (k > nums.length) {
    return
  }
  let sortNum = nums.sort((a, b) => a - b)
  return sortNum[nums.length - k]
}

// console.log(
//   findKthLargest(
//     [3, 2, 3, 1, 2, 4, 5, 5, 6, 7, 7, 8, 2, 3, 1, 1, 1, 10, 11, 5, 6, 2, 4, 7, 8, 5, 6],
//     2
//   )
// )

// 快排 从小开始排
// 挡板法，移动指针，不修改数组
// 小于不用管
// 处理完， pivot要和替换位置
// 需要判断 在 target 左边还是在右边
// 会改变原数组
// 有序数组话， 取 pivot 在右边越复杂，其实可以取中间
var findKthLargest2 = function (nums, k) {
  if (k > nums.length) return
  let target = nums.length - k
  quickSort(0, nums.length - 1, nums, target)
  return nums[target]
}

function quickSort(st, end, nums, target) {
  if (st >= end) return
  let pivot = nums[end]
  let splitIndex = end - 1 // 分割大的和小的挡板指针
  let i = st
  while (splitIndex >= i) {
    if (nums[i] > pivot) {
      swap(i, splitIndex, nums)
      splitIndex--
    } else {
      i++
    }
  }
  if (end !== splitIndex + 1) {
    swap(end, splitIndex + 1, nums)
  }
  if (splitIndex + 1 === target) {
    // 相等
    return
  } else if (splitIndex + 1 > target) {
    // 去左边做处理
    quickSort(st, splitIndex, nums, target)
  } else {
    // 去右边做处理
    quickSort(splitIndex + 2, end, nums, target)
  }
}
function swap(st, ed, arr) {
  ;[arr[st], arr[ed]] = [arr[ed], arr[st]]
}

// 3,2, 3
// st = 0
// splitIndex = 1
// i = 0

// 3a, 2, A , 3b

// 2, A, 3a, 3b

// st = 0
// splitIndex = 0
// i = 0

//  2, A, 3a, 3b

// 2,  3b, 3a

// st = 2
// splitIndex = 1
// i = 0

// console.log(
//   findKthLargest2(
//     [3, 2, 3],
//     2
//   )
// )

console.log(findKthLargest2([3, 2, 3, 1, 2, 4, 5, 5, 6], 2))
// console.log(findKthLargest2([3, 2, 1, 5, 6, 4], 4))
// console.log(findKthLargest2([], 2))
// console.log(findKthLargest2([1], 1))
// console.log(findKthLargest2([1, 2], 1))
// console.log(findKthLargest2([2, 1], 1))
// console.log(findKthLargest2([3, 2, 1, 5, 6, 4], 2))
