/**
 * @param {number[]} height
 * @return {number}
 */
var maxArea = function (height) {
  let area = 0
  let len = height.length
  for (let i = 0; i < len; i++) {
    for (let j = i + 1; j < len; j++) {
      area = Math.max(Math.min(height[i], height[j]) * (j - i), area)
    }
  }
  return area
}

console.log(maxArea([1, 2, 3, 4, 2, 3, 4]))
console.log(maxArea([]))
console.log(maxArea([1]))

// 暴力法，两次遍历，计算出所有可能，得出 最大面积
// 双休指针，两侧，每次移动小的那边

var maxArea2 = function (height) {
  let right = height.length - 1
  let left = 0
  let area = 0
  while (right > left) {
    area = Math.max(Math.min(height[left], height[right]) * (right - left), area)
    if (height[left] > height[right]) {
      right--
    } else {
      left++
    }
  }
  return area
}

console.log(maxArea2([1, 2, 3, 4, 2, 3, 4]))
console.log(maxArea2([]))
console.log(maxArea2([1]))


// 证明
// 假设 y >=x 
area = Math.min(x, y) * t

// 先移动左边， t2 < t
// 假设 y2 > y
area2 = Math.min(x, y2) * t2
Math.min(x, y2) = Math.min(x, y) = x
// 假设 y2 <= y
area3 = Math.min(x, y2) * t2
Math.min(x, y2) <= Math.min(x, y) // 最大也只是相等， 加上 * t2条件，就不可能相等了
area > area2 
area > area3

// 我们可以断定，如果我们保持左指针的位置不变，那么无论右指针在哪里，这个容器的容量都不会超过 x * t 了。
// 注意这里右指针只能向左移动，因为 我们考虑的是第一步，也就是 指针还指向数组的左右边界的时候。

// 即无论我们怎么移动右指针，得到的容器的容量都小于移动前容器的容量。也就是说，这个左指针对应的数不会作为容器的边界了，
// 那么我们就可以丢弃这个位置，将左指针向右移动一个位置，此时新的左指针于原先的右指针之间的左右位置，才可能会作为容器的边界。

// 这样以来，我们将问题的规模减小了 1，被我们丢弃的那个位置就相当于消失了。此时的左右指针，
// 就指向了一个新的、规模减少了的问题的数组的左右边界，因此，我们可以继续像之前 考虑第一步 那样考虑这个问题：

// 求出当前双指针对应的容器的容量；

// 对应数字较小的那个指针以后不可能作为容器的边界了，将其丢弃，并移动对应的指针。

