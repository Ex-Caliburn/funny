# WebComponent 生命周期详解：constructor vs connectedCallback

## 概述

在 WebComponent 开发中，除了 `constructor` 和 `connectedCallback`，还有多个重要的生命周期方法，它们在组件的不同阶段被调用，承担着不同的职责。完整的生命周期包括：元素创建、属性变化、元素连接/断开、元素升级等阶段。

## 生命周期概览

```
元素创建 → constructor()
    ↓
元素添加到DOM → connectedCallback()
    ↓
属性变化 → attributeChangedCallback() (可选)
    ↓
元素从DOM移除 → disconnectedCallback()
    ↓
元素迁移到新文档 → adoptedCallback() (可选)
```

## 所有生命周期方法列表

1. **constructor()** - 构造函数，元素创建时调用
2. **connectedCallback()** - 连接回调，元素添加到DOM时调用
3. **disconnectedCallback()** - 断开回调，元素从DOM移除时调用
4. **attributeChangedCallback()** - 属性变化回调，属性修改时调用
5. **adoptedCallback()** - 采用回调，元素迁移到新文档时调用

## 生命周期方法对比

### 1. constructor（构造函数）

**调用时机**：元素实例被创建时立即调用

**特点**：

- 只执行一次
- 此时元素还没有被添加到 DOM 中
- 无法访问父元素或子元素
- 适合做一次性的初始化工作

**典型用途**：

```javascript
constructor() {
    super()
    // 创建 Shadow DOM
    const shadowDOM = this.attachShadow({ mode: 'open' })
    
    // 初始化内部属性
    this.isConnected = false
    this.count = 0
    
    // 设置默认值
    this.setAttribute('data-status', 'initialized')
}
```

### 2. connectedCallback（连接回调）

**调用时机**：元素被添加到 DOM 中时调用

**特点**：

- 每次元素被添加到 DOM 都会执行
- 元素已经在 DOM 中，可以安全地访问父元素和子元素
- 适合做需要 DOM 环境的初始化工作

**典型用途**：

```javascript
connectedCallback() {
    // 获取 DOM 引用
    const shadowRoot = this.shadowRoot
    const buttons = shadowRoot.querySelectorAll('button')
    
    // 添加事件监听器
    buttons.forEach(btn => {
        btn.addEventListener('click', this.handleClick.bind(this))
    })
    
    // 访问父元素
    const parent = this.parentElement
    console.log('父元素:', parent)
    
    // 初始化第三方库
    this.initializeThirdPartyLibrary()
    
    // 发送分析数据
    this.trackAnalytics()
}

### 3. disconnectedCallback（断开回调）

**调用时机**：元素从 DOM 中移除时调用

**特点**：
- 每次元素从 DOM 中移除都会执行
- 适合做资源清理和事件解绑
- 防止内存泄漏

**典型用途**：
```javascript
disconnectedCallback() {
    // 清理事件监听器
    this.removeEventListeners()
    
    // 清理定时器
    if (this.timer) {
        clearInterval(this.timer)
        this.timer = null
    }
    
    // 清理观察器
    if (this.resizeObserver) {
        this.resizeObserver.disconnect()
    }
    
    // 释放第三方库资源
    this.cleanupThirdPartyLibrary()
}
```

### 4. attributeChangedCallback（属性变化回调）

**调用时机**：元素的属性被添加、移除或修改时调用

**特点**：

- 需要配合 `static get observedAttributes()` 使用
- 只监听指定的属性变化
- 适合做响应式更新

**典型用途**：

```javascript
// 声明要监听的属性
static get observedAttributes() {
    return ['disabled', 'size', 'theme']
}

attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
        case 'disabled':
            this.updateDisabledState(newValue)
            break
        case 'size':
            this.updateSize(newValue)
            break
        case 'theme':
            this.updateTheme(newValue)
            break
    }
}

updateDisabledState(value) {
    const isDisabled = value !== null
    this.shadowRoot.querySelector('button').disabled = isDisabled
    this.classList.toggle('disabled', isDisabled)
}
```

### 5. adoptedCallback（采用回调）

**调用时机**：元素被移动到新的文档时调用（如 iframe 之间移动）

**特点**：

- 使用场景相对较少
- 适合做跨文档的资源管理

**典型用途**：

```javascript
adoptedCallback(oldDocument, newDocument) {
    console.log('组件从', oldDocument.title, '移动到', newDocument.title)
    
    // 重新初始化在新文档中的状态
    this.initializeInNewDocument(newDocument)
    
    // 更新全局引用
    this.updateGlobalReferences(newDocument)
}
```

## 完整的生命周期示例

```javascript
class MyComponent extends HTMLElement {
    constructor() {
        super()
        
        // 1. 创建 Shadow DOM
        const shadow = this.attachShadow({ mode: 'open' })
        
        // 2. 初始化内部状态
        this.isConnected = false
        this.eventListeners = new Map()
        
        // 3. 设置默认属性
        this.setAttribute('data-component', 'my-component')
        
        // 4. 创建基础 DOM 结构
        shadow.innerHTML = `
            <div class="container">
                <slot></slot>
            </div>
        `
    }
    
    // 声明要监听的属性
    static get observedAttributes() {
        return ['disabled', 'size', 'theme', 'loading']
    }
    
