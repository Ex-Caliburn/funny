# async/await

## 前言





```js
fetch('https://www.geekbang.org')
      .then((response) => {
          console.log(response)
          return fetch('https://www.geekbang.org/test')
      }).then((response) => {
          console.log(response)
      }).catch((error) => {
          console.log(error)
      })
```
从这段 Promise 代码可以看出来，使用 promise.then 也是相当复杂，虽然整个请求流程已经线性化了，但是代码里面包含了大量的 then 函数，使得代码依然不是太容易阅读。基于这个原因，ES7 引入了 async/await，这是 JavaScript 异步编程的一个重大改进，提供了在不阻塞主线程的情况下使用同步代码实现异步访问资源的能力，并且使得代码逻辑更加清晰。你可以参考下面这段代码：

```js
async function foo(){
  try{
    let response1 = await fetch('https://www.geekbang.org')
    console.log('response1')
    console.log(response1)
    let response2 = await fetch('https://www.geekbang.org/test')
    console.log('response2')
    console.log(response2)
  }catch(err) {
       console.error(err)
  }
}
foo()
```
通过上面代码，你会发现整个异步处理的逻辑都是使用同步代码的方式来实现的，而且还支持 try catch 来捕获异常，这就是完全在写同步代码，所以是非常符合人的线性思维的。但是很多人都习惯了异步回调的编程思维，对于这种采用同步代码实现异步逻辑的方式，还需要一个转换的过程，因为这中间隐藏了一些容易让人迷惑的细节。

### 生成器 VS 协程

生成器函数是一个带星号函数，而且是可以暂停执行和恢复执行的。我们可以看下面这段代码：

```js
function* genDemo() {
    console.log("开始执行第一段")
    yield 'generator 2'

    console.log("开始执行第二段")
    yield 'generator 2'

    console.log("开始执行第三段")
    yield 'generator 2'

    console.log("执行结束")
    return 'generator 2'
}

console.log('main 0')
let gen = genDemo()
console.log(gen.next().value)
console.log('main 1')
console.log(gen.next().value)
console.log('main 2')
console.log(gen.next().value)
console.log('main 3')
console.log(gen.next().value)
console.log('main 4')
```

1. 在生成器函数内部执行一段代码，如果遇到 yield 关键字，那么 JavaScript 引擎将返回关键字后面的内容给外部，并暂停该函数的执行。
2. 外部函数可以通过 next 方法恢复函数的执行。

要搞懂函数为何能暂停和恢复，那你首先要了解协程的概念。`协程是一种比线程更加轻量级的存在。你可以把协程看成是跑在线程上的任务`，一个线程上可以存在多个协程，但是在线程上同时只能执行一个协程，比如当前执行的是 A 协程，要启动 B 协程，那么 A 协程就需要将主线程的控制权交给 B 协程，这就体现在 A 协程暂停执行，B 协程恢复执行；同样，也可以从 B 协程中启动 A 协程。通常，如果从 A 协程启动 B 协程，我们就把 A 协程称为 B 协程的父协程。

正如一个进程可以拥有多个线程一样，一个线程也可以拥有多个协程。最重要的是，协程不是被操作系统内核所管理，而完全是由程序所控制（也就是在用户态执行）。这样带来的好处就是性能得到了很大的提升，不会像线程切换那样消耗资源。

