# promiseResolve

## 前言

因为一道题引起，我把它简化

```js
new Promise(function (resolve) {
  resolve(Promise.resolve(1))
}).then(function () {
  console.log('promise then')
})
new Promise(function (resolve) {
  resolve()
}).then(function () {
  console.log('promise then2')
})

Promise.resolve().then(() => {
  console.log(0);
  return Promise.resolve(4)
}).then(res => {
  console.log(res)
})

// Promise.resolve().then(() => {
//   console.log(0);
//   return new Promise((resolve) => {
//     resolve(4)
//   })
// }).then(res => {
//   console.log(res)
// })

Promise.resolve().then(() => {
  console.log(0);
  return new Promise((resolve) => {
    resolve(4)
  }).then(res => {
    return res
  })
}).then(res => {
  console.log(res)
})

Promise.resolve().then(() => {
  console.log(1);
}).then(() => {
  console.log(2);
}).then(() => {
  console.log(3);
}).then(() => {
  console.log(5);
}).then(() =>{
  console.log(6);
})

// 输出：0 1 2 3 4 5 6
```

为什么 resolve(Promise.resolve(1)) 会比  resolve()慢？

### 源码

当 return Promise.resolve(4) 所处的 then 方法执行完成后，记 then 方法返回的 promise 为 p1，此时 p1 的状态是 pending，虽然我们知道 p1 的状态终将是 fulfilled，但现在保持 pending。记 return Promise.resolve(4) 的结果为 p2。

return Promise.resolve(4) 所在的 fulfilled 处理函数执行完成后，V8 调用 ResolvePromise，ResolvePromise 的参数 promise 是 p1，resolution 是 p2。如果 p2 是整数/字符串，则执行 FulfillPromise，改变 p1 的状态和结果，在 FulfillPromise 执行完成后，p1 的状态是 fulfilled，这是喜闻乐见的常规情况。

但本题我们的 p2 是 return Promise.resolve(4) 的结果，是一个 Promise 对象，所以 if (resolutionMap.prototype == promisePrototype) 分支为 true，跳转到标号 Enqueue，Enqueue 代码逻辑与规范一致，创建一个 microtask，也就是规范中的 NewPromiseResolveThenableJob，然后插入 microtask 队列。这是`第一个不执行任何 JS 代码的 microtask`。

```C++
// <https://tc39.es/ecma262/#sec-promise-resolve-functions>
transitioning builtin
ResolvePromise(implicit context: Context)(
    promise: JSPromise, resolution: JSAny): JSAny {
  try {
    // 8. If Type(resolution) is not Object, then
    // 8.a Return FulfillPromise(promise, resolution).
    if (TaggedIsSmi(resolution)) {
      // 如果 resolution 是整数/字符串，则调用 FulfillPromise
      // FulfillPromise 把 promise 状态变为 fulfilled 状态，这是最常见的情况
      return FulfillPromise(promise, resolution);
    }
    const promisePrototype =
        *NativeContextSlot(ContextSlot::PROMISE_PROTOTYPE_INDEX);
    // 本题代码执行到了这里，判断 resolution 的类型是否为 Promise，是的
    if (resolutionMap.prototype == promisePrototype) {
      // The {resolution} is a native Promise in this case.
then =*NativeContextSlot(ContextSlot::PROMISE_THEN_INDEX);
      // Check that Torque load elimination works.
      static_assert(nativeContext == LoadNativeContext(context));
      goto Enqueue;
    }
  } label Enqueue {
    // 13. Let job be NewPromiseResolveThenableJob(promise, resolution,
    // 代码逻辑与规范一致，创建 NewPromiseResolveThenableJobTask
    const task = NewPromiseResolveThenableJobTask(
        promise, UnsafeCast<JSReceiver>(resolution),
        UnsafeCast<Callable>(then));
    // 14. Perform HostEnqueuePromiseJob(job.[[Job]], job.[[Realm]]).
    // 15. Return undefined.
    // 插入 microtask 队列
    return EnqueueMicrotask(task.context, task);
  }
}
```

 p1： 当 return Promise.resolve(4) 所处的 then 方法执行完成后，记 then 方法返回的 promise 为
 p2： return Promise.resolve(4) 的结果

