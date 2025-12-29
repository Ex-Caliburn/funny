// 1
let obj = {
    a: []
}
Object.defineProperty(obj, 'a', {
    set(val) {
        console.log('set', val)
    },
    get(val) {
        console.log('get', val)
        return obj.a // Maximum call stack size exceeded

    }
})

// 2
obj.a = [1,2,3]

let obj = {
    a: []
}
let $data = {
}
Object.defineProperty($data, 'a', {
    set(val) {
        console.log('set', val)
        obj.a = val
    },
    get(val) {
        console.log('get', val)
        return obj.a
    }
})


$data.a = [1,2,3]
$data.a[4] = 7 //只会触发get 方法，虽然数值变化了，没有触发set方法，我就不能主动触发通知了
$data.a.push(123) // 也是一样



// 3 拦截原生方法
let proto = Object.create(Array.prototype)
let originalMethod = proto.push
Object.defineProperty(proto, 'push',  {
     value: function test(...args) {
      let res = originalMethod.apply(this, args)
       // notify()
       console.log('toNotify')
       return res
      },
      enumerable: false,
      writable: true,
      configurable: true
})

let obj = {
  a: []
}
let $data = {
}
$data.a = []
$data.a.__proto__ = proto
$data.a.push(123) // 'toNotify'



vue源码
/**
 * 尝试为一个值创建一个观察者实例，如果成功观察返回 新的观察者实例，或者已经存在的观察者实例
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 */
export function observe (value: any, asRootData: ?boolean): Observer | void {
    if (!isObject(value) || value instanceof VNode) {
      return
    }
    let ob: Observer | void
    //  已经有__ob__属性， 是 Observer  的实例
    if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
      ob = value.__ob__
    } else if (
    // 非服务端渲染, 数组或者对象，可以拓展， _isVue (避免被观察的标识位)
      shouldObserve &&
      !isServerRendering() &&
      (Array.isArray(value) || isPlainObject(value)) &&
      Object.isExtensible(value) &&
      !value._isVue
    ) {
      ob = new Observer(value)
    }
    if (asRootData && ob) {
    //  vmCount ; // 根 $data 对象有多少个vm，视图模型，
      ob.vmCount++
    }
    return ob
  }

  // 下一步进入 Observer

  export class Observer {
    value: any;
    dep: Dep;
    vmCount: number; // number of vms that have this object as root $data
  
    constructor (value: any) {
      this.value = value
      this.dep = new Dep()
      this.vmCount = 0
      def(value, '__ob__', this)
      if (Array.isArray(value)) {
          // 是支持 __proto__ 属性
        if (hasProto) {
         // 继承
          protoAugment(value, arrayMethods)
        } else {
            // 拷贝
          copyAugment(value, arrayMethods, arrayKeys)
        }
        // 单独的观察数组
        this.observeArray(value)
      } else {
        // 遍历对象，添加双向数据绑定
        this.walk(value)
      }
    }
    /**
   * Observe a list of Array items.
   */
  observeArray (items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
   /**
   * Walk through all properties and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   */
  walk (obj: Object) {
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i])
    }
  }
}

// can we use __proto__?
export const hasProto = '__proto__' in {}

/**
 * Augment a target Object or Array by intercepting
 * the prototype chain using __proto__
 */
function protoAugment (target, src: Object) {
    target.__proto__ = src
  }
  
/**
 * Augment a target Object or Array by defining
 * hidden properties.
 */
function copyAugment (target: Object, src: Object, keys: Array<string>) {
for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    def(target, key, src[key])
}
}

const arrayProto = Array.prototype
// arrayMethods 是个对象，拥有数组所有原生方法
export const arrayMethods = Object.create(arrayProto)

const methodsToPatch = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]

/**
 * Intercept mutating methods and emit events
 * 拦截 改变的方法并传递
 */
