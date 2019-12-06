// 给定一个已按照升序排列 的有序数组，找到两个数使得它们相加之和等于目标数。
//
// 函数应该返回这两个下标值 index1 和 index2，其中 index1 必须小于 index2。
//
// 说明:
//
//   返回的下标值（index1 和 index2）不是从零开始的。
// 你可以假设每个输入只对应唯一的答案，而且你不可以重复使用相同的元素。
// 示例:
//
//   输入: numbers = [2, 7, 11, 15], target = 9
// 输出: [1,2]
// 解释: 2 与 7 之和等于目标数 9 。因此 index1 = 1, index2 = 2 。

/**
 * @param {number[]} numbers
 * @param {number} target
 * @return {number[]}
 */
/* 暴力法 */
var twoSum = function(numbers, target) {
let res = []
  for (var i = 0; i < numbers.length; i++) {
    for (var j = i +1; j < numbers.length; j++) {
      if (numbers[i] + numbers[j] === target) {
        res.push(i + 1, j+1)
      }
    }
  }
return res
};

/* hashmap 一次遍历*/
var twoSum = function(numbers, target) {
  let res = []
  let hashMap = {}
  for (var i = 0; i < numbers.length; i++) {
    let item = numbers[i]
    if (hashMap[target - item]) {
      return [hashMap[target-item],i+1]
    }
    hashMap[item] = i + 1
  }
  return res
};


/* 双指针，如果大小指针和大于 目标数，大指针减一，小于目标数，小指针加1，这都是建立在数组排序之后的 */
var twoSum = function(numbers, target) {
  let lowI = 0
  let hightI = numbers.length -1
  while (lowI < hightI) {
    if (numbers[lowI] +  numbers[hightI] ===  target) {
      return  [lowI +1, hightI +1]
    } else if(numbers[lowI] +  numbers[hightI] >  target) {
      hightI--
    } else {
      lowI++
    }
  }
  return []
};

console.log(twoSum([1, 7, 11,-2, 15], 9))
