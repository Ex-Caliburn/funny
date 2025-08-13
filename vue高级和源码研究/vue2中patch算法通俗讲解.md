# Vue2 中 patch 算法通俗讲解

## 什么是 patch 算法？

想象一下，你有一个网页，当数据变化时，页面需要更新。但是直接重新渲染整个页面会很慢，就像重新画一幅画一样费时间。

**patch 算法就像是"智能补丁"**：

- 它比较新旧两个版本的页面（虚拟 DOM）
- 找出哪些地方变了，哪些地方没变
- 只更新变化的部分，就像给衣服打补丁一样

## 生活中的比喻

### 1. **拼图游戏**

想象你在玩拼图：

- **旧版本**：已经拼好的拼图
- **新版本**：需要拼成的最终图案
- **patch 算法**：找出哪些拼图块需要移动、哪些需要替换、哪些保持不变

### 2. **装修房子**

- **旧版本**：装修前的房子
- **新版本**：装修后的房子
- **patch 算法**：只装修需要改变的房间，不需要重新装修整个房子

## patch 算法的核心步骤

### 第一步：比较节点类型

```javascript
// 伪代码示例
function patch(oldVNode, newVNode) {
  // 1. 检查节点类型是否相同
  if (oldVNode.type !== newVNode.type) {
    // 类型不同，直接替换整个节点
    replaceNode(oldVNode, newVNode)
    return
  }
  
  // 2. 类型相同，继续比较
  patchNode(oldVNode, newVNode)
}
```

**通俗理解**：

- 如果一个是 `<div>`，一个是 `<span>`，那就完全不同，直接换掉
- 如果都是 `<div>`，那就可以继续比较内容

### 第二步：比较文本内容

```javascript
function patchNode(oldVNode, newVNode) {
  // 如果是文本节点
  if (oldVNode.text !== newVNode.text) {
    // 只更新文本内容，不重新创建节点
    oldVNode.el.textContent = newVNode.text
  }
}
```

**通俗理解**：

- 如果只是文字变了（比如从"你好"变成"你好世界"）
- 那就只改文字，不用重新创建整个元素

### 第三步：比较属性

```javascript
function patchProps(oldVNode, newVNode) {
  const oldProps = oldVNode.props || {}
  const newProps = newVNode.props || {}
  
  // 1. 更新新增或修改的属性
  for (const key in newProps) {
    if (oldProps[key] !== newProps[key]) {
      setAttr(oldVNode.el, key, newProps[key])
    }
  }
  
  // 2. 删除不再需要的属性
  for (const key in oldProps) {
    if (!(key in newProps)) {
      removeAttr(oldVNode.el, key)
    }
  }
}
```

**通俗理解**：

- 就像给衣服换扣子：新扣子换上，旧扣子拆掉
- 只改变需要改变的部分，其他保持不变

### 第四步：比较子节点（最复杂的部分）

```javascript
function patchChildren(oldVNode, newVNode) {
  const oldChildren = oldVNode.children || []
  const newChildren = newVNode.children || []
  
  // 1. 如果新节点没有子节点，清空旧节点
  if (newChildren.length === 0) {
    oldVNode.el.innerHTML = ''
    return
  }
  
  // 2. 如果旧节点没有子节点，添加新节点
  if (oldChildren.length === 0) {
    newChildren.forEach(child => {
      oldVNode.el.appendChild(createElement(child))
    })
    return
  }
  
  // 3. 都有子节点，需要比较
  updateChildren(oldVNode.el, oldChildren, newChildren)
}
```

**通俗理解**：

- 就像比较两排小朋友：谁的位置变了，谁是新来的，谁走了
- 尽量少移动，能不动就不动

## 子节点比较的详细过程

### 1. **双端比较算法**

