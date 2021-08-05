// https://zhuanlan.zhihu.com/p/134647506

// await接受 基础类型和promise
// await 2 是基础类型，直接返回 
async function test() {
  setTimeout(() => {
    console.log(1)
  })
  b = await 2
  console.log(b, 3)
}
test()

function promise1() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(2)
      console.log(6)
    })
  })
}

async function test2() {
  setTimeout(() => {
    console.log(1)
  })
  Promise.resolve(5).then((res) => {
    console.log(res)
  })
  console.log(await promise1())
  console.log(3)
}
test2()


function promise2() {
  return new Promise((resolve) => {
    resolve(2)
  })
}

async function test3() {
  setTimeout(() => {
    console.log(1)
  })
  Promise.resolve(5).then((res) => {
    console.log(res)
  })
  console.log(await promise2())
  console.log(3)
}
test3()

// 5 2 1 3
// 竟然是 5231

// await 后既可以是 Promise 对象，也可以是原始类型的值
// await 后面的接的函数会被加入到microtask队列

// async await 是 generate 的语法糖，不是promise ，完全是不一样的
//  执await 时，promise1里的任务会加入到microtask队列，但是里面的语句看情况执行，如果嵌套宏任务的话，按事件轮训的来
// 主线程暂停，执行 microtask的任务队列
// 然后等promise1变成fullfilled状态
// 主线程恢复执行状态

// 这个可以理解为一个线程里的两个协程吧，async可以理解为当前线程的子协程，
// 执行async方法时暂停当前线程的主协程执行，执行子协程，遇到await暂停子协程执行，转而执行主协程。

// async 函数本质还是 Generator 函数，是通过不断执行遍历器对象的 next 方法来执行函数。当遍历器对象遍历完毕，
// 就将最后遍历 (return) 的值 resolve 出来传递给成功回调。


