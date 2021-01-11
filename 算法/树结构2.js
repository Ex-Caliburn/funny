var origin = [
  'home/a/2019-04-09/1.txt',
  'home/a/2019-04-10/2.txt',
  'home/c/2019-04-09/3.txt',
  'home2/d/2019-04-09/4.txt',
  'home2/e/2019-04-09/5.txt'
]

var result = [
  {
    label: 'home',
    children: [
      {
        label: 'a',
        children: [
          {
            label: '2019-04-09',
            children: []
          },
          {
            label: '2019-04-10',
            children: []
          }
        ]
      },
      {
        label: 'c',
        children: []
      }
    ]
  },
  {
    label: 'home2',
    children: [
      {
        label: 'b',
        children: []
      },
      {
        label: 'e',
        children: []
      }
    ]
  }
]
// [home, a, '2019-04-09', '1.txt']

// 建立树结构，然后去重复 用时1h
// reduce 妙用，如果用for循环，你需要你自己去维系这个变量
// 先把字符串处理成数组，然后对数组进行循环，变成树结构。 如果树结构存在，直接复用，处里孩子
function geneTree(arr) {
  let res = []
  let target = null
  arr.forEach((item) => {
    item
      .split('/')
      .filter((item) => item)
      .reduce(
        (pre, current) => {
          if (!pre.children) {
            pre.children = []
          }
          target = pre.children.find((item) => item.label === current)
          if (!target) {
            target = {
              label: current
            }
            pre.children.push(target)
          }
          return target
        },
        { children: res }
      )
  })
  return res
}

// console.log(geneTree(origin))
// console.log(JSON.stringify(geneTree(origin)))

//  for循环版本
function geneTree2(arr) {
  let res = { children: [] }
  let target = null
  let path = null
  arr.forEach((item) => {
    item
      .split('/')
      .filter((item) => item)
      .forEach((pathItem, index) => {
        if (index === 0) {
          path = res
        }
        if (!path.children) {
          path.children = []
        }
        target = path.children.find((item) => item.label === pathItem)
        if (!target) {
          target = {
            label: pathItem
          }
          path.children.push(target)
        }
        path = target
      })
  })
  return res.children
}
// console.log(JSON.stringify(geneTree2(origin)))

// 第三种 reduce 两次，有点东西

let res = origin
  .map((p) => p.split('/'))
  .reduce((output, path) => {
    console.log(output, path)
    path.reduce((parent, child) => {
      console.log(parent, 'parent', child)
      if (parent && !parent.children) {
        parent.children = [{ label: child }]
        return (parent = parent.children[0])
      }
      let container = parent ? parent.children : output
      parent = container.find((item) => item.label === child)
      if (!parent) {
        parent = { label: child }
        container.push(parent)
      }
      return parent
    }, null)
    return output
  }, [])
  console.log(res)