```javascript
function updateChildren(parentEl, oldChildren, newChildren) {
  let oldStartIdx = 0
  let oldEndIdx = oldChildren.length - 1
  let newStartIdx = 0
  let newEndIdx = newChildren.length - 1
  
  let oldStartVNode = oldChildren[oldStartIdx]
  let oldEndVNode = oldChildren[oldEndIdx]
  let newStartVNode = newChildren[newStartIdx]
  let newEndVNode = newChildren[newEndIdx]
  
  while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
    // 1. 比较开头和开头
    if (sameVNode(oldStartVNode, newStartVNode)) {
      patchVNode(oldStartVNode, newStartVNode)
      oldStartVNode = oldChildren[++oldStartIdx]
      newStartVNode = newChildren[++newStartIdx]
    }
    // 2. 比较结尾和结尾
    else if (sameVNode(oldEndVNode, newEndVNode)) {
      patchVNode(oldEndVNode, newEndVNode)
      oldEndVNode = oldChildren[--oldEndIdx]
      newEndVNode = newChildren[--newEndIdx]
    }
    // 3. 比较开头和结尾
    else if (sameVNode(oldStartVNode, newEndVNode)) {
      patchVNode(oldStartVNode, newEndVNode)
      // 移动节点到末尾
      parentEl.insertBefore(oldStartVNode.el, oldEndVNode.el.nextSibling)
      oldStartVNode = oldChildren[++oldStartIdx]
      newEndVNode = newChildren[--newEndIdx]
    }
    // 4. 比较结尾和开头
    else if (sameVNode(oldEndVNode, newStartVNode)) {
      patchVNode(oldEndVNode, newStartVNode)
      // 移动节点到开头
      parentEl.insertBefore(oldEndVNode.el, oldStartVNode.el)
      oldEndVNode = oldChildren[--oldEndIdx]
      newStartVNode = newChildren[++newStartIdx]
    }
    // 5. 都不匹配，需要创建新节点
    else {
      // 创建新节点并插入
      const newEl = createElement(newStartVNode)
      parentEl.insertBefore(newEl, oldStartVNode.el)
      newStartVNode = newChildren[++newStartIdx]
    }
  }
}
```

**通俗理解**：
就像重新排列一排小朋友：

1. **开头对开头**：如果第一个小朋友没变，就跳过
2. **结尾对结尾**：如果最后一个小朋友没变，就跳过
3. **开头对结尾**：如果第一个小朋友应该到最后，就移动
4. **结尾对开头**：如果最后一个小朋友应该到最前，就移动
5. **都不匹配**：说明是新来的小朋友，直接插入

## 实际例子演示

### 例子1：简单的文本更新

```html
<!-- 旧版本 -->
<div>你好</div>

<!-- 新版本 -->
<div>你好世界</div>
```

**patch 过程**：

1. 比较节点类型：都是 `<div>`，继续
2. 比较子节点：发现文本从"你好"变成"你好世界"
3. 只更新文本内容，不重新创建 `<div>` 元素

### 例子2：列表项顺序变化

```html
<!-- 旧版本 -->
<ul>
  <li key="A">苹果</li>
  <li key="B">香蕉</li>
  <li key="C">橙子</li>
</ul>

<!-- 新版本 -->
<ul>
  <li key="C">橙子</li>
  <li key="A">苹果</li>
  <li key="B">香蕉</li>
</ul>
```

**patch 过程**：

1. 通过 `key` 识别每个 `<li>` 的身份
2. 发现顺序变了：C 从最后移到最前
3. 只移动 DOM 节点，不重新创建内容

### 例子3：属性变化

```html
<!-- 旧版本 -->
<button class="btn" disabled>提交</button>

<!-- 新版本 -->
<button class="btn btn-primary">提交</button>
```

**patch 过程**：

1. 节点类型相同，继续比较
2. 发现 `class` 从 `"btn"` 变成 `"btn btn-primary"`
3. 发现 `disabled` 属性被删除了
4. 只更新这些属性，不重新创建按钮

## patch 算法的优势

### 1. **性能提升**

- 避免重新创建整个页面
- 只更新变化的部分
- 减少 DOM 操作次数

