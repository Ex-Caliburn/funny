// https://leetcode-cn.com/problems/binary-tree-zigzag-level-order-traversal/submissions/
// 蛇形打印二叉树（之字形）即第一行从左到右的顺序打印，第二行从右到左的顺序打印，第三行又是从做到右的顺序打印
// 0 1 2 6 5 4 3 7 8

//     0
//   1   2
// 3  4  5 6
//    7     8

node = {
  val: 0,
  left: {
    val: 1,
    left: {
      val: 3
    },
    right: {
      val: 4,
      left: {
        val: 7
      }
    }
  },
  right: {
    val: 2,
    left: {
      val: 5
    },
    right: {
      val: 6,
      right: {
        val: 8
      }
    }
  }
}

let arr = []
let subChild = []
function zigzagLevelOrder(nodeArr, dir = 'left') {
  subChild = []
  if (!Array.isArray(nodeArr)) {
    nodeArr = [nodeArr]
  }
  nodeArr.forEach((item) => {
    arr.push(item.val)
    if (dir === 'left') {
      subChild.unshift(item.left, item.right)
    } else {
      subChild.unshift(item.right, item.left)
    }
  })
  subChild = subChild.filter((item) => item)
  if (subChild.length) {
    return zigzagLevelOrder(subChild, dir === 'left' ? 'right' : 'left')
  } else {
    return arr
  }
}

console.log(zigzagLevelOrder(node))

// 循环一定要计算终止条件，多在心里走一边，哪些一眼看出的bug，语法错误，就改掉，早日bug free

function zigzagLevelOrder3(nodeArr) {
  let arr3 = []
  let subChild3 = []
  let temp = []
  if (!Array.isArray(nodeArr)) {
    nodeArr = [nodeArr]
  }
  function _circle(nodeArr, dir = 'right') {
    subChild3 = []
    temp = []
    nodeArr.forEach((item) => {
      if (!item) {
        return
      }
      temp.push(item.val)
      if (dir === 'right') {
        subChild3.unshift(item.left)
        subChild3.unshift(item.right)
      } else {
        subChild3.unshift(item.right)
        subChild3.unshift(item.left)
      }
    })
    if (temp.length) arr3.push(temp)
    subChild3 = subChild3.filter((item) => item)
    if (subChild3.length) {
      return _circle(subChild3, dir === 'left' ? 'right' : 'left')
    } else {
      return arr3
    }
  }
  return _circle(nodeArr)
}

// console.log(zigzagLevelOrder3(node))
