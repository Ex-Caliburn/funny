/**
 * 代码题目——有序数组合并
 * 输入：给定两个有序数组作为输入
 * 输出：合并为一个有序数组
 * 注意：数组不一定等长
 * @param arr1 [1, 2, 5]
 * @param arr2 [3, 7]
 */
const merge = (arr1, arr2) => {
  if (arr1[arr1.length - 1] <= arr2[0]) {
    return arr1.concat(arr2)
  } else if (arr1[0] >= arr2[arr2.length - 1]) {
    return arr2.concat(arr1)
  }
  for (let i = 0; i < arr1.length; i++) {
    if (arr2[0] <= arr1[i]) {
      arr1.splice(i, 0, arr2.shift())
    } else if (arr2[0] > arr1[i] && arr1[i + 1] && arr1[i + 1] > arr2[0]) {
      arr1.splice(i + 1, 0, arr2.shift())
    } else if (arr2[0] > arr1[i] && !arr1[i + 1]) {
      arr1.splice(i + 1, 0, arr2.shift())
    }
  }
  return arr1
}

console.log(merge([1, 2, 5, 8], [3, 7]))

const merge2 = (arr1, arr2) => {
  let temp = []
  while (arr1.length !== 0 && arr2.length !== 0) {
    if (arr1[arr1.length - 1] >= arr2[arr2.length - 1]) {
      temp.push(arr1.pop())
    } else {
      temp.push(arr2.pop())
    }
  }
  return temp.concat(arr1, arr2)
}
console.log(merge2([1, 2, 5, 8], [3, 7]))
