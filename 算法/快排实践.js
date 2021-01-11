// 一个数量为N的正整数数组，其中一个数字出现次数超过N/2，请将该数字找出来 (请尽量思考最优解)
a = [1, 1, 1, 2, 2]

// 其实这道题就是快速找中间值，想了半天没想到
// 快排的思想是什么，先找个基准值，然后 分两个数组 比大的放右边，小的放左边，然后递归两个数组，再找个基准值，比他大的放右边，小的放做左边，一直递归到1个项

function quickSort(arr) {
  if (arr.length < 2) {
    return arr
  }
  let pivot = arr.pop()
  let [leftArr, rightArr] = [[], []]
  arr.forEach((item) => {
    if (item > pivot) {
      rightArr.push(item)
    } else {
      leftArr.push(item)
    }
  })
  return quickSort(leftArr).concat(pivot, quickSort(rightArr))
}
// let arr = [1, 2, 3, 4, 1, 2, 3, 2, 1, 2]

// let temp = quickSort(arr)
// console.log(temp, temp[Math.ceil(temp.length / 2)])

// 不使用新数组，通过指针偏移完成，一个指针指向左边，一个指向右边，一般基准是右边，我选左边只是方便
// 两个指针相当于挡板，隔离开比他大的，和小的，最后把 left 和pivot互换，看你基准是选择第一个还是最后一个

//  1  3  5  2 1
//  1  3  5  2 1
// ｜  1  3  5  2 ｜ 1
// ｜  1  3  5  2 ｜ 1
// ｜  3  5  2 ｜ 1 1
// ｜   5  2 ｜3 1 1
// ｜    2 ｜5 3 1 1
// ｜   ｜2 5 3 1 1
function _quickSort(arr, firstIndex, endIndex) {
  if (firstIndex >= endIndex){
    return
  }
  // 随机数
  // let index = Math.round(Math.random() * arr.length)
  // swap(arr, firstIndex, index)
  let pivot = arr[firstIndex]
  let st = firstIndex + 1
  let ed = endIndex
  while (st <= ed) {
    if (arr[st] <= pivot) {
      st++
    } else if (arr[st] > pivot) {
      swap(arr, st, ed)
      ed--
    }
  }
  swap(arr, firstIndex, --st)
  _quickSort(arr, firstIndex,ed-1)
  _quickSort(arr, ed+1, endIndex)
  return arr
}

function quickSort2(arr) {
  if (!arr || arr.length < 2){
    return arr
  }
  return _quickSort(arr, 0 , arr.length - 1)
}

function swap(arr, st, ed) {
  ;[arr[st], arr[ed]] = [arr[ed], arr[st]]
}

let arr2 = [1, 2, 3, 4, 1, 2, 3, 2, 1, 2]
console.log(quickSort2(arr2))