var baseModules = [
    ref,
    directives
  ];

  var platformModules = [
    attrs,
    klass,
    events,
    domProps,
    style,
    transition
  ];

  var nodeOps = /*#__PURE__*/Object.freeze({
    createElement: createElement$1,
    createElementNS: createElementNS,
    createTextNode: createTextNode,
    createComment: createComment,
    insertBefore: insertBefore,
    removeChild: removeChild,
    appendChild: appendChild,
    parentNode: parentNode,
    nextSibling: nextSibling,
    tagName: tagName,
    setTextContent: setTextContent,
    setSt
  })
  
    Vue.prototype.__patch__ = inBrowser ? patch : noop;
  
  // the directive module should be applied last, after all
  // built-in modules have been applied.
  var modules = platformModules.concat(baseModules);
  
  
  var patch = createPatchFunction({ nodeOps: nodeOps, modules: modules });

  function createPatchFunction (backend) {
    //...
    return function patch (oldVnode, vnode, hydrating, removeOnly) {}
  }

  // 判断是否是真是的 dom对象，oldVnode.nodeType 如果有则是 dom对象，没有则是vnode节点

  // 第一次 会把 oldVnode 赋值为 空Vnode
  oldVnode = emptyNodeAt(oldVnode);

  // 判断是不是组件，组件则进入另一它流程
  if (createComponent(vnode, insertedVnodeQueue, parentElm, refElm)) {
    return
  }

  // vnode 的dom元素
  var oldElm = oldVnode.elm;
    // vnode 的父dom元素， DOM 的 body
  var parentElm = nodeOps.parentNode(oldElm);


  // patch 最后插入，触发insert 钩子函数，触发组件mounted
  invokeInsertHook(vnode, insertedVnodeQueue, isInitialPatch);


            // destroy old node, 移除老节点，dom操作
  if (isDef(parentElm)) {
    removeVnodes([oldVnode], 0, 0);
  } else if (isDef(oldVnode.tag)) {
    invokeDestroyHook(oldVnode);
  }

  // 重新创建 elm容器
  vnode.elm = vnode.ns
  ? nodeOps.createElementNS(vnode.ns, tag)
  : nodeOps.createElement(tag, vnode);
  // 给 scoped css 添加scope id
setScope(vnode);

/* istanbul ignore if */
{
  // 创建子元素
  createChildren(vnode, children, insertedVnodeQueue);
  if (isDef(data)) {
    // 更新 属性，class，事件监听，prop，style， 指令等
    invokeCreateHooks(vnode, insertedVnodeQueue);
  }
  // 插入页面中
  insert(parentElm, vnode.elm, refElm);
}


