// 你获得了一个字符串，内容为一个四则运算公式，字符包含 + - * / ( ) 和数字
// ，要求提供一个接口，入参是这个字符串，返回结果是计算的结果

// 暴露的缺陷，考虑不仔细 for index 不对应， 正则不太熟悉，match 匹配返回的是数组， split 的用法理解程度
// i--的判断条件，参数是否正确
const example = '(45-4*(56+23))/16'
let operation = ['*', '/', '+', '-']
function calcStr(params, index = -1) {
  index++
  console.log(params, index)
  let temp = ''
  let calcNext = ''
  let arr = []
  if (params.match(/\(.+\)/)) {
    temp = params.replace(/\(.+\)/, `$${index}`)
    calcNext = params.match(/\(.+\)/)[0].slice(1, params.match(/\(.+\)/)[0].length - 1)
  } else {
    arr = params.split(/([+\-*/])/g)
    for (let i = 0; i < arr.length; i++) {
      if (
        ['*', '/'].includes(arr[i]) &&
        arr[i - 1].indexOf('$') < 0 &&
        arr[i + 1].indexOf('$') < 0
      ) {
        if (arr[i] === operation[0]) {
          arr.splice(i - 1, 3, arr[i - 1] * arr[i + 1] + '')
        } else if (arr[i] === operation[1]) {
          arr.splice(i - 1, 3, arr[i - 1] / arr[i + 1] + '')
        }
        i--
      }
    }
    for (let i = 0; i < arr.length; i++) {
      if (
        ['+', '-'].includes(arr[i]) &&
        arr[i - 1].indexOf('$') < 0 &&
        arr[i + 1].indexOf('$') < 0
      ) {
        if (arr[i] === operation[2]) {
          arr.splice(i - 1, 3, +arr[i - 1] + +arr[i + 1] + '')
        } else if (arr[i] === operation[3]) {
          arr.splice(i - 1, 3, arr[i - 1] - arr[i + 1] + '')
        }
        i--
      }
    }
    return arr.indexOf('$') > -1 ? arr : +arr
  }
  return calcStr(temp.replace(`$${index}`, calcStr(calcNext, index)))
}

// console.log(calcStr(example))

// eval

// 狐进行了一次黑客马拉松大赛，全公司一共分为了N个组，每组一个房间排成一排开始比赛
// 比赛结束后没有公布成绩，但是每个组能够看到自己相邻的两个组里比自己成绩低的组的成绩
// 比赛结束之后要发奖金，以1w为单位，每个组都至少会发1w的奖金
// 另外，如果一个组发现自己的奖金没有高于比自己成绩低的组发的奖金，就会不满意
// 作为比赛的组织方，根据成绩计算出至少需要发多少奖金才能让所有的组满意。

// const example2 = [1, 5, 6, 8, 3, 2, 4, 7]
const example2 = [1, 5, 6, 8,8,8 ,3, 2, 4, 7]
// const example2 = [1, 5, 6, 8]

function calcMinMoney(queue) {
  let sum = new Array(queue.length).fill(1)
  for (let i = 1; i < queue.length; i++) {
    if (queue[i] > queue[i - 1]) {
      sum[i] = sum[i - 1] + 1
    }
  }
  for (let j = queue.length - 2; j >= 0; j--) {
    if (queue[j] > queue[j + 1] &&  sum[j] <= sum[j + 1]) {
      sum[j] = sum[j + 1] + 1
    }
  }
  return sum.reduce((acc, item) => {
    return acc + item
  }, 0)
}


// 思路，先找规律，2个规律， 3个规律，找到普遍性，先找到最小，但是可能有多个最小值，所以不行，
// 那我画出来，发现肯定有高有底么，我从左到右先计算上升的，大于的加一，然后再从右到左，计算遗漏的
console.log(calcMinMoney(example2))
