//给定一个非空整数数组，除了某个元素只出现一次以外，其余每个元素均出现两次。找出那个只出现了一次的元素。
//
//说明：
//
//你的算法应该具有线性时间复杂度。 你可以不使用额外空间来实现吗？
//
//示例 1:
//
//输入: [2,2,1]
//输出: 1
//示例 2:
//
//输入: [4,1,2,1,2]
//输出: 4
/**
 * @param {number[]} nums
 * @return {number}
 */
var singleNumber = function(nums) {
  nums = nums.sort((a,b) => {
   return a - b
  })
  for (var i = 0; i < nums.length; i++) {
    if(nums[(2*i+1)]!== nums[2*i]){
      return nums[2*i]
    }
  }
};

/* 复杂度 o(n) 位运算 */
var singleNumber = function(nums) {
  let ans = 0;
  for(const num of nums) {
    ans ^= num;
  }
  return ans;
};

console.log(singleNumber([2,2,1]))