### 2. **用户体验**

- 页面更新更快
- 保持用户输入状态
- 减少闪烁和跳动

### 3. **资源节约**

- 减少 CPU 使用
- 减少内存分配
- 减少网络请求

## 与普通树形遍历／通用树编辑距离的对比

- 核心优势（为什么更快）
  - 通过“双端指针＋key 快表”在同层比较子节点，把通用树编辑距离从理论的 O(n^3) 简化为接近 O(n) 的线性扫描。
  - 优先“复用＋移动”已有 DOM，尽量避免“删除重建”，显著降低实际 DOM 操作次数。

- 快在哪里（典型场景）
  - 头插／尾插：只需 1 次插入（按索引对齐的朴素遍历可能导致整列位移，≈O(n) 次操作）。
  - 单元素移位（末项移到首位）：1 次移动（朴素方式常退化为多次替换／重建）。
  - 反转：接近 O(n) 次移动且不重建节点（朴素方式可能产生更多无谓替换）。
  - 静态子树跳过：编译期标记的静态节点直接略过，无需下钻比较。

- 复杂度与操作数（量化）
  - 时间复杂度：通用树 diff O(n^3) → 子节点线性 diff 约 O(n)（含 key→index 映射时为 O(n) 额外空间）。
  - DOM 操作：从“按索引逐个对齐”的 O(n) 级变更，降到“接近真实变更数”的少量插入／移动。

- 能快多少（经验值）
  - 与数据规模与变更模式强相关，难以给出固定倍数。
  - 在大列表（如 1000 项）进行头插／单项移位时：朴素遍历可能触发近 1000 次补丁；双端 diff 仅 1 次插入／移动，DOM 触达次数可下降两个数量级以上。

## 常见的优化策略

### 1. **key 的重要性**

```html
<!-- 没有 key，Vue 无法识别节点身份 -->
<li>苹果</li>
<li>香蕉</li>

<!-- 有 key，Vue 可以精确追踪节点 -->
<li key="apple">苹果</li>
<li key="banana">香蕉</li>
```

**通俗理解**：

- `key` 就像是每个节点的身份证
- 没有身份证，Vue 就分不清谁是谁
- 有身份证，Vue 就能精确地知道哪个节点变了

### 2. **避免不必要的嵌套**

```html
<!-- 不好的写法：嵌套过深 -->
<div>
  <div>
    <div>
      <span>内容</span>
    </div>
  </div>
</div>

<!-- 好的写法：扁平化结构 -->
<div>
  <span>内容</span>
</div>
```

**通俗理解**：

- 就像文件夹嵌套：嵌套越深，找文件越慢
- 结构越扁平，patch 算法越高效

### 3. **合理使用 v-show 和 v-if**

```html
<!-- 频繁切换用 v-show -->
<div v-show="isVisible">内容</div>

<!-- 条件渲染用 v-if -->
<div v-if="shouldRender">内容</div>
```

**通俗理解**：

- `v-show` 就像开关灯：灯还在，只是亮不亮
- `v-if` 就像拆装灯泡：灯泡可能不在，需要重新装

## 总结

Vue2 的 patch 算法就像是一个"智能补丁系统"：

1. **比较节点类型**：类型不同直接替换
2. **比较文本内容**：文字变了只改文字
3. **比较属性**：属性变了只改属性
4. **比较子节点**：用双端比较算法找出最优的更新方案

**核心思想**：能不动就不动，能少动就少动，必须动才动。

这样既保证了页面的正确性，又大大提升了性能，让用户感受到流畅的交互体验。

## 实际应用建议

1. **合理使用 key**：为列表项添加唯一的 key
2. **避免过度嵌套**：保持 DOM 结构扁平
3. **合理使用指令**：v-show 和 v-if 各司其职
4. **避免频繁创建对象**：减少不必要的响应式数据创建

通过这些优化，可以让 patch 算法发挥最大的性能优势。
