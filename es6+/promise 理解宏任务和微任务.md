# 宏任务和微任务

## 现象 同是异步队列为什么别人比我快

```js
setTimeout(() => {
    console.log(1)
},0)
setTimeout(() => {
    console.log(2)
},0)
new Promise((resolve) => {
    console.log(3)
}).then(() => {
    console.log(4)
})
// 3 4 1 2
 ```

```js
setTimeout(() => {
    console.log(1)
    setTimeout(() => {
        console.log(5)
    },0)
    new Promise((resolve) => {
        console.log(6)
        resolve()
    }).then(() => {
        console.log(7)
    })
    new Promise((resolve) => {
        console.log(8)
        resolve()
    }).then(() => {
        console.log(9)
    })
},0)
setTimeout(() => {
    console.log(2)
},0)
new Promise((resolve) => {
    console.log(3)
    resolve()
}).then(() => {
    console.log(4)
})
```

我的理解:
多个微任务会在宏任务结尾处执行
消息队列每个消息对应相对应的回调函数，当定时器1，定时器2 把其回调队列塞到回调队列，碰到promise.then 微任务，会把promise.then的回调函数塞在执行栈的最后，所以promise.then 会在定时器任务之前，多个promise.then也会将回调函数按顺序塞进执行栈，因为执行栈有任务了，事件轮询机制在处理完当前任务优先处理执行栈中任务，执行完去轮询消息队列（回调队列）

## promise

Promise 对象是一个代理对象（代理一个值），被代理的值在Promise对象创建时可能是未知的。它允许你为异步操作的成功和失败分别绑定相应的处理方法（handlers）。 这让异步方法可以像同步方法那样返回值，但并不是立即返回最终执行结果，而是一个能代表未来出现的结果的promise对象

一个 Promise有以下几种状态:

pending: 初始状态，既不是成功，也不是失败状态。
fulfilled: 意味着操作成功完成。
rejected: 意味着操作失败。

### 链式调用

因为 Promise.prototype.then 和  Promise.prototype.catch 方法返回promise 对象， 所以它们可以被链式调用。

#### 宏任务 Tasks

XHR回调、事件回调（鼠标键盘事件）、setImmediate、setTimeout、setInterval、requestAnimationFrame、indexedDB数据库操作等I/O以及UI rendering

#### 微任务 microtasks

process.nextTick（nodejs）、Promise.then、Object.observer(已经被废弃)、MutationObserver(html5新特性)
为了突破单线程的限制

区别
hen executing tasks from the task queue, the runtime executes each task that is in the queue at the moment a new iteration of the event loop begins. Tasks added to the queue after the iteration begins will not run until the next iteration.

1. 当执行回调队列，执行队列执行每一个在回调队列中的任务同时事件循环开始新的循环，在循环开始之后回调队列新添加的任务，直到下一次事件轮询开始才会运行
2. 当任务退出，当执行栈为空，每一个微任务队列的微任务都会执行，一个接一个 微任务队列会执行到微任务队列为空为止，即使有新队列加入， 微任务队列能加入新的微任务，这些新的微任务会在下一个宏任务开始之前执行，而且在当前事件事件轮询结束之前


### 新解决方案

通过引入 queueMicrotask()，由晦涩地使用 promise 去创建微任务而带来的风险就可以被避免了。举例来说，当使用 promise 创建微任务时，由回调抛出的异常被报告为 rejected promises 而不是标准异常。同时，创建和销毁 promise 带来了事件和内存方面的额外开销，这是正确入列微任务的函数应该避免的。

```js
let queuePromisetask = f => Promise.resolve().then(f);
let queueMacrotask= f => setTimeout(f);

queueMicrotask(() => console.log('Microtask 1'));
queueMacrotask(() => console.log('Macro task'));
queuePromisetask(() => console.log('Promise task'));
queueMicrotask(() => console.log('Microtask 2'));
```

### 参考文献

1. <https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide/In_depth>
2. <https://stackoverflow.com/questions/41075724/javascript-api-to-explicitly-add-micro-tasks-or-macro-tasks>
3. <https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide/In_depth>
4. <http://www.ruanyifeng.com/blog/2018/02/node-event-loop.html>