虽然在 JS 层面感受不深，但在 V8 中，microtask 有多种类型，所以 RunSingleMicrotask 有多个分支，与本题相关的分支是，BIND(&is_promise_resolve_thenable_job)，从名字也可以看出，和规范中的  NewPromiseResolveThenableJob 命名基本一致。BIND(&is_promise_resolve_thenable_job) 分支最重要的一行代码是 CallBuiltin(Builtins::kPromiseResolveThenableJob, native_context, promise_to_resolve, thenable, then)。相当于调用了 PromiseResolveThenableJob，这里的 promise_to_resolve 是 p1，thenable 是 p2，then 是 JS Promise 原型的 then 方法。PromiseResolveThenableJob 的源码见代码片断 3。

```C++
void MicrotaskQueueBuiltinsAssembler::RunSingleMicrotask(
    TNode<Context> current_context, TNode<Microtask> microtask) {
  CSA_ASSERT(this, TaggedIsNotSmi(microtask));
  StoreRoot(RootIndex::kCurrentMicrotask, microtask);
  TNode<IntPtrT> saved_entered_context_count = GetEnteredContextCount();
  TNode<Map> microtask_map = LoadMap(microtask);
  TNode<Uint16T> microtask_type = LoadMapInstanceType(microtask_map);

  TVARIABLE(Object, var_exception);
  Label if_exception(this, Label::kDeferred);
  Label is_callable(this), is_callback(this),
      is_promise_fulfill_reaction_job(this),
      is_promise_reject_reaction_job(this),
      is_promise_resolve_thenable_job(this),
  BIND(&is_promise_resolve_thenable_job);
  {
    // Enter the context of the {microtask}.
    CodeStubAssembler::Print("RunSingleMicrotask is_promise_resolve_thenable_job");
    TNode<Context> microtask_context = LoadObjectField<Context>(
        microtask, PromiseResolveThenableJobTask::kContextOffset);
    TNode<NativeContext> native_context = LoadNativeContext(microtask_context);
    PrepareForContext(native_context, &done);

    const TNode<Object> promise_to_resolve = LoadObjectField(
        microtask, PromiseResolveThenableJobTask::kPromiseToResolveOffset);
    const TNode<Object> then =
        LoadObjectField(microtask, PromiseResolveThenableJobTask::kThenOffset);
    const TNode<Object> thenable = LoadObjectField(
        microtask, PromiseResolveThenableJobTask::kThenableOffset);
    {
      ScopedExceptionHandler handler(this, &if_exception, &var_exception);
      // 关键的代码在这里，调用 PromiseResolveThenableJob
      CallBuiltin(Builtins::kPromiseResolveThenableJob, native_context,
                  promise_to_resolve, thenable, then);
    }
    Goto(&done);
  }
}
```

 p1： 当 return Promise.resolve(4) 所处的 then 方法执行完成后，记 then 方法返回的 promise 为
 p2： return Promise.resolve(4) 的结果

代码片断3：PromiseResolveThenableJob，功能是执行前面创建的 NewPromiseResolveThenableJob。
PromiseResolveThenableJob 的参数 promiseToResolve 是 p1，thenable 是 p2，then 是 JS Promise 原型的 then，底层调用了 PerformPromiseThen。PerformPromiseThen 方法也是  JS Promise then 方法的底层调用，如果用 JS 表述，大致相当于 JS 代码：`p1 = p2.then(undefined, undefined)`。p2 的状态是 fulfilled，fulfilled 回调函数 undefined 直接进入 microtask 队列。于是就出现了`第二个不执行任何 JS 代码的 microtask`，在这个 microtask 执行完成后，p1 的状态终于变成了 fulfilled。

```C++
// <https://tc39.es/ecma262/#sec-promiseresolvethenablejob>
transitioning builtin
PromiseResolveThenableJob(implicit context: Context)(
    promiseToResolve: JSPromise, thenable: JSReceiver, then: JSAny): JSAny {
  const nativeContext = LoadNativeContext(context);
  const promiseThen = *NativeContextSlot(ContextSlot::PROMISE_THEN_INDEX);
  const thenableMap = thenable.map;
    // What happens normally in this case is
    //
    //   resolve, reject = CreateResolvingFunctions(promise_to_resolve)
    //   result_capability = NewPromiseCapability(%Promise%)
    //   PerformPromiseThen(thenable, resolve, reject, result_capability)
    return PerformPromiseThen(
        UnsafeCast<JSPromise>(thenable), UndefinedConstant(),
        UndefinedConstant(), promiseToResolve);
}
```

