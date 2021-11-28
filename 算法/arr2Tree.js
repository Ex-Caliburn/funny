
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

// console.time(1)
// console.log(arrToTree4(arr))
// console.timeEnd(1)



// 深度遍历 ，溯源， 递归
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
// console.time(2)
// console.log(arrToTree5(arr))
// console.timeEnd(2)


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

console.time(3)
console.log(arrToTree5(arr))
console.timeEnd(3)

// o(n) pid 是按顺序排的，这种情况
function arrToTrr(arr) {
  let itemMap = {}
  let result = []
  for (let i = 0; i < arr.length; i++) {
    let id = arr[i].id
    let pid = arr[i].parentId
    if (!itemMap[id]) {
      itemMap[id] = {
        children: []
      }
    }
    itemMap[id] = {
      ...item,
      children: itemMap[id]['children']
    }
  }
  return result
}