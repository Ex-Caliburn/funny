/**
 * Initialize your data structure here.
 */
var MyLinkedList = function () {
  this.linkedList = {}
}

/**
 * Get the value of the index-th node in the linked list. If the index is invalid, return -1.
 * @param {number} index
 * @return {number}
 */
MyLinkedList.prototype.get = function (index) {
  let i = 0
  let target = this.linkedList
  while (target.next && i !== index) {
    i++
    target = target.next
  }
  return i === index && target ? target.val : -1
}

/**
 * Add a node of value val before the first element of the linked list. After the insertion, the new node will be the first node of the linked list.
 * @param {number} val
 * @return {void}
 */
MyLinkedList.prototype.addAtHead = function (val) {
  if (typeof this.linkedList.val === 'undefined') {
    this.linkedList.val = val
    this.next = null
  } else {
    let cur = {
      val: val,
      next: this.linkedList
    }
    this.linkedList = cur
  }
}

/**
 * Append a node of value val to the last element of the linked list.
 * @param {number} val
 * @return {void}
 */
MyLinkedList.prototype.addAtTail = function (val) {
  let target = this.linkedList
  while (target.next) {
    target = target.next
  }
  if (typeof target.val === 'undefined') {
    target.val = val
  } else {
    target.next = {
      val
    }
  }
  return target
}

/**
 * Add a node of value val before the index-th node in the linked list. If index equals to the length of linked list, the node will be appended to the end of linked list. If index is greater than the length, the node will not be inserted.
 * @param {number} index
 * @param {number} val
 * @return {void}
 */
MyLinkedList.prototype.addAtIndex = function (index, val) {
  if (index === 0) {
    let temp = {
      val,
      next: this.linkedList
    }
    this.linkedList = temp
    return
  }
  let i = 0
  let target = this.linkedList
  while (target.next && i !== index - 1) {
    i++
    target = target.next
  }
  let node = i === index - 1 && target ? target : null
  if (node) {
    let temp = node.next
    node.next = {
      val,
      next: temp
    }
  }
}

/**
 * Delete the index-th node in the linked list, if the index is valid.
 * @param {number} index
 * @return {void}
 */
MyLinkedList.prototype.deleteAtIndex = function (index) {
  if (index === 0) {
    this.linkedList = this.linkedList.next || {}
    return
  }
  let i = 0
  let target = this.linkedList
  while (target.next && i !== index - 1) {
    i++
    target = target.next
  }
  let node = i === index - 1 && target ? target : null
  if (node) {
    let temp = node.next
    if (temp && temp.next) {
      node.next = temp.next
    } else {
      node.next = null
    }
  }
}

// ["MyLinkedList","addAtHead","addAtTail","addAtHead","addAtTail","addAtHead","addAtHead","get","addAtHead","get","get","addAtTail"]
// [[],[7],[7],[9],[8],[6],[0],[5],[0],[2],[5],[4]]
// 0 6 9 7 7 8
// 8
// 0 0 6 9 7 7 8
// 6
// 7
// 0 0 6 9 7 7 8 4
linkedList = new MyLinkedList()
// linkedList.addAtHead(7)
// linkedList.addAtTail(7)
// linkedList.addAtHead(9)
// linkedList.addAtTail(8)
// linkedList.addAtHead(6)
// linkedList.addAtHead(0)
// linkedList.get(5)
// linkedList.addAtHead(0)
// linkedList.get(2)
// linkedList.get(5)
// linkedList.addAtTail(4)

// ["MyLinkedList","addAtHead","addAtTail","addAtIndex","get","deleteAtIndex","get"]
// [[],[1],[3],[1,2],[1],[1],[1]]

// 2 3
// 1 2 3
// 1 3
// linkedList.addAtHead(1)
// linkedList.addAtTail(3)
// linkedList.addAtIndex(1,2)
// linkedList.get(1)
// linkedList.deleteAtIndex(1)
// linkedList.get(1)

console.log(linkedList)

var reverseList = function (head) {
  let first = head
  let next = head.next
  let nextNext = head.next && head.next.next
  while (next && nextNext) {
    next.next = first
    head = next
    first = next
    next = nextNext
    nextNext = nextNext.next && nextNext.next.next
  }
  if (next && !nextNext) {   
    next.next = first
  }
  return next
}
