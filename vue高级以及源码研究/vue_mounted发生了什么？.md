# vnode和diff

1. 摧毁全部，重新从草稿开始新建
2. 创建模版，比较新旧模版的区别，然后更新

## vue_mounted发生了什么

Where is mountComponent actually called?
Where does a template get compiled into a render function?
What does _render do?
What does_update do?

绑定 mounted 先watcher，确定模版上的数据和data 的绑定关系，template 使用js object对象结构定义(VNode)，

```
{
      tag: "div"
      children: [
        {
          text: "Hello"
        }
      ]
    }
```

```
 export function mountComponent (...) {
    ...
    callHook(vm, 'beforeMount') // <-- Lifecycle hook

    let updateComponent = () => {
      vm._update(vm._render(), hydrating)  // <-- This is our target method
    }  
    new Watcher(vm, updateComponent, noop, null, true) // <-- Our watcher, which runs our target method, and reruns it when needed
    ...
```

根据构建环境不同 mounted 处理不同
Runtime+compiler
runtime-only

/scripts/config.js

```
const builds = {
  // runtime-only build (Browser)
  "web-runtime-dev": {
    entry: resolve("web/entry-runtime.js"), // This mount only includes the code to run render functions.
    dest: resolve("dist/vue.runtime.js"),
    ...
  },
  // Runtime+compiler development build (Browser)
  "web-full-dev": {
    entry: resolve("web/entry-runtime-with-compiler.js"), // includes code to compile templates into render functions and run them
    dest: resolve("dist/vue.js"),
    ...
  }
};
```

/src/platforms/web/entry-runtime-with-compiler.js

```
    const mount = Vue.prototype.$mount // This version of mount is defined inside runtime/index.js
    Vue.prototype.$mount = function (el?: string | Element, hydrating?: boolean): Component {
      el = el && query(el)
      const options = this.$options

      // Only compile a template if we don't already have a render function
      if (!options.render) {
        let template = options.template
        if (template) {  // do compilation in here!
          const { render, staticRenderFns } = compileToFunctions(template, { ...  }, this)
          options.render = render  // Now we have compiled .. see below
        }
      }
      // Call previously defined mount before returning
      return mount.call(this, el, hydrating)
    }
```

```
    template: `<h1>{{ this.name }}</h1>`
    // Into something that looks more like:

    {
        with(this){return _c('h1',[_v(_s(this.name))])}
    }
```

```
    vm._c = (a, b, c, d) => createElement(vm, a, b, c, d, false)

/src/core/instance/render-helpers.js
    target._o = markOnce
      target._n = toNumber
      target._s = toString // <-------
      target._l = renderList
      target._t = renderSlot
      target._q = looseEqual
      target._i = looseIndexOf
      target._m = renderStatic
      target._f = resolveFilter
      target._k = checkKeyCodes
      target._b = bindObjectProps
      target._v = createTextVNode // <------
      target._e = createEmptyVNode
      target._u = resolveScopedSlots
      target._g = bindObjectListeners


      // If we were to extrapolate our render function we’d have:

{
    with(this){return createElement('h1',[ createTextVNode ( toString(this.name))])}
    }

```

/src/platforms/web/runtime.js

```
    // public mount method
    Vue.prototype.$mount = function (
      el?: string | Element,
      hydrating?: boolean
    ): Component {
      el = el && inBrowser ? query(el) : undefined // Get or create the DOM element if we haven't yet
      return mountComponent(this, el, hydrating) // <-- Here's our mountComponent call!
    }
```

/src/core/instance/lifecycle.js

```
export function mountComponent (
      vm: Component,
      el: ?Element,
      hydrating?: boolean
    ): Component {
      vm.$el = el
      ...
      callHook(vm, 'beforeMount')

      let updateComponent
      updateComponent = () => {
        vm._update(vm._render(), hydrating)
      }

      new Watcher(vm, updateComponent, noop, null, true /* isRenderWatcher */)

      hydrating = false
      return vm
    }
```

### What are this _render() &_update() functions doing

```
/src/core/instance/render.js

 Vue.prototype._render = function (): VNode {
        const vm: Component = this
        const { render, _parentVnode } = vm.$options

        // set parent vnode. this allows render functions to have access
          // to the data on the placeholder node.
        vm.$vnode = _parentVnode
        // render self
        let vnode
        try {
          vnode = render.call(vm._renderProxy, vm.$createElement) // <--- Executes our render function, returning a VNode
        } catch (e) { ... }

        // set parent
        vnode.parent = _parentVnode
        return vnode
      }
```

```
  (function() {
      with(this){return _c('h1',[_v(_s(this.name))])}
    })
```

这个名字是响应式的，我们在之前initDate 已经绑定了 setter和getter方法，this.name 会触发getter方法，并且触发dep.depend()

```
/src/core/instance/lifecycle.js
Vue.prototype._update = function (vnode: VNode, hydrating?: boolean) {
        const vm: Component = this
        if (vm._isMounted) {  // If we've already mounted this node on the DOM
          callHook(vm, 'beforeUpdate')
        }

        const prevVnode = vm._vnode // Store the previous VNode

        vm._vnode = vnode // set current vnode to the one we just generated and
                          // passed into the _update method

        if (!prevVnode) {
          // If no previous VNode then DOM node created and inserted
          vm.$el = vm.__patch__(vm.$el, vnode, hydrating, false, vm.$options._parentElm, vm.$options._refElm)
        } else {
          // Updates happen here.  Notice we're sending in the prevVnode and the new
          // one, so that the least amount of DOM updates occur.
          vm.$el = vm.__patch__(prevVnode, vnode)
        }
      }

```

_update 最终调用了 __patch__方法，并发送消息，__patch__调用取决与运行环境， 并且比较VNode是否创建过，是将进行比较并更新，否则新建

/src/platforms/web/runtime/index.js

```
Vue.prototype.__patch__ = inBrowser ? patch : noop
We are inBrowser so this leads us to the path function:

```

/src/platforms/web/runtime/patch.js

```
import * as nodeOps from 'web/runtime/node-ops'
...
export const patch: Function = createPatchFunction({ nodeOps, modules })
```

/src/core/vdom/patch.js

```
export function createPatchFunction (backend) { ... }

```

nodeOps 包含了许多dom操作

```
export function createElement(tagName: string, vnode: VNode): Element {
  const elm = document.createElement(tagName);
}

export function createTextNode(text: string): Text {
  return document.createTextNode(text);
}
... // A bunch more
```

### 参考文献

1. <https://www.vuemastery.com/courses/advanced-components/mounting-process>
