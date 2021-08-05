/**
 * Definition for a binary tree node.
 * function TreeNode(val, left, right) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.left = (left===undefined ? null : left)
 *     this.right = (right===undefined ? null : right)
 * }
 */

//  输入: 二叉树: [1,2,3,null,4]
//  1
// /   \
// 2     3
// \
// 4

// [5, 4, 7, 3, null, 2, null, -1, null, 9]

//       5
//      / \
//     4   7
//    /   /
//   3   2
//  /   /
// -1  9

// 找规律， 子树的数量是2的幂函数
// 用双指针，一个指针指向 父， 另一个指向 孩子，但是有递归的问题
// 2N, 错误，双指针不行， 幂函数也不行
// function  arr2Tree (arr) {
//   let root = {}
//   if (!arr.length) {
//     return {}
//   }
//   let root = {
//     val: arr[0]
//   }
//   concatChild(root, 0, arr, 0)
//   return root
// }

// function concatChild(root, floor, arr, coordinate) {
//   let index = Math.pow(2, floor) + coordinate
//   if (arr[index]) {
//     root.left = {
//       val: arr[index]
//     }
//   } else {
//     root.left = null
//   }
//   if (arr[index+1]) {
//     root.right = {
//       val: arr[index+1]
//     }
//   } else {
//     root.right = null
//   }
//   floor++
//   concatChild(root.left, floor, arr, coordinate)
//   concatChild(root.right, floor, arr, coordinate + 2 )
// }

const arr = [5, 4, 7, 3, null, 2, null, -1, null, 9]

//       5
//     4  7
//  3 n 2 n
// -1   9
// 返过来思考，同层打印反过来

function arr2Tree(arr) {
  let root = {}
  if (!arr.length) {
    return {}
  }
  root.val = arr.shift()
  let stack = [root] // 存储同一层
  // let nextStack = []

  while (stack.length) {
    let parent = stack.shift()
    let i = 0
    while (i < 2 && arr.length) {
      let child = arr.shift()
      console.log(i, parent, child)
      if (i === 0) {
        if (child) {
          parent.left = {
            val: child
          }
          stack.push(parent.left)
        } else {
          parent.left = null
        }
      } else {
        if (child) {
          parent.right = {
            val: child
          }
          stack.push(parent.right)
        } else {
          parent.right = null
        }
      }
      i++
    }
  }
  return root
}
console.log(JSON.stringify(arr2Tree(arr)))
