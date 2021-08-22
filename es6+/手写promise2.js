// 手写题：Promise 原理
// 思路，执行完resolve，才能进去then，非则就卡住了，then执行成功后执行成功队列和错误队列，依次执行
//  2. then promise的传递 3. 任何地方的错误捕获，以Promise.reject 形式抛出
// 被catch 捕获或者被reject 捕获了，继续链式调用返回还是正确的promise，除非手动设置promise.reject
// 三种状态不可逆
// finally 不管正确与否都会走
// then , catch ,finally 参数为空，或者不为函数的情况
// then 中返回promise, 使用返回的promise，并将结果指向 .then
// 多次调用 p.then 是单向链表 next 指向下一个
// promise.resolve 我没处理, 因该是没有promise 新生成一个promise.并且传入 值
// https://www.zhihu.com/people/kan-a-79/posts

const noop = () => {}

class MyPromise {
  constructor(fn) {
    // 应该限制 请使用 new 操作符调用 MyPromise 构造函数 但是Promise.resolve
    if (typeof fn !== 'function') {
      console.log(error('Promise resolver undefined is not a function'))
    }
    this._resolvedHandle = null
    this._rejectedHandle = null
    this._catchHandle = null
    this.nextPromise = []
    this.value = undefined // 存放传递的值
    this.state = 'PENDING'
    try {
      fn(this.resolve.bind(this), this.reject.bind(this))
    } catch (error) {
      this.throwErr(error, this)
    }
    return this
  }
  resolve(value) {
    // setTimeout(() => {
    if (this.state === 'PENDING') {
      this.state = 'RESOLVED'
      this.value = value
      if (typeof this._resolvedHandle === 'function') {
        this.executeWrap(this._resolvedHandle, value, this)
      } else {
        if (this.nextPromise.length) {
          // 异步执行 放入微任务队列，用setTimeout模拟
          setTimeout(() => {
            this.nextPromise.map((item) => item.resolve(this.value))
          }, 0)
          return this
        } else {
          return this
        }
      }
    }
    // }, 0)
  }
  reject(value) {
    // setTimeout(() => {
    if (this.state === 'PENDING') {
      this.state = 'REJECTED'
      this.value = value
      if (typeof this._rejectedHandle === 'function') {
        this.executeWrap(this._rejectedHandle, value, this)
      } else {
        setTimeout(() => {
          this.nextPromise.map((item) => item.reject(this.value))
        }, 0)
        return this
      }
    }
    // }, 0)
  }
  then(onFulFilled, onRejected) {
    let newPromise = new MyPromise(noop)
    if (this.state === 'PENDING') {
      newPromise._resolvedHandle = onFulFilled
      newPromise._rejectedHandle = onRejected
      if (this.nextPromise) {
        this.nextPromise.push(newPromise)
      } else {
        this.nextPromise = [newPromise]
      }
    }
    if (this.state === 'REJECTED') {
      if (typeof onFulFilled === 'function') {
        setTimeout(() => {
          this.executeWrap(onRejected, this.value, newPromise)
        }, 0)
      } else {
        newPromise.reject(this.value)
      }
    }
    if (this.state === 'RESOLVED') {
      if (typeof onFulFilled === 'function') {
        setTimeout(() => {
          this.executeWrap(onFulFilled, this.value, newPromise)
        }, 0)
      } else {
        newPromise.resolve(this.value)
      }
    }
    return newPromise
  }
  catch(fn) {
    let newPromise = new MyPromise(noop)
    if (this.state === 'PENDING') {
      newPromise._rejectedHandle = fn
      if (this.nextPromise) {
        this.nextPromise.push(newPromise)
      } else {
        this.nextPromise = [newPromise]
      }
    }
    if (this.state === 'REJECTED') {
      if (typeof fn === 'function') {
        setTimeout(() => {
          this.executeWrap(fn, this.value, newPromise)
        }, 0)
      } else {
        newPromise.reject(this.value)
      }
    }
    if (this.state === 'RESOLVED') {
      newPromise.resolve(this.value)
    }
    return newPromise
  }
  finally(fn) {
    let newPromise = new MyPromise(noop)
    if (this.state === 'PENDING') {
      newPromise._resolvedHandle = fn
      newPromise._rejectedHandle = fn
    }
    if (this.state === 'REJECTED') {
      if (typeof fn === 'function') {
        setTimeout(() => {
          this.executeWrap(fn, this.value, newPromise)
        }, 0)
      } else {
        newPromise.reject(this.value)
      }
    }
    if (this.state === 'RESOLVED') {
      if (typeof fn === 'function') {
        setTimeout(() => {
          this.executeWrap(fn, this.value, newPromise)
        }, 0)
      } else {
        newPromise.resolve(this.value)
      }
    }
    return newPromise
  }
  // 执行函数fn，并传入参数a，这里目的是做好统一的异常错误处理
  executeWrap(fn, a, newPromise) {
    try {
      let res = fn && fn(a)
      if (res instanceof MyPromise) {
        if (res.nextPromise) {
          this.nextPromise.push(newPromise)
        } else {
          this.nextPromise = [newPromise]
        }
        return res
      } else {
        this.value = res
        newPromise.resolve(res)
        return nextPromise
      }
    } catch (error) {
      return this.throwErr(error, newPromise)
    }
  }
  throwErr(err, newPromise) {
    this.value = err
    // 我的思路： constructor 和 then，finally，catch函数都用try catch包裹，然后统一交给throwErr处理，报错了用Promise.reject() 封装
    if (err instanceof MyPromise) {
      return err
    } else {
      newPromise.reject(err)
      return newPromise
    }
  }
  toString() {
    return this
  }
}

