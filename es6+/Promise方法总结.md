# Promise 方法总结

## 概述

Promise 是 JavaScript 中处理异步操作的标准方式，ES6 引入了 Promise 对象，ES2020 和 ES2021 又增加了新的静态方法。本文档总结了所有 Promise 相关的方法和用法。

## Promise 静态方法

### 1. Promise.all()

| 特性 | 说明 |
|------|------|
| **功能** | 等待所有 Promise 完成，返回结果数组 |
| **参数** | `Promise[]` - Promise 数组 |
| **返回值** | `Promise<any[]>` - 包含所有结果的数组 |
| **成功条件** | 所有 Promise 都成功 |
| **失败条件** | 任何一个 Promise 失败 |
| **失败行为** | 立即失败，返回第一个失败的原因 |
| **适用场景** | 需要所有异步操作都成功的情况 |

```js
// 成功示例
Promise.all([
  Promise.resolve(1),
  Promise.resolve(2),
  Promise.resolve(3)
]).then(results => {
  console.log(results); // [1, 2, 3]
});

// 失败示例
Promise.all([
  Promise.resolve(1),
  Promise.reject('error'),
  Promise.resolve(3)
]).catch(error => {
  console.log(error); // 'error'
});
```

### 2. Promise.race()

| 特性 | 说明 |
|------|------|
| **功能** | 返回第一个完成的 Promise 结果 |
| **参数** | `Promise[]` - Promise 数组 |
| **返回值** | `Promise<any>` - 第一个完成的结果 |
| **完成条件** | 第一个 Promise 完成（成功或失败） |
| **适用场景** | 超时控制、竞态条件处理 |

```js
// 超时控制
const timeout = new Promise((_, reject) => {
  setTimeout(() => reject('timeout'), 5000);
});

const fetchData = fetch('/api/data');

Promise.race([fetchData, timeout])
  .then(data => console.log('数据获取成功:', data))
  .catch(error => console.log('错误:', error));
```

### 3. Promise.allSettled()

| 特性 | 说明 |
|------|------|
| **功能** | 等待所有 Promise 完成，返回状态和结果 |
| **参数** | `Promise[]` - Promise 数组 |
| **返回值** | `Promise<Array<{status, value\|reason}>>` |
| **完成条件** | 所有 Promise 都完成（无论成功失败） |
| **结果格式** | `{status: 'fulfilled'\|'rejected', value\|reason}` |
| **适用场景** | 需要知道所有操作结果的情况 |

```js
Promise.allSettled([
  Promise.resolve(1),
  Promise.reject('error'),
  Promise.resolve(3)
]).then(results => {
  console.log(results);
  // [
  //   { status: 'fulfilled', value: 1 },
  //   { status: 'rejected', reason: 'error' },
  //   { status: 'fulfilled', value: 3 }
  // ]
});
```

### 4. Promise.any()

| 特性 | 说明 |
|------|------|
| **功能** | 返回第一个成功的 Promise 结果 |
| **参数** | `Promise[]` - Promise 数组 |
| **返回值** | `Promise<any>` - 第一个成功的结果 |
| **成功条件** | 至少有一个 Promise 成功 |
| **失败条件** | 所有 Promise 都失败 |
| **失败行为** | 返回 AggregateError，包含所有失败原因 |
| **适用场景** | 多个备选方案，任一成功即可 |

```js
Promise.any([
  Promise.reject('error1'),
  Promise.resolve('success'),
  Promise.reject('error2')
]).then(result => {
  console.log(result); // 'success'
});

// 全部失败
Promise.any([
  Promise.reject('error1'),
  Promise.reject('error2')
]).catch(error => {
  console.log(error instanceof AggregateError); // true
  console.log(error.errors); // ['error1', 'error2']
});
```

### 5. Promise.resolve()

| 特性 | 说明 |
|------|------|
| **功能** | 创建已解决的 Promise |
| **参数** | `any` - 要解决的值 |
| **返回值** | `Promise<any>` - 已解决的 Promise |
| **适用场景** | 将同步值包装为 Promise |

```js
// 包装普通值
Promise.resolve(42).then(value => {
  console.log(value); // 42
});

// 包装 Promise（原样返回）
const p = Promise.resolve(1);
Promise.resolve(p) === p; // true

// 包装 thenable 对象
Promise.resolve({
  then: (resolve) => resolve('thenable')
}).then(value => {
  console.log(value); // 'thenable'
});
```

### 6. Promise.reject()

| 特性 | 说明 |
|------|------|
| **功能** | 创建已拒绝的 Promise |
| **参数** | `any` - 拒绝原因 |
| **返回值** | `Promise<any>` - 已拒绝的 Promise |
| **适用场景** | 创建已拒绝的 Promise |

