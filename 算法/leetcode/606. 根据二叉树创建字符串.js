// https://leetcode-cn.com/problems/construct-string-from-binary-tree/solution/gen-ju-er-cha-shu-chuang-jian-zi-fu-chuan-by-leetc/
// 你需要采用前序遍历的方式，将一个二叉树转换成一个由括号和整数组成的字符串。

// 空节点则用一对空括号 "()" 表示。而且你需要省略所有不影响字符串与原始二叉树之间的一对一映射关系的空括号对。

// 示例 1:

// 输入: 二叉树: [1,2,3,4]
//        1
//      /   \
//     2     3
//    /
//   4

// 输出: "1(2(4))(3)"

// 解释: 原本将是“1(2(4)())(3())”，
// 在你省略所有不必要的空括号对之后，
// 它将是“1(2(4))(3)”。

// 链接：https://leetcode-cn.com/problems/construct-string-from-binary-tree
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
 * @return {string}
 */
// 我的思路先拼然后再去掉(),其实在判断的时候就可以去掉了
// 其实就是 左右 有无共四种情况
var tree2str = function (root, output = '') {
  if (!root) {
    return output
  }
  output = root.val + ''
  if (root.left && root.right) {
    return output + '(' + tree2str(root.left) + ')' + '(' + tree2str(root.right) + ')'
  } else if (!root.left && !root.right) {
    return output
  } else if (root.left) {
    return output + '(' + tree2str(root.left) + ')'
  } else {
    return output + '()(' + tree2str(root.right) + ')'
  }
}

// 输入: 二叉树: [1,2,3,4]
//        1
//      /   \
//     2     3
//    /
//   4

// 输出: "1(2(4))(3)"

// 1
// 1(2)(3)
// 1(2(4)())(3()())

node = {
  val: 1,
  left: {
    val: 2,
    left: {
      val: 4
    }
  },
  right: {
    val: 3
  }
}

console.log(tree2str(node))

var tree2str2 = function (root, output = '') {
  if (!root) {
    return output
  }
  let stack = [root]
  let visited = new Set()
  output = ''
  let t = null
  while (stack.length) {
    t = stack[stack.length - 1]
    if (visited.has(t)) {
      stack.pop()
      output += ')'
    } else {
      visited.add(t)
      output += '(' + t.val
      if (t.left == null && t.right != null) t += '()'
      if (t.right != null) stack.push(t.right)
      if (t.left != null) stack.push(t.left)
    }
  }
  return output.substring(1, output.length - 1)
}
console.log(tree2str2(node))

// (1
// (1(2
// (1(2(4
// (1(2(4))(3))
