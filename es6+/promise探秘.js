// https://mp.weixin.qq.com/s?__biz=MjM5MTA1MjAxMQ==&mid=2651240199&idx=1&sn=85483c1b8a0119ee009869f8b99403b3&chksm=bd496e838a3ee79535fc8d6fa921a38a2f275935be7a3ff4a65e8908f034855e5b38b9631de9&scene=21#wechat_redirect
// https://mp.weixin.qq.com/s/RHxwjqKN6v7emBd-Hsvpeg
// https://tc39.es/ecma262/#sec-promise-objects

// executor 的类型是函数，在 JavaScript 的世界里，回调函数通常是异步调用，
// 但 executor 是同步调用。在 Call(context, UnsafeCast(executor), Undefined, resolve, reject) 这一行，同步调用了 executor。
console.log('a')
let realPromise2 = new Promise((resolve, reject) => {
  resolve(1)
  console.log('b')
})
console.log('c')


// PromisePrototypeThen 函数创建了一个新的 Promise，获取 then 接收到的两个参数，
// 调用 PerformPromiseThenImpl 完成大部分工作。这里有一点值得注意，then 方法返回的是一个新创建的 Promise。
realPromise3 = realPromise2.then()
console.log(realPromise3 === realPromise2)


 
// 即使调用 then 方法时 promise 已经处于 fulfilled 或 rejected 状态，
// then 方法的 onFulfilled 或 onRejected 参数也不会立刻执行，而是进入
// microtask 队列后执行


// myPromise4 调用了两次 then 方法，每个 then 方法都会生成一个 PromiseReaction 对象。
// 第一次调用 then 方法时生成对象 PromiseReaction1，此时 myPromise4 的 reactionsorresult 存的是 PromiseReaction1。

// 第二次调用 then 方法时生成对象 PromiseReaction2，调用 NewPromiseReaction 函数时，
// PromiseReaction2.next = PromiseReaction1，PromiseReaction1 变成了 PromiseReaction2 的下一个节点，
// 最后 myPromise4 的 reactionsorresult 存的是 PromiseReaction2。
// PromiseReaction2 后进入 Promise 处理函数的链表，却是链表的头结点。NewPromiseReaction 函数源码如下：
let realPromise3 = new Promise((resolve, reject) => {
    resolve(1)
  })
  realPromise3.then(() => {
    console.log('1 then')
  })

  realPromise3.then(() => {
    console.log('2 then')
  })

  

// TriggerPromiseReactions 做了两件事：

// 反转 reactions 链表，前文有分析过 then 方法的实现，then 方法的参数最终存在链表中。最后被调用的 then 方法，
// 它接收的参数被包装后会位于链表的头部，这不符合规范，所以需要反转

// 遍历 reactions 对象，将每个元素放入 microtask 队列
