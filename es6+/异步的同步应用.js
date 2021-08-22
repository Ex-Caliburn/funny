// 素材中心批量上传图片正序
// 这是一个异步函数 fetch(url)，会打印东西  我有个urls数组

const urls = [1, 2, 3]
// 模拟fetch
function fetch(url) {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('定时器中', url)
      resolve(url)
    }, (5 - url) * 100)
  })
}

// 1. 我需要按顺序输出 fetch(url)的结果

async function logInOrder() {
  for (const url of urls) {
    let res = await fetch(url)
    console.log('按顺序同步输出', res)
  }
}
logInOrder()

// 优点是按顺序打印
// 缺点是多个请求是串联的，前面堵住了，后面就无法持续，这样做效率很差，非常浪费时间
// 你可以设置接口请求超时限制，来处理异常情况

// 2 按顺序输出，多条请求并行 封装成promise, promise.all 缺点有一个报错就终止

async function logInOrder2() {
  let promiseArr = urls.map(async (url) => await fetch(url))
  for (const res of promiseArr) {
    // console.log(res) // 不加await  直接打印 Promise {<pending>}，因为接口还灭完成
    console.log('并发按顺序同步输出', await res)
  }
}
logInOrder2()

// 3 不使用async 即使用promise

async function logInOrder3() {
  let promiseArr = urls.map((url) => fetch(url))
  promiseArr.reduce((chain, cur) => {
    return chain
      .then(() => cur)
      .then((res) => {
        console.log('并发按顺序同步输出 promise', res)
      })
  }, Promise.resolve())
}
logInOrder3()

// 4 使用 Generate

function* logInOrder4() {
  let promiseArr = urls.map((url) => fetch(url))
  for (const item of promiseArr) {
    var result = yield item
    console.log(result)
  }
}
var g = logInOrder4()

// 手动执行其实就是用then方法，层层添加回调函数。理解了这一点，就可以写出一个自动执行器。
// 有多少个 yield 就得写多少个 then

g.next().value.then(function (data) {
  g.next(data).value.then(function (data) {
    g.next(data).value.then(function (data) {
      g.next(data)
    })
  })
})

function run(gen) {
  var g = gen()
  function next(data) {
    let res = g.next(data)
    if (res.done) return res.value
    res.value.then((data) => {
      next(data)
    })
  }
  next()
}

run(logInOrder4)
