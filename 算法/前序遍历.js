// 3. Tree To String
// Please convert a binary tree to a string that consists of parenthesis and integers using preorder traversing.

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

var tree2str = function (node, str = '') {
  if (!node) {
    return ''
  }
  str += node.val
  return str + tree2str(node.left) + tree2str(node.right)
}

//      1
//   2    3
// 4  5    6

// a b d e c f

console.log(tree2str(node))

node2 = {
  val: 1,
  children: [
    {
      val: 2,
      children: [
        {
          val: null
        },
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
var preorder2 = function (root, stack = []) {
  if (!root) {
    return []
  }
  console.log(root.val)
  stack.push(root.val)
  root.children &&
    root.children.forEach((item) => {
      if (item) {
        preorder2(item, stack)
      }
    })
  return stack
}

/**
 * @param {Node} root
 * @return {number[]}
 */
// 栈思路
// 将前面的放在后面，让其先出栈，然后出栈操作
var preorder = function (root) {
  let output = []
  if (!root) {
    return output
  }
  let stack = [root]
  while (stack.length) {
    let item = stack.pop()
    output.push(item.val)
    stack.push(...item.children.reverse())
  }
  return output
}

console.log(preorder2(node2))
