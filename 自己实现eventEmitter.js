// nodejs demo
var events = require('events')
var eventEmitter = new events.EventEmitter()

// console.log(events)

// 监听器 #1
var listener1 = function listener1() {
  console.log('监听器 listener1 执行。')
}

// 监听器 #2
var listener2 = function listener2() {
  console.log('监听器 listener2 执行。')
}

// 绑定 connection 事件，处理函数为 listener1
eventEmitter.addListener('connection', listener1)

// 绑定 connection 事件，处理函数为 listener2
eventEmitter.addListener('connection', listener2)

// 绑定 connection 事件，调用一次，处理函数为 listener2
eventEmitter.once('connection', listener2)

// 处理 connection 事件
// eventEmitter.emit('connection');

// 处理 connection 事件
// eventEmitter.off('connection');

// 如何自己实现 eventEmitter
class eventEmitter2 {
  constructor() {
    this._events = Object.create(null)
    this._maxEventLister = 10
  }
}

function EventEmitter() {
  this._events = Object.create(null)
  this._maxEventLister = 10
}

EventEmitter.prototype.addListener = (type, listener) => {
  if (!this._events) {
    this._events = Object.create(null)
  }
  if (this._events[type]) {
    this._events[type].push(listener)
  } else {
    this._events[type] = [listener]
  }
}

EventEmitter.prototype.removeListener = (type, listener) => {
  if (this._events[type]) {
    if (!listener) {
      delete this._events[type]
    } else {
      this._events[type] = this._events[type].filters((item) => item !== listener)
    }
  }
}

EventEmitter.prototype.once = (type, listener) => {
  const cb = (...args) => {
    listener.apply(this, args)
    this.removeListener(type, listener)
  }
  this.addListener(type, cb)
}

EventEmitter.prototype.emit = (type, ...args) => {
  if (type && this._events[type]) {
    this._events[type].forEach((item) => {
      item.apply(this, args)
    })
  }
}

let eventBus = new EventEmitter()
eventBus.addListener('update', () => {
  console.log('监听器 update 执行。')
})
eventBus.emit('update')