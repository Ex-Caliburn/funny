# defineProperty和proxy 双向数据绑定

## proxy 的优势

不再需要先创建属性才能数据双向绑定
这也是为什么vue data:{}开始值不存在，之后添加，就无法同步更新数据

### defineProperty

通过数据修饰符set，get 达到双向数据绑定目的
个人理解； defineProperty 加通知和订阅实现 vue的双向数据绑定，
defineProperty 对数组不好用，push操作和直接通过下标修改数组等只可以只会触发get方法，而不是set方法

```
(1)
let num  = 1
let price = 2
let total = num * price // 2

num = 2 //
console.log(total) // 2， 期望 total=4
我想实现 修改 a，b 自动计算total的值

(2)
let num  = 1
let price = 2
let total
function target() {
  total = num * price
}

num = 2 //
target()
console.log(total) // 4


(3) 记录上一步,抽象化，storage存贮当时执行函数，reply执行当时存放的执行队列
let num  = 1
let price = 2
let total

function target() {
  total = num * price
}
let storage = []
record() {
  storage.push(target)
}
function reply() {
  storage.forEach(item => item())
}

target()
record()
console.log(total) // 4

num = 2
reply()
console.log(total) // 4


(4)  首次初始化赋值， target 改为匿名函数,
record 改为depend, replay 改为 notify, 该用独立的 class设计模式

class Dep {
  constructor() {
    this.subscribers = []
  }
  depend () {
    if(target && !this.subscribers.includes(target)){
          this.subscribers.push(target)
    }
  }
  notify(){
    this.subscribers.forEach(item => item())
  }
}

let num  = 1
let price = 2
let total
let target = () => {
  total = num * price
}

let dep = new Dep()

dep.depend()
target()
total // 2

num = 2
dep.notify()
total // 4

(5) 随着每个变量越来越多，dep创建越来越多，target是全局变量，watcher用来代替它

let target = () => {
  total = num * price
}
dep.depend()
target()

watcher (() => {
  total = num * price
})

function watcher (func) {
  target = func
  dep.depend()
  target()
  target = null
}


(6) 我不想执行 notify(),希望修改a，notify自动执行,这时用到defineProperty

let data = {
  num: 1,
  price: 2
}
let initVal = data.num *  data.price
defineProperty(data, total, {
  get() {
    return  initVal
  },
  set(val) {
   initVal = val
  },
})

total // 2
num = 2 // total 4

Object.keys(data).forEach(item => {
  let initVal = data[item]
  Object.defineProperty(data, item , {
    get() {
      return  initVal
    },
    set(val) {
     initVal = val
    }
  })
})

(7) 组合在一起
let data = { num: 1, price: 2 }
let target = null

class Dep {
  constructor() {
    this.subscribers = []
  }
  depend () {
    if(target && !this.subscribers.includes(target)){
          this.subscribers.push(target)
    }
  }
  notify(){
    this.subscribers.forEach(sub => sub())
  }
}

Object.keys(data).forEach(key => {
  let internalValue = data[key]
  let dep = new Dep()
  Object.defineProperty(data, key , {
    get() {
      dep.depend()
      return  internalValue
    },
    set(val) {
     internalValue = val
     dep.notify()
    }
  })
})

function watcher(func) {
  target = func
  target()
  target = null
}

watcher(() => {
  data.total = data.num * data.price
})

data.total // 2
data.num = 4 //
data.total // 8

## Proxy
Proxy 用于修改某些操作的默认行为，等同于在语言层面做出修改，所以属于一种“元编程”（meta programming），即对编程语言进行编程。

Proxy 可以理解成，在目标对象之前架设一层“拦截”，外界对该对象的访问，都必须先通过这层拦截，因此提供了一种机制，可以对外界的访问进行过滤和改写。Proxy 这个词的原意是代理，用在这里表示由它来“代理”某些操作，可以译为“代理器”

### 优点
get() 和 set() 可以触发 dep.depend() and dep.notify()，新添加的属性将触发set(),将合适创建一个新的响应式属性， 我们不需要使用Vue.$set添加新属性，删除属性也可以使用deleteProperty() 代替

###  Proxy 改写数据绑定
```

(1)
let data = { num: 1, price: 2 }
let target = null

class Dep {
  constructor() {
    this.subscribers = []
  }
  depend () {
    if(target && !this.subscribers.includes(target)){
          this.subscribers.push(target)
    }
  }
  notify(){
    this.subscribers.forEach(sub => sub())
  }
}

<!-- Object.keys(data).forEach(key => {
  let internalValue = data[key]
  let dep = new Dep()
  Object.defineProperty(data, key , {
    get() {
      dep.depend()
      return  internalValue
    },
    set(val) {
     internalValue = val
     dep.notify()
    }
  })
}) -->

let deps = new Map(); // Let's store all of our data's deps in a map

Object.keys(data).forEach(item => deps.set(item, new Dep())) // Each property gets a dependency instance

let data_without_proxy = data

data = new Proxy(data_without_proxy,{
  get (obj, key) {
    deps.get(key).depend()
    return obj[key]
  },
  set (obj,key, newVal) {
    obj[key] = newVal
    deps.get(key).notify()
  }
})

function watcher(func) {
  target = func
  target()
  target = null
}

let total = 0
watcher(() => {
  total = data.num * data.price
})

data.num = 2
console.log(total)
data.price = 5
console.log(total)

(2) Adding Reactive Properties
    deps.set("discount", new Dep());  // Need a new dep for our property
    data.discount = 0.5

    let salePrice
    watcher(() => {
      salePrice = data.price - data.discount
    })

    data.price = 1.5

    data.discount = 1

```

下面是一个get方法的第三个参数的例子，它总是指向原始的读操作所在的那个对象，一般情况下就是 Proxy 实例。

```

const proxy = new Proxy({}, {
  get: function(target, key, receiver) {
    return receiver;
  }
});
proxy.c === proxy // true

```
上面代码中，proxy对象的getReceiver属性是由proxy对象提供的，所以receiver指向proxy对象。

```

const proxy = new Proxy({}, {
  get: function(target, key, receiver) {
    return receiver;
  }
});

const d = Object.create(proxy);
d.a === d // true

```
上面代码中，d对象本身没有a属性，所以读取d.a的时候，会去d的原型proxy对象找。这时，receiver就指向d，代表原始的读操作所在的那个对象。



### 参考文献

1. https://es6.ruanyifeng.com/?search=defineProperty&x=0&y=0#docs/proxy#%E6%A6%82%E8%BF%B0
2. https://www.vuemastery.com/courses/advanced-components/build-num-reactivity-system
```
