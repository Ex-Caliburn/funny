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
  router.root = arr.filter((item) => item.parentId === 0)[0]
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

console.time(1)
// arrToTree(arr)
console.log(JSON.stringify(arrToTree(arr)))
console.timeEnd(1)

/* 使用栈  出入栈*/
// function arrToTree(arr) {
//   let router = {}
//   router.root = arr.filter((item) => item.parentId === 0)[0]
//   let stack = []

//   return router
// }

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

