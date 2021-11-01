// 3. Tree To String
// Please convert a binary tree to a string that consists of parenthesis and integers using midOrder traversing.

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
 * Definition for a binary tree node.
 * function TreeNode(val, left, right) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.left = (left===undefined ? null : left)
 *     this.right = (right===undefined ? null : right)
 * }
 */
/**
 * @param {TreeNode} root
 * @return {number[]}
 */
// 中序遍历首先访问左子树，然后在根结点，再右子树，所有节点都是这样
var inorderTraversal = function (node, arr = []) {
  if (!node) {
    return arr
  }
  arr.push(...inorderTraversal(node.left), node.val, ...inorderTraversal(node.right))
  return arr
}


//      1
//   2    3
// 4  5  6 
//  425163

console.log(inorderTraversal(node))

// 请注意，N叉树的中序遍历没有标准定义，中序遍历只有在二叉树中有明确的定义。尽管我们可以通过几种不同的方法来定义N叉树的中序遍历，但是这些描述都不是特别贴切，并且在实践中也不常用到，所以我们暂且跳过N叉树中序遍历的部分。

// 栈思路
// 第1步 所有的左子树入栈，
// 第2步然后右子树没了，出栈，
// 第3步 入栈左子树 执行第1步操作
// 要多看 一时没想起来先把步骤图画出来

var midOrder = function (root) {
  let output = []
  let stack = []
  while (root || stack.length) {
    while (root) {
      stack.push(root)
      root = root.left
    }
    root = stack.pop()
    output.push(root.val)
    root = root.right
  }
  return output
}

console.log(midOrder(node))
// https://leetcode-cn.com/problems/binary-tree-inorder-traversal/solution/er-cha-shu-de-zhong-xu-bian-li-by-leetcode-solutio/

function midOrder2(root) {
  let output = []
  let stack = []
  while (root || stack.length) {
    while (root) {
      stack.push(root)
      root = root.left
    }
    root = stack.pop()
    output.push(root.val)
    root = root.right
  }
  return output
}

console.log(midOrder2(node))
