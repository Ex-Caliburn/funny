//  computed 依赖和 data 如何建立联系的
// 发现如果计算属性初始化是lazy，初始化watcher 不会运行，如果不在页面上引用，render 运行，不会建立联系

// 被template 使用时， 哪怕是间接引用 render ，被调用时 变量被访问，
// 被主动访问或者赋值时 只会调用set get 方法，没有关联vnode，就没有watcher

// 初始化data ，初始化computed， 这时候还没确立联系
// 第一次 watcher 更新，触发 
updateComponent = function () {
        vm._update(vm._render(), hydrating);
    };
    // 触发 _render
    // 解析 render 字符串

    // 如果用vue文件， vue-runtime 必须要用 vue-loader

    // 解析  render函数 是 with ， 其中的变量全部会运行 has 方法，去vm找 _c，_v， _s 和 test
    // 找到了  test  触发了 计算属性的 get 方法  createComputedGetter
    // 触发了
    if (watcher.dirty) {
        watcher.evaluate();
      }
      if (Dep.target) {
        watcher.depend();
      }
      // evaluate 触发 get  收集依赖   触发get
      pushTarget(this) // 推入栈
      value = this.getter.call(vm, vm) //运行 getter， 这时候data 和compute 的关系建立了


// (function anonymous(
//     ) {
//     with(this){return _c('div',{attrs:{"id":"app"}},[_v("\n    "+_s(test)+"\n  ")])}
//     })

<div id="app">
{{test}}
</div>

{
    data: {
        msg: {
          b: 'hello'
        }
      },
      computed: {
        test() {
          return this.msg.b + 1
        }
      }
}


const computedWatcherOptions = { lazy: true }

var watchers = vm._computedWatchers = Object.create(null);

watchers[key] = new Watcher(
    vm,
    getter || noop,
    noop,
    computedWatcherOptions
  )

this.value = this.lazy
      ? undefined
      : this.get();

 /**
   *  收集 getter， 重新收集依赖
   *  Evaluate the getter, and re-collect dependencies.
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

 // The current target watcher being evaluated.
// This is globally unique because only one watcher
// can be evaluated at a time.
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

depend () {
    if (Dep.target) {
      Dep.target.addDep(this)
    }
  }

  let childOb = !shallow && observe(val)

  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter () {
      const value = getter ? getter.call(obj) : val
      if (Dep.target) {
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
      /* eslint-disable no-self-compare */
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
      dep.notify()
    }
  })

  // 遍历 computed 里的数据
  for (var key in computed) {
    var userDef = computed[key];
  }

    // 将数据绑定到 vm上，如果已经绑定了component prototype
        // component-defined computed properties are already defined on the
      // component prototype. We only need to define computed properties defined
      // at instantiation here.
      if (!(key in vm)) {
        defineComputed(vm, key, userDef);
      }


      function defineComputed (
        target,
        key,
        userDef
      ) {
        if (typeof userDef === 'function') {
          sharedPropertyDefinition.get = shouldCache
            ? createComputedGetter(key)
            : createGetterInvoker(userDef);
          sharedPropertyDefinition.set = noop;
        } else {
          sharedPropertyDefinition.get = userDef.get
            ? shouldCache && userDef.cache !== false
              ? createComputedGetter(key)
              : createGetterInvoker(userDef.get)
            : noop;
          sharedPropertyDefinition.set = userDef.set || noop;
        }
        Object.defineProperty(target, key, sharedPropertyDefinition);
      }

      function createComputedGetter (key) {
        return function computedGetter () {
          var watcher = this._computedWatchers && this._computedWatchers[key];
          if (watcher) {
            if (watcher.dirty) {
              watcher.evaluate();
            }
            if (Dep.target) {
              watcher.depend();
            }
            return watcher.value
          }
        }
      }

       /**
   * Evaluate the value of the watcher.
   * This only gets called for lazy watchers.
   */
  // 只会被 lazy watcher 调用
  Watcher.prototype.evaluate = function evaluate () {
    this.value = this.get();
    this.dirty = false;
  };

  /**
   * Depend on all deps collected by this watcher.
   */
  Watcher.prototype.depend = function depend () {
    var i = this.deps.length;
    while (i--) {
      this.deps[i].depend();
    }
  };