methodsToPatch.forEach(function (method) {
  // cache original method 缓存原生方法
  const original = arrayProto[method]
  // 拦截原生方法
  def(arrayMethods, method, function mutator (...args) {
      // 结果调用原生方法
    const result = original.apply(this, args)
    const ob = this.__ob__
    let inserted
    // 添加数组项的方法 需要进行新的监听， 删除数组项不用监听，但最后都要通知
    switch (method) {
      case 'push':
      case 'unshift':
          // 获取插入的内容
        inserted = args
        break
      case 'splice':
          // 获取插入的内容,取 splice第二个参数之后的内容
        inserted = args.slice(2)
        break
    }
    // 开始监听插入的内容
    if (inserted) ob.observeArray(inserted)
    // notify change
    ob.dep.notify()
    return result
  })
})

 
/**
 * Define a reactive property on an Object.
 */
export function defineReactive (
    obj: Object,
    key: string,
    val: any,
    customSetter?: ?Function,
    shallow?: boolean
  ) {
    const dep = new Dep()
  
    // 必须是自己的属性，而不是原型上的
    const property = Object.getOwnPropertyDescriptor(obj, key)
        // 属性 可配置
    if (property && property.configurable === false) {
      return
    }
  
    // cater for pre-defined getter/setters
    const getter = property && property.get
    const setter = property && property.set
    if ((!getter || setter) && arguments.length === 2) {
      val = obj[key]
    }
    // 监听子孙对象
    let childOb = !shallow && observe(val)
    Object.defineProperty(obj, key, {
      enumerable: true,
      configurable: true,
      get: function reactiveGetter () {
        //   有getter方式直接调用
        const value = getter ? getter.call(obj) : val
        if (Dep.target) {
            // 添加依赖
          dep.depend()
          if (childOb) {
            childOb.dep.depend()
            if (Array.isArray(value)) {
              dependArray(value)
            }
          }
        }
        return value
      },
      set: function reactiveSetter (newVal) {
        const value = getter ? getter.call(obj) : val
        // NaN 和值没变
        if (newVal === value || (newVal !== newVal && value !== value)) {
          return
        }
        /* eslint-enable no-self-compare */
        if (process.env.NODE_ENV !== 'production' && customSetter) {
          customSetter()
        }
        // #7981: for accessor properties without setter
        if (getter && !setter) return
        if (setter) {
          setter.call(obj, newVal)
        } else {
          val = newVal
        }
        childOb = !shallow && observe(newVal)
        // 通知订阅者
        dep.notify()
      }
    })
  }


  /**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 * dep 是观察者，有各种各样的指令取订阅它
 */
export default class Dep {
    static target: ?Watcher;
    id: number;
    subs: Array<Watcher>;
  
    constructor () {
      this.id = uid++
      this.subs = []
    }
  
    addSub (sub: Watcher) {
      this.subs.push(sub)
    }
  
    removeSub (sub: Watcher) {
      remove(this.subs, sub)
    }
  
    depend () {
      if (Dep.target) {
        Dep.target.addDep(this)
      }
    }
  
    notify () {
      // stabilize the subscriber list first
      const subs = this.subs.slice()
      // config.async true
      if (process.env.NODE_ENV !== 'production' && !config.async) {
        // subs aren't sorted in scheduler if not running async
        // we need to sort them now to make sure they fire in correct
        // order
        subs.sort((a, b) => a.id - b.id)
      }
      for (let i = 0, l = subs.length; i < l; i++) {
        subs[i].update()
      }
    }
  }

  /**
   * watcher 转换表达式，收集依赖，触发回调，当表达式的值发生改变，用于 $watch() 和指令
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 */
export default class Watcher {
    vm: Component;
    expression: string;
    cb: Function;
    id: number;
    deep: boolean;
    user: boolean;
    lazy: boolean;
    sync: boolean;
    dirty: boolean;
    active: boolean;
    deps: Array<Dep>;
    newDeps: Array<Dep>;
    depIds: SimpleSet;
    newDepIds: SimpleSet;
    before: ?Function;
    getter: Function;
    value: any;
  
