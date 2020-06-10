//思路 利用对象去存储值，没值创建一个索引，有值自动加一，并且将重复的值从原数组删除， 达到o(1)的复杂度，
//引出一个问题 let i； i < 7 是否为true，按照常理应该是true，但是 NaN < 7 为false， 原因是 NaN 与所有值都不相等，包括它自己
/**
 * @param {number[]} nums
 * @return {number}
 */
//[1,1,1,1,3] [1,2,3,'','']
//[1,1,1,1,3] count 1
//  i 3
//  4
//  [1,3, 1,1,3]

var removeDuplicates = function (nums) {
  let obj = {}
  for (var i = 0; i < nums.length; i++) {
    let item = nums[i]
    if (!obj[item]) {
      obj[item] = 1
    }
    else {
      obj[item]++
      nums.splice(i, 1)
      i--
    }
  }
  return nums.length
}

var removeDuplicates2 = function (nums) {
  let item = nums[0]
  for (var i = 1; i < nums.length; i++) {
    if(item == nums[i]){
      nums.splice(i, 1)
      i--
    } else {
      item = nums[i]
    }
  }
  return nums.length
}

/* 最快*/
var removeDuplicates3 = function (nums) {
  // 校验可以不需要
  if(!nums|| !nums.length)return 0
  let count = 0
  for (var i = 1; i < nums.length; i++) {
    if(nums[i] != nums[i-1]){
      count++
      nums[count] = nums[i]
    }
  }
  return count + 1
}

let arr = [1, 1, 1, 2, 2, 3, 4]
let length = removeDuplicates3(arr)
console.log(arr, length)