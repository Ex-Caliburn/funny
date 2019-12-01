//给定一个整数数组 nums ，找到一个具有最大和的连续子数组（子数组最少包含一个元素），返回其最大和。
//
//示例:
//
//  输入: [-2,1,-3,4,-1,2,1,-5,4],
//    输出: 6
//解释: 连续子数组 [4,-1,2,1] 的和最大，为 6。
//进阶:
//
//  如果你已经实现复杂度为 O(n) 的解法，尝试使用更为精妙的分治法求解。
/**
 * @param {number[]} nums
 * @return {number}
 */
/* 两次成功，没考虑到负数的情况*/
var maxSubArray = function(nums) {
  let maxVal = nums[0]
  let val= 0
  let len = nums.length
  for (var i = 0; i < len; i++) {
    val = 0
    for (var j = i; j < len; j++) {
      val += nums[j]
      maxVal= Math.max(val, maxVal)
    }
  }
  return maxVal
};

/* 动态规划的思路 如果大于0，可以有继续累加负数的资本，小于等于0，舍弃，没有存在的意义， */
var maxSubArray2 = function(nums) {
  let ans = nums[0];
  let sum = 0;
  for(const num of nums) {
    // if(sum > 0) { 可以写成这样 更容易理解
    // if(sum + num > num )
    // 简洁写法 sum = Math.max(sum + num, num)
    if(sum > 0) {
      sum += num;
    } else {
      sum = num;
    }
    ans = Math.max(ans, sum)
  }
  return ans;
};

function  maxSubArray3  ( nums ) {
  if (!nums.length) {
    return;
  };
  // 在每一个扫描点计算以该点数值为结束点的子数列的最大和（正数和）。
  let max_ending_here = nums[0];
  let max_so_far = nums[0];

  for (let i = 1; i < nums.length; i ++ ) {
    // 以每个位置为终点的最大子数列 都是基于其前一位置的最大子数列计算得出,

    max_ending_here = Math.max ( nums[i], max_ending_here + nums[i]);
    max_so_far = Math.max ( max_so_far, max_ending_here);
  };

  return max_so_far;
};

/*  清晰一点，但是修改了原数组 */
function LSS(list) {
  const len = list.length;
  let max = list[0];
  for (let i = 1; i < len; i++) {
    list[i] = Math.max(0, list[i - 1]) + list[i];
    if (list[i] > max) max = list[i];
  }

  return max;
}

let arr = [3,-1,4]
let maxVal = maxSubArray(arr)
console.log(maxVal)