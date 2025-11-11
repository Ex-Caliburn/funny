// 插入排序（Insertion Sort）
// 核心思想：将数组分为"已排序"和"未排序"两部分，每次从未排序部分取出一个元素，插入到已排序部分的正确位置。
// 工作原理：
// 从第二个元素开始（索引1），作为"当前元素"
// 将当前元素与已排序部分从右到左逐个比较
// 如果已排序元素大于当前元素，则向右移动一位
// 找到正确位置后，插入当前元素
// 重复直到所有元素都插入到正确位置

function insertionSort(arr) {
  for (let i = 1; i < arr.length; i++) {
    for (let j = i - 1; j >= 0; j--) {
      console.log(arr[i], arr[j], i, j)
      if (arr[i] >= arr[j]) {
        if (i !== j + 1) {
          arr.splice(j + 1, 0, arr.splice(i, 1)[0])
        }
        break // 我用错了continue
      } else if (j === 0) {
        arr.splice(j, 0, arr.splice(i, 1)[0])
      }
    }
  }
  return arr
}

// let arr = [1, 2, 3]
// console.log(insertionSort(arr))

function insertionSort2(arr) {
  let st = 0 // 已排序的下标
  let ed = 1 // 遮挡版 ed之前都是已经排序的
  while (ed < arr.length && st >= 0) {
    if (arr[ed] >= arr[st]) {
      arr.splice(st + 1, 0, arr.splice(ed, 1)[0])
      ed++
      st = ed
    } else if (st === 0) {
      arr.splice(st, 0, arr.splice(ed, 1)[0])
      ed++
      st = ed
    }
    st--
  }
  return arr
}
// let arr2 = [1,3,1,4,1, 2, 3]
// console.log(insertionSort2(arr2))

function insertionSort3(arr) {
  let j
  for (let i = 1; i < arr.length; i++) {
    j = i - 1
    while (j >= 0) {
      console.log(i, j)
      if (arr[i] >= arr[j]) {
        arr.splice(j + 1, 0, arr.splice(i, 1)[0])
        break
      } else if (j === 0) {
        arr.splice(j, 0, arr.splice(i, 1)[0])
      }
      j--
    }
  }
  return arr
}
let arr3 = [1, 3, 1, 4, 1, 2, 3]
console.log(insertionSort3(arr3))

//test 不要输入提示, 外层循环所有，已经排序的在排序一次，插入到合适的位置
let arr3 = [1, 3, 1, 4, 1, 2, 3]
// [1,3]
// [1, 1, 3]
// [1, 1, 3, 4]
// [1, 1, 1, 3, 4]
// [1, 1, 1, 2,3, 4]
// [1, 1, 1, 2,3, 3, 4]

// 不影响顺序 换一种写法
function insertionSort4(arr) {
  for (let i = 1; i < arr.length; i++) {
    for (let j = i + 1; j > 0; j--) {
      if (arr[j] < arr[j - 1]) {
        // 如果小，则交换，相当于插入 交换法可行但写入多，移动法更优。
        ;[arr[j], arr[j - 1]] = [arr[j - 1], arr[j]]
      } else {
        break
      }
    }
  }
  return arr
}
console.log(insertionSort4(arr3))

let arr4 = [1, 3, 1, 4, 1, 2, 3]
// 相遇于，大的往右边移动，挪一个位置
function insertionSort5(arr) {
  for (let i = 1; i < arr.length; i++) {
    let current = arr[i] // 当前要插入的元素
    let j = i - 1 // 已排序部分的最后一个索引

    // 从右到左找到插入位置
    while (j >= 0 && arr[j] > current) {
      arr[j + 1] = arr[j] // 向右移动
      j--
    }

    arr[j + 1] = current // 插入元素
  }
  return arr
}