![alt](https://static001.geekbang.org/resource/image/5e/37/5ef98bd693bcd5645e83418b0856e437.png)

从图中可以看出来协程的四点规则：

1. 通过调用生成器函数 genDemo 来创建一个协程 gen，创建之后，gen 协程并没有立即执行。
2. 要让 gen 协程执行，需要通过调用 gen.next。
3. 当协程正在执行的时候，可以通过 yield 关键字来暂停 gen 协程的执行，并返回主要信息给父协程。
4. 如果协程在执行期间，遇到了 return 关键字，那么 JavaScript 引擎会结束当前协程，并将 return 后面的内容返回给父协程。

不过，对于上面这段代码，你可能又有这样疑问：父协程有自己的调用栈，gen 协程时也有自己的调用栈，当 gen 协程通过 yield 把控制权交给父协程时，V8 是如何切换到父协程的调用栈？当父协程通过 gen.next 恢复 gen 协程时，又是如何切换 gen 协程的调用栈？

第一点：gen 协程和父协程是在主线程上交互执行的，并不是并发执行的，它们之前的切换是通过 yield 和 gen.next 来配合完成的。

第二点：当在 gen 协程中调用了 yield 方法时，`JavaScript 引擎会保存 gen 协程当前的调用栈信息，并恢复父协程的调用栈信息`。同样，当在父协程中执行 gen.next 时，JavaScript 引擎会保存父协程的调用栈信息，并恢复 gen 协程的调用栈信息。

![alt](https://static001.geekbang.org/resource/image/92/40/925f4a9a1c85374352ee93c5e3c41440.png)

，`生成器就是协程的一种实现方式`，这样相信你也就理解什么是生成器了。那么接下来，我们使用生成器和 Promise 来改造开头的那段 Promise 代码。改造后的代码如下所示：

```js
function fetch(url) {
   let execute = (resolve) => {
       setTimeout(() => {
        resolve(url)
    })
   }
    return new Promise(execute)
}

//foo函数
function* foo() {
    console.log(111)
    let response1 = yield fetch('https://www.geekbang.org')
    console.log('yield response1')
    console.log(response1)
    let response2 = yield fetch('https://www.geekbang.org/test')
    console.log('yield response2')
    console.log(response2)
}

//执行foo函数的代码
let gen = foo()
function getGenPromise(gen) {
    return gen.next().value
}
getGenPromise(gen).then((response) => {
    console.log('response1')
    console.log(response)
    return getGenPromise(gen)
}).then((response) => {
    console.log('response2')
    console.log(response)
})
```

foo 函数是一个生成器函数，在 foo 函数里面实现了用同步代码形式来实现异步操作；但是在 foo 函数外部，我们还需要写一段执行 foo 函数的代码，如上述代码的后半部分所示，那下面我们就来分析下这段代码是如何工作的。

1. 首先执行的是let gen = foo()，创建了 gen 协程。
2. 然后在父协程中通过执行 gen.next 把主线程的控制权交给 gen 协程。
3. gen 协程获取到主线程的控制权后，就调用 fetch 函数创建了一个 Promise 对象 response1，然后通过 yield 暂停 gen 协程的执行，并将 response1 返回给父协程。
4. 父协程恢复执行后，调用 response1.then 方法等待请求结果。
5. 等通过 fetch 发起的请求完成之后，会调用 then 中的回调函数，then 中的回调函数拿到结果之后，通过调用 gen.next 放弃主线程的控制权，将控制权交 gen 协程继续执行下个请求。

以上就是协程和 Promise 相互配合执行的一个大致流程。不过通常，我们把执行生成器的代码封装成一个函数，并把这个执行生成器代码的函数称为`执行器`（可参考著名的 co 框架），如下面这种方式：

```js
function* foo() {
    let response1 = yield fetch('https://www.geekbang.org')
    console.log('response1')
    console.log(response1)
    let response2 = yield fetch('https://www.geekbang.org/test')
    console.log('response2')
    console.log(response2)
}
co(foo());
```
通过使用生成器配合执行器，就能实现使用同步的方式写出异步代码了，这样也大大加强了代码的可读性。

### async/await

虽然生成器已经能很好地满足我们的需求了，但是程序员的追求是无止境的，这不又在 ES7 中引入了 async/await，这种方式能够彻底告别执行器和生成器，实现更加直观简洁的代码。其实 async/await 技术背后的秘密就是 Promise 和生成器应用，往低层说就是`微任务`和`协程应用`。要搞清楚 async 和 await 的工作原理，我们就得对 async 和 await 分开分析。

#### async

我们先来看看 async 到底是什么？根据 MDN 定义，async 是一个通过异步执行并隐式返回 Promise 作为结果的函数。

对 async 函数的理解，这里需要重点关注两个词：`异步执行`和`隐式返回` Promise。

关于异步执行的原因，我们一会儿再分析。这里我们先来看看是如何隐式返回 Promise 的，你可以参考下面的代码

```js
async function foo() {
    return 2
}
console.log(foo())  // Promise {<resolved>: 2}
```
### await

我们知道了 async 函数返回的是一个 Promise 对象，那下面我们再结合文中这段代码来看看 await 到底是什么。

```js
async function foo() {
    console.log(1)
    let a = await 100
    console.log(a)
    console.log(2)
}
console.log(0)
foo()
console.log(3)
```
![alt](https://static001.geekbang.org/resource/image/8d/94/8dcd8cfa77d43d1fb928d8b001229b94.png)

结合上图，我们来一起分析下 async/await 的执行流程。

首先，执行console.log(0)这个语句，打印出来 0。

紧接着就是执行 foo 函数，由于 foo 函数是被 async 标记过的，所以当进入该函数的时候，JavaScript 引擎会保存当前的调用栈等信息，然后执行 foo 函数中的console.log(1)语句，并打印出 1。接下来就执行到 foo 函数中的await 100这个语句了，这里是我们分析的重点，因为在执行await 100这个语句时，JavaScript 引擎在背后为我们默默做了太多的事情，那么下面我们就把这个语句拆开，来看看 JavaScript 到底都做了哪些事情。

当执行到await 100时，会默认创建一个 Promise 对象，代码如下所示：

```js
let promise_ = new Promise((resolve,reject){
  resolve(100)
})
```
在这个 promise_ 对象创建的过程中，我们可以看到在 executor 函数中调用了 resolve 函数，JavaScript 引擎会将该任务提交给微任务队列

然后 JavaScript 引擎会暂停当前协程的执行，将主线程的控制权转交给父协程执行，同时会将 promise_ 对象返回给父协程。

主线程的控制权已经交给父协程了，这时候父协程要做的一件事是调用 `promise_.then` 来监控 promise 状态的改变。

接下来继续执行父协程的流程，这里我们执行console.log(3)，并打印出来 3。随后父协程将执行结束，在结束之前，会进入微任务的检查点，然后执行微任务队列，微任务队列中有resolve(100)的任务等待执行，执行到这里的时候，会触发 promise_.then 中的回调函数，如下所示：

```js
promise_.then((value)=>{
   //回调函数被激活后
  //将主线程控制权交给foo协程，并将vaule值传给协程
})
```

该回调函数被激活以后，会将主线程的控制权交给 foo 函数的协程，并同时将 value 值传给该协程。

foo 协程激活之后，会把刚才的 value 值赋给了变量 a，然后 foo 协程继续执行后续语句，执行完成之后，将控制权归还给父协程。

以上就是 await/async 的执行流程。正是因为 async 和 await 在背后为我们做了大量的工作，所以我们才能用同步的方式写出异步代码来。

### 协程
协程和进程、线程的区别就是两点 -- 是否隔离变量，是否自动切换运行上下文。满足这两点区别的，就是协程。

进程：变量隔离，自动切换运行上下文
线程：不变量隔离，自动切换运行上下文切换
协程：不变量隔离，不自动切换运行上下文切换

到底是不是“真·协程”，看看方法有没有被挂起，函数执行结束后有没有恢复上下文：

听说过面向对象的上下文么？谁说上下文一定只能存在于寄存器和栈上呢？

把栈指针寄存器换成this指针，这叫做无栈协程～～再配合点语法糖，让访问对象成员如同访问局部变量一样（连主流编译语言都支持省略this直接访问成员），这不是很平凡的操作么～～

1. 有栈协程：用(e)rsp栈寄存器来索引局部变量，上下文是协程私有的栈。 访问上下文数据也就是局部变量的时候，我们无需显式的使用栈寄存器+偏移量来访问，而是直接访问变量名。
2. 无栈协程：用this来索引对象的成员变量，上下文就是对象自己。访问上下文数据也就是成员变量的时候，我们无需显式的使用this+成员偏移量（或者变量名）来访问，而是直接访问变量名。
  
 两种协程访问的上下文中的数据，生命周期都大于函数的返回：栈的生命周期晚于函数的返回，this对象的生命周期晚于函数的返回。后者更晚而且往往需要手工销毁。

###  generator函数和普通函数

JavaScript 的类型系统比较薄弱，比如
```js
typeof 1 // number
typeof 0.1 // number
```
虽然 1 和 0.1 都是 number，但它们本质上是不同的类型，内存表示不一样，CPU 对整数和浮点数的运算指令也不一样，放在一个类型里面，有些勉为其难，但基本相安无事。

```js
function* test() {
  yield 123456
}
typeof test // function

async function test1() {
  let res = await 123456;
}
typeof test1 // function

function test2() {}
typeof test2 // function
test、test1、test2 在 JavaScript 中的类型都是 function，但在 V8 中它们 3 个是不同的类型，如下图：
```


![alt](https://pic3.zhimg.com/80/v2-552905211eb6a7d64745095e7ed17fee_1440w.jpg)

日常开发中，当一个组件/方法需要一个函数做为参数时，比如 forEach 和 map，多半需要的是 ES6 之前的函数，如果误传了 async 函数或者生成器函数，多半会出问题。因为 ES6 之前的函数、async 函数和生成器函数，虽然在 JavaScript 中 typeof 都返回 function，但在 V8 中它们是不同的类型，运行机制和返回值也不一样。

```
function * foo(){}
Object.prototype.toString.call(foo) === "[object GeneratorFunction]"
```

## 总结

核心思想: 就是把执行的权利交给程序，也就是我们程序编写的代码
子协程执行权交换的时候，会保存上下文环境和子协程的调用栈信息

使用 async/await 可以实现用同步代码的风格来编写异步代码，这是因为 async/await 的基础技术使用了生成器和 Promise，生成器是协程的实现，利用生成器能实现生成器函数的暂停和恢复。

另外，V8 引擎还为 async/await 做了大量的语法层面包装，所以了解隐藏在背后的代码有助于加深你对 async/await 的理解。

async/await 无疑是异步编程领域非常大的一个革新，也是未来的一个主流的编程风格。其实，除了 JavaScript，Python、Dart、C# 等语言也都引入了 async/await，使用它不仅能让代码更加整洁美观，而且还能确保该函数始终都能返回 Promise。

```js
async function foo() {
    console.log(1)
    let a = await fetch(11)
    // let a = await Promise.resolve(1).then((value)=>{})
    // let a = await Promise.reject(1)
    console.log(a)
    console.log(2)
}
console.log(0)
foo()
console.log(3)

function fetch(url) {
   let execute = (resolve) => {
       setTimeout(() => {
    })
   }
    return new Promise(execute)
}

```

await 后面的接的函数如果一直没有变成 fullfilled ，那么卡死了，它一直再等你的resolve，reject也不行
await在你resolve后直接执行了next

这样子是先打印2，再打印1，说明是then的时候才添加进微任务队列的吧?
我看见我也发现了，但是我已打印，发现真的

我觉是resolve的逻辑优化了吧，resolve 非异步触发，直接就返回promise并且状态置为fulfilled，所以谁先掉用then，谁先触发

```js
var p1 = new Promise((res,rej)=>{
    // setTimeout(() => {
    //     res(1);
    // }, 0);
  res(1);
})
var p2 =new Promise((res,rej)=>{
    // setTimeout(() => {
    //     res(2);
    // }, 0);
  res(2)
})
console.log(p1, p2) // Promise {<fulfilled>: 2}
p2.then(val=>{
  console.log(val)
})
p1.then(val=>{
  console.log(val)
})

```

有个疑问，为什么async/await 的异步错误可以被捕获，而promise中的必须链式捕获，async中的异步流程不也是在任务队列中嘛？

```js
try {
  Promise.reject(111) // try 无法捕获 
} catch (error) {
  console.log(error, 11)
}
try {
  await Promise.reject(111)  // await 会将错误的返回值获取，并且抛出,后面的语句无法执行
  console.log(111)
} catch (error) {
  console.log(error, 11)
}
```

```js
new Promise((resolve, reject) => {
    resolve(2)
  })
  // 等同于
  Promise.resolve(2)

```


### 参考文献
1. https://www.zhihu.com/question/305443189
2. https://www.zhihu.com/people/kan-a-79/posts