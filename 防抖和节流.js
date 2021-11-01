function debounce(fn, interval) {
  let timer = null
  //   let _this = this
  return function (...args) {
    if (timer) clearInterval(timer)
    timer = setTimeout(() => {
      console.log(args)
      fn.apply(this, args)
    }, interval)
  }
}

// let test = debounce(function () {
//   console.log(...arguments)
// }, 100)

// test('a', 'b')

// setInterval(() => {
//     test('a', 'b')
// }, 40)

// leading: 指定在延迟开始前调用。
function debounce2(fn, interval, leading) {
  let timer = null
  let now 
  let lastCall = 0
  //   let _this = this
  return function (...args) {
    now = Date.now()
    // console.log(now, lastCall, now - lastCall)
    if (leading && (((now - lastCall > interval) && !timer) || !lastCall)) {
      lastCall = Date.now()
      // console.timeEnd('abc')
      fn.apply(this, args)
      return
    }
    if (timer) clearInterval(timer)
    timer = setTimeout(() => {
      lastCall = Date.now()
      fn.apply(this, args)
      timer = null
    }, interval)
  }
}

// let test2 = debounce2(
//   function () {
//     console.log(...arguments)
//   },
//   100,
//   true
// )

// test2('a', 'b')

// setInterval(() => {
//   test2('a', 'b')
//   // console.time('abc')
// }, 90)


// leading: 指定在延迟开始前调用。
function debounce3(fn, interval, option = {}) {
  let timer = null
  let now 
  let lastCall = 0
  let maxWait = Number(option.maxWait|| 0)
  let leading = Boolean(option.leading)
  //   let _this = this
  return function (...args) {
    now = Date.now()
    console.log(now, lastCall)
    let isInvoke = (now - lastCall > maxWait) && timer
    console.log('isInvoke', isInvoke, now - lastCall)
    if ((leading && (((now - lastCall >interval * 1000) && !timer) || !lastCall)) || isInvoke) {
      lastCall = Date.now()
      console.log('1')
      fn.apply(this, args)
      clearInterval(timer)
      timer = null
      return
    }
    if (timer) clearInterval(timer)
    timer = setTimeout(() => {
      lastCall = Date.now()
      console.log('2')
      fn.apply(this, args)
      timer = null
    }, interval)
  }
}

let test3 = debounce3(
  function () {
    console.log(...arguments)
  },
  500,
  {
    maxWait: 10
  }
)

test3('a', 'b')

setInterval(() => {
  test3('a', 'b')
  // console.time('abc')
}, 100)