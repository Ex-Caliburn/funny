/**
 * Definition for singly-linked list.
 * function ListNode(val) {
 *     this.val = val;
 *     this.next = null;
 * }
 */
/**
 * @param {ListNode} head
 * @param {number} val
 * @return {ListNode}
 */
function ListNode(val) {
   this.val = val;
   this.next = null;
}

var removeElements = function(head, val) {
  let item = new ListNode()
  item.next = head
  let cur = head
  let pre = item
  let temp = null
  while(cur){
    if(cur.val === val){
      temp = cur.next || null
      pre.next = temp
      cur = temp
    } else {
      cur = head.next
    }
  }
  return head
};

console.log(removeElements([1,2,6,3,4,5,6],6))