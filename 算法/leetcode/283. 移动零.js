/**
 * @param {number[]} nums
 * @return {void} Do not return anything, modify nums in-place instead.
 */
// times 误打误撞， 最后一个无论是什么都不需要换位置
// 缺点，时间复杂高
var moveZeroes = function (nums) {
    let count = 0
    let times = nums.length - 1
    for (let i = 0; i < times - count; i++) {
        if (nums[i] === 0) {
            count++
            nums.push(nums[i])
            nums.splice(i, 1)
            i--
        }
    }
    return nums
};

console.log(moveZeroes([1, 1, 1, 3, 12, 0, 1]))


// 思路2，将指针互换，所以这是考研基本功  刚开始我发现，把0还到后面有点难，把非0换在前面比较简单，我还写错了
var moveZeroes2 = function (nums) {
    let times = nums.length
    let j = 0
    for (let i = 0; i < times; i++) {
        if (nums[i] !== 0 && i !== j && nums[j] === 0) {
            nums[j] = nums[i]
            nums[i] = 0
            j++
        }
    }
    return nums
};

console.log(moveZeroes2([0, 1, 0, 3, 12, 0]))
console.log(moveZeroes2([2, 1]))
console.log(moveZeroes2([1,0,1]))

// 优化，条件越多，就越难考虑周全， 其实是双指针
var moveZeroes3 = function (nums) {
    let times = nums.length
    let j = 0
    for (let i = 0; i < times; i++) {
        if (nums[i] !== 0) {
            if (i !== j) {
                nums[j] = nums[i]
                nums[i] = 0
            }
            j++
        }
    }
    return nums
};

console.log(moveZeroes3([0, 1, 0, 3, 12, 0]))
console.log(moveZeroes3([2, 1]))


