// https://cn.vuejs.org/v2/api/#template
// https://cn.vuejs.org/v2/api/#render


// watcher 根组件第一次渲染，触发 updateComponent

updateComponent = () => {
  vm._update(vm._render(), hydrating)
}

new Watcher(vm, updateComponent, noop, {}, true /* isRenderWatcher */)

class Watcher {
  constructor() {
    this.value = this.lazy
    ? undefined
    : this.get()
  }
  get () {
    // this.getter 就是 updateComponent
    value = this.getter.call(vm, vm)
  }
}

vm._render()

// 类似这种格式
_render = function() {
  with (this) {
    return _c('div', [_v('A custom component!')])
  }
}

Vue.prototype._render = function () {
    // 关键代码 调用render ，传入 vm.$createElement 返回vnode 
    vnode = render.call(vm._renderProxy, vm.$createElement);
    return vnode
}
// 更新
vm._update(vm._render(), hydrating)


Vue.prototype._update = function (vnode, hydrating) {
  var vm = this;
  var prevVnode = vm._vnode;
  vm._vnode = vnode;
  // Vue.prototype.__patch__ is injected in entry points
  // based on the rendering backend used.
  if (!prevVnode) {
    // initial render
    vm.$el = vm.__patch__(vm.$el, vnode, hydrating, false /* removeOnly */);
  } else {
    // updates
    vm.$el = vm.__patch__(prevVnode, vnode);
  }
};

// 参看 vnode 和diff
// vm.__patch__  返回 真实dom



// ### 需要了解的基本知识

// 一个字符串模板作为 Vue 实例的标识使用。模板将会替换挂载的元素。挂载元素的内容都将被忽略，除非模板的内容有分发插槽。

// 如果值以 # 开始，则它将被用作选择符，并使用匹配元素的 innerHTML 作为模板。常用的技巧是用 <script type="x-template"> 包含模板。

// 如果 Vue 选项中包含渲染函数，该模板将被忽略。


// 需要编译器
new Vue({
    template: '<div>{{ hi }}</div>'
  })
  
  // 不需要编译器
  new Vue({
    render (h) {
      return h('div', this.hi)
    }
  })
  // 当使用 vue-loader 或 vueify 的时候，*.vue 文件内部的模板会在构建时预编译成 JavaScript。你在最终打好的包里实际上是不需要编译器的，所以只用运行时版本即可。
  
  // Vue 选项中的 render 函数若存在，则 Vue 构造函数不会从 template 选项或通过 el 选项指定的挂载元素中提取出的 HTML 模板编译渲染函数。

//   当使用 vue-loader 或 vueify 的时候，*.vue 文件内部的模板会在构建时预编译成 JavaScript。你在最终打好的包里实际上是不需要编译器的，所以只用运行时版本即可
  
  import App from './App.vue'
  
  //  App已经被 vue-loader处理成了 js 对象 ，vue创建内部方法 h === vm.$createElement

