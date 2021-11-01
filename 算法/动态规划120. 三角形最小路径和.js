// dp表, val， 转移方程
function minimumTotal(triangle) {
  if (!triangle.length) return -1
  let dp = {}
  let st = triangle.length - 1
  for (let j = 0; j < triangle[st].length; j++) {
    dp[`${st}.${j}`] = triangle[st][j]
  }
  // 从 st-1 开始
  for (let i = st - 1; i >= 0; i--) {
    for (let j = 0; j < triangle[i].length; j++) {
      dp[`${i}.${j}`] = Math.min(dp[`${i + 1}.${j}`], dp[`${i + 1}.${j + 1}`]) + triangle[i][j]
    }
  }
  console.log(dp)
  return dp['0.0']
}

console.log(minimumTotal([[2], [3, 4], [6, 5, 7], [4, 1, 8, 3]]))

// 那么在进行状态压缩的时候，我们该怎么去做呢？

// 实际上就是只用一个状态表来表示所有的。

// 因为只是和上一个状态相关，所以说可以表示成如下的形式：

// dp[j] = min(dp[j], dp[j + 1]) + triangle[i][j]，

// 我们只用 j 来代表当前的状态，然后最终输出dp[0]即可
// 这个思路太强了， 每一层的只和上一次层状态相关，每一个状态，只和下一层相同指针和指针+1 相关
function minimumTotal2(triangle) {
  if (!triangle.length) return -1
  let dp = []
  let st = triangle.length - 1
  for (let j = 0; j < triangle[st].length; j++) {
    dp[j] = triangle[st][j]
  }
  // 从 st-1 开始
  for (let i = st - 1; i >= 0; i--) {
    for (let j = 0; j < triangle[i].length; j++) {
      dp[j] = Math.min(dp[j], dp[j + 1]) + triangle[i][j]
    }
  }
  console.log(dp)
  return dp[0]
}

console.log(minimumTotal2([[2], [3, 4], [6, 5, 7], [4, 1, 8, 3]]))
