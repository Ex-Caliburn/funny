// 给定一个 N 叉树，返回其节点值的 前序遍历 。

// N 叉树 在输入中按层序遍历进行序列化表示，每组子节点由空值 null 分隔（请参见示例）。

//

// 进阶：

// 递归法很简单，你可以使用迭代法完成此题吗?

/**
 * // Definition for a Node.
 * function Node(val, children) {
 *    this.val = val;
 *    this.children = children;
 * };
 */
/**
 * @param {Node} root
 * @return {number[]}
 */
// 我这是二叉树
var preorder = function (root, arr = []) {
  if (!root) {
    return arr
  }
  arr.push(root.val)
  if (root.left) {
    preorder(root.left, arr)
  }
  if (root.right) {
    preorder(root.right, arr)
  }
  return arr
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

console.log(preorder(null))
console.log(preorder(node))

// 思路二 二叉树 迭代法， stack
var preorder2 = function (root) {
  let output = []
  if (!root) {
    return output
  }
  let stack = [root]
  while (stack.length) {
    let root = stack.pop()
    output.push(root.val)
    if (root.right) stack.push(root.right)
    if (root.left) stack.push(root.left)
  }
  return output
}

console.log(preorder2(null))
console.log(preorder2(node))

// 思路3 N叉树
var preorder3 = function (root, arr = []) {
  if (!root) {
    return arr
  }
  arr.push(root.val)
  for (let i = 0; i < root.children.length; i++) {
    preorder3(root.children[i], arr)
  }
  return arr
}

// 迭代
var preorder4 = function (root) {
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
