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

console.log(maxProfit([7,1,5,3,0,6]))
console.log(maxProfit2([10,2,9,1,2,1,3,1]))
