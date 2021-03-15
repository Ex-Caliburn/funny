// 手写题：Promise 原理

class MyPromise {
  constructor(fn) {
    this.resolvedCallbacks = []
    this.rejectCallbacks = []
    this.catchCallbacks = []
    this.value = ''
    this.state = 'PENDING'
    fn(this.resolve.bind(this), this.reject.bind(this))
  }
  resolve(value) {
    if (this.state === 'PENDING') {
      this.state = 'RESOLVED'
      this.value = value

      this.resolvedCallbacks.map((cb) => cb(value))
    }
  }
  reject(value) {
    if (this.state === 'PENDING') {
      this.state = 'REJECTED'
      this.value = value

      this.rejectCallbacks.map((cb) => cb(value))
    }
  }
  then(onFulFilled, onRejected) {
    if (this.state === 'PENDING') {
      this.resolvedCallbacks.push(onFulFilled)
      this.rejectCallbacks.push(onRejected)
    }
    if (this.state === 'RESOLVED') {
      onFulFilled(this.value)
    }
    if (this.state === 'REJECTED') {
        onRejected(this.value)
    }
  }
  catch(err) {
    // 我觉得思路是，每个函数都用try catch包裹，然后报错了主动触罚 this.catch(err)
  }
  finally(fn) {
    // 只会调用一次
    if (['REJECTED', 'RESOLVED'].includes(this.state)) {
      fn()
    }
  }
}
