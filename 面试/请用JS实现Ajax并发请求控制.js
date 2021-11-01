// 实现一个批量请求函数 multiRequest(urls, maxNum)，要求如下：
// • 要求最大并发数 maxNum
// • 每当有一个请求返回，就留下一个空位，可以增加新的请求
// • 所有请求完成后，结果按照 urls 里面的顺序依次打出
// 自己推断出来的点， 请求是可以并发的，但是打印 是 按顺序的

let queue = []
let waitQueue = []
let pending = false

function ajax(url) {
  //   let xhr = new XMLHttpRequest()
  //  用setTimeout模拟
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(url)
    }, 1000)
  })
}

function multiRequest(urls, maxNum) {
  urls.forEach((url) => {
    waitQueue.push(url)
  })
  checkQueue(maxNum)
}

async function executeQueue(maxNum) {
  if (pending) {
    return
  }
  pending = true
  while (queue.length) {
    // await queue.shift() 直接这么写有问题，shift 掉后，队列立马就变成2了，但是队列其实没有执行完成，然后又被塞进去一个
    let b = await queue[0]
    console.log(b, Date.now())
    queue.shift()
    checkQueue(maxNum)
    if (!queue.length) {
      pending = false
    }
  }
}

function checkQueue(maxNum) {
  if (queue.length < maxNum && waitQueue.length) {
    let availableCount =
      waitQueue.length >= maxNum - queue.length ? maxNum - queue.length : waitQueue.length
    let temp = waitQueue.splice(0, availableCount).map((item) => ajax(item))
    queue.push(...temp)
    executeQueue(maxNum)
  }
}

multiRequest([1, 2, 3, 4], 3)
multiRequest([5, 6], 3)
