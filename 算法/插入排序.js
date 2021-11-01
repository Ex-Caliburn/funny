function sort(arr) {
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
// console.log(sort(arr))

function sort2(arr) {
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
// console.log(sort2(arr2))

function sort3(arr) {
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
console.log(sort3(arr3))
