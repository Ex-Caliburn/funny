// 思想： 每次把最小的选择出来
// 利用挡板法，少用一个数组

function sort(arr) {
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      //   console.log(i, j, arr[i], arr[j])
      if (arr[i] > arr[j]) {
        swap(arr, i, j)
      }
    }
  }
  return arr
}

//  优化, 只在便利完了在交换
// 选择排序的最后一轮可以省略，因为只剩下最大的那个元素了；

function sort2(arr) {
  let min
  for (let i = 0; i < arr.length - 1; i++) {
    min = i
    for (let j = 1 + 1; j < arr.length; j++) {
      if (arr[min] > arr[j]) {
        min = j
      }
    }
    swap(arr, i, min)
  }
  return arr
}

function swap(arr, st, ed) {
  ;[arr[st], arr[ed]] = [arr[ed], arr[st]]
}

let arr = [1, 2, 3, 4, 1, 2, 3, 2, 1, 2]
console.log(sort(arr))
let arr2 = [1, 2, 3, 4, 1, 2, 3, 2, 1, 2]
console.log(sort(arr2))

// 选择排序并没有稳定性。
// swap时 导致位置乱了

// 我们以为两层循环就是 O(n^2), 这就太偷懒了
// 其实 时 n-1, ...  2 之和 1/2*n^2

/**
时间复杂度
最内层的 if 语句每执行一次是 O(1) ，那么要执行多少次呢？

当 i = 0 时，是 n-1 次；当 i = 1 时，是 n-2 次；...最后是 1 次；
所以加起来，总共是：
(n-1) + (n-2) + … + 1 = n*(n-1) / 2 = O(n^2)
是这样算出来的，而不是一拍脑袋说两层循环就是 O(n^2).

空间复杂度
这个很简单，最多的情况是 call swap() 的时候，然后 call stack 上每一层就用了几个有限的变量，所以是 O(1)。
那自然也是原地排序算法了。
稳定性

这个答案是否定的，选择排序并没有稳定性。
因为交换的过程破坏了原有的相对顺序，比如: {5, 5, 2, 1, 0} 这个例子，第一次交换是 0 和 第一个 5 交换，
于是第一个 5 跑到了数组的最后一位，且再也无翻身之地，所以第一个 5 第二个 5 的相对顺序就已经打乱了

 */
