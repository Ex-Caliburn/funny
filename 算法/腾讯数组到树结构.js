// 数组到树

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

0
    1
        3
            6
        4
            8
    5
    7

/*  递归实现， 不清晰，脑子潜意识就是递归 */
function arrToTree(arr) {
  let router = {}
  router.root = arr.find((item) => item.parentId === 0)
  function search(tree, parentId) {
    if (!tree.child) {
      tree.child = []
    }
    arr.map((item) => {
      if (item.parentId === parentId) {
        tree.child.push(item)
        search(item, item.id)
      }
    })
  }
  search(router.root, router.root.id)
  return router
}

// console.time(1)
// // arrToTree(arr)
// console.log(JSON.stringify(arrToTree(arr)))
// console.timeEnd(1)

/* 2 先抽取相同子元素， 从上往下 */
function arrToTree2(arr) {
  let router = {}
  let temp = {}
  router.root = arr.find((item) => item.parentId === 0)
  arr.forEach((item) => {
    if (!temp[item.parentId]) {
      temp[item.parentId] = [item]
    } else {
      temp[item.parentId].push(item)
    }
  })
  function appendChild(parent) {
    if (temp[parent.id]) {
      parent.children = temp[parent.id]
      parent.children.map((item) => {
        appendChild(item)
      })
    }
  }
  appendChild(router.root)
  return router
}

// console.time(2)
// // arrToTree(arr)
// console.log(JSON.stringify(arrToTree2(arr)))
// console.timeEnd(2)

/* 从底层到上层组装， 利用js引用数据的特性*/
function arrToTree3(arr) {
  let temp = {}
  let rootId = arr.find((item) => item.parentId === 0).id
  arr.forEach((item) => {
    temp[item.id] = item
  })
  arr.map((item) => {
    if (item.id !== rootId) {
      if (temp[item.parentId].children) {
        temp[item.parentId].children.push(item)
      } else {
        temp[item.parentId].children = [item]
      }
    }
  })
  return temp[rootId]
}

console.time(3)
// arrToTree(arr)
console.log(JSON.stringify(arrToTree3(arr)))
console.timeEnd(3)

// let res = {
//   root: {
//     id: 2,
//     name: '部门B',
//     parentId: 0,
//     child: [
//       {
//         id: 1,
//         name: '部门A',
//         parentId: 2,
//         child: [
//           {
//             id: 3,
//             name: '部门C',
//             parentId: 1,
//             child: [{ id: 6, name: '部门F', parentId: 3, child: [] }]
//           },
//           {
//             id: 4,
//             name: '部门D',
//             parentId: 1,
//             child: [{ id: 8, name: '部门H', parentId: 4, child: [] }]
//           }
//         ]
//       },
//       { id: 5, name: '部门E', parentId: 2, child: [] },
//       { id: 7, name: '部门G', parentId: 2, child: [] }
//     ]
//   }
// }


