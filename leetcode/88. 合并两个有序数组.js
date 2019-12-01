//给定两个有序整数数组 nums1 和 nums2，将 nums2 合并到 nums1 中，使得 num1 成为一个有序数组。
//
//说明:
//
//  初始化 nums1 和 nums2 的元素数量分别为 m 和 n。
//你可以假设 nums1 有足够的空间（空间大小大于或等于 m + n）来保存 nums2 中的元素。
//示例:
//
//  输入:
// nums1 = [1,2,3,0,0,0], m = 3
// nums2 = [2,5,6],       n = 3
//
//输出: [1,2,2,3,5,6]

/**
 * @param {number[]} nums1
 * @param {number} m
 * @param {number[]} nums2
 * @param {number} n
 * @return {void} Do not return anything, modify nums1 in-place instead.
 */
var merge = function (nums1, m, nums2, n) {
  nums1.splice(m, n, ...nums2)
  nums1.sort((a, b) => a - b)
}

var merge2 = function (nums1, m, nums2, n) {
  let len = m
  nums1.splice(m, n)
  for (var i = n-1; i > -1; i--) {
    if (nums2[i] >= nums1[m-1] || !len || m===0) {
      nums1.splice(len ? m : 0, 0, nums2[i])
    } else {
      i++
      m--
    }
  }
}

var merge2 = function (nums1, m, nums2, n) {
  let len = m
  nums1.splice(m, n)
  for (var i = n-1; i > -1; i--) {
    if (nums2[i] >= nums1[m-1] || !len || m===0) {
      nums1.splice(len ? m : 0, 0, nums2[i])
    } else {
      i++
      m--
    }
  }
}


let arr1 = [1]
let arr2 = []
let arr3 = arr1.concat(Array(arr2.length).fill(0))
merge2(arr3, arr1.length, arr2, arr2.length)
console.log(arr3)