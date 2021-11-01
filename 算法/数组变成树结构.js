// 按树结构排列，排列一下结构

var data = [
  { parent_id: 0, id: 1, value: 'xxx' },
  { parent_id: 1, id: 3, value: 'xxx' },
  { parent_id: 1, id: 6, value: 'xxx' },
  { parent_id: 2, id: 5, value: 'xxx' },
  { parent_id: 3, id: 4, value: 'xxx' },
  { parent_id: 4, id: 2, value: 'xxx' },
  { parent_id: 4, id: 8, value: 'xxx' },
  { parent_id: 6, id: 7, value: 'xxx' }
]

// 思路
// 首先获取根节点，
// 第二步 然后遍历寻找他的子节点
// 然后在的子节点 ，继续第二步
// 我这写的函数也是有问题  data，应该参数传入，tree 应该是返回出来的东西
var tree = {}
function circle(parentID, parentContainer) {
  // console.log(data, parentID)
  for (var i = 0; i < data.length; i++) {
    let temp = data[i]
    if (!temp.parent_id) {
      tree[temp.id] = { children: {} }
      data.splice(i, 1)
      i--
      circle(temp.id, tree[temp.id])
    }
    if (parentID && temp.parent_id === parentID) {
      parentContainer.children[temp.id] = { children: {} }
      data.splice(i, 1)
      i--
      circle(temp.id, parentContainer.children[temp.id])
    }
  }
}
// console.time(1)
// circle()
// console.timeEnd(1)
// console.log(tree)

// 第二次写，这个思路更清晰，但是会有两个函数，每次都要递归全部，还会修改原数组
//  第二种比第一种稍微快点
// 还没有其他更好办法

var data = [
  { parent_id: 0, id: 1, value: 'xxx' },
  { parent_id: 1, id: 3, value: 'xxx' },
  { parent_id: 1, id: 6, value: 'xxx' },
  { parent_id: 2, id: 5, value: 'xxx' },
  { parent_id: 3, id: 4, value: 'xxx' },
  { parent_id: 4, id: 2, value: 'xxx' },
  { parent_id: 4, id: 8, value: 'xxx' },
  { parent_id: 6, id: 7, value: 'xxx' }
]

function geneTree(arr) {
  let root = arr.find((item) => item.parent_id === 0)
  findChildren(root, arr)
  return root
}
function findChildren(target, arr) {
  arr.forEach((item) => {
    if (item.parent_id === target.id) {
      if (!target.children) {
        target.children = [item]
      } else {
        target.children.push(item)
      }
      findChildren(item, arr)
    }
  })
}
// console.time(2)
// geneTree(data)
// console.timeEnd(2)
// console.log(JSON.stringify(geneTree(data)))

var data = [
  { parent_id: 0, id: 1, value: 'xxx' },
  { parent_id: 0, id: 2, value: 'xxx' },
  { parent_id: 1, id: 3, value: 'xxx' },
  { parent_id: 1, id: 6, value: 'xxx' },
  { parent_id: 2, id: 5, value: 'xxx' },
  { parent_id: 3, id: 4, value: 'xxx' },
  // { parent_id: 4, id: 2, value: 'xxx' },
  { parent_id: 4, id: 8, value: 'xxx' },
  { parent_id: 6, id: 7, value: 'xxx' }
]

// 第三次，优化非递归版, 只用for循环, 会改变愿数组，
function geneTree2(arr) {
  let temp = {} // 存放相同的父亲的子目录
  for (let i = 0; i < arr.length; i++) {
    if (!temp[arr[i].parent_id]) {
      temp[arr[i].parent_id] = []
    }
    temp[arr[i].parent_id].push(arr[i])
  }
  for (const key in temp) {
      temp[key].forEach((item) => (item.children = temp[item.id]))
  }
  return temp[0]
}

console.time(3)
geneTree2(data)
console.timeEnd(3)
console.log(JSON.stringify(geneTree2(data)))
// console.log(geneTree2(data))

var data = [
  { parent_id: 0, id: 1, value: 'xxx' },
  { parent_id: 0, id: 2, value: 'xxx' },
  { parent_id: 1, id: 3, value: 'xxx' },
  { parent_id: 1, id: 6, value: 'xxx' },
  { parent_id: 2, id: 5, value: 'xxx' },
  { parent_id: 3, id: 4, value: 'xxx' },
  // { parent_id: 4, id: 2, value: 'xxx' },
  { parent_id: 4, id: 8, value: 'xxx' },
  { parent_id: 6, id: 7, value: 'xxx' }
]

// 第四次， 左侧导航栏，多个根目录 多个parent_id： 0，只在是 geneTree 稍作了改变
function geneMenu(tree) {
  let menu = tree.filter((item) => item.parent_id === 0)
  menu.forEach((item) => findChildren(item, tree))
  return menu
}

function findChildren(target, arr) {
  arr.forEach((item) => {
    if (item.parent_id === target.id) {
      if (!target.children) {
        target.children = [item]
      } else {
        target.children.push(item)
      }
      findChildren(item, arr)
    }
  })
}

//  console.log(geneMenu(geneMenu))
// console.log(JSON.stringify(geneMenu(data)))
