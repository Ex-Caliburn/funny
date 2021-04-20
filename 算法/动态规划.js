// 零钱兑换
// 给定不同面额的硬币 coins 和一个总金额 amount。计算可以凑成总金额所需的最少的硬币个数。如果没有任何一种硬币组合能组成总金额，返回 -1。

// 可以认为每种硬币的数量是无限的。

// coins = {1,2,5,7,10} amount = 14

function solution(coins, amount) {
  if (!coins.length) return -1
  let dp = [0]
  for (let i = 1; i <= amount; i++) {
    let min = Number.MAX_SAFE_INTEGER
    for (let j = 0; j < coins.length; j++) {
      if (coins[j] <= i && dp[i - coins[j]] < min) {
        min = dp[i - coins[j]] + 1
      }
    }
    dp[i] = min
  }
  console.log(dp)
  return (dp[amount] = dp[amount] === Number.MAX_SAFE_INTEGER ? -1 : dp[amount])
}

// console.log(solution([1, 2, 5, 7, 10], 14))
// console.log(solution([2, 5, 7, 10], 14))

// 递归思路 缺点 dp 表不回补全，如 13 是可以得出，但是返回的dp表 dp[13] 是空， 因为没有路径去计算 如果要得出所有的，从头开始遍历
function solution2(coins, amount) {
    if (!coins.length) return -1
    let dp = [0]
    for (let i = 0; i < coins.length; i++) {
      dp[coins[i]] = 1
    }
    helper(coins, amount, dp)
    console.log(dp)
    return dp[amount] || -1
  }
  function helper(coins, amount, dp) {
    if (typeof dp[amount] !== 'undefined') return dp[amount]
    let min = Number.MAX_SAFE_INTEGER
    let temp
    for (let i = 0; i < coins.length; i++) {
      if (coins[i] <= amount) {
        temp = helper(coins, amount - coins[i], dp)
        if (temp < min && temp > 0) {
          min = temp + 1
        }
      }
    }
    dp[amount] = min === Number.MAX_SAFE_INTEGER ? -1 : min
    return dp[amount]
  }

// console.log(solution2([1, 2, 5, 7, 10], 14))
// console.log(solution2([2, 5, 7, 10], 14))
// console.log(solution2([ 2], 3))

// 这个算法可要可不要，看具体需求
function solution3(coins, amount) {
    if (!coins.length) return -1
    let dp = [0]
    for (let i = 0; i < coins.length; i++) {
      dp[coins[i]] = 1
    }
    // 这样可以得出所有需要硬币数 
    for (let i = 1; i <= amount; i++) {
        helper(coins, i, dp)
    }
    console.log(dp)
    return dp[amount] || -1
  }
  function helper(coins, amount, dp) {
    if (typeof dp[amount] !== 'undefined') return dp[amount]
    let min = Number.MAX_SAFE_INTEGER
    let temp
    for (let i = 0; i < coins.length; i++) {
      if (coins[i] <= amount) {
        temp = helper(coins, amount - coins[i], dp)
        if (temp < min && temp > 0) {
          min = temp + 1
        }
      }
    }
    dp[amount] = min === Number.MAX_SAFE_INTEGER ? -1 : min
    return dp[amount]
  }

// console.log(solution2([1, 2, 5, 7, 10], 14))
// console.log(solution3([2, 5, 7, 10], 14))
// console.log(solution2([ 2], 3))