    constructor (
      vm: Component,
      expOrFn: string | Function,
      cb: Function,
      options?: ?Object,
      isRenderWatcher?: boolean
    ) {
      this.vm = vm
      if (isRenderWatcher) {
        vm._watcher = this
      }
      vm._watchers.push(this)
      // options
      if (options) {
        this.deep = !!options.deep
        this.user = !!options.user
        this.lazy = !!options.lazy
        this.sync = !!options.sync
        this.before = options.before
      } else {
        this.deep = this.user = this.lazy = this.sync = false
      }
      this.cb = cb
      this.id = ++uid // uid for batching
      this.active = true
      this.dirty = this.lazy // for lazy watchers
      this.deps = []
      this.newDeps = []
      this.depIds = new Set()
      this.newDepIds = new Set()
      this.expression = process.env.NODE_ENV !== 'production'
        ? expOrFn.toString()
        : ''
      // parse expression for getter
      if (typeof expOrFn === 'function') {
        this.getter = expOrFn
      } else {
        this.getter = parsePath(expOrFn)
        if (!this.getter) {
          this.getter = noop
          process.env.NODE_ENV !== 'production' && warn(
            `Failed watching path: "${expOrFn}" ` +
            'Watcher only accepts simple dot-delimited paths. ' +
            'For full control, use a function instead.',
            vm
          )
        }
      }
      // 首次更新，触发vm 实例数据上 get
      this.value = this.lazy
        ? undefined
        : this.get()
    }
  
    /**
     * Evaluate the getter, and re-collect dependencies.
     */
    get () {
      pushTarget(this)
      let value
      const vm = this.vm
      try {
        value = this.getter.call(vm, vm)
      } catch (e) {
        if (this.user) {
          handleError(e, vm, `getter for watcher "${this.expression}"`)
        } else {
          throw e
        }
      } finally {
        // "touch" every property so they are all tracked as
        // dependencies for deep watching
        if (this.deep) {
          traverse(value)
        }
        popTarget()
        this.cleanupDeps()
      }
      return value
    }
  
    /**
     * Add a dependency to this directive.
     */
    addDep (dep: Dep) {
      const id = dep.id
      if (!this.newDepIds.has(id)) {
        this.newDepIds.add(id)
        this.newDeps.push(dep)
        if (!this.depIds.has(id)) {
          dep.addSub(this)
        }
      }
    }
  
    /**
     * Clean up for dependency collection.
     */
    cleanupDeps () {
      let i = this.deps.length
      while (i--) {
        const dep = this.deps[i]
        if (!this.newDepIds.has(dep.id)) {
          dep.removeSub(this)
        }
      }
      let tmp = this.depIds
      this.depIds = this.newDepIds
      this.newDepIds = tmp
      this.newDepIds.clear()
      tmp = this.deps
      this.deps = this.newDeps
      this.newDeps = tmp
      this.newDeps.length = 0
    }
  
    /**
     * 订阅者接口，依赖改变将会被调用
     * Subscriber interface.
     * Will be called when a dependency changes.
     */
    update () {
      /* istanbul ignore else */
      if (this.lazy) {
        this.dirty = true
      } else if (this.sync) {
        this.run()
      } else {
        // watcher队列，空闲的时机执行更新 页面组件
        queueWatcher(this)
      }
    }
  
    /**
     * Scheduler job interface.
     * Will be called by the scheduler.
     */
    run () {
      if (this.active) {
        const value = this.get()
        if (
          value !== this.value ||
          // Deep watchers and watchers on Object/Arrays should fire even
          // when the value is the same, because the value may
          // have mutated.
          isObject(value) ||
          this.deep
        ) {
          // set new value
          const oldValue = this.value
          this.value = value
          if (this.user) {
            try {
              this.cb.call(this.vm, value, oldValue)
            } catch (e) {
              handleError(e, this.vm, `callback for watcher "${this.expression}"`)
            }
          } else {
            this.cb.call(this.vm, value, oldValue)
          }
        }
      }
    }
  
    /**
     * Evaluate the value of the watcher.
     * This only gets called for lazy watchers.
     */
    evaluate () {
      this.value = this.get()
      this.dirty = false
    }
  
