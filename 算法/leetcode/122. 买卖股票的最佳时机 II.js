//给定一个数组，它的第 i 个元素是一支给定股票第 i 天的价格。
//
//设计一个算法来计算你所能获取的最大利润。你可以尽可能地完成更多的交易（多次买卖一支股票）。
//
//注意：你不能同时参与多笔交易（你必须在再次购买前出售掉之前的股票）。
//
//示例 1:
//
//输入: [7,1,5,3,6,4]
//输出: 7
//解释: 在第 2 天（股票价格 = 1）的时候买入，在第 3 天（股票价格 = 5）的时候卖出, 这笔交易所能获得利润 = 5-1 = 4 。
//     随后，在第 4 天（股票价格 = 3）的时候买入，在第 5 天（股票价格 = 6）的时候卖出, 这笔交易所能获得利润 = 6-3 = 3 。
//示例 2:
//
//输入: [1,2,3,4,5]
//输出: 4
//解释: 在第 1 天（股票价格 = 1）的时候买入，在第 5 天 （股票价格 = 5）的时候卖出, 这笔交易所能获得利润 = 5-1 = 4 。
//     注意你不能在第 1 天和第 2 天接连购买股票，之后再将它们卖出。
//     因为这样属于同时参与了多笔交易，你必须在再次购买前出售掉之前的股票。
/**
 * @param {number[]} prices
 * @return {number}
 */
var maxProfit = function(prices) {
  let profit = 0
  for (var i = 1; i < prices.length; i++) {
    if(prices[i] > prices[i-1]){
      profit = profit + prices[i] - prices[i-1]
    }
  }
  return profit
};

var maxProfit2 = function(prices) {
  let profit = 0
  let minPrice = prices[0]
  for (var i = 1; i < prices.length; i++) {
    if(prices[i] < prices[i-1]){
      profit = profit + prices[i-1] - minPrice
      minPrice = prices[i]
    } else if(prices[i] >= prices[i-1] && i === prices.length-1){
      profit = profit + prices[i] - minPrice
    }
  }
  return profit
};
/**
 * @param {number[]} prices
 * @return {number}
 */

var maxProfit3 = function(prices) {
  if(!prices || prices.length < 1) return 0
  let profit = 0
  let minPrice = prices[0]
  for (var i = 1; i < prices.length; i++) {
    if(prices[i] < prices[i-1]){
      profit = profit + prices[i-1] - minPrice
      minPrice = prices[i]
    }
  }
  if(prices[prices.length-1] >= prices[prices.length-2]){
    profit = profit + prices[prices.length-1] - minPrice
  }
  return profit
};
console.log(maxProfit3([1,2,3,4]))
console.log(maxProfit3([4,3,2,1]))
console.log(maxProfit3([1,5,2,4,4]))