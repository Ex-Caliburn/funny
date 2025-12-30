function executor(resolve, reject) {
  let rand = Math.random()
  console.log(1)
  console.log(rand)
  if (rand > 0.5) resolve()
  else reject()
}
var p0 = new Promise(executor)

var p1 = p0.then((value) => {
  console.log('succeed-1')
  return new Promise(executor)
})

var p3 = p1.then((value) => {
  console.log('succeed-2')
  return new Promise(executor)
})

var p4 = p3.then((value) => {
  console.log('succeed-3')
  return new Promise(executor)
})

p4.catch((error) => {
  console.log('error')
})
console.log(2)

//result
// console.log(1)
// console.log(rand)
// 2
// "succeed-1"
// console.log(1)
// console.log(rand)
// "succeed-2"
// console.log(1)
// console.log(rand)
// "succeed-3"
// console.log(1)
// console.log(rand)

function Bromise(executor) {
  var onResolve_ = null
  var onReject_ = null
  //模拟实现resolve和then，暂不支持rejcet
  this.then = function (onResolve, onReject) {
    onResolve_ = onResolve
  }
  function resolve(value) {
    // setTimeout(() => {
      onResolve_(value)
    // }, 0)
  }
  executor(resolve, null)
}

function executor(resolve, reject) {
  resolve(100)
}
//将Promise改成我们自己的Bromsie
let demo = new Bromise(executor)

function onResolve(value) {
  console.log(value)
}
demo.then(onResolve)

// 是由于 Bromise 的延迟绑定导致的，在调用到 onResolve_ 函数的时候，Bromise.then 还没有执行，
// 所以执行上述代码的时候，当然会报“onResolve_ is not a function“的错误了。