MicrotaskQueueBuiltinsAssembler::RunSingleMicrotask 的功能是运行一个 microask，笔者在这个函数加了 log，从 log 可以清晰看到有两个 microtask 不执行任何 JS 代码，已用红框圈出。这两个 microtask 就是题主说的多出的那两个微任务。

![alt](https://pic1.zhimg.com/50/v2-20dd94a382c3d43928dac616eb895498_720w.jpg?source=1940ef5c)

简单说，就是创建 NewPromiseResolveThenableJob，多了一个 microtask；运行 NewPromiseResolveThenableJob 又多了一个 microtask，这两个 microtask 不执行 JS 代码。

### 二.回答新增一个 then，打印顺序不变的问题

```js
Promise.resolve().then(() => {
  console.log(0);

  return new Promise(resolve => {
    resolve(4)
  })
  // 新增一个 then  
  .then(res => {
    console.log('新增的 then 执行啦！')
    return res
  })
}).then(res => {
  console.log(res)
})

Promise.resolve().then(() => {
  console.log(1);
}).then(() => {
  console.log(2);
}).then(() => {
  console.log(3);
}).then(() => {
  console.log(5);
}).then(() =>{
  console.log(6);
})
```

新增一个 then 后，当执行到新增的这个 then 方法时，由于其对应的 promise 已经是 fulfilled 状态，所以 res => { console.log('新增的 then 执行啦！')  return res } 进入 microtask 队列，随后 NewPromiseResolveThenableJob 进入 microtask 队列。

依然记 return Promise.resolve(4) 所处的 then 方法返回的 promise 为 p1，记 return Promise.resolve(4).then(res => { console.log('新增的 then 执行啦！') return res } 的结果为 p2。

microtask 队列先进先出，当取出 res => {  console.log('新增的 then 执行啦！')  return res }  执行时，p2 的状态变为 fulfilled，当取出 NewPromiseResolveThenableJob 执行时，由于 p2 的状态已经是 fullfilled，后面的逻辑和本回答第一节完全一样

![alt](https://pica.zhimg.com/80/v2-12aa85306a002f8507fd9cba12a5abc9_1440w.jpg?source=1940ef5c)

如果在多加几个then的话， NewPromiseResolveThenableJob 都是在最后一个then执行的时候执行，因为这时候已经知道 then执不执行 resolve() 这个参数是个 Promise

都是调用 resolve 的时候创建。只要 resolve 的参数是 Promise，就会创建 PromiseResolveThenableJob

 NewPromiseResolveThenableJob 执行的时机，是判断resolve()的参数是不是Promise，多个then().then(),它必须等到最后一个then 执行才知道 参数 是 Promise类型么？

反证

```js
Promise.resolve().then(() => {
  console.log(0);

  return new Promise(resolve => {
    resolve(4)
  })
  // 新增一个 then
  .then(res => {
    console.log('新增的 then 执行啦！')
    return res
  }).toString()
}).then(res => {
  console.log(res)
})

Promise.resolve().then(() => {
  console.log(1);
}).then(() => {
  console.log(2);
}).then(() => {
  console.log(3);
}).then(() => {
  console.log(5);
}).then(() =>{
  console.log(6);
})
0
 1
新增的 then 执行啦！
 [object Promise]
 2
 3
 5
 6
```

## 总结

在Promise函数中return 一个普通类型，直接调用FulfillPromise
在Promise函数中return Promise.resolve(params)，就会进行如下判断
如果是个promise 对象，插入到微任务队列，产生两个空回调，一个是NewPromiseResolveThenableJobTask， 另一个是p.then(undefine,undefined)的空回调,undefine 是一个空回调插入微任务队列，

Promise.reject(params) 类似

下次遇到问题

1. 看源码
2. 发到群里问大佬

### 参考文献

1. <https://www.zhihu.com/question/453677175>
2. <https://tc39.es/ecma262/#sec-promise-resolve-functions>