    connectedCallback() {
        // 1. 标记为已连接
        this.isConnected = true
        
        // 2. 获取 DOM 引用
        this.container = this.shadowRoot.querySelector('.container')
        
        // 3. 添加事件监听器
        this.addEventListeners()
        
        // 4. 初始化组件
        this.initialize()
        
        // 5. 触发自定义事件
        this.dispatchEvent(new CustomEvent('component-ready'))
    }
    
    disconnectedCallback() {
        // 1. 标记为已断开
        this.isConnected = false
        
        // 2. 清理事件监听器
        this.removeEventListeners()
        
        // 3. 清理定时器
        if (this.timer) {
            clearInterval(this.timer)
        }
        
        // 4. 释放资源
        this.cleanup()
    }
    
    attributeChangedCallback(name, oldValue, newValue) {
        // 属性变化时的响应式更新
        if (oldValue === newValue) return
        
        switch (name) {
            case 'disabled':
                this.updateDisabledState(newValue)
                break
            case 'size':
                this.updateSize(newValue)
                break
            case 'theme':
                this.updateTheme(newValue)
                break
            case 'loading':
                this.updateLoadingState(newValue)
                break
        }
    }
    
    adoptedCallback(oldDocument, newDocument) {
        // 元素被移动到新文档时调用
        console.log('组件从', oldDocument.title, '移动到', newDocument.title)
        this.initializeInNewDocument(newDocument)
    }
    
    // 私有方法
    addEventListeners() {
        // 添加事件监听器的逻辑
    }
    
    removeEventListeners() {
        // 移除事件监听器的逻辑
    }
    
    initialize() {
        // 初始化组件的逻辑
    }
    
    cleanup() {
        // 清理资源的逻辑
    }
    
    updateDisabledState(value) {
        const isDisabled = value !== null
        this.shadowRoot.querySelector('button').disabled = isDisabled
        this.classList.toggle('disabled', isDisabled)
    }
    
    updateSize(value) {
        this.classList.remove('size-small', 'size-medium', 'size-large')
        if (value) this.classList.add(`size-${value}`)
    }
    
    updateTheme(value) {
        this.classList.remove('theme-light', 'theme-dark')
        if (value) this.classList.add(`theme-${value}`)
    }
    
    updateLoadingState(value) {
        const isLoading = value !== null
        this.classList.toggle('loading', isLoading)
    }
    
    initializeInNewDocument(document) {
        // 在新文档中重新初始化的逻辑
    }
}

customElements.define('my-component', MyComponent)
```

## 最佳实践建议

### constructor 中应该做的

- ✅ 创建 Shadow DOM
- ✅ 初始化内部属性
- ✅ 设置默认值
- ✅ 创建基础 DOM 结构
- ❌ 不要添加事件监听器
- ❌ 不要访问外部 DOM 元素

### connectedCallback 中应该做的

- ✅ 添加事件监听器
- ✅ 获取 DOM 引用
- ✅ 初始化需要 DOM 环境的第三方库
- ✅ 发送分析数据
- ✅ 设置观察器（如 ResizeObserver）
- ❌ 不要做耗时的同步操作

### disconnectedCallback 中应该做的

- ✅ 清理事件监听器
- ✅ 清理定时器
- ✅ 释放观察器
- ✅ 清理第三方库资源

### attributeChangedCallback 中应该做的

- ✅ 响应式更新组件状态
- ✅ 更新 DOM 元素的属性
- ✅ 触发相关的自定义事件
- ❌ 不要做耗时的 DOM 操作
- ❌ 不要无限递归地修改属性

### adoptedCallback 中应该做的

- ✅ 重新初始化在新文档中的状态
- ✅ 更新全局引用和事件绑定
- ✅ 清理旧文档中的资源
- ❌ 不要做复杂的 DOM 操作

## 实际应用场景

### 场景1：动态添加/移除组件

```javascript
// 添加组件
const component = document.createElement('my-component')
document.body.appendChild(component) // 触发 connectedCallback

// 移除组件
document.body.removeChild(component) // 触发 disconnectedCallback
```

### 场景2：条件渲染

```javascript
// 显示组件
component.style.display = 'block' // 不会触发 connectedCallback

// 真正添加到 DOM
parent.appendChild(component) // 触发 connectedCallback
```

## 注意事项

1. **多次连接**：如果元素被多次添加到 DOM 中，`connectedCallback` 会被多次调用
2. **性能考虑**：在 `connectedCallback` 中避免做耗时的操作
3. **错误处理**：在生命周期方法中添加适当的错误处理
4. **兼容性**：确保目标浏览器支持这些生命周期方法

## 总结

WebComponent 提供了完整的生命周期管理，每个方法都有其特定的职责：

- **constructor**：组件的"出生"阶段，负责基础初始化
- **connectedCallback**：组件的"激活"阶段，负责 DOM 相关的初始化
- **disconnectedCallback**：组件的"清理"阶段，负责资源释放
- **attributeChangedCallback**：组件的"响应"阶段，负责属性变化的响应式更新
- **adoptedCallback**：组件的"迁移"阶段，负责跨文档的资源管理

## 生命周期执行顺序

1. **元素创建**：`constructor()` 被调用
2. **元素连接**：`connectedCallback()` 被调用
3. **属性变化**：`attributeChangedCallback()` 被调用（如果属性发生变化）
4. **元素断开**：`disconnectedCallback()` 被调用（如果元素被移除）
5. **元素迁移**：`adoptedCallback()` 被调用（如果元素被移动到新文档）

合理使用这些生命周期方法，可以让 WebComponent 更加健壮、高效和易于维护。
