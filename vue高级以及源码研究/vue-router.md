# vue-router

## 前言

```js

// exposed util methods.
  // NOTE: these are not considered part of the public API - avoid relying on
  // them unless you are aware of the risk.
  Vue.util = {
    warn,
    extend,
    mergeOptions,
    defineReactive: defineReactive$$1
  };

Vue.mixin({
    beforeCreate: function beforeCreate () {
      if (isDef(this.$options.router)) {
        this._routerRoot = this;
        this._router = this.$options.router;
        this._router.init(this);
        // 绑定 _route 到 vue是实例上， 动态监听
        Vue.util.defineReactive(this, '_route', this._router.history.current);
      } else {
          // 子组件的绑定 _routerRoot， 或者重新渲染更新
        this._routerRoot = (this.$parent && this.$parent._routerRoot) || this;
      }
      registerInstance(this, this);
    },
    destroyed: function destroyed () {
      registerInstance(this);
    }
  });


  push (location: RawLocation, onComplete?: Function, onAbort?: Function) {
    const { current: fromRoute } = this
    this.transitionTo(location, route => {
      pushState(cleanPath(this.base + route.fullPath))
    }, onAbort)
  }

  transitionTo (
    location: RawLocation,
    onComplete?: Function,
    onAbort?: Function
  ) {
    const route = this.router.match(location, this.current)
    this.confirmTransition(
      route,
      () => {
        this.updateRoute(route)
        onComplete && onComplete(route)
        this.ensureURL()
      }
    )
  }

  updateRoute (route: Route) {
    const prev = this.current
    this.current = route
    // 回调
    this.cb && this.cb(route)
    this.router.afterHooks.forEach(hook => {
      hook && hook(route, prev)
    })
  }


  init (app: any /* Vue component instance */) {
    this.apps.push(app)
    history.listen(route => {
      this.apps.forEach((app) => {
        app._route = route
      })
    })
  }

  History.prototype.listen = function listen (cb) {
    this.cb = cb;
};
```

## 总结

### 参考文献
  