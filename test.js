function wait(time) {
  // 在这里实现
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(true)
    }, time)
  })
}

console.log('console start       :' + new Date())

wait(1000).then(() => {
  console.log('console after 1000ms:' + new Date())
})

wait(2000).then(() => {
  console.log('console after 2000ms:' + new Date())
})

async function async1() {
  console.log('async1 start')
  await async2().then(() => {
    console.log('async2 end!')
  })
  console.log('async1 end')
}
async function async2() {
  console.log('async2')
}
console.log('script start')
setTimeout(function () {
  console.log('setTimeout')
}, 0)
async1()

new Promise(function (resolve) {
  console.log('promise1')
  resolve()
}).then(function () {
  console.log('promise2')
})

let b = await async2() // undefined

async function async3() {
  console.log('async2')
  return Promise.resolve(1)
}
async function async4() {
  console.log('async4')
  return 1
}
let b = await async3() // 1


// script start
// async1 start
// async2
// async2 end
// async1 end
// setTimeout