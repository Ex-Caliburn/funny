var data = [
  { parent_id: 0, id: 1, value: 'xxx' },
  { parent_id: 1, id: 3, value: 'xxx' },
  { parent_id: 1, id: 6, value: 'xxx' },
  { parent_id: 2, id: 5, value: 'xxx' },
  { parent_id: 3, id: 4, value: 'xxx' },
  { parent_id: 4, id: 2, value: 'xxx' },
  { parent_id: 4, id: 8, value: 'xxx' },
  { parent_id: 6, id: 7, value: 'xxx' }
]

/* 桉树型结构排列 */
var tree = {}

function circle(parentID, parentContainer) {
  console.log(data, parentID)
  for (var i = 0; i < data.length; i++) {
    let temp = data[i]
    if (!temp.parent_id) {
      tree[temp.id] = { children: {} }
      data.splice(i, 1)
      i--
      circle(temp.id, tree[temp.id])
    }
    if (parentID && temp.parent_id === parentID) {
      parentContainer.children[temp.id] = { children: {} }
      data.splice(i, 1)
      i--
      circle(temp.id, parentContainer.children[temp.id])
    }
  }
}
console.time(1)
circle()
console.timeEnd(1)
console.log(tree)