    /**
     * Depend on all deps collected by this watcher.
     */
    depend () {
      let i = this.deps.length
      while (i--) {
        this.deps[i].depend()
      }
    }
  
    /**
     * Remove self from all dependencies' subscriber list.
     */
    teardown () {
      if (this.active) {
        // remove self from vm's watcher list
        // this is a somewhat expensive operation so we skip it
        // if the vm is being destroyed.
        if (!this.vm._isBeingDestroyed) {
          remove(this.vm._watchers, this)
        }
        let i = this.deps.length
        while (i--) {
          this.deps[i].removeSub(this)
        }
        this.active = false
      }
    }
  }



// The current target watcher being evaluated.
// This is globally unique because only one watcher
// can be evaluated at a time.
// 同一时间只有一个watcher在运行
Dep.target = null
const targetStack = []

export function pushTarget (target: ?Watcher) {
  targetStack.push(target)
  Dep.target = target
}

export function popTarget () {
  targetStack.pop()
  Dep.target = targetStack[targetStack.length - 1]
}

/**
 * Define a property.
 */
export function def (obj: Object, key: string, val: any, enumerable?: boolean) {
    Object.defineProperty(obj, key, {
      value: val,
      enumerable: !!enumerable,
      writable: true,
      configurable: true
    })
  }

  /**
   * https://cn.vuejs.org/v2/guide/reactivity.html#%E5%BC%82%E6%AD%A5%E6%9B%B4%E6%96%B0%E9%98%9F%E5%88%97
   * 将观察者推送到观察者队列中。具有重复ID的任务将被跳过，除非在刷新队列时推送
 * Push a watcher into the watcher queue.
 * Jobs with duplicate IDs will be skipped unless it's
 * pushed when the queue is being flushed.
 */
export function queueWatcher (watcher: Watcher) {
    const id = watcher.id
    if (has[id] == null) {
      has[id] = true
      //  没在刷新
      if (!flushing) {
        queue.push(watcher)
      } else {
        // if already flushing, splice the watcher based on its id
        // if already past its id, it will be run next immediately.
        let i = queue.length - 1
        while (i > index && queue[i].id > watcher.id) {
          i--
        }
        //刷新中，插入队列
        queue.splice(i + 1, 0, watcher)
      }
      // queue the flush
      if (!waiting) {
        waiting = true
  
        // config.async true
        if (process.env.NODE_ENV !== 'production' && !config.async) {
          flushSchedulerQueue()
          return
        }
        // 定时刷新
        nextTick(flushSchedulerQueue)
      }
    }
  }

  export function nextTick (cb?: Function, ctx?: Object) {
    let _resolve
    callbacks.push(() => {
      if (cb) {
        try {
          cb.call(ctx)
        } catch (e) {
          handleError(e, ctx, 'nextTick')
        }
      } else if (_resolve) {
        _resolve(ctx)
      }
    })
    if (!pending) {
      pending = true
      // 事件轮询
      timerFunc()
    }
    // $flow-disable-line
    if (!cb && typeof Promise !== 'undefined') {
      return new Promise(resolve => {
        _resolve = resolve
      })
    }
  }

/**
 * Flush both queues and run the watchers.
 */
