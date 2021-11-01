// 给定一个排序数组和一个目标值，在数组中找到目标值，并返回其索引。如果目标值不存在于数组中，返回它将会被按顺序插入的位置。

// 你可以假设数组中无重复元素。

// 示例 1:

// 输入: [1,3,5,6], 5
// 输出: 2
// 示例 2:

// 输入: [1,3,5,6], 2
// 输出: 1
// https://leetcode-cn.com/problems/search-insert-position
/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number}
 */

// 第一种思路， 简单 但是比所有小的情况我漏了 O(n)
var searchInsert = function (nums, target) {
  let len = nums.length
  if (!nums.length) return -1
  if (target > nums[len - 1]) {
    return len
  }
  for (let i = 0; i < len; i++) {
    if (nums[i] >= target) {
      return i
    }
  }
  return -1
}

console.log(searchInsert([1, 3, 5, 6], 5))
console.log(searchInsert([1, 3, 5, 6], 2))
console.log(searchInsert([1, 3, 5, 6], 7))
console.log(searchInsert([1, 3, 5, 6], 0))

// 2 二分法搜索
// 如果 st !== ed 或者, 说明 nums中没有找到 target， st > ed 说明，目标在右侧，返回st， st < ed 说明，目标在左侧
var searchInsert2 = function (nums, target) {
  let len = nums.length
  if (!nums.length) return -1
  let st = 0
  let ed = len - 1
  let mid
  while (st <= ed) {
    mid = Math.floor((st + ed) / 2)
    if (target > nums[mid]) {
      st = mid + 1
    } else if (target < nums[mid]) {
      ed = mid - 1
    } else {
      return mid
    }
  }
  if (st > ed) {
    return st
  } else {
    return ed
  }
}

  console.log(searchInsert2([1, 3, 5, 6], 5))
  console.log(searchInsert2([1, 3, 5, 6], 2))
  console.log(searchInsert2([1, 3, 5, 6], 7))
  console.log(searchInsert2([1, 3, 5, 6], 0))
