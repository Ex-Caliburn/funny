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

// resolve 的主要工作是遍历上节调用 then 方法时收集到的依赖，放入 microtask 队列中

// 总结与感想
// 曾经觉得 Promise 很神秘，看了源码觉得 Promise 的本质其实还是回调函数，只不过背靠 Promise 的一系列方法和思想，
// 改变了书写回调函数的方式。then 方法做依赖收集，resolve 将 then 收集到的依赖，放入 microtask 队列中。
// 笔者觉得 Promise 属于微创新，async/await 抛弃回调函数式的写法，暂停/恢复当前代码的执行，是革命性的创新。

realPromise5 = new Promise((resolve, reject) => {
  resolve(1)
  console.log('1')
})
setTimeout(() => {
  console.log('2')
})
realPromise5
  .then(() => {
    console.log('3')
    setTimeout(() => {
      console.log('4')
    })
  })
  .then(() => {
    console.log('5')
  })

// 流程总结 从事件轮询的角度
// Promise 函数体 是同步语句
// 等待执行resolve，或者reject， 如果一直不执行，就一直处于pending状态
// resolve/reject 触发回调，不会立即执行，会push到微任务队列中，
// 如果多个then 生成promiseReaction链表，并且反转，遍历 promiseReaction链表，依次处理，并放入 microtask 队列


// 关于 then 中定时器 return 的行为演示
console.log('=== then 中定时器 return 的行为演示 ===')

let promiseWithTimer = new Promise((resolve) => {
  console.log('Promise 开始执行')
  resolve('初始值')
})

promiseWithTimer
  .then((value) => {
    console.log('第一个 then，收到值:', value)
    
    // 在定时器中 return
    setTimeout(() => {
      console.log('定时器执行，准备 return')
      return '定时器返回值' // 这个 return 不会影响 Promise 链
    }, 1000)
    
    // 立即 return，这个值会传递给下一个 then
    return '第一个 then 的返回值'
  })
  .then((value) => {
    console.log('第二个 then，收到值:', value) // 会收到 '第一个 then 的返回值'
    
    // 如果要在定时器后传递值，需要使用新的 Promise
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('定时器执行完成，resolve 新值')
        resolve('定时器后的新值')
      }, 1000)
    })
  })
  .then((value) => {
    console.log('第三个 then，收到值:', value) // 会收到 '定时器后的新值'
  })

// 关键点总结：
// 1. 在 then 的回调函数中，定时器里的 return 不会影响 Promise 链
// 2. 只有 then 回调函数直接 return 的值才会传递给下一个 then
// 3. 如果要在异步操作后传递值，需要 return 一个新的 Promise
// 4. Promise 链会等待这个新 Promise 完成后再继续

// ===== Promise 底层机制更准确的说明 =====

// PromiseReaction 链表机制详解：
// 1. 每次调用 then() 都会创建一个 PromiseReaction 对象
// 2. 这些对象通过 next 指针连接成链表
// 3. 新创建的 PromiseReaction 会插入到链表头部
// 4. 执行时需要按照 then 的调用顺序，所以需要反转链表

// 示例演示：
let demoPromise = new Promise((resolve) => {
  resolve('demo')
})

// 调用顺序：then1 -> then2 -> then3
demoPromise.then(() => console.log('then1'))  // 创建 PromiseReaction1
demoPromise.then(() => console.log('then2'))  // 创建 PromiseReaction2，next = PromiseReaction1
demoPromise.then(() => console.log('then3'))  // 创建 PromiseReaction3，next = PromiseReaction2

// 链表结构：PromiseReaction3 -> PromiseReaction2 -> PromiseReaction1
// 反转后：PromiseReaction1 -> PromiseReaction2 -> PromiseReaction3
// 执行顺序：then1 -> then2 -> then3

// 关于 microtask 队列的补充说明：
// 1. Promise 的回调函数确实会进入微任务队列
// 2. 但这不是 Promise 特有的，而是 JavaScript 事件循环的机制
// 3. Promise 的 then/catch/finally 回调都是微任务
// 4. 微任务会在当前宏任务执行完毕后、下一个宏任务开始前执行

// 执行时机对比：
console.log('同步代码开始')
setTimeout(() => console.log('宏任务'), 0)
Promise.resolve().then(() => console.log('微任务'))
console.log('同步代码结束')

// 输出顺序：同步代码开始 -> 同步代码结束 -> 微任务 -> 宏任务

// ===== then 的 return 与 resolve 的关系详解 =====

// 1. 基本相似性：都会创建 fulfilled 状态的 Promise
let promise1 = Promise.resolve('原始值')
  .then(value => {
    console.log('收到值:', value)
    return 'then 返回值'  // 相当于 Promise.resolve('then 返回值')
  })

let promise2 = Promise.resolve('原始值')
  .then(value => {
    console.log('收到值:', value)
    return Promise.resolve('then 返回值')  // 显式返回 Promise
  })

// 2. 关键区别：return 的隐式包装
let demo1 = Promise.resolve('hello')
  .then(value => {
    console.log('demo1:', value)
    return 'world'  // 隐式被包装成 Promise.resolve('world')
  })
  .then(value => {
    console.log('demo1 结果:', value)  // 输出: world
  })

// 3. 特殊情况：return undefined
let demo2 = Promise.resolve('hello')
  .then(value => {
    console.log('demo2:', value)
    // 没有 return，相当于 return undefined
  })
  .then(value => {
    console.log('demo2 结果:', value)  // 输出: undefined
  })

// 4. return 与 resolve 的等价性验证
let promise3 = new Promise((resolve) => {
  resolve('直接 resolve')
})

let promise4 = Promise.resolve().then(() => {
  return 'then return'
})

// 这两个 Promise 在行为上是等价的
promise3.then(value => console.log('promise3:', value))
promise4.then(value => console.log('promise4:', value))

// 5. 但 return 不能替代 resolve 的所有功能
let promise5 = new Promise((resolve, reject) => {
  // resolve 可以设置 Promise 状态
  resolve('成功')
  // reject('失败')  // 可以设置失败状态
})

// then 的 return 只能设置成功状态，无法设置失败状态
let promise6 = Promise.resolve()
  .then(() => {
    // return 无法模拟 reject
    // 只能抛出错误来触发失败
    throw new Error('then 中的错误')
  })

// 6. 总结对比：
// return 的优势：
// - 语法简洁，自动包装成 Promise
// - 在 then 链中自然传递值
// - 适合简单的值传递

// resolve 的优势：
// - 可以显式控制 Promise 状态
// - 可以设置成功或失败状态
// - 更灵活的状态控制

// 7. 实际使用建议：
// 在 then 回调中：
// - 简单返回值用 return
// - 需要控制状态用 Promise.resolve/reject
// - 异步操作用 return new Promise()

console.log('=== 测试开始 ===')




