// 3. Tree To String
// Please convert a binary tree to a string that consists of parenthesis and integers using postOrder traversing.

let tree = [1, 2, 3, null, 4]

node = {
  val: 1,
  left: {
    val: 2,
    left: {
      val: 4
    },
    right: {
      val: 5
    }
  },
  right: {
    val: 3,
    left: {
      val: 6
    }
  }
}

/**
 * @param {Array<int>} t
 * @return {string}
 */
// 前序遍历首先访问根结点然后遍历左子树，最后遍历右子树。在遍历左、右子树时，仍然先访问根结点，然后遍历左子树，最后遍历右子树。

var postOrder = function (node, str = '') {
  if (!node) {
    return ''
  }
  str += node.val
  return str + postOrder(node.right) + postOrder(node.left)
}

//      1
//   2    3
// 4  5    6

// a c f b e d

console.log('postOrder', postOrder(node))

node2 = {
  val: 1,
  children: [
    {
      val: 2,
      children: [
        null,
        {
          val: 4
        },
        {
          val: 5
        },
        {
          val: 6
        }
      ]
    },
    {
      val: 3,
      children: [
        {
          val: 7
        },
        {
          val: 8
        },
        {
          val: 9
        }
      ]
    }
  ]
}
node3 = {
  val: 1,
  children: [
    {
      val: 2,
      children: [
        null,
        {
          val: 4
        },
        {
          val: 5
        },
        {
          val: 6
        }
      ]
    },
    {
      val: 3,
      children: [
        {
          val: 7
        },
        {
          val: 8
        },
        {
          val: 9
        }
      ]
    }
  ]
}

// n叉树
/**
 * // Definition for a Node.
 * function Node(val, children) {
 *    this.val = val;
 *    this.children = children;
 * };
 */

// 递归 效率不高
var postOrder2 = function (root, stack = []) {
  if (!root) {
    return []
  }
  stack.push(root.val)
  root.children &&
    root.children.reverse().forEach((item) => {
      if (item) {
        postOrder2(item, stack)
      }
    })
  return stack
}
// console.log('postOrder2', postOrder2(node2))

/**
 * @param {Node} root
 * @return {number[]}
 */
// 栈思路
var postOrder3 = function (root) {
  let output = []
  if (!root) {
    return output
  }
  let stack = [root]
  while (stack.length) {
    let item = stack.pop()
    if (item) {
      output.push(item.val)
      item.children && stack.push(...item.children)
    }
  }
  return output
}

console.log('postOrder3', postOrder3(node3))