// {
//   beforeCreate: [ƒ]
//   beforeDestroy: [ƒ]
//   components:  ImagePreviewer: {name: "image-previewer", props: {…}, watch: {…}, methods: {…}, data: ƒ, …}
//   computed: {imagePreview: ƒ, videoPreview: ƒ, showPreviewVideo: ƒ}
//   methods: {UPDATE_ViDEO_PREVIEW: ƒ, UPDATE_SCREEN_WIDTH: ƒ, closeVideoPreview: ƒ}
//   mixins: [{…}]
//   mounted: ƒ mounted()
//   name: "App"
//   render: ƒ ()
//   staticRenderFns: []
//   watch: {}
//   __file: "src/App.vue"
//   _compiled: true
// }

  new Vue({
    router,
    store,
    render: h => h(App)
  }).$mount('#app')
  
  function lifecycleMixin (Vue) {
    Vue.prototype._update = function (vnode, hydrating) {
      var vm = this;
      var prevEl = vm.$el;
      var prevVnode = vm._vnode;
      var restoreActiveInstance = setActiveInstance(vm);
      vm._vnode = vnode;
      // Vue.prototype.__patch__ is injected in entry points
      // based on the rendering backend used.
      if (!prevVnode) {
        // initial render
        vm.$el = vm.__patch__(vm.$el, vnode, hydrating, false /* removeOnly */);
      } else {
        // updates
        vm.$el = vm.__patch__(prevVnode, vnode);
      }
      restoreActiveInstance();
      // update __vue__ reference
      if (prevEl) {
        prevEl.__vue__ = null;
      }
      if (vm.$el) {
        vm.$el.__vue__ = vm;
      }
      // if parent is an HOC, update its $el as well
      if (vm.$vnode && vm.$parent && vm.$vnode === vm.$parent._vnode) {
        vm.$parent.$el = vm.$el;
      }
      // updated hook is called by the scheduler to ensure that children are
      // updated in a parent's updated hook.
    };
  
    Vue.prototype.$forceUpdate = function () {
      var vm = this;
      if (vm._watcher) {
        vm._watcher.update();
      }
    };
  
  }

  var componentVNodeHooks = {
    init: function init (vnode, hydrating) {
      if (
        vnode.componentInstance &&
        !vnode.componentInstance._isDestroyed &&
        vnode.data.keepAlive
      ) {
        // kept-alive components, treat as a patch
        var mountedNode = vnode; // work around flow
        componentVNodeHooks.prepatch(mountedNode, mountedNode);
      } else {
        var child = vnode.componentInstance = createComponentInstanceForVnode(
          vnode,
          activeInstance
        );
        child.$mount(hydrating ? vnode.elm : undefined, hydrating);
      }
    }
    // ...
  }
  
  // bind the createElement fn to this instance
    // so that we get proper render context inside it.
    // args order: tag, data, children, normalizationType, alwaysNormalize
    // internal version is used by render functions compiled from templates
    // 内部版本 用于模版 的渲染函数编译
    vm._c = (a, b, c, d) => createElement(vm, a, b, c, d, false)
    // normalization is always applied for the public version, used in
    // user-written render functions.
    // 公共版本 用户调用渲染函数
    vm.$createElement = (a, b, c, d) => createElement(vm, a, b, c, d, true)
  
  $vm0.$options.render = function() {
    with (this) {
      return _c('div', [_v('A custom component!')])
    }
  }
  
  renderMixin(Vue)
  
  Vue.prototype._render = function () {
    var vm = this;
    var ref = vm.$options;
    var render = ref.render;
    var _parentVnode = ref._parentVnode;
  
    if (_parentVnode) {
      vm.$scopedSlots = normalizeScopedSlots(
        _parentVnode.data.scopedSlots,
        vm.$slots,
        vm.$scopedSlots
      );
    }
  
    // set parent vnode. this allows render functions to have access
    // to the data on the placeholder node.
    vm.$vnode = _parentVnode;
    // render self
    var vnode;
    try {
      // 这里没必要去维护一个栈，因为所有的render函数调用都是独立的，内嵌的组件会在父组 patched 时调用
      currentRenderingInstance = vm;
      // 关键代码 调用render ，传入 vm.$createElement
      vnode = render.call(vm._renderProxy, vm.$createElement);
    } catch (e) {
      handleError(e, vm, "render");
      // return error render result,
      // or previous vnode to prevent render error causing blank component
      /* istanbul ignore else */
      if (vm.$options.renderError) {
        try {
          vnode = vm.$options.renderError.call(vm._renderProxy, vm.$createElement, e);
        } catch (e) {
          handleError(e, vm, "renderError");
          vnode = vm._vnode;
        }
      } else {
        vnode = vm._vnode;
      }
    } finally {
      currentRenderingInstance = null;
    }
    // if the returned array contains only a single node, allow it
    if (Array.isArray(vnode) && vnode.length === 1) {
      vnode = vnode[0];
    }
    // return empty vnode in case the render function errored out
    if (!(vnode instanceof VNode)) {
      if (Array.isArray(vnode)) {
        warn(
          'Multiple root nodes returned from render function. Render function ' +
          'should return a single root node.',
          vm
        );
      }
      vnode = createEmptyVNode();
    }
    // set parent
    vnode.parent = _parentVnode;
    return vnode
  };
  
  initProxy = function initProxy (vm) {
    if (hasProxy) {
      // determine which proxy handler to use
      var options = vm.$options;
      var handlers = options.render && options.render._withStripped
        ? getHandler
        : hasHandler;
      vm._renderProxy = new Proxy(vm, handlers);
    } else {
      vm._renderProxy = vm;
    }
  };
  
      // key in obj或者with作用域时，会触发has的钩子 进行验证
      var hasHandler = {
        has: function has (target, key) {
          var has = key in target;
          var isAllowed = allowedGlobals(key) ||
            (typeof key === 'string' && key.charAt(0) === '_' && !(key in target.$data));
          if (!has && !isAllowed) {
            if (key in target.$data) { warnReservedPrefix(target, key); }
            else { warnNonPresent(target, key); }
          }
          return has || !isAllowed
        }
      };
    
      var getHandler = {
        get: function get (target, key) {
          if (typeof key === 'string' && !(key in target)) {
            if (key in target.$data) { warnReservedPrefix(target, key); }
            else { warnNonPresent(target, key); }
          }
          return target[key]
        }
      };


