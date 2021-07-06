// let a = (b, gmm, g) => {
//   console.log(arguments)
// }
// a(1, 2, 3)

// let b = function (b, gmm, g) {
//   console.log(arguments)
// }
// b(1, 2, 3)

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

let test = debounce(function () {
  console.log(...arguments)
}, 100)

test('a', 'b')

// setInterval(() => {
//     test('a', 'b')
// }, 40)

// leading: 指定在延迟开始前调用。
function debounce2(fn, interval, leading) {
  let timer = null
  let now
  let end = 0
  //   let _this = this
  return function (...args) {
    now = Date.now()
    console.log(now, end, now - end)
    if (leading && ((now - end > (interval * 1000) && timer) || !end)) {
      end = Date.now()
      console.timeEnd('abc')
      fn.apply(this, args)
      return
    }
    if (timer) clearInterval(timer)
    timer = setTimeout(() => {
      end = Date.now()
      fn.apply(this, args)
    }, interval)
  }
}

let test2 = debounce2(
  function () {
    console.log(...arguments)
  },
  100,
  true
)

test2('a', 'b')

setInterval(() => {
  test2('a', 'b')
  console.time('abc')
}, 90)