```js
Promise.reject('error').catch(reason => {
  console.log(reason); // 'error'
});

// 包装错误对象
Promise.reject(new Error('Something went wrong'))
  .catch(error => {
    console.log(error instanceof Error); // true
  });
```

## Promise 实例方法

### 1. Promise.prototype.then()

| 特性 | 说明 |
|------|------|
| **功能** | 处理 Promise 的成功和失败状态 |
| **参数** | `onFulfilled?: Function, onRejected?: Function` |
| **返回值** | `Promise<any>` - 新的 Promise |
| **链式调用** | 支持链式调用 |
| **微任务** | 回调函数在微任务队列中执行 |

```js
new Promise((resolve) => resolve(1))
  .then(value => {
    console.log('成功:', value); // 成功: 1
    return value * 2;
  })
  .then(value => {
    console.log('链式调用:', value); // 链式调用: 2
  })
  .catch(error => {
    console.log('错误:', error);
  });
```

### 2. Promise.prototype.catch()

| 特性 | 说明 |
|------|------|
| **功能** | 处理 Promise 的失败状态 |
| **参数** | `onRejected: Function` |
| **返回值** | `Promise<any>` - 新的 Promise |
| **等价于** | `then(undefined, onRejected)` |

```js
new Promise((_, reject) => reject('error'))
  .catch(reason => {
    console.log('捕获错误:', reason); // 捕获错误: error
    return 'recovered';
  })
  .then(value => {
    console.log('恢复后:', value); // 恢复后: recovered
  });
```

### 3. Promise.prototype.finally()

| 特性 | 说明 |
|------|------|
| **功能** | 无论成功失败都执行的回调 |
| **参数** | `onFinally: Function` |
| **返回值** | `Promise<any>` - 新的 Promise |
| **执行时机** | 在 then/catch 之后执行 |
| **不传递值** | 回调函数不接收任何参数 |

```js
new Promise((resolve) => resolve('success'))
  .then(value => {
    console.log('成功:', value);
    return value;
  })
  .finally(() => {
    console.log('清理工作');
  })
  .then(value => {
    console.log('finally 后的值:', value); // 值保持不变
  });
```

## 方法对比总结

| 方法 | 等待条件 | 成功条件 | 失败条件 | 返回值 |
|------|----------|----------|----------|--------|
| `Promise.all()` | 所有完成 | 全部成功 | 任一失败 | 结果数组 |
| `Promise.race()` | 第一个完成 | 第一个完成 | 第一个完成 | 第一个结果 |
| `Promise.allSettled()` | 所有完成 | 全部完成 | 全部完成 | 状态数组 |
| `Promise.any()` | 第一个成功 | 任一成功 | 全部失败 | 第一个成功结果 |
| `Promise.resolve()` | 立即完成 | 立即成功 | - | 已解决的值 |
| `Promise.reject()` | 立即完成 | - | 立即失败 | 已拒绝的原因 |

## 实际应用场景

### 1. 并发请求控制

```js
// 限制并发数量
async function limitConcurrency(tasks, limit) {
  const results = [];
  const executing = [];
  
  for (const task of tasks) {
    const promise = task();
    results.push(promise);
    
    if (limit <= tasks.length) {
      const cleanup = () => {
        const index = executing.indexOf(cleanup);
        executing.splice(index, 1);
      };
      executing.push(cleanup);
      promise.then(cleanup).catch(cleanup);
    }
    
    if (executing.length >= limit) {
      await Promise.race(executing);
    }
  }
  
  return Promise.all(results);
}
```

### 2. 超时处理

```js
// 带超时的请求
function fetchWithTimeout(url, timeout = 5000) {
  return Promise.race([
    fetch(url),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), timeout)
    )
  ]);
}
```

### 3. 错误恢复

```js
// 多个备选方案
async function fetchWithFallback(urls) {
  try {
    return await Promise.any(urls.map(url => fetch(url)));
  } catch (error) {
    console.log('所有请求都失败了:', error.errors);
    throw new Error('无法获取数据');
  }
}
```

## 注意事项

1. **微任务队列**：Promise 回调在微任务队列中执行，优先级高于宏任务
2. **错误传播**：未捕获的 Promise 错误会导致 "Unhandled promise rejection" 警告
3. **内存泄漏**：长时间未解决的 Promise 可能导致内存泄漏
4. **性能考虑**：大量并发 Promise 可能影响性能，需要控制并发数量

## 总结

Promise 提供了强大的异步操作处理能力，不同的静态方法适用于不同的场景：

- **all()**: 需要所有操作都成功
- **race()**: 只需要第一个完成的结果
- **allSettled()**: 需要知道所有操作的结果
- **any()**: 任一成功即可
- **resolve/reject()**: 创建已确定状态的 Promise

合理选择合适的方法可以大大简化异步代码的编写和维护。
