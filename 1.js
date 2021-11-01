// 1.封装一个Modal对话框组件
// 第一道题反而是思路重要，什么都没给你
// 几种方案，一种原生，一种框架， 原生中还有基础html和webComponent

// 2.防抖截流代码实现

// function debounce(fn, interval) {
//   let time = Date.now()
//   let timer = null
//   return function () {
//     let now = Date.now()
//     // console.log(timer)
//     if (!timer) {
//       execute()
//     } else if (now - time < interval) {
//       time = now
//       execute()
//     }
//     function execute() {
//       clearTimeout(timer)
//       timer = setTimeout(() => {
//         fn()
//         clearTimeout(timer)
//         timer = null
//       }, interval)
//     }
//   }
// }

// cb = debounce(function () {
//   console.log(500)
// }, 500)

// cb()
// cb()
// cb()
// setTimeout(() => {
//   cb()
// }, 800)

// 3.关系型数组转换成树形结构对象
// var obj = [
//     { id:3, parent:2 },
//     { id:1, parent:null },
//     { id:2, parent:1 }
// ]
// 转换成
// var result = {
//   id: 1,
//   parent: null,
//   children: [{
//     id: 2,
//     parent: 1,
//     children: [{
//       id: 3,
//       parent: 2
//     }]
//   }]
// }


// 4.数组全排列
// var arr = [1,2,3];
// 预期结果
// [[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]


/**
 * @param {arr[]} arr
 * @return {number[][]}
 */
// 溯源， 深度遍历有点像， 更像深度遍历的一种实现， 剪枝完了之后，返回上一个状态，继续前进，是一个个把果实塞进篮子的
function permute(arr) {
  const res = []
  const path = []
  backtracking(arr, arr.length, [])
  return res

  function backtracking(nums, len, used) {
    if (path.length === len) {
      // 为什么要Array.from()  断开引用关系
      res.push(Array.from(path))
      return
    }
    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue
      used[i] = 1
      path.push(nums[i])
      backtracking(nums, len, used)
      path.pop()
      used[i] = 0
    }
  }
}

const arr = [
  { id: 2, name: '部门B', parentId: 0 },
  { id: 3, name: '部门C', parentId: 1 },
  { id: 1, name: '部门A', parentId: 2 },
  { id: 4, name: '部门D', parentId: 1 },
  { id: 5, name: '部门E', parentId: 2 },
  { id: 6, name: '部门F', parentId: 3 },
  { id: 7, name: '部门G', parentId: 2 },
  { id: 8, name: '部门H', parentId: 4 }
]

// 引用的关系
function arrToTree4(arr) {
  let temp = {}
  root = arr.find((item) => item.parentId === 0)
  arr.forEach((item) => {
    temp[item.id] = item
  })
  arr.forEach((item) => {
    if (temp[item.parentId]) {
      if (temp[item.parentId].children) {
        temp[item.parentId].children.push(item)
      } else {
        temp[item.parentId].children = [item]
      }
    }
  })
  return temp[root.id]
}

// 深度遍历 ， 溯源， 递归
// 优化，改变原数组， 用完剔除数组，或者复制数组
// 还不能删除，可能导致，前面的栈崩塌
function arrToTree5(arr) {
  let root = arr.find((item) => item.parentId === 0)
  function searchChildren(parent, parentId) {
    for (let i = 0; i < arr.length; i++) {
      let item = arr[i]
      if (item.parentId === parentId) {
        if (parent.children) {
          parent.children.push(item)
        } else {
          parent.children = [item]
        }
        searchChildren(item, item.id)
      }
    }
  }
  searchChildren(root, root.id)
  return root
}
// console.log(arrToTree5(arr))

// 同层遍历
function arrToTree6(arr) {
  let root = arr.find((item) => item.parentId === 0)
  function searchChildren(parent, parentId) {
    parent.children = arr.filter((item) => item.parent === parentId)
    for (let index = 0; index < parent.children.length; index++) {
      searchChildren(parent.children[i], parent.children[i].id)
    }
  }
  searchChildren(root, root.id)
  return root
}

console.log(arrToTree5(arr))
