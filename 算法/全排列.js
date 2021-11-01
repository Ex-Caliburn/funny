// 给定一个可包含重复数字的序列 nums ，按任意顺序 返回所有不重复的全排列。
// https://leetcode-cn.com/problems/permutations-ii

// 示例 1：

// 输入：nums = [1,1,2]
// 输出：
// [[1,1,2],
//  [1,2,1],
//  [2,1,1]]
// 示例 2：

// 输入：nums = [1,2,3]
// 输出：[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]

function permute(arr) {
  const res = []
  const path = []
  backtracking(arr, arr.length, [])
  return res

  function backtracking(nums, len, used) {
    if (path.length === len) {
      // 为什么要Array.from()  断开引用关系
      res.push(Array.from(path))
      return
    }
    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue
      used[i] = 1
      path.push(nums[i])
      backtracking(nums, len, used)
      path.pop()
      used[i] = 0
    }
  }
}

// console.log(permute([1, 1, 2]))
// console.log(permute([1, 2, 3]))

//   我可以用 map 去剪支，怎么判断是重复的呢
// 发现map是对象，不好判断，字符串做key好点，但是就没必要用map了
function permuteUnique(arr) {
  const res = []
  const path = []
  let usedArr = {}
  backtracking(arr, arr.length, [])
  return res

  function backtracking(nums, len, used) {
    if (path.length === len) {
      res.push(Array.from(path))
      return
    }
    for (let i = 0; i < nums.length; i++) {
      if (used[i] || usedArr[path.concat(nums[i]).join(',')]) continue
      used[i] = 1
      path.push(nums[i])
      usedArr[path.join(',')] = 1
      backtracking(nums, len, used)
      path.pop()
      used[i] = 0
    }
  }
}

// console.log(permuteUnique([1, 1, 2]))
// console.log(permuteUnique([1, 2, 3]))
// 看了官方解释，剪支都是临近的剪支，存放一个访问的数组
// 用 字符串还是不行， 这是个序列，但没有顺序，只需要判断当前的层级是否有重复的
// 如果是有顺序，可以用 字符串
function permuteUnique2(arr) {
  const res = []
  const path = []
  backtracking(arr, arr.length, [])
  return res
  function backtracking(nums, len, used) {
    if (path.length === len) {
      res.push(Array.from(path))
      return
    }
    let visited = {}
    for (let i = 0; i < nums.length; i++) {
      if (used[i] || (i > 0 && visited[nums[i]])) continue
      used[i] = 1
      path.push(nums[i])
      backtracking(nums, len, used)
      path.pop()
      used[i] = 0
      visited[nums[i]] = 1
    }
  }
}

// console.log(permuteUnique2([1, 1, 2]))
// console.log(permuteUnique2([1, 2, 3]))
// console.log(permuteUnique2([3, 0, 3]))

// 加上 !vis[i - 1]来去重主要是通过限制一下两个相邻的重复数字的访问顺序

// 举个栗子，对于两个相同的数11，我们将其命名为1a1b, 1a表示第一个1，1b表示第二个1； 
// 那么，不做去重的话，会有两种重复排列 1a1b, 1b1a， 我们只需要取其中任意一种排列；
//  为了达到这个目的，限制一下1a, 1b访问顺序即可。 比如我们只取1a1b那个排列的话，
//  只有当visit nums[i-1]之后我们才去visit nums[i]， 也就是如果!visited[i-1]的话则continue

// used[i - 1] 我觉得好理解点 !used[i - 1] 相当于 取得 1b1a， used[i - 1]取得 1a1b
function permuteUnique3(arr) {
  const res = []
  const path = []
  backtracking(arr.sort(), arr.length, [])
  return res
  function backtracking(nums, len, used) {
    if (path.length === len) {
      res.push(Array.from(path))
      return
    }
    for (let i = 0; i < nums.length; i++) {
      if (used[i] || (i > 0 && nums[i] === nums[i - 1] && used[i - 1])) continue
      used[i] = 1
      path.push(nums[i])
      backtracking(nums, len, used)
      path.pop()
      used[i] = 0
    }
  }
}

//  我多了一个变量 last，但是容易理解
function permuteUnique5(arr) {
    const res = []
    const path = []
    backtracking(arr.sort(), arr.length, [])
    return res
    function backtracking(nums, len, used) {
      if (path.length === len) {
        res.push(Array.from(path))
        return
      }
      let last
      for (let i = 0; i < nums.length; i++) {
        if (used[i] || (i > 0 && nums[i] === last)) continue
        used[i] = 1
        path.push(nums[i])
        backtracking(nums, len, used)
        path.pop()
        used[i] = 0
        last = nums[i]
      }
    }
  }

console.log(permuteUnique3([1, 1, 2]))
console.log(permuteUnique3([1, 2, 3]))
console.log(permuteUnique3([3, 0, 3]))
