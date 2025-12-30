// 组件钩子 从里到外 打断点跳出 ,逆向破解
// 事件通知
function invokeWithErrorHandling(handler, context, args, vm, info) {
  var res
  try {
    res = args ? handler.apply(context, args) : handler.call(context)
    if (res && !res._isVue && isPromise(res) && !res._handled) {
      res.catch(function (e) {
        return handleError(e, vm, info + ' (Promise/async)')
      })
      // issue #9511
      // avoid catch triggering multiple times when nested calls
      res._handled = true
    }
  } catch (e) {
    handleError(e, vm, info)
  }
  return res
}

function callHook(vm, hook) {
  // #7573 disable dep collection when invoking lifecycle hooks
  pushTarget()
  var handlers = vm.$options[hook]
  var info = hook + ' hook'
  if (handlers) {
    for (var i = 0, j = handlers.length; i < j; i++) {
      invokeWithErrorHandling(handlers[i], vm, null, vm, info)
    }
  }
  if (vm._hasHookEvent) {
    vm.$emit('hook:' + hook)
  }
  popTarget()
}

callHook(vm, 'beforeCreate')

/**
 * Class inheritance
 */
Vue.extend = function (extendOptions) {
  var Sub = function VueComponent(options) {
    this._init(options)
  }
  return Sub
}

function createComponentInstanceForVnode(
  vnode, // we know it's MountedComponentVNode but flow doesn't
  parent // activeInstance in lifecycle state
) {
    // 调用了 Ctor() 触发 this._init(options) 子组件开始创建
  return new vnode.componentOptions.Ctor(options)
}

var componentVNodeHooks = {
  // inline hooks to be invoked on component VNodes during patch
  init: function init(vnode, hydrating) {
    if (
      vnode.componentInstance &&
      !vnode.componentInstance._isDestroyed &&
      vnode.data.keepAlive
    ) {
    } else {
      var child = (vnode.componentInstance = createComponentInstanceForVnode(
        vnode,
        activeInstance
      ))
      child.$mount(hydrating ? vnode.elm : undefined, hydrating)
    }
  }
}


// wrapper function for providing a more flexible interface
// without getting yelled at by flow
function createElement(context, tag, data, children, normalizationType, alwaysNormalize) {
  return _createElement(context, tag, data, children, normalizationType)
}

function _createElement(context, tag, data, children, normalizationType) {
  if (typeof tag === 'string') {
    var Ctor
    ns = (context.$vnode && context.$vnode.ns) || config.getTagNamespace(tag)
    if (config.isReservedTag(tag)) {
      // platform built-in elements
      vnode = new VNode(
        config.parsePlatformTagName(tag),
        data,
        children,
        undefined,
        undefined,
        context
      )
    } else if (
      (!data || !data.pre) &&
      isDef((Ctor = resolveAsset(context.$options, 'components', tag)))
    ) {
      // component
      vnode = createComponent(Ctor, data, context, children, tag)
    } else {
      // unknown or unlisted namespaced elements
      // check at runtime because it may get assigned a namespace when its
      // parent normalizes children
      vnode = new VNode(tag, data, children, undefined, undefined, context)
    }
  } else {
    // direct component options / constructor
    vnode = createComponent(tag, data, context, children)
  }
  if (Array.isArray(vnode)) {
    return vnode
  } else if (isDef(vnode)) {
    if (isDef(ns)) {
      applyNS(vnode, ns)
    }
    if (isDef(data)) {
      registerDeepBindings(data)
    }
    return vnode
  } else {
    return createEmptyVNode()
  }
}

function mergeHook$1 (f1, f2) {
    var merged = function (a, b) {
      // flow complains about extra args which is why we use any
      f1(a, b);
      f2(a, b);
    };
    merged._merged = true;
    return merged
  }

function installComponentHooks (data) {
    var hooks = data.hook || (data.hook = {});
    for (var i = 0; i < hooksToMerge.length; i++) {
      var key = hooksToMerge[i];
      var existing = hooks[key];
      var toMerge = componentVNodeHooks[key];
      if (existing !== toMerge && !(existing && existing._merged)) {
        hooks[key] = existing ? mergeHook$1(toMerge, existing) : toMerge;
      }
    }
  }

  function createComponent (vnode, insertedVnodeQueue, parentElm, refElm) {
    var i = vnode.data;
    if (isDef(i)) {
      var isReactivated = isDef(vnode.componentInstance) && i.keepAlive;
      // watcher > updateComponent > render >  触发 组件上的init 事件 init 触发 Vue继承来的 this._init(options)， 触发 lifecycle, 触发  beforeCreate created
      // 之后 $mount 调用  beforeMount 触发， 之后会触发 __patch__ 插入到父组件中，从里到外，因为是深度遍历，所以是从内到外mount
      // invokeInsertHook(vnode, insertedVnodeQueue, isInitialPatch)
      if (isDef(i = i.hook) && isDef(i = i.init)) {
        i(vnode, false /* hydrating */);
      }
      // after calling the init hook, if the vnode is a child component
      // it should've created a child instance and mounted it. the child
      // component also has set the placeholder vnode's elm.
      // in that case we can just return the element and be done.
      if (isDef(vnode.componentInstance)) {
        initComponent(vnode, insertedVnodeQueue);
        insert(parentElm, vnode.elm, refElm);
        if (isTrue(isReactivated)) {
          reactivateComponent(vnode, insertedVnodeQueue, parentElm, refElm);
        }
        return true
      }
    }
  }

function createComponent (
    Ctor,
    data,
    context,
    children,
    tag
  ) {
if (isObject(Ctor)) {
    Ctor = baseCtor.extend(Ctor);
    }
    installComponentHooks(data);
}

vm._c = function (a, b, c, d) {
  return createElement(vm, a, b, c, d, false)
}


var render = function () {
  var _vm = this
  var _h = _vm.$createElement
  var _c = _vm._self._c || _h
  return _c(
    'div',
    { staticClass: 'notranslate' },
    [
      _c(
        'el-button',
        {
          attrs: { type: 'text' },
          on: {
            click: function ($event) {
              _vm.outerVisible = true
            }
          }
        },
        [_vm._v('点击打开外层 Dialog')]
      )
    ],
    1
  )
}

Vue.prototype._render = function () {
  vnode = render.call(vm._renderProxy, vm.$createElement)
}

updateComponent = () => {
  vm._update(vm._render(), hydrating)
}

__patch__

function invokeInsertHook (vnode, queue, initial) {
    // delay insert hooks for component root nodes, invoke them after the
    // element is really inserted
    if (isTrue(initial) && isDef(vnode.parent)) {
      vnode.parent.data.pendingInsert = queue
    } else {
      for (let i = 0; i < queue.length; ++i) {
          // 调用组件的 insert 方法
        queue[i].data.hook.insert(queue[i])
      }
    }
  }
