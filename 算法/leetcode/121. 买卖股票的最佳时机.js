//给定一个数组，它的第 i 个元素是一支给定股票第 i 天的价格。
//
//如果你最多只允许完成一笔交易（即买入和卖出一支股票），设计一个算法来计算你所能获取的最大利润。
//
//注意你不能在买入股票前卖出股票。
//
//示例 1:
//
//输入: [7,1,5,3,6,4]
//输出: 5
//解释: 在第 2 天（股票价格 = 1）的时候买入，在第 5 天（股票价格 = 6）的时候卖出，最大利润 = 6-1 = 5 。
//     注意利润不能是 7-1 = 6, 因为卖出价格需要大于买入价格。

/**
 * @param {number[]} prices
 * @return {number}
 */
/* 低买高卖 */
var maxProfit = function(prices) {
  let maxPrice = 0
  for (var i = 0; i < prices.length; i++) {
    for (var j = i + 1; j < prices.length; j++) {
      if (prices[i] > prices[j]) continue
      maxPrice = Math.max(prices[j] - prices[i], maxPrice)
    }
  }
  return maxPrice
};

/* 动态规划 */
var maxProfit2 = function(prices) {
  let profit = 0
  let min = prices[0]
  for (var i = 1; i < prices.length; i++) {
    if (prices[i] > prices[i-1]) {
      profit = Math.max(prices[i] - min, profit)
    } else {
      min = Math.min(prices[i], min)
    }
  }
  return profit
};

//console.log(maxProfit([7,1,5,3,0,6]))
//console.log(maxProfit2([10,2,9,1,2,1,3,1]))

// 当前数 min 最大收益
// [7,1,5,3,6,4]
// 7 7 0
// 1 1 0
// 5 1 4
// 3 1 4
// 6 1 5
// 4 1 5

/* 温习*/
var maxProfit3 = function(prices) {
  let maxPrice = 0
  let min = prices[0]
  for (var i = 1; i < prices.length; i++) {
    if(prices[i] > min){
      maxPrice = Math.max(prices[i]-min, maxPrice)
    } else {
      min = prices[i]
    }
  }
  return maxPrice
};

console.log(maxProfit3([7,1,5,3,0,6]))
console.log(maxProfit3([10,2,9,1,2,1,3,1]))