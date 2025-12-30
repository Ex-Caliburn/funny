
// 1.找出字符串中重复次数最多的元素
const str = "abcaasddsaaaaasds";
function longestStr(str) {
}
longestStr(str); // a

答案 
// 在此作答
// 1.找出字符串中重复次数最多的元素
function longestStr(str) {
  if (!str || !str.length) return
  let arr = str.split('')
  let temp = {}
  let max = 1
  let maxChar = arr[0]
  for (let i = 0; i < arr.length; i++) {
    if (temp[arr[i]]) {
      temp[arr[i]]++
      if (temp[arr[i]]> max) {
        max = temp[arr[i]]
        maxChar = arr[i]
      }
    } else {
      temp[arr[i]] = 1
    }
  }
  return maxChar
}

// 完成时间：


# 2.请用 es6 实现发布订阅模式
题目
// 请用 es6 实现发布订阅模式
// 代码提示
class Event {
  constructor(){
      this.eventList = []
  }
  on(eventName, eventCallback) {
  }
  emit(eventName) {
  }
  off(eventName) {
  }
}

let e = new Event();
function a() {
  console.log("a");
}
function b() {
  console.log("b");
}

e.on("test", a);
e.once("test1", b);

e.emit("test");  // a
e.emit("test");  // a

e.emit("test1"); // b
e.emit("test1");  

e.emit("test");  // a
e.off("test", a);
e.emit("test");

答案
// 在此作答
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
  emit(eventName) {
    for (let i = 0; i < this.eventList.length; i++) {
      if (this.eventList[i].name === eventName) {
        this.eventList[i].cb()
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

// 完成时间：

// # 3.实现一个Promise.all
题目
async function PromiseAny (promiseList) {
  let res = []
  for (const iterator of promiseList) {
    res.push(await iterator())
  }
  return res
}

function PromiseAny2 (promiseList) {
  if (!promiseList.length) return 
  execute(promiseList.shift(), promiseList)
}

function execute(single, promiseList) {
  single().then(() => {
    return PromiseAny2(promiseList)
  })
}

// 完成时间：



// # 4.请设计一个 TaskPool 类
题目
// 请设计一个 TaskPool 类如下
class TaskPool {
  // 设计 delayRun() 方法，支持链式操作，注意 delayTime 是间隔时长
  delayRun(delayTime, callback) {
  }
}

const instance = new TaskPool();

instance
  .delayRun(3000, function task1() {
    console.log("run log 1");
  })
  .delayRun(2000, function task2() {
    console.log("run log 2");
  })
  .delayRun(1000, function task3() {
    console.log("run log 3");
  });

setTimeout(() => {
  instance.delayRun(10, function task4() {
    console.log("run log 4");
  });
}, 4000);

// 需要按照如下顺序打印
//打印 register 3000 task1
//打印 register 2000 task2
//打印 register 1000 task3
//过 3 秒打印 run log 1
//打印 register 10 task4
//间隔2秒打印 run log 2
//又间隔1秒打印 run log 3
//又间隔10毫秒打印 run log 4



答案
// 请设计一个 TaskPool 类如下
class TaskPool {
  constructor() {
    this.task1 = 0
    this.pool = []
  }
  // 设计 delayRun() 方法，支持链式操作，注意 delayTime 是间隔时长
  delayRun(delayTime, callback) {
    console.log('register','delayTime', this.task1)
      this.task1++
      this.pool.push(function () {
        return new Promise((resolve) => {
          setTimeout(() => {
            callback()
            resolve()
          }, delayTime);
        })
      })
      PromiseAny(this.pool)
    return this
  }
}

// 完成时间：


// # 5.请实现 listToTree 函数
 题目
// 请实现 listToTree 函数，根据 parentId 的关系把数组转换成树形结构，要求时间复杂度不能为 n^2

// 原始数据：
const data = [
  { id: 1, name: "部门A", parentId: 0 },
  { id: 2, name: "部门B", parentId: 0 },
  { id: 3, name: "部门C", parentId: 1 },
  { id: 4, name: "部门D", parentId: 1 },
  { id: 5, name: "部门E", parentId: 2 },
  { id: 6, name: "部门F", parentId: 3 },
  { id: 7, name: "部门G", parentId: 5 },
  { id: 8, name: "部门H", parentId: 4 }
];

// 转换后的结果：
const result = [
  {
    id: 1,
    name: "部门A",
    parentId: 0,
    children: [
      {
        id: 3,
        name: "部门C",
        parentId: 1,
        children: [{ id: 6, name: "部门F", parentId: 3 }]
      },
      {
        id: 4,
        name: "部门D",
        parentId: 1,
        children: [{ id: 8, name: "部门H", parentId: 4 }]
      }
    ]
  },
  {
    id: 2,
    name: "部门B",
    parentId: 0,
    children: [
      { 
      id: 5, 
      name: "部门E", 
      parentId: 2,
      children: [{ id: 7, name: "部门G", parentId: 5 }]
      },
    ]
  }
];


答案
// 在此作答
// 原始数据：
const data = [
  { id: 1, name: "部门A", parentId: 0 },
  { id: 2, name: "部门B", parentId: 0 },
  { id: 3, name: "部门C", parentId: 1 },
  { id: 4, name: "部门D", parentId: 1 },
  { id: 5, name: "部门E", parentId: 2 },
  { id: 6, name: "部门F", parentId: 3 },
  { id: 7, name: "部门G", parentId: 5 },
  { id: 8, name: "部门H", parentId: 4 }
];

function listTree(data){
 let temp = {}
 for (let i = 0; i < data.length; i++) {
  if (temp[data[i].parentId]) {
    temp[data[i].parentId].push(data[i])
  } else {
    temp[data[i].parentId] =  [data[i]] 
  }
 }
 for (const key in temp) {
   for (let i = 0; i < temp[key].length; i++) {
    if (temp[temp[key][i].id]) {
      temp[key][i].children = temp[temp[key][i].id]
    }
   }
 }
 return  temp[0]
}
console.log(listTree(data))


// 完成时间：


