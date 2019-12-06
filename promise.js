Promise.resolve().then(()=>{
  console.log('Promise1')
  setTimeout(()=>{
    console.log('setTimeout2')
  },0)
});
setTimeout(()=>{
  console.log('setTimeout1')
  Promise.resolve().then(()=>{
    console.log('Promise2')
  })
},0);
console.log('start');
/*
* 解析 整个js当做是宏任务 遇到promise.resolve 在当前宏任务尾部塞入微任务队列， 遇到 settimeout 入宏任务队列
* 打印 start
* 先执行 promise.resolve.then 的微任务，
 * 打印  'Promise1'
 * 遇到 settimeout 塞入 宏任务队列
 *  检查 当前微任务队列是否还有任务， 没有执行下一个宏任务
 *  打印 'setTimeout1'
 *  遇到 promise.resolve 在当前 宏任务 队列尾部塞入微任务队列
 *  检查 微任务 打印 'setTimeout1'
 *  检查 微任务， 没有，执行宏任务 打印 'setTimeout2'
 *
* */

// 立即resolve的 Promise 对象，是在本轮“事件循环”（event loop）的结束时执行执行，不是马上执行,也不是在下一轮“事件循环”的开始时执行
Promise.resolve().then(() => console.log(2)).then(() => console.log(3));
console.log(1); // 1, 2, 3
