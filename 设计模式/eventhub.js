// 手写 EventHub（发布-订阅）
// 核心思路是：

// 使用一个对象作为缓存
// on 负责把方法发布到缓存的 EventName 对应的数组
// emit 负责遍历触发（订阅） EventName 下的方法数组
// off 找方法的索引，并删除

class EventHub {
  cache = {}
  on(event, fn) {
    this.cache[event] = this.cache[event] || []
    this.cache[event].push(fn)
  }
  emit(event) {
    this.cache[event].forEach(e => e())
  }
  off(event,fn) {
    let i = this.cache[event].findIndex(e => e === fn)
    if (i > -1) {
      this.cache[event].splice(i, 1)
    }
  }
}

let bus = new EventHub()
let cb = () => {
  console.log('start')
}
bus.on('start', cb)
bus.emit('start')
setTimeout(() => {
  bus.off('start', cb)
}, 10000);
