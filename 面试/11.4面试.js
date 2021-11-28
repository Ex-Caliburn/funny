function longestStr(str) {
  if (!str || !str.length) return
  let arr = str.split('')
  let temp = {}
  let max = 1
  let maxChar = arr[0]
  for (let i = 0; i < arr.length; i++) {
    if (temp[arr[i]]) {
      temp[arr[i]]++
      if (temp[arr[i]] > max) {
        max = temp[arr[i]]
        maxChar = arr[i]
      }
    } else {
      temp[arr[i]] = 1
    }
  }
  return maxChar
}

class Event {
  constructor() {
    this.eventList = []
  }
  on(eventName, eventCallback) {
    this.eventList.push({
      name: eventName,
      cb: eventCallback
    })
  }
  once(eventName, eventCallback) {
    this.eventList.push({
      name: eventName,
      cb: eventCallback,
      once: true
    })
  }
  emit(eventName) {
    for (let i = 0; i < this.eventList.length; i++) {
      if (this.eventList[i].name === eventName) {
        this.eventList[i].cb()
        if (this.eventList[i].once) {
          this.eventList.splice(i, 1)
          i--
        }
      }
    }
  }
  off(eventName) {
    for (let i = 0; i < this.eventList.length; i++) {
      if (this.eventList[i].name === eventName) {
        this.eventList.splice(i, 1)
        i--
      }
    }
  }
}

async function PromiseAny(promiseList) {
  let res = []
  for (const iterator of promiseList) {
    res.push(await iterator())
  }
  return res
}

function PromiseAny2(promiseList) {
  if (!promiseList.length) return
  execute(promiseList.shift(), promiseList)
}

function execute(single, promiseList) {
  single().then(() => {
    return PromiseAny2(promiseList)
  })
}

// 请设计一个 TaskPool 类如下
class TaskPool {
  // 设计 delayRun() 方法，支持链式操作，注意 delayTime 是间隔时长
  delayRun(delayTime, callback) {}
}

const instance = new TaskPool()

instance
  .delayRun(3000, function task1() {
    console.log('run log 1')
  })
  .delayRun(2000, function task2() {
    console.log('run log 2')
  })
  .delayRun(1000, function task3() {
    console.log('run log 3')
  })

setTimeout(() => {
  instance.delayRun(10, function task4() {
    console.log('run log 4')
  })
}, 4000)

// 需要按照如下顺序打印
//打印 register 3000 task1
//打印 register 2000 task2
//打印 register 1000 task3
//过 3 秒打印 run log 1
//打印 register 10 task4
//间隔2秒打印 run log 2
//又间隔1秒打印 run log 3
//又间隔10毫秒打印 run log 4

class TaskPool {
  constructor() {
    this.task1 = 0
  }
  // 设计 delayRun() 方法，支持链式操作，注意 delayTime 是间隔时长
  delayRun(delayTime, callback) {
    console.log('register', 'delayTime', this.task1)
    this.task1++
    new Promise((resolve) => {
      setTimeout(() => {
        callback()
        resolve()
      }, delayTime)
    })
    return this
  }
}

// 请实现 listToTree 函数，根据 parentId 的关系把数组转换成树形结构，要求时间复杂度不能为 n^2

// 原始数据：
const data = [
  { id: 1, name: '部门A', parentId: 0 },
  { id: 2, name: '部门B', parentId: 0 },
  { id: 3, name: '部门C', parentId: 1 },
  { id: 4, name: '部门D', parentId: 1 },
  { id: 5, name: '部门E', parentId: 2 },
  { id: 6, name: '部门F', parentId: 3 },
  { id: 7, name: '部门G', parentId: 5 },
  { id: 8, name: '部门H', parentId: 4 }
]

function listTree(data) {
  let root = data.filter((item) => item.parentId === 0)
  for (let i = 0; i < root.length; i++) {
    const element = root[i]
    if (element.parentId === root[i]) {
    }
  }
}

function listTree(data) {
  let temp = {}
  for (let i = 0; i < data.length; i++) {
    if (temp[data[i].parentId]) {
      temp[data[i].parentId].push(data[i])
    } else {
      temp[data[i].parentId] = [data[i]]
    }
  }
  for (const key in temp) {
    for (let i = 0; i < temp[key].length; i++) {
      if (temp[temp[key][i].id]) {
        temp[key][i].children = temp[temp[key][i].id]
      }
    }
  }
  return temp[0]
}

// 另一种思路，使用map结构存储id，

// 然后找parentId 与其对应id ，是否有，有就塞入children
function listTree2(data) {
  let temp = { 0: { children: [] } }
  for (let i = 0; i < data.length; i++) {
    temp[data[i].id] = data[i]
  }
  let parentId
  for (const key in temp) {
    parentId = temp[key].parentId
    if (temp[parentId]) {
      if (temp[parentId].children) {
        temp[parentId].children.push(temp[key])
      } else {
        temp[parentId].children = [temp[key]]
      }
    }
  }
  return temp[0].children
}
console.log(listTree2(data))


// 一条路长度为n，有n+1个距离相等的路灯，分别位于[0，1....n], 每个路灯的亮度为lamps[i],即可照亮的范围为[i-lamp[i], i+lamp[i]]
//   lamps[i]可能为0，即无法打开。请计算照亮整条路，最少需要打开几盏路灯。如果无法照亮整条路，返回 -1.
//   示例：输入：n = 7, lamps = [1,2,1,0,2,1,0,1]
//   输出：3

// 遍历， 
function openLamps(lamps) {
  if (!lamps.length) return -1
  let lights = 0
  let temp = {} // 存储没有被照亮
  for (let i = 0; i < lamps.length; i++) {
    if (!lamps[i] && !temp[i]) {
      temp[i] = 0
    } else {
      lights++
      for (let j = i; j >= i-temp[i] && j >=0 ; j--) {
        temp[j] = 1
      }
      for (let j = i; j <= i+temp[i] && j < lamps.length ; j++) {
        temp[j] = 1
      }
    }
  }
  return Object.values.find(item => !item) ? -1 : lights
}


// 实现一个函数，要求：在整形数组中，找出3个数的最大乘积，并将其输出。

// 示例1：
// 输入：[5,2,3,1]
// 输出：30

// 示例2:
// 输入：[1,-2,3,-6]
// 输出：36

function findMaxMulti(arr) {
  let res = []
  let used = []
  let temp = 1
  deep(arr, used, temp , res) 
  return res.reduce((pre,cur) => Math.max(pre, cur), 0)
} 

 function deep(arr, used, temp , res) {
   if (used.filter(item => item).length === 3) {
    res.push(temp)
    return
   }
   for (let i = 0; i < arr.length; i++) {
    if (used[i]) {
      continue
    }
    temp = temp * arr[i]
    used[i] = 1
    deep(arr, used, temp, res)
    temp =  temp /  arr[i]
    used[i] = 0
  }
 }