function flushSchedulerQueue () {
  currentFlushTimestamp = getNow()
  flushing = true
  let watcher, id

  // Sort queue before flush.
  // This ensures that:
  // 1. Components are updated from parent to child. (because parent is always
  //    created before the child)
  // 2. A component's user watchers are run before its render watcher (because
  //    user watchers are created before the render watcher)
  // 3. If a component is destroyed during a parent component's watcher run,
  //    its watchers can be skipped.

    // 组件正在从父组件更新到子组件，(因为父组件比子组件先创建)
  // 组件的watchers比在render watcher 之前执行 (因为 组件的watchers 比 render watcher 先创建)
  // 如果一个组件在父组件watcher运行时销毁，watcher将会被跳过
  queue.sort((a, b) => a.id - b.id)

  // do not cache length because more watchers might be pushed
  // as we run existing watchers
  for (index = 0; index < queue.length; index++) {
    watcher = queue[index]
    if (watcher.before) {
      watcher.before()
    }
    id = watcher.id
    has[id] = null
    // 运行 watcher 中run，触发  updateComponent
    watcher.run()
    // in dev build, check and stop circular updates.
    if (process.env.NODE_ENV !== 'production' && has[id] != null) {
      circular[id] = (circular[id] || 0) + 1
      if (circular[id] > MAX_UPDATE_COUNT) {
        warn(
          'You may have an infinite update loop ' + (
            watcher.user
              ? `in watcher with expression "${watcher.expression}"`
              : `in a component render function.`
          ),
          watcher.vm
        )
        break
      }
    }
  }

  /**
   * 当访问数组时，进行依赖收集，因为属性getter不能拦截属性元素的访问
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */
function dependArray (value: Array<any>) {
    for (let e, i = 0, l = value.length; i < l; i++) {
      e = value[i]
      e && e.__ob__ && e.__ob__.dep.depend()
      if (Array.isArray(e)) {
        dependArray(e)
      }
    }
  }

  // microtasks还是有一些狡猾的bug，vue在任何地方都使用 微任务队列
  // 主要的缺点是 微任务有太高的优先级去执行，会在相同事件冒泡之间触发，在顺序事件之间触发，
  // Here we have async deferring wrappers using microtasks.
// In 2.5 we used (macro) tasks (in combination with microtasks).
// However, it has subtle problems when state is changed right before repaint
// (e.g. #6813, out-in transitions).
// Also, using (macro) tasks in event handler would cause some weird behaviors
// that cannot be circumvented (e.g. #7109, #7153, #7546, #7834, #8109).
// So we now use microtasks everywhere, again.
// A major drawback of this tradeoff is that there are some scenarios
// where microtasks have too high a priority and fire in between supposedly
// sequential events (e.g. #4521, #6690, which have workarounds)
// or even between bubbling of the same event (#6566).
let timerFunc

// The nextTick behavior leverages the microtask queue, which can be accessed
// via either native Promise.then or MutationObserver.
// MutationObserver has wider support, however it is seriously bugged in
// UIWebView in iOS >= 9.3.3 when triggered in touch event handlers. It
// completely stops working after triggering a few times... so, if native
// Promise is available, we will use it:
/* istanbul ignore next, $flow-disable-line */
if (typeof Promise !== 'undefined' && isNative(Promise)) {
  const p = Promise.resolve()
  timerFunc = () => {
    p.then(flushCallbacks)
    // In problematic UIWebViews, Promise.then doesn't completely break, but
    // it can get stuck in a weird state where callbacks are pushed into the
    // microtask queue but the queue isn't being flushed, until the browser
    // needs to do some other work, e.g. handle a timer. Therefore we can
    // "force" the microtask queue to be flushed by adding an empty timer.
    if (isIOS) setTimeout(noop)
  }
  isUsingMicroTask = true
} else if (!isIE && typeof MutationObserver !== 'undefined' && (
  isNative(MutationObserver) ||
  // PhantomJS and iOS 7.x
  MutationObserver.toString() === '[object MutationObserverConstructor]'
)) {
  // Use MutationObserver where native Promise is not available,
  // e.g. PhantomJS, iOS7, Android 4.4
  // (#6466 MutationObserver is unreliable in IE11)
  let counter = 1
  const observer = new MutationObserver(flushCallbacks)
  const textNode = document.createTextNode(String(counter))
  observer.observe(textNode, {
    characterData: true
  })
  timerFunc = () => {
    counter = (counter + 1) % 2
    textNode.data = String(counter)
  }
  isUsingMicroTask = true
} else if (typeof setImmediate !== 'undefined' && isNative(setImmediate)) {
  // Fallback to setImmediate.
  // Technically it leverages the (macro) task queue,
  // but it is still a better choice than setTimeout.
  timerFunc = () => {
    setImmediate(flushCallbacks)
  }
} else {
  // Fallback to setTimeout.
  timerFunc = () => {
    setTimeout(flushCallbacks, 0)
  }
}