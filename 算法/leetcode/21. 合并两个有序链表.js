// https://leetcode-cn.com/problems/merge-two-sorted-lists/
/**
 * Definition for singly-linked list.
 * function ListNode(val, next) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.next = (next===undefined ? null : next)
 * }
 */
/**
 * @param {ListNode} l1
 * @param {ListNode} l2
 * @return {ListNode}
 */
// 都是有序，双指针，有点像插排
;[1, 2, 4][(1, 3, 4)]

var mergeTwoLists2 = function (l1, l2) {
  let res = []
  let L1Index = 0
  let L2Index = 0
  while (l1[L1Index] && l2[L2Index]) {
    if (l1[L1Index] <= l2[L2Index]) {
      res.push(l1[L1Index])
      L1Index++
    } else {
      res.push(l2[L2Index])
      L2Index++
    }
  }
  return res.concat(l1.slice(L1Index), l2.slice(L2Index))
}
// console.log(mergeTwoLists2([1, 2, 4], [1, 3, 4]))

var mergeTwoLists = function (l1, l2) {
  let res = {
    val: undefined,
    next: null
  }
  let head = null
  let L1Item = l1
  let L2Item = l2
  while (L1Item && L2Item) {
    console.log(L1Item.val, L2Item.val)
    if (L1Item.val <= L2Item.val) {
      if (typeof res.val !== 'undefined') {
        res.next = L1Item
        res = L1Item
      } else {
        head = L1Item
        res = L1Item
      }
      L1Item = L1Item.next
    } else {
      if (typeof res.val !== 'undefined') {
        res.next = L2Item
        res = L2Item
      } else {
        head = L2Item
        res = L2Item
      }
      L2Item = L2Item.next
    }
  }
  console.log(res.val)
  if (typeof res.val !== 'undefined') {
    res.next = L1Item ? L1Item : L2Item
  } else {
    res = L1Item ? L1Item : L2Item
    head = res
  }
  //   console.log(head, res)
  return head
}

a = {
  val: -4,
  next: {
    val: -2,
    next: {
      val: -1,
      next: null
    }
  }
}
b = {
  val: -1,
  next: {
    val: 0,
    next: {
      val: 4,
      next: null
    }
  }
}

// console.log(JSON.stringify(mergeTwoLists(a, b)))

function ListNode(val, next) {
  this.val = val === undefined ? 0 : val
  this.next = next === undefined ? null : next
}
// 看了别人优化 思路一致，但是我的复杂，15min肯定写不出来
var mergeTwoLists2 = function (l1, l2) {
  let preHead = new ListNode(-1)
  let prev = preHead
  while (l1 && l2) {
    if (l1.val >= l2.val) {
      prev.next = l2
      l2 = l2.next
    } else {
      prev.next = l1
      l1 = l1.next
    }
    prev = prev.next
  }
  prev.next = l1 ? l1 : l2
  return preHead.next
}

// console.log(JSON.stringify(mergeTwoLists2(a, b)))

// 递归
// 先判断边界
var mergeTwoLists4 = function (l1, l2) {
  if (!l1) {
    return l2
  } else if (!l2) {
    return l1
  } else if (l1.val <= l2.val) {
    l1.next = mergeTwoLists4(l1.next, l2)
    return l1
  } else {
    l2.next = mergeTwoLists4(l1, l2.next)
    return l2
  }
}

console.log(JSON.stringify(mergeTwoLists4(a, b)))
