/**
 * Definition for a binary tree node.
 * function TreeNode(val, left, right) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.left = (left===undefined ? null : left)
 *     this.right = (right===undefined ? null : right)
 * }
 */
//  假设一个二叉搜索树具有如下特征：

//  节点的左子树只包含小于当前节点的数。
//  节点的右子树只包含大于当前节点的数。
//  所有左子树和右子树自身必须也是二叉搜索树。
// 左树的右子树 有上限， 右子树的左子树有下限，不能高于上面所有的子节点
/**
 * @param {TreeNode} root
 * @return {boolean}
 */
var isValidBST = function (root) {
  if (!root) return false
  return helper(root)
}
function helper(root, lower = -Infinity, upper = Infinity) {
  if (
    !root ||
    (root.val < upper &&
      root.val > lower &&
      helper(root.left, lower, Math.min(upper, root.val)) &&
      helper(root.right, Math.max(lower, root.val), upper))
  ) {
    return true
  }
  return false
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
node2 = {
  val: 2,
  left: {
    val: 1
  },
  right: {
    val: 3
  }
}

console.log(isValidBST(node))
console.log(isValidBST(node2))
console.log(isValidBST(null))
