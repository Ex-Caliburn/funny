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
// 输出顺序：3 4 1 2
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
// 输出顺序：3 4 1 6 7 8 9 2 5
```

## 事件循环机制理解

JavaScript的事件循环机制遵循以下规则：

1. **同步代码**：在主线程上立即执行
2. **宏任务（Macro Task）**：包括setTimeout、setInterval、setImmediate、I/O操作、UI渲染等
3. **微任务（Micro Task）**：包括Promise.then、process.nextTick、MutationObserver等

**执行顺序**：

- 执行完当前宏任务后，会检查微任务队列
- 执行完所有微任务后，才会执行下一个宏任务
- 微任务可以添加新的微任务，这些新微任务会在当前事件循环中执行完

## Promise

Promise 对象是一个代理对象（代理一个值），被代理的值在Promise对象创建时可能是未知的。它允许你为异步操作的成功和失败分别绑定相应的处理方法（handlers）。这让异步方法可以像同步方法那样返回值，但并不是立即返回最终执行结果，而是一个能代表未来出现的结果的promise对象。

一个 Promise有以下几种状态：

- **pending**: 初始状态，既不是成功，也不是失败状态。
- **fulfilled**: 意味着操作成功完成。
- **rejected**: 意味着操作失败。

### 链式调用

因为 `Promise.prototype.then` 和 `Promise.prototype.catch` 方法返回promise对象，所以它们可以被链式调用。

## 任务类型详解

### 宏任务（Macro Tasks）

- XHR回调
- 事件回调（鼠标键盘事件）
- setImmediate（Node.js）
- setTimeout
- setInterval
- requestAnimationFrame
- indexedDB数据库操作等I/O
- UI rendering

### 微任务（Micro Tasks）

- process.nextTick（Node.js）
- Promise.then/catch/finally
- Object.observer（已被废弃）
- MutationObserver（HTML5新特性）
- queueMicrotask（现代浏览器API）

## 事件循环执行机制

1. **执行同步代码**：在主线程上立即执行
2. **执行微任务队列**：清空所有微任务
3. **执行宏任务**：从宏任务队列中取出一个任务执行
4. **重复步骤2-3**：形成事件循环

**重要特点**：

- 微任务在当前事件循环中执行完
- 宏任务在下一个事件循环中执行
- 微任务可以添加新的微任务，这些新微任务会在当前事件循环中执行完

## 新解决方案

通过引入 `queueMicrotask()`，由晦涩地使用 promise 去创建微任务而带来的风险就可以被避免了。举例来说，当使用 promise 创建微任务时，由回调抛出的异常被报告为 rejected promises 而不是标准异常。同时，创建和销毁 promise 带来了事件和内存方面的额外开销，这是正确入列微任务的函数应该避免的。

`queueMicrotask` 除了 IE 都支持：

```js
queueMicrotask(function);
```

一个函数，当浏览器引擎确定调用你的代码是安全的时候，它就会被执行。入队的微任务会在所有待处理的任务完成后执行，但在将控制权交给浏览器的事件循环之前执行。

```js
let queuePromisetask = f => Promise.resolve().then(f);
let queueMacrotask= f => setTimeout(f);

queueMicrotask(() => console.log('Microtask 1'));
queueMacrotask(() => console.log('Macro task'));
queuePromisetask(() => console.log('Promise task'));
queueMicrotask(() => console.log('Microtask 2'));

// 输出顺序：Microtask 1, Promise task, Microtask 2, Macro task
```

**注意事项**：因为微任务自身可以入列更多的微任务，且事件循环会持续处理微任务直至队列为空，那么就存在一种使得事件循环无尽处理微任务的真实风险。如何处理递归增加微任务是要谨慎而行的。

## 常见误区

1. **setTimeout(fn, 0)** 不是立即执行，而是将回调放入宏任务队列
2. **Promise.then** 是微任务，会在当前事件循环中执行完
3. **微任务优先级高于宏任务**，但不是绝对的"先执行"
4. **事件循环是循环的**，不是线性的

### 参考文献

1. <https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide/In_depth>
2. <https://stackoverflow.com/questions/41075724/javascript-api-to-explicitly-add-micro-tasks-or-macro-tasks>
3. <https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide/In_depth>
4. <http://www.ruanyifeng.com/blog/2018/02/node-event-loop.html>
