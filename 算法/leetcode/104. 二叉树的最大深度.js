/**
 * Definition for a binary tree node.
 * function TreeNode(val) {
 *     this.val = val;
 *     this.left = this.right = null;
 * }
 */
//https://leetcode-cn.com/problems/maximum-depth-of-binary-tree/solution/er-cha-shu-de-zui-da-shen-du-by-leetcode-solution/
/**
 * @param {TreeNode} root
 * @return {number}
 */
var maxDepth = function (root) {
  if (!root) {
    return 0
  }
  if (root && !root.left && !root.right) {
    return 1
  }
  return 1 + Math.max(maxDepth(root.left), maxDepth(root.right))
}

/* 
广度优先搜索 思想
null 做为当层的遍历截止， 层与层之间的隔断
*/
var maxDepth2 = function (root) {
  if (!root) return 0
  if (!root.left && !root.right) return 1

  // 层次遍历 BFS
  let cur = root
  const queue = [root, null]
  let depth = 1

  while ((cur = queue.shift()) !== undefined) {
    if (cur === null) {
      // 注意⚠️： 不处理会无限循环，进而堆栈溢出
      if (queue.length === 0) return depth
      depth++
      queue.push(null)
      continue
    }
    const l = cur.left
    const r = cur.right

    if (l) queue.push(l)
    if (r) queue.push(r)
  }

  return depth
}


//  一层循环在末尾添加null
function maxLength3(root) {
  if (!root) return 0
  let depth = 0
  let queue = [root, null]
  let current = null
  while (queue.length) {
    current = queue.shift()
    if (current === null) {
      if (!queue.length) return depth
      depth++
      queue.push(null)
      continue
    }
    if (current.left) queue.push(current.left)
    if (current.right) queue.push(current.right)
  }

  return depth
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
console.log(maxLength3(node))