function createComponent (vnode, insertedVnodeQueue, parentElm, refElm) {
  var i = vnode.data;
  if (isDef(i)) {
    var isReactivated = isDef(vnode.componentInstance) && i.keepAlive;
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

    // tag 标签存在
  //  文本节点
  //  评论节点

  // 插入到相同父元素下，一般是body  insertBefore 或者  appendChild
  function insert (parent, elm, ref$$1) {
    if (isDef(parent)) {
      if (isDef(ref$$1)) {
        if (nodeOps.parentNode(ref$$1) === parent) {
          nodeOps.insertBefore(parent, elm, ref$$1);
        }
      } else {
        nodeOps.appendChild(parent, elm);
      }
    }
  }

// 如果是子组件
  createComponent

  if (isDef(i = i.hook) && isDef(i = i.init)) {
    // 调用组件的初始化方法init
    i(vnode, false /* hydrating */);
  }


  var child = vnode.componentInstance = createComponentInstanceForVnode(
    vnode,
    activeInstance
  );

  function createComponentInstanceForVnode (
    vnode, // we know it's MountedComponentVNode but flow doesn't
    parent // activeInstance in lifecycle state
  ) {
    var options = {
      _isComponent: true,
      _parentVnode: vnode,
      parent: parent
    };
    return new vnode.componentOptions.Ctor(options)
  }


  Vue.extend = function (extendOptions) {
    var Sub = function VueComponent (options) {
      // 初始化生命周期 beforeCreate, create
      this._init(options);
    };
  }

  // 挂载
  child.$mount(hydrating ? vnode.elm : undefined, hydrating);

  // 解析render函数时，创建 Ctor也挂载上去

  vm._c = function (a, b, c, d) {
    return createElement(vm, a, b, c, d, false)
  }

  function _createElement(context, tag, data, children, normalizationType) {
    if (typeof tag === 'string') {
      var Ctor
      ns = (context.$vnode && context.$vnode.ns) || config.getTagNamespace(tag)
      if (config.isReservedTag(tag)) {
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

  function Vue (options) {
    if (!(this instanceof Vue)
    ) {
      warn('Vue is a constructor and should be called with the `new` keyword');
    }
    this._init(options);
  }    

  Vue.options._base = Vue;


  function createComponent (
    Ctor,
    data,
    context,
    children,
    tag
  ) {

    var baseCtor = context.$options._base;

    // plain options object: turn it into a constructor
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

    data = data || {};

    // resolve constructor options in case global mixins are applied after
    // component constructor creation
    resolveConstructorOptions(Ctor);

    // transform component v-model data into props & events
    if (isDef(data.model)) {
      transformModel(Ctor.options, data);
    }

    // extract props
    var propsData = extractPropsFromVNodeData(data, Ctor, tag);

    // functional component
    if (isTrue(Ctor.options.functional)) {
      return createFunctionalComponent(Ctor, propsData, data, context, children)
    }

    // extract listeners, since these needs to be treated as
    // child component listeners instead of DOM listeners
    var listeners = data.on;
    // replace with listeners with .native modifier
    // so it gets processed during parent component patch.
    data.on = data.nativeOn;

    if (isTrue(Ctor.options.abstract)) {
      // abstract components do not keep anything
      // other than props & listeners & slot

      // work around flow
      var slot = data.slot;
      data = {};
      if (slot) {
        data.slot = slot;
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

    return vnode
  }

  // 第二次数据改变，更新视图

  // 不是真实dom
  var isRealElement = isDef(oldVnode.nodeType);
    if (!isRealElement && sameVnode(oldVnode, vnode)) {
      // patch existing root node
      patchVnode(oldVnode, vnode, insertedVnodeQueue, null, null, removeOnly);
    }

    // 先判断新节点Vnode是不是文本节点，是文本节点，直接覆盖setTextContent，
    // 不是进入比较孩子环节
    // insertedVnodeQueue 一开始是空数组，已经插入的vnode队列
    function patchVnode (
      oldVnode,
      vnode,
      insertedVnodeQueue,
      ownerArray,
      index,
      removeOnly
    ) {
      if (oldVnode === vnode) {
        return
      }

      if (isDef(vnode.elm) && isDef(ownerArray)) {
        // clone reused vnode
        vnode = ownerArray[index] = cloneVNode(vnode);
      }

      var elm = vnode.elm = oldVnode.elm; // 新旧vnode的真实elm

      if (isTrue(oldVnode.isAsyncPlaceholder)) {
        if (isDef(vnode.asyncFactory.resolved)) {
          hydrate(oldVnode.elm, vnode, insertedVnodeQueue);
        } else {
          vnode.isAsyncPlaceholder = true;
        }
        return
      }

      // reuse element for static trees.
      // note we only do this if the vnode is cloned -
      // if the new node is not cloned it means the render functions have been
      // reset by the hot-reload-api and we need to do a proper re-render.
      if (isTrue(vnode.isStatic) &&
        isTrue(oldVnode.isStatic) &&
        vnode.key === oldVnode.key &&
        (isTrue(vnode.isCloned) || isTrue(vnode.isOnce))
      ) {
        vnode.componentInstance = oldVnode.componentInstance;
        return
      }

      var i;
      var data = vnode.data;
      if (isDef(data) && isDef(i = data.hook) && isDef(i = i.prepatch)) {
        i(oldVnode, vnode);
      }

      var oldCh = oldVnode.children;
      var ch = vnode.children;
      if (isDef(data) && isPatchable(vnode)) {
        for (i = 0; i < cbs.update.length; ++i) { cbs.update[i](oldVnode, vnode); }
        if (isDef(i = data.hook) && isDef(i = i.update)) { i(oldVnode, vnode); }
      }
      // 新vnode不是文本节点
    // 1. 新vnode不是文本节点
          //  新旧节点孩子存在比较 updateChildren
          //  新节点孩子存在 老的不存在 添加到elm上
          //  新节点孩子不存在 老的节点存在 移除
          //  老的节点是文本节点 清空文本节点内容
    // 2. 新vnode是文本节点
          //  新vnode和老vnode不同，更新文本
      if (isUndef(vnode.text)) {
        // 都有子组件
        if (isDef(oldCh) && isDef(ch)) {
          if (oldCh !== ch) { updateChildren(elm, oldCh, ch, insertedVnodeQueue, removeOnly); }
        } else if (isDef(ch)) {
          // 只有新节点有子组件，旧的没有，直接置为空串，直接添加vnode
          {
            checkDuplicateKeys(ch);
          }
          
          if (isDef(oldVnode.text)) { nodeOps.setTextContent(elm, ''); }
          addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue);
        } else if (isDef(oldCh)) {
          // 新节点不存在，直接移除子dom
          removeVnodes(oldCh, 0, oldCh.length - 1);
        } else if (isDef(oldVnode.text)) {
           // 新节点不存在，老节点是文本，直接置为空串
          nodeOps.setTextContent(elm, '');
        }
      } else if (oldVnode.text !== vnode.text) {
        // 新旧文本变化，设置新文本
        nodeOps.setTextContent(elm, vnode.text);
      }
      if (isDef(data)) {
        if (isDef(i = data.hook) && isDef(i = i.postpatch)) { i(oldVnode, vnode); }
      }
    }

    // 深度遍历，同层比较
  function updateChildren (parentElm, oldCh, newCh, insertedVnodeQueue, removeOnly) {
    var oldStartIdx = 0;
    var newStartIdx = 0;
    var oldEndIdx = oldCh.length - 1;
    var oldStartVnode = oldCh[0];
    var oldEndVnode = oldCh[oldEndIdx];
    var newEndIdx = newCh.length - 1;
    var newStartVnode = newCh[0];
    var newEndVnode = newCh[newEndIdx];
    var oldKeyToIdx, idxInOld, vnodeToMove, refElm;

    // removeOnly is a special flag used only by <transition-group>
    // to ensure removed elements stay in correct relative positions
    // during leaving transitions
    var canMove = !removeOnly;  // 避免不避免的移动

    {
      checkDuplicateKeys(newCh); // 检查孩子是否有相同的key
    }

    while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
      if (isUndef(oldStartVnode)) {
        // 旧vdom首指针指向dom不存在，指针右移
        oldStartVnode = oldCh[++oldStartIdx]; // Vnode has been moved left
      } else if (isUndef(oldEndVnode)) {
        // 旧vdom尾指针指向dom不存在，指针右移
        oldEndVnode = oldCh[--oldEndIdx];
      } else if (sameVnode(oldStartVnode, newStartVnode)) {
        //  旧的首指针和新的首指针是相同的node
        patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue, newCh, newStartIdx);
        oldStartVnode = oldCh[++oldStartIdx]; // 旧首指针右移
        newStartVnode = newCh[++newStartIdx];
      } else if (sameVnode(oldEndVnode, newEndVnode)) {
        //  旧的尾指针和新的尾指针是相同的node
        patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue, newCh, newEndIdx);
        oldEndVnode = oldCh[--oldEndIdx];  //旧尾指针右移
        newEndVnode = newCh[--newEndIdx];
      } else if (sameVnode(oldStartVnode, newEndVnode)) { // Vnode moved right
        // 旧的首指针和新的尾指针是相同的node，说明位置调换 新节点右移
        patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue, newCh, newEndIdx);
        // canMove  非<transition-group> 情况
        // 使用 insertBefore 新vnode插入到老节点尾指针一个节点的后面的兄弟元素之前
        canMove && nodeOps.insertBefore(parentElm, oldStartVnode.elm, nodeOps.nextSibling(oldEndVnode.elm));
        oldStartVnode = oldCh[++oldStartIdx];
        newEndVnode = newCh[--newEndIdx];
      } else if (sameVnode(oldEndVnode, newStartVnode)) { // Vnode moved left
        // 旧的旧指针和新的首指针是相同的node
        // 新节点左移
        patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue, newCh, newStartIdx);
        // 使用 insertBefore 新vnode插入到老节点首首指针节点的之前
        canMove && nodeOps.insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm);
        oldEndVnode = oldCh[--oldEndIdx];
        newStartVnode = newCh[++newStartIdx];
      } else {
          // oldKeyToIdx 生成 老子集的key map结构
        if (isUndef(oldKeyToIdx)) { oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx); }
        idxInOld = isDef(newStartVnode.key)
          ? oldKeyToIdx[newStartVnode.key]
          // 拿者新vnode，去遍历旧子集寻找是否有相同的samenode ，返回下标
          : findIdxInOld(newStartVnode, oldCh, oldStartIdx, oldEndIdx);
          // 找不到key ，创建 新元素 
        if (isUndef(idxInOld)) { // New element
          createElm(newStartVnode, insertedVnodeQueue, parentElm, oldStartVnode.elm, false, newCh, newStartIdx);
        } else {
          vnodeToMove = oldCh[idxInOld];
          // 找到相同的key，是sameVnode
          if (sameVnode(vnodeToMove, newStartVnode)) {
            patchVnode(vnodeToMove, newStartVnode, insertedVnodeQueue, newCh, newStartIdx);
            // 旧子集对应元素的置为空，相当于删除
            oldCh[idxInOld] = undefined;
            // 插入到旧元素之前
            canMove && nodeOps.insertBefore(parentElm, vnodeToMove.elm, oldStartVnode.elm);
          } else {
            // 相同的key不同的元素
            // same key but different element. treat as new element
            createElm(newStartVnode, insertedVnodeQueue, parentElm, oldStartVnode.elm, false, newCh, newStartIdx);
          }
        }
        newStartVnode = newCh[++newStartIdx];
      }
    }
    // 一个多，一个少的情况 eg：旧dom就一个，新的有三个， while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx)  执行一遍就不执行了
    //  新node 循环完了，但是老的还没，说明老的插入很多，需要删除重复的
    if (oldStartIdx > oldEndIdx) {
      refElm = isUndef(newCh[newEndIdx + 1]) ? null : newCh[newEndIdx + 1].elm;
      addVnodes(parentElm, refElm, newCh, newStartIdx, newEndIdx, insertedVnodeQueue);
    } else if (newStartIdx > newEndIdx) {
      removeVnodes(oldCh, oldStartIdx, oldEndIdx);
    }
  }

  function addVnodes (parentElm, refElm, vnodes, startIdx, endIdx, insertedVnodeQueue) {
    for (; startIdx <= endIdx; ++startIdx) {
      // 创建dom,如果组件就渲染组件，插入到 parentElm
      createElm(vnodes[startIdx], insertedVnodeQueue, parentElm, refElm, false, vnodes, startIdx);
    }
  }

  // 删除 则需要判断是否有transition 之类的
  function removeVnodes (vnodes, startIdx, endIdx) {
    for (; startIdx <= endIdx; ++startIdx) {
      var ch = vnodes[startIdx];
      if (isDef(ch)) {
        if (isDef(ch.tag)) {
          removeAndInvokeRemoveHook(ch);
          invokeDestroyHook(ch);
        } else { // Text node
          removeNode(ch.elm);
        }
      }
    }
  }

  // 生成旧孩子的key的map结构
  function createKeyToOldIdx (children, beginIdx, endIdx) {
    var i, key;
    var map = {};
    for (i = beginIdx; i <= endIdx; ++i) {
      key = children[i].key;
      if (isDef(key)) { map[key] = i; }
    }
    return map
  }