function sleep(time = 0, index) {
  return new Promise(resolve => {
    setTimeout(() => {
      //   console.log(index)
      resolve(index)
    }, time)
  })
}

// 可以使用 async await + sleep，实现睡眠效果

let arr = [1, 2, 3]
// for
// for (let index = 0; index < 3; index++) {
//   sleep(0, index)
//   console.log(index)
// }

// for of
// for (let index of arr) {
//   sleep(0, index)
//   console.log(index)
// }

// for of  async
async function circle() {
  for (let index of arr) {
    console.log(await sleep(0, index), index)
  }
}
// circle()

// for await...of
// https://es6.ruanyifeng.com/#docs/async-iterator#for-await---of
arr2 = [sleep(20, 1), sleep(0, 2)]
async function circle2() {
  for await (let index of arr2) {
    console.log(index)
  }
}
// circle2()

// 函数循环 可以加 async
// arr.map(async item => {
//   console.log(await sleep(0, item), item)
// })


// timeEnd 还是执行了， 只在 sleep2函数内实现了暂停和睡眠
// 没有真正的sleep 函数
async function sleep2(time) {
  function _sleep(time) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(1)
        console.log(time)
      }, time)
    })
  }
  await _sleep(time)
  console.log(33333)
}

// console.time(111)
// sleep2(5000)
// console.timeEnd(111)



function msleep(n) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, n);
}

// 使用node-sleep
// https://github.com/ErikDubbelboer/node-sleep 还有其他的实现
var n=5;

console.time(111)
msleep(10000) //sleep for n seconds
console.timeEnd(111)