// process.nextTick(() => console.log(1));
// Promise.resolve().then(() => console.log(2));
// process.nextTick(() => console.log(3));
// Promise.resolve().then(() => console.log(4));

// 上面代码中，全部process.nextTick的回调函数，执行都会早于Promise的。


// http://www.ruanyifeng.com/blog/2018/02/node-event-loop.html


const fs = require('fs');

const timeoutScheduled = Date.now();

// 异步任务一：100ms 后执行的定时器
setTimeout(() => {
  const delay = Date.now() - timeoutScheduled;
  console.log(`${delay}ms`);
}, 100);

// 异步任务二：文件读取后，有一个 200ms 的回调函数
fs.readFile('test2.js', () => {
  const startCallback = Date.now();
  while (Date.now() - startCallback < 200) {
    // 什么也不做
    // console.log(22)
  }
});