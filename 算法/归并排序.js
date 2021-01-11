/**
 * 代码题目——有序数组合并
 * 输入：给定两个有序数组作为输入
 * 输出：合并为一个有序数组
 * 注意：数组不一定等长
 * @param arr1 [1, 2, 5]
 * @param arr2 [3, 7]
 */

//  第一次我的思路， 先处理 极端情况， 一个数组的开头和另一个数组的结尾比较，总共两次
// 然后处理普通情况，把arr1当容器，把arr2各项插入到arr1中来，
// 第一种情况， arr2比arr1[i]小，直接插入 arr1[i]前面
// 第2种情况， arr2比arr1[i]大，但是不能直接插入在 arr1[i] 后面，需要比较 arr1[i+1]，介于两者之间才能插入之间
// 第3种情况， arr2比arr1[i]大，如果是arr1[i]是最后一项，arr2直接插入arr1后面，终止循环
// 我这种写法考虑的情况太多了，在面试中很难手写完整和正确！！！

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
      // arr1.splice(i + 1, 0, arr2.shift())
       // 换一种写法 提前break
       arr1 = arr1.concat(arr2)
      break
    }
  }
  return arr1
}

// console.log(merge([1, 2, 5, 8], [3, 7]))
// console.log(merge([1, 2, 5, 8], [3, 7, 9, 11]))

// 刚开始我是用得 pop，这样我还要获取到数组的长度，取到数组中最后一项
// 改成 数组第一项就好了，直接shift()和[0]就可以获取
const merge2 = (arr1, arr2) => {
  let temp = []
  while (arr1.length && arr2.length) {
    if (arr1[0] < arr2[0]) {
      temp.push(arr1.shift())
    } else {
      temp.push(arr2.shift())
    }
  }
  return temp.concat(arr1, arr2)
}
// console.log(merge2([1, 2, 5, 8], [3, 7, 9, 11]))

// 归并排序是用分治思想，分治模式在每一层递归上有三个步骤：

// 分解（Divide）：将n个元素分成个含n/2个元素的子序列。
// 解决（Conquer）：用合并排序法对两个子序列递归的排序。
// 合并（Combine）：合并两个已排序的子序列已得到排序结果。

// 非排序数组 分而治之
function sort(arr) {
  if (arr.length < 2) {
    return arr
  }
  // 这是一步优化，如果只有两项就不需要进入递归，面试时可以不写
  // if (arr.length === 2) {
  //   if (arr[0] > arr[1]) {
  //     return [arr[1], arr[0]]
  //   } else {
  //     return [arr[0], arr[1]]
  //   }
  // }
  let leftArr = arr.splice(0,  Math.ceil(arr.length / 2))
  return mergeSort(sort(arr.splice(0,  Math.ceil(arr.length / 2))), sort(arr))
}

function mergeSort(arr1, arr2) {
  let temp = []
  while (arr1.length && arr2.length) {
    if (arr1[0] > arr2[0]) {
      temp.push(arr2.shift())
    } else {
      temp.push(arr1.shift())
    }
  }
  return temp.concat(arr1, arr2)
}

console.time(1)
console.log(sort([1, 2, 5, 8, 1, 2, 3, 1]))
console.timeEnd(1)

// mergeSort(sort([1, 2, 5, 8]), sort([ 1, 2, 3, 1]))

// mergeSort(mergeSort(sort(1,2), sort(5,8)), mergeSort(sort(1,2), sort(3, 1)))

// mergeSort(mergeSort(sort(mergeSort(1),mergeSort(2)), sort(mergeSort(5),mergeSort(8))), mergeSort(sort(mergeSort(1),mergeSort(2)), sort(mergeSort(3), mergeSort(1))))

// mergeSort(mergeSort(sort([1],[2]), sort([5],[8]])), mergeSort(sort([1],[2]), sort([3], [1])))

// mergeSort(mergeSort([1,2], [5,8]), mergeSort([1,2], [1,3])

// mergeSort([1,2,5,8], [1,1,,2,3])

// [1,1,1,2,2,3,5,8]


// 平均时间复杂度：O(nlogn)
// 最佳时间复杂度：O(n)
// 最差时间复杂度：O(nlogn)
// 空间复杂度：O(n)
// 排序方式：In-place
// 稳定性：稳定

//   in-place操作，意思是所有的操作都是”就地“操作，不允许进行移动，或者称作 原位操作，即不允许使用临时变量。

// 时间复杂度：O(N*logN) 为什么 O(N*logN)

// 时间复杂度分析：
// 分的过程需要三步：
// log8 = 3，而每一步都需要遍历一次8个元素，
// 所以8个元素共需要运行 8log8 次指令，那么对于 n 个元素，时间复杂度为 O(nlogn)。

// 归并排序算法中，归并最后到底都是相邻元素之间的比较交换，并不会发生相同元素的相对位置发生变化，故是稳定性算法。