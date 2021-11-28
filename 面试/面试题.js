setTimeout(() => {
  console.log('4')
}, 0)
new Promise((resolve, reject) => {
  resolve(1)
  Promise.resolve().then(() => {
    console.log(2)
  })
}).then((t) => {
  console.log(t)
})
console.log(3)

function deep(node) {
  if (!node.children.length) {
    return 1
  }
  let len = 0
  for (let i = 0; i < root.children; i++) {
    len = Math.max(0, deep[root[i]])
  }
  return 1 + len
}

function deep(node) {
  if (!node.children.length) {
    return 1
  }
  let len = 0
  for (let i = 0; i < root.children; i++) {
    len = Math.max(0, deep[root[i]])
  }
  return 1 + len
}

let a = 0
let lazy = {
  add() {
    a++
    return this
  }
}
lazy.add().add()


function Cat() {};
var cat = new Cat();

cat.__proto__ // === ? 1
cat.__proto__.__proto__ // === ? 2
cat.__proto__.__proto__.__proto__ // === ? 3
cat.__proto__.__proto__.__proto__.__proto__ // === ? 4
Cat.__proto__ // === ? 5
Cat.__proto__.__proto__ // === ? 6
cat.prototype // ? 7
Cat.prototype // ? 8

1. Cat.prototype
2. Object.prototype
3. null
4. error
5. Object.prototype
5. null
5. undefined
Cat.prototype

class Demo  {
    a = 1;
    m1() {}
    m2 = () => {
    }
    static s2 = 2;
  }

  function Demo() {
      a = 1
  }
  Demo.m1 = function () {
  }
  Demo.m2 =  () => {
  }
  Demo.s2 = 2

async  function promiseAll (promises) {  
    for (const fn of promises) {
        let res = await  promises()
        console.log(res)
    }
 }

 promises = []

 function promiseAll (promises) {
    promises.forEach(async (item) => {
        let res = await  item()
        console.log(res)
    })
 }

 function promiseAll (promises) {
    if (!promises.length) {
        return 
    }
    execute(promises.shift(), promises)
 }


 function execute(item, arr) {
    item().then(() => {
        if (!arr.length) {
            return
        }
        return execute(arr.shift(), arr)
    })
 }


 const treeData = [
    {
      key: '1',
      name: '1',
      children: [
        {
          key: '1.1',
          name: '1.1',
          children: [
            {
                key: '1.1.1',
                name: '1.1.1'
            }
          ]
        },
      ]
    },
    {
      key: '2',
      name: '2',
      children: [
        {
          key: '2.1',
          name: '2.1',
        },
      ]
    }
  ]


