// 给定一个只包含数字的字符串，用以表示一个 IP 地址，返回所有可能从 s 获得的 有效 IP 地址 。你可以按任何顺序返回答案。

// 有效 IP 地址 正好由四个整数（每个整数位于 0 到 255 之间组成，且不能含有前导 0），整数之间用 '.' 分隔。

// 例如："0.1.2.201" 和 "192.168.1.1" 是 有效 IP 地址，但是 "0.011.255.245"、"192.168.1.312" 和 "192.168@1.1" 是 无效 IP 地址。

// 输入：s = "25525511135"
// 输出：["255.255.11.135","255.255.111.35"]
// 示例 2：

// 输入：s = "0000"
// 输出：["0.0.0.0"]
// 示例 3：

// 输入：s = "1111"
// 输出：["1.1.1.1"]
// 示例 4：

// 输入：s = "010010"
// 输出：["0.10.0.10","0.100.1.0"]
// 示例 5：

// 输入：s = "101023"
// 输出：["1.0.10.23","1.0.102.3","10.1.0.23","10.10.2.3","101.0.2.3"]

// 链接：https://leetcode-cn.com/problems/restore-ip-addresses

/**
 * @param {string} s
 * @return {string[]}
 */
// 先处理异常
// 不包含前道0， 溯源，剪枝
var restoreIpAddresses = function (s) {
  if (!/^\d{4,12}$/g.test(s)) return []
  let res = []
  let arr = s.split('')
  dfs(arr, res, 1, [arr[0]])
  return res
}

// 递归三要素
// 终止条件
// 递归公式，规律
// 对数据的处理
function dfs(arr, res, index, store) {
  // 终止条件
  console.log(store.length, index, arr.length, JSON.stringify(store))
  if (store.length === 4 && index === arr.length) {
    res.push(store.join('.'))
    return
  } else if (store.length > 4) {
    //  已经有4项但是剩余数字未用
    return
  } else if (index === arr.length) {
    //  数字用完了
    return
  }
  let item = store.pop()
  // console.log('item', item)
  if (item.length === 3) {
    store.push(item)
    store.push(arr[index])
    popStack(arr, res, index + 1, store)
  } else if (item === '0') {
    store.push(item)
    store.push(arr[index])
    popStack(arr, res, index + 1, store)
  } else {
    store.push(item)
    store.push(arr[index])
    popStack(arr, res, index + 1, store)
    store.pop() // 需要多弹出一层
    if (item.length === 2) {
      if (item + arr[index] > 255) {
        store.push(item)
        return
      }
    }
    store.push(item + arr[index])
    popStack(arr, res, index + 1, store)
  }
}
function popStack(arr, res, i, store) {
  dfs(arr, res, i, store)
  let item = store.pop()
  if (item.length !== 1) {
    store.push(item.slice(0, -1))
  }
}

// 如何判断组合已经用过了 用对象存贮，key用 ip地址
// console.log(restoreIpAddresses('0000'))
// console.log(restoreIpAddresses('25525511135'))
// console.log(restoreIpAddresses('255255255255'))
// console.log(restoreIpAddresses('1111'))
// console.log(restoreIpAddresses('010010')) // ["0.10.0.10","0.100.1.0"]
// console.log(restoreIpAddresses('101023'))
// console.log(restoreIpAddresses('172162541'))

var restoreIpAddresses2 = function (s) {
  const SEG_COUNT = 4
  const segments = new Array(SEG_COUNT)
  const ans = []

  const dfs = (s, segId, segStart) => {
    // 如果找到了 4 段 IP 地址并且遍历完了字符串，那么就是一种答案
    if (segId === SEG_COUNT) {
      if (segStart === s.length) {
        ans.push(segments.join('.'))
      }
      return
    }

    // 如果还没有找到 4 段 IP 地址就已经遍历完了字符串，那么提前回溯
    if (segStart === s.length) {
      return
    }

    // 由于不能有前导零，如果当前数字为 0，那么这一段 IP 地址只能为 0
    if (s.charAt(segStart) === '0') {
      segments[segId] = 0
      dfs(s, segId + 1, segStart + 1)
    }

    // 一般情况，枚举每一种可能性并递归
    let addr = 0
    for (let segEnd = segStart; segEnd < s.length; ++segEnd) {
      addr = addr * 10 + (s.charAt(segEnd) - '0')
      if (addr > 0 && addr <= 0xff) {
        segments[segId] = addr
        dfs(s, segId + 1, segEnd + 1)
      } else {
        break
      }
    }
  }

  dfs(s, 0, 0)
  return ans
}

console.log(restoreIpAddresses2('172162541'))

var restoreIpAddresses3 = function (s) {
  const SEG_COUNT = 4
  const segments = new Array(SEG_COUNT)
  const ans = []

  const dfs = (s, segId, segStart) => {
    // 如果找到了 4 段 IP 地址并且遍历完了字符串，那么就是一种答案
    if (segId === SEG_COUNT) {
      if (segStart === s.length) {
        ans.push(segments.join('.'))
      }
      return
    }

    // 如果还没有找到 4 段 IP 地址就已经遍历完了字符串，那么提前回溯
    if (segStart === s.length) {
      return
    }

    // 由于不能有前导零，如果当前数字为 0，那么这一段 IP 地址只能为 0
    if (s.charAt(segStart) === '0') {
      segments[segId] = 0
      dfs(s, segId + 1, segStart + 1)
    }

    // 一般情况，枚举每一种可能性并递归
    let addr = 0
    for (let segEnd = segStart; segEnd < s.length; ++segEnd) {
      addr = addr * 10 + +s.charAt(segEnd)
      if (addr > 0 && addr <= 255) {
        segments[segId] = addr
        dfs(s, segId + 1, segEnd + 1)
      } else {
        break
      }
    }
  }

  dfs(s, 0, 0)
  return ans
}