// wrapper function for providing a more flexible interface
// without getting yelled at by flow
function createElement (
  context,
  tag,
  data,
  children,
  normalizationType,
  alwaysNormalize
) {
  if (Array.isArray(data) || isPrimitive(data)) {
    normalizationType = children;
    children = data;
    data = undefined;
  }
  if (isTrue(alwaysNormalize)) {
    normalizationType = ALWAYS_NORMALIZE;
  }
  return _createElement(context, tag, data, children, normalizationType)
}

// 区分 tag 是原生标签还是 组件
function _createElement (
  context,
  tag,
  data,
  children,
  normalizationType
) {
  if (typeof tag === 'string') {
    var Ctor;
        // 子节点的标签为普通的html标签，直接创建Vnode
    if (config.isReservedTag(tag)) {
      // platform built-in elements
      vnode = new VNode(
        config.parsePlatformTagName(tag), data, children,
        undefined, undefined, context
      );
    } else if ((!data || !data.pre) && isDef(Ctor = resolveAsset(context.$options, 'components', tag))) {
      // 子节点标签为注册过的组件标签名，则子组件Vnode的创建过程
      vnode = createComponent(Ctor, data, context, children, tag);
    } else {
      // unknown or unlisted namespaced elements
      // check at runtime because it may get assigned a namespace when its
      // parent normalizes children
      vnode = new VNode(
        tag, data, children,
        undefined, undefined, context
      );
    }
  } else {
    // direct component options / constructor
    vnode = createComponent(tag, data, context, children);
  }
}


function createComponent (
  Ctor,
  data,
  context,
  children,
  tag
) {
  var baseCtor = context.$options._base;

  // plain options object: turn it into a constructor
  // 继承 Vue父类
  if (isObject(Ctor)) {
    Ctor = baseCtor.extend(Ctor);
  }

  // async component
  var asyncFactory;
  if (isUndef(Ctor.cid)) {
    asyncFactory = Ctor;
    Ctor = resolveAsyncComponent(asyncFactory, baseCtor);
    if (Ctor === undefined) {
      // return a placeholder node for async component, which is rendered
      // as a comment node but preserves all the raw information for the node.
      // the information will be used for async server-rendering and hydration.
      return createAsyncPlaceholder(
        asyncFactory,
        data,
        context,
        children,
        tag
      )
    }
  }
   // install component management hooks onto the placeholder node
   installComponentHooks(data);

   // return a placeholder vnode
   var name = Ctor.options.name || tag;
   var vnode = new VNode(
     ("vue-component-" + (Ctor.cid) + (name ? ("-" + name) : '')),
     data, undefined, undefined, undefined, context,
     { Ctor: Ctor, propsData: propsData, listeners: listeners, tag: tag, children: children },
     asyncFactory
   );
}



var componentVNodeHooks = {
  init: function init (vnode, hydrating) {
    if (
      vnode.componentInstance &&
      !vnode.componentInstance._isDestroyed &&
      vnode.data.keepAlive
    ) {
      // kept-alive components, treat as a patch
      var mountedNode = vnode; // work around flow
      componentVNodeHooks.prepatch(mountedNode, mountedNode);
    } else {
      var child = vnode.componentInstance = createComponentInstanceForVnode(
        vnode,
        activeInstance
      );
      child.$mount(hydrating ? vnode.elm : undefined, hydrating);
    }
  },

  prepatch: function prepatch (oldVnode, vnode) {
    var options = vnode.componentOptions;
    var child = vnode.componentInstance = oldVnode.componentInstance;
    updateChildComponent(
      child,
      options.propsData, // updated props
      options.listeners, // updated listeners
      vnode, // new parent vnode
      options.children // new children
    );
  },

  insert: function insert (vnode) {
    var context = vnode.context;
    var componentInstance = vnode.componentInstance;
    if (!componentInstance._isMounted) {
      componentInstance._isMounted = true;
      callHook(componentInstance, 'mounted');
    }
    if (vnode.data.keepAlive) {
      if (context._isMounted) {
        // vue-router#1212
        // During updates, a kept-alive component's child components may
        // change, so directly walking the tree here may call activated hooks
        // on incorrect children. Instead we push them into a queue which will
        // be processed after the whole patch process ended.
        queueActivatedComponent(componentInstance);
      } else {
        activateChildComponent(componentInstance, true /* direct */);
      }
    }
  },

  destroy: function destroy (vnode) {
    var componentInstance = vnode.componentInstance;
    if (!componentInstance._isDestroyed) {
      if (!vnode.data.keepAlive) {
        componentInstance.$destroy();
      } else {
        deactivateChildComponent(componentInstance, true /* direct */);
      }
    }
  }
};

var hooksToMerge = Object.keys(componentVNodeHooks); // init prepatch insert destroy


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

function mergeHook$1 (f1, f2) {
  var merged = function (a, b) {
    // flow complains about extra args which is why we use any
    f1(a, b);
    f2(a, b);
  };
  merged._merged = true;
  return merged
}