// console.log(new MyPromise(() =>{}).then())

// 对比
MyPromiseTest = new MyPromise((resolve, reject) => {
  // console.log(resolve, reject, 'resolve')
  // 同步任务
  resolve(1)
  // reject(2)

  // 如果是个异步任务呢
  // setTimeout(() => {
  //   // resolve(3)
  //   resolve(4)
  // }, 0)
})

ccc = MyPromiseTest.then(
  (res) => {
    console.log('MyPromiseTest res', res, this)
    return new MyPromise((resolve, reject) => {
      setTimeout(() => {
        reject(7)
      }, 0)
    })
  },
  (err) => {
    console.log('MyPromiseTest err', err)
  }
).then(
  (res) => {
    console.log('MyPromiseTest2 res', res, this)
  },
  (err) => {
    console.log('MyPromiseTest2 err', err)
  }
)
console.log(333)

ccc = MyPromiseTest.then(
  (res) => {
    console.log('MyPromiseTest2 res', res, this)
  },
  (err) => {
    console.log('MyPromiseTest2 err', err)
  }
)

// .then().then(
//   (res) => {
//     console.log('MyPromiseTest res', res)
//   },
//   (err) => {
//     console.log('MyPromiseTest err', err)
//   }
// )

// .catch(
//   (res) => {
//     console.log('MyPromiseTest2 res', res)
//   },
//   (err) => {
//     console.log('MyPromiseTest2 err', err)
//   }
// ).finally(
//   (res) => {
//     console.log('MyPromiseTest3 res', res)
//   }
// )
// .then(
//   (res) => {
//     console.log('MyPromiseTest3 res', res)
//   },
//   (err) => {
//     console.log('MyPromiseTest3 err', err)
//   }
// )

// console.log(ccc)

// 暂时无法处理
// MyPromise.resolve(1)

// let realPromise = new Promise((resolve, reject) => {
//   console.log(resolve, reject, 'resolve')
//   resolve(1) // 不执行resolve 一直会进入then 的回吊
// })
// console.log(realPromise)
// realPromise.then(
//   (res) => {
//     console.log('realPromise res', res)
//   },
//   (err) => {
//     console.log('realPromise err', err)
//   }
// )

// Promise.resolve(111)
// .then(res => {
//   console.log(a)
// })
// .catch(res => {
//   console.log(111,res)
// })

// try {
//   aa()
// } catch (error) {
//   console.log(error)
// }

// function aa(params) {
//   console.log(bsdf)
// }
