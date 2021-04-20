/**
 * // Definition for a Node.
 * function Node(val,children) {
 *    this.val = val;
 *    this.children = children;
 * };
 */

/**
 * @param {Node} root
 * @return {number[][]}
 */
var levelOrder = function (root) {
  let output = []
  if (!root) return output
  let stack = [root]
  let nextStack = []
  let group = []
  while (stack.length) {
    let item = stack.shift()
    group.push(item.val)
    nextStack.push(...item.children)
    if (!stack.length) {
      output.push(group)
      group = []
      stack = nextStack
      nextStack = []
    }
  }
  return output
}
// 比起维护数组，变量更加节省空间和时间 len 记录上一个 stack 的长度
var levelOrder = function (root) {
  let output = []
  if (!root) return output
  let stack = [root]
  let group = []
  let len = stack.length
  while (stack.length) {
    let item = stack.shift()
    len-- 
    group.push(item.val)
    stack.push(...item.children)
    if (!len) {
      len = stack.length
      output.push(group)
      group = []
    }
  }
  return output
}

console.log(levelOrder(null))


// 别人写的 递归实现 先构造数组，然后往数组里补全
var levelOrder = function(root) {
  if(!root)return [];
  let ans = [];
  const dfs = (root, d)=>{
      if(!root)return;
      if(d>=ans.length){
          ans.push([root.val]);
      } else {
          ans[d].push(root.val);
      }
      for(let i of root.children){
          dfs(i,d+1);
      }
  }
  dfs(root,0);
  return ans;
};