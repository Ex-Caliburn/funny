// setTimeout(() => {
//   console.log(111)
// }, 0)

// function fn() {
//   let resolve = (resolve) => {
//     setTimeout(() => {
//       console.log(222)
//       resolve(222)
//     }, 0)
//   }
//   return new Promise(resolve)
// }

// async function a() {
//   console.log(1)
//   await fn()
//   console.log(2)
// }

// console.log(a())
// console.log(3)

async function async1() {
  console.log('async1 start') // 2
  let a = await async2()
  console.log('async1 end', a) // 6----8 // 这里注意！！
  // async2 中是 return 的 promise 导致这个的输出比下面的 promise2 promise3 都晚
}

async function async2() {
  console.log('async2 start') //3
  // 注意这里是return的，会影响到上面async1里面await后的执行顺序；若去掉return 关键字，则'async1 end'还是会早于 promise2 promise3 的输出
  return new Promise((resolve, reject) => {
    resolve(2)
    console.log('async2 end') // 4 // 这里也答错了，resolve后面也是可以执行的！！
  })
  // 不写return，其实是返回的 undefined
}

console.log('script start') // 1
setTimeout(() => {
  console.log('setTimeout') // 9
}, 0)

async1()

new Promise(function (resolve) {
  console.log('promise1') //5

  resolve()
})
  .then(function () {
    console.log('promise2') // 7-----6 // 注意，就算这里没有返回，后面的 then 也是可以执行的！！
  })
  .then(function () {
    console.log('promise3') //8-----7
  })

console.log('script end') //6

// async function foo() {
//   console.log('foo')
//   return 1
// }
// async function bar() {
//   console.log('bar start')
//   await foo()
//   console.log('bar end')
// }
// console.log('script start')
// setTimeout(function () {
//   console.log('setTimeout')
// }, 0)
// bar();
// new Promise(function (resolve) {
//   console.log('promise executor')
//   resolve();
// }).then(function () {
//   console.log('promise then')
// })
// console.log('script end')

// // script start
// // bar start
// // foo
// // promise executor
// // script end
// // bar end
// // promise then
// // setTimeout

// why result in difference in async function  return undefined and  promise ?

// ```
async function foo() {
  console.log('foo')
}
async function bar() {
  console.log('bar start')
  await foo()
  console.log('bar end')
}
console.log('script start')
setTimeout(function () {
  console.log('setTimeout')
}, 0)
bar()
new Promise(function (resolve) {
  console.log('promise executor')
  resolve()
}).then(function () {
  console.log('promise then')
})
console.log('script end')
// ```
// is me expect

// // script start
// // bar start
// // foo
// // promise executor
// // script end
// // bar end
// // promise then
// // setTimeout

// ```
async function foo() {
  console.log('foo')
  return Promise.resolve(1)
}
async function bar() {
  console.log('bar start')
  await foo()
  console.log('bar end')
}
console.log('script start')
setTimeout(function () {
  console.log('setTimeout')
}, 0)
bar()
new Promise(function (resolve) {
  console.log('promise executor')
  resolve()
}).then(function () {
  console.log('promise then')
})
console.log('script end')
// ```

// // script start
// // bar start
// // foo
// // promise executor
// // script end
// // promise then
// // bar end
// // setTimeout

// confuse me

// async promise js  javascript event loop

// 简化代码
async function bar() {
  console.log('bar start')
  await new Promise(resolve => resolve(1))
  await new Promise(resolve => resolve(Promise.resolve(1)))
  console.log('bar end')
}
console.log('script start')
setTimeout(function () {
  console.log('setTimeout')
}, 0)
bar()
new Promise(function (resolve) {
  console.log('promise executor')
  resolve()
}).then(function () {
  console.log('promise then')
})
console.log('script end')


// 继续简化
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

p = new Promise((resolve) => {
  setTimeout(() => {
    resolve(1)
  }, 11111111);
})

b = p.then(res=> res)
console.log(p === b) // false

