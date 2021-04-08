// 广度优先搜索(Breadth First Search)
// 不分行从上到下打印
// 从上往下打印出二叉树的每个节点，同层节点从左至右打印。
//     0
//   1   2
// 3  4  5 6
//    7     8

// 思路 处理每个树节点的同时，把子节点入站，这样就可以循环往复打印，从左到右

function PrintFromTopToBottom(root) {
  let queue = []
  let res = []
  if (root) {
    let currentItem = null
    queue.push(root)
    while (queue.length) {
      currentItem = queue.shift()
      if (currentItem.left) {
        queue.push(currentItem.left)
      }
      if (currentItem.right) {
        queue.push(currentItem.right)
      }
      res.push(currentItem.val)
    }
  }
  return res
}

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

// console.log(PrintFromTopToBottom(node))

function PrintMultiLine(root) {
  let queue = []
  let res = []
  let tempArr = []
  let ed = 1
  if (root) {
    let currentItem = null
    queue.push(root)
    while (queue.length) {
      currentItem = queue.shift()
      if (currentItem.left) {
        queue.push(currentItem.left)
      }
      if (currentItem.right) {
        queue.push(currentItem.right)
      }
      tempArr.push(currentItem.val)
      ed--
      if (ed === 0) {
        res.push(tempArr)
        tempArr = []
        ed = queue.length
      }
    }
  }
  return res
}

// console.log(PrintMultiLine(node))

// 记录方向 1. 循环顺序不变，插入顺序根据行数变化， 2 循环顺序根据行数变化 插入不变
// 队列，先进先出
// 从左至右，下一个开始就是从右至左，注意位置
// 用unshift 插入队首简单，尾部复杂，还需要记住尾部的下标，取下标也麻烦
// 队列，栈可以
function Print(root, dir = 'right') {
  let queue = []
  let res = []
  let tempArr = []
  let evenQueue = []
  let oddQueue = []
  let ed = 1
  if (root) {
    let currentItem = null
    queue.push(root)
    while (queue.length) {
      currentItem = queue.shift()
      //   console.log(queue , dir)
      if (dir === 'right') {
        if (currentItem.left) {
          evenQueue.unshift(currentItem.left)
        }
        if (currentItem.right) {
          evenQueue.unshift(currentItem.right)
        }
      } else {
        if (currentItem.right) {
          oddQueue.unshift(currentItem.right)
        }
        if (currentItem.left) {
          oddQueue.unshift(currentItem.left)
        }
      }
      tempArr.push(currentItem.val)
      ed--
      if (ed === 0) {
        res.push(tempArr)
        tempArr = []
        queue = dir === 'left' ? oddQueue : evenQueue
        dir = dir === 'left' ? 'right' : 'left'
        console.log(JSON.stringify(queue), dir)
        ed = queue.length
      }
    }
  }
  return res
}

function Print2(root, dir = 'right') {
  let queue = []
  let res = []
  let tempArr = []
  let evenQueue = []
  let oddQueue = []
  let ed = 1
  if (root) {
    let currentItem = null
    queue.push(root)
    while (queue.length) {
      currentItem = queue.pop()
      //   console.log(queue , dir)
      if (dir === 'right') {
        if (currentItem.left) {
          evenQueue.push(currentItem.left)
        }
        if (currentItem.right) {
          evenQueue.push(currentItem.right)
        }
      } else {
        if (currentItem.right) {
          oddQueue.push(currentItem.right)
        }
        if (currentItem.left) {
          oddQueue.push(currentItem.left)
        }
      }
      tempArr.push(currentItem.val)
      ed--
      if (ed === 0) {
        res.push(tempArr)
        tempArr = []
        queue = dir === 'left' ? oddQueue : evenQueue
        dir = dir === 'left' ? 'right' : 'left'
        // console.log(JSON.stringify(queue), dir)
        ed = queue.length
      }
    }
  }
  return res
}

// console.log(Print(node, 'left'))
// console.log(Print(node, 'right'))
// console.log(Print2(node, 'left'))
// console.log(Print2(node, 'right'))

//  思路1 从左到右 打印
// 推入数组，然后循环 打印
function printLeftToRight(node) {
  if (!node) {
    return
  }
  if (!Array.isArray(node)) {
    node = [node]
  }
  let len = node.length
  let arr = []
  for (let i = 0; i < len; i++) {
    console.log(node[i].val)
    if (node[i].left) {
      arr.push(node[i].left)
    }
    if (node[i].right) {
      arr.push(node[i].right)
    }
  }
  if (arr.length) printLeftToRight(arr)
}

// printLeftToRight(node)

// 思路2 一次循环 不断往数组后面添加
function printLeftToRight2(node) {
  if (!node) {
    return
  }
  let arr = [node]
  let currentItem
  for (let i = 0; i < arr.length; i++) {
    currentItem = arr[i]
    console.log(currentItem.val)
    if (currentItem.left) {
      arr.push(currentItem.left)
    }
    if (currentItem.right) {
      arr.push(currentItem.right)
    }
  }
}

// printLeftToRight2(node)

// 思路3 以这种思路思考之字打印
function printLeftToRight3(node, dir = 'right') {
  if (!node) {
    return
  }
  let arr = [node]
  let currentItem
  let ed = 0
  let currentLineNum = 1
  let nextLineNum = 0
  for (let i = 0; i < arr.length; i++) {
    currentItem = arr[i]
    console.log(currentItem.val)
    if (currentLineNum === 0) {
      ed = ed + nextLineNum
      currentLineNum = nextLineNum
      nextLineNum = 0
      dir = dir === 'left' ? 'right' : 'left'
    }
    if (dir === 'right') {
      if (currentItem.left) {
        arr.splice(ed + 1, 0, currentItem.left)
        nextLineNum++
      }
      if (currentItem.right) {
        arr.splice(ed + 1, 0, currentItem.right)
        nextLineNum++
      }
    } else {
      if (currentItem.right) {
        arr.splice(ed + 1, 0, currentItem.right)
        nextLineNum++
      }
      if (currentItem.left) {
        arr.splice(ed + 1, 0, currentItem.left)
        nextLineNum++
      }
    }
    currentLineNum--
  }
}

// printLeftToRight3(node)


// 思路4 用数组 这样少了不少遍历，但是空间复杂度会高，，数组的插入删除都是 O(n)，但是清晰
function printLeftToRight4(node, dir = 'right') {
  if (!node) {
    return
  }
  let arr = [node]
  let currentItem
  let newArr = []
  while (arr.length) {
    currentItem = arr.shift()
    console.log(currentItem.val)
    if (dir === 'right') {
      if (currentItem.left) {
        newArr.unshift(currentItem.left)
      }
      if (currentItem.right) {
        newArr.unshift(currentItem.right)
      }
    } else {
      if (currentItem.right) {
        newArr.unshift(currentItem.right)
      }
      if (currentItem.left) {
        newArr.unshift(currentItem.left)
      }
    }
    if (!arr.length) {
      arr = newArr
      newArr = []
      dir = dir === 'left' ? 'right' : 'left'
    }
  }
}

printLeftToRight4(node)
