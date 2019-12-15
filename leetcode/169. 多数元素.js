//给定一个大小为 n 的数组，找到其中的多数元素。多数元素是指在数组中出现次数大于 ⌊ n/2 ⌋ 的元素。
//
//你可以假设数组是非空的，并且给定的数组总是存在多数元素。
//
//示例 1:
//
//输入: [3,2,3]
//输出: 3
//示例 2:
//
//输入: [2,2,1,1,1,2,2]
//输出: 2

/**
 * @param {number[]} nums
 * @return {number}
 */
var majorityElement = function(nums) {
  let obj = {}
  for (var i = 0; i < nums.length; i++) {
    var num = nums[i]
    if(obj[num]){
      obj[num]++
      if(obj[num]> nums.length/2){
        return num
      }
    } else {
      obj[num] = 1
    }
  }
  return nums[0]
};

console.log(majorityElement([2]))

/* 投票法，相同的+1，不同减一，这个算法是基于题目，众数总是存在，并且个数> n/2 */
var majorityElement2 = function(nums) {
  if(!nums) return ''
  let major = 0
  let sum = 0
  for (var i = 0; i < nums.length; i++) {
    if(sum === 0){
      major = nums[i]
    }
    sum += nums[i] === major ? 1 : -1
  }
  return major
};

console.log(majorityElement2([6]))
