# 微前端

## 什么是微前端

微前端（Micro Frontends）是一种架构风格，它将大型的前端应用程序分解为一组更小的、更易于管理的独立应用程序或服务

### 为什么要接入微前端

PDM 系统调用标签自动化系统的画板编辑功能 ， 因为标签自动化系统依赖 excalidraw 库，必须使用 React 搭建，而 PDM 是 VUE 项目，两个项目无法融合，而微前端可以实现多个应用可以像搭积木一样组合在一起

### 微前端方案选择

1. iframe
2. 将代码通过 script 或者 fetch 方式获取 html，插入 dom

### iframe

优点: 简单，历史最悠久的接入方式
缺点

1. url 不同步。浏览器刷新 iframe url 状态丢失、后退前进按钮无法使用。
2. UI 不同步，DOM 结构不共享。想象一下屏幕右下角 1/4 的 iframe 里来一个带遮罩层的弹框，同时我们要求这个弹框要浏览器居中显示，还要浏览器 resize 时自动居中..
3. 全局上下文完全隔离，内存变量不共享。iframe 内外系统的通信、数据同步等需求，主应用的 cookie 要透传到根域名都不同的子应用中实现免登效果。
4. 慢。每次子应用进入都是一次浏览器上下文重建、资源重新加载的过程。

#### 不同域名 iframe 通信方案

由于浏览器的同源策略限制，不同域名的 iframe 无法直接访问对方的 window 对象。以下是几种通信方案：

##### 1. postMessage 通信

**主应用（父页面）**：

```js
// 发送消息给 iframe
const iframe = document.getElementById('myIframe')
iframe.contentWindow.postMessage({
  type: 'USER_LOGIN',
  data: { userId: '123', userName: 'admin' }
}, 'https://child-domain.com')

// 监听 iframe 发来的消息
window.addEventListener('message', (event) => {
  // 验证来源域名
  if (event.origin !== 'https://child-domain.com') return
  
  const { type, data } = event.data
  switch (type) {
    case 'FORM_SUBMIT':
      console.log('收到表单提交', data)
      break
    case 'USER_LOGOUT':
      console.log('用户登出', data)
      break
  }
})
```

**子应用（iframe 内）**：

```js
// 发送消息给父页面
window.parent.postMessage({
  type: 'FORM_SUBMIT',
  data: { formData: { name: 'test', age: 25 } }
}, 'https://parent-domain.com')

// 监听父页面发来的消息
window.addEventListener('message', (event) => {
  // 验证来源域名
  if (event.origin !== 'https://parent-domain.com') return
  
  const { type, data } = event.data
  switch (type) {
    case 'USER_LOGIN':
      console.log('用户登录信息', data)
      // 处理登录逻辑
      break
    case 'UPDATE_THEME':
      console.log('更新主题', data)
      // 更新界面主题
      break
  }
})
```

##### 2. 基于 URL 的通信

**通过 URL 参数传递数据**：

```js
// 主应用更新 iframe URL
const iframe = document.getElementById('myIframe')
const baseUrl = 'https://child-domain.com/app'
const params = new URLSearchParams({
  userId: '123',
  theme: 'dark',
  token: 'abc123'
})
iframe.src = `${baseUrl}?${params.toString()}`

// 子应用解析 URL 参数
const urlParams = new URLSearchParams(window.location.search)
const userId = urlParams.get('userId')
const theme = urlParams.get('theme')
const token = urlParams.get('token')
```

##### 3. 基于 localStorage 的通信

**重要说明**：`localStorage.setItem()` 不会触发 `storage` 事件，这是浏览器的设计机制。`storage` 事件只在**其他窗口/标签页**修改 localStorage 时才会触发。

**主应用**：

```js
// 设置共享数据
localStorage.setItem('shared_user_info', JSON.stringify({
  userId: '123',
  userName: 'admin',
  permissions: ['read', 'write']
}))

// 监听数据变化（只在其他窗口修改时触发）
window.addEventListener('storage', (event) => {
  if (event.key === 'shared_user_info') {
    const userInfo = JSON.parse(event.newValue)
    console.log('用户信息更新', userInfo)
  }
})
```

**子应用**：

```js
// 读取共享数据
const userInfo = JSON.parse(localStorage.getItem('shared_user_info') || '{}')

// 更新共享数据
localStorage.setItem('shared_user_info', JSON.stringify({
  ...userInfo,
  lastLoginTime: new Date().toISOString()
}))
```

**解决方案：结合 postMessage 和 localStorage**

```js
// 主应用：设置数据并通知 iframe
function updateSharedData(data) {
  localStorage.setItem('shared_user_info', JSON.stringify(data))
  
  // 手动通知 iframe
  const iframe = document.getElementById('myIframe')
  iframe.contentWindow.postMessage({
    type: 'LOCALSTORAGE_UPDATE',
    data: { key: 'shared_user_info', value: data }
  }, 'https://child-domain.com')
}

// 子应用：监听 postMessage 通知
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://parent-domain.com') return
  
  const { type, data } = event.data
  if (type === 'LOCALSTORAGE_UPDATE') {
    // 处理 localStorage 更新
    console.log('收到 localStorage 更新', data)
    handleLocalStorageUpdate(data.key, data.value)
  }
})

// 子应用：更新数据并通知父页面
function updateSharedData(data) {
  localStorage.setItem('shared_user_info', JSON.stringify(data))
  
  // 通知父页面
  window.parent.postMessage({
    type: 'LOCALSTORAGE_UPDATE',
    data: { key: 'shared_user_info', value: data }
  }, 'https://parent-domain.com')
}
```

**更完整的解决方案：封装 localStorage 通信类**

```js
class LocalStorageCommunicator {
  constructor(targetOrigin, iframeId) {
    this.targetOrigin = targetOrigin
    this.iframe = document.getElementById(iframeId)
    this.updateHandlers = new Map()
    
    // 监听 storage 事件（其他窗口修改）
    window.addEventListener('storage', this.handleStorageEvent.bind(this))
    
    // 监听 postMessage（当前窗口修改）
    window.addEventListener('message', this.handlePostMessage.bind(this))
  }
  
  // 设置数据并通知
  setItem(key, value) {
    localStorage.setItem(key, JSON.stringify(value))
    
    // 通知 iframe
    this.iframe.contentWindow.postMessage({
      type: 'LOCALSTORAGE_UPDATE',
      data: { key, value }
    }, this.targetOrigin)
  }
  
  // 获取数据
  getItem(key) {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : null
  }
  
  // 注册更新处理器
  onUpdate(key, handler) {
    this.updateHandlers.set(key, handler)
  }
  
  // 处理 storage 事件
  handleStorageEvent(event) {
    if (event.key && this.updateHandlers.has(event.key)) {
      const value = JSON.parse(event.newValue)
      this.updateHandlers.get(event.key)(value, event)
    }
  }
  
  // 处理 postMessage
  handlePostMessage(event) {
    if (event.origin !== this.targetOrigin) return
    
    const { type, data } = event.data
    if (type === 'LOCALSTORAGE_UPDATE') {
      const { key, value } = data
      if (this.updateHandlers.has(key)) {
        this.updateHandlers.get(key)(value, event)
      }
    }
  }
}

// 使用示例
const communicator = new LocalStorageCommunicator('https://child-domain.com', 'myIframe')

communicator.onUpdate('shared_user_info', (value) => {
  console.log('用户信息更新', value)
})

communicator.setItem('shared_user_info', {
  userId: '123',
  userName: 'admin'
})
```

##### 4. 基于 BroadcastChannel 的通信

**主应用**：

```js
// 创建广播通道
const channel = new BroadcastChannel('iframe-communication')

// 发送消息
channel.postMessage({
  type: 'USER_UPDATE',
  data: { userId: '123', action: 'login' }
})

// 监听消息
channel.onmessage = (event) => {
  const { type, data } = event.data
  if (type === 'FORM_DATA') {
    console.log('收到表单数据', data)
  }
}
```

**子应用**：

```js
// 创建广播通道
const channel = new BroadcastChannel('iframe-communication')

// 发送消息
channel.postMessage({
  type: 'FORM_DATA',
  data: { formId: 'user-form', fields: { name: 'test' } }
})

// 监听消息
channel.onmessage = (event) => {
  const { type, data } = event.data
  if (type === 'USER_UPDATE') {
    console.log('用户信息更新', data)
  }
}
```

##### BroadcastChannel vs postMessage 对比

| 特性 | BroadcastChannel | postMessage |
|------|------------------|-------------|
| **通信范围** | 同源的所有窗口/标签页/iframe | 父子窗口、iframe 之间 |
| **目标指定** | 广播给所有监听者 | 需要明确指定目标窗口 |
| **安全性** | 同源限制，自动安全 | 需要手动验证 origin |
| **使用复杂度** | 简单，无需指定目标 | 复杂，需要获取目标窗口引用 |
| **浏览器支持** | 现代浏览器（IE 不支持） | 所有浏览器 |
| **性能** | 高效，专门为广播设计 | 需要遍历目标窗口 |
| **调试** | 容易调试，消息流向清晰 | 调试复杂，需要跟踪目标 |

**详细对比**：

###### 1. 通信范围差异

```js
// BroadcastChannel：广播给所有同源窗口
const channel = new BroadcastChannel('app-events')
channel.postMessage({ type: 'USER_LOGIN' })
// 所有同源的窗口、标签页、iframe 都会收到

// postMessage：需要明确指定目标
const iframe = document.getElementById('myIframe')
iframe.contentWindow.postMessage({ type: 'USER_LOGIN' }, 'https://child.com')
// 只有指定的 iframe 会收到
```

###### 2. 安全性差异

```js
// BroadcastChannel：自动同源限制
const channel = new BroadcastChannel('app-events')
// 只有同源的窗口才能接收消息，无需额外验证

// postMessage：需要手动验证
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://trusted-domain.com') {
    console.warn('未授权的消息来源')
    return
  }
  // 处理消息
})
```

###### 3. 使用场景对比

**BroadcastChannel 适用场景**：

```js
// 1. 多标签页同步
const channel = new BroadcastChannel('user-session')
channel.postMessage({ type: 'LOGOUT' })
// 所有标签页都会收到登出通知

// 2. 全局状态同步
channel.postMessage({ 
  type: 'THEME_CHANGE', 
  data: { theme: 'dark' } 
})
// 所有窗口同步主题

// 3. 应用间通信
channel.postMessage({ 
  type: 'DATA_UPDATE', 
  data: { userId: '123' } 
})
// 所有相关应用收到数据更新
```

**postMessage 适用场景**：

```js
// 1. 父子窗口通信
const childWindow = window.open('https://child.com')
childWindow.postMessage({ type: 'INIT_DATA' }, 'https://child.com')

// 2. iframe 通信
const iframe = document.getElementById('myIframe')
iframe.contentWindow.postMessage({ type: 'FORM_SUBMIT' }, 'https://child.com')

// 3. 跨域通信
window.parent.postMessage({ type: 'RESULT' }, 'https://parent.com')
```

###### 4. 性能对比

```js
// BroadcastChannel：高效广播
const channel = new BroadcastChannel('events')
// 一次发送，所有监听者同时收到

// postMessage：需要遍历目标
const windows = [window1, window2, window3, iframe1, iframe2]
windows.forEach(win => {
  win.postMessage(data, origin)
})
// 需要逐个发送给每个目标
```

###### 5. 错误处理对比

```js
// BroadcastChannel：自动处理
const channel = new BroadcastChannel('events')
channel.onmessage = (event) => {
  try {
    const { type, data } = event.data
    // 处理消息
  } catch (error) {
    console.error('消息处理错误', error)
  }
}

// postMessage：需要手动处理
window.addEventListener('message', (event) => {
  try {
    // 验证来源
    if (event.origin !== 'https://trusted.com') return
    
    const { type, data } = event.data
    // 处理消息
  } catch (error) {
    console.error('消息处理错误', error)
  }
})
```

###### 6. 选择建议

**使用 BroadcastChannel 当**：

- 需要在多个窗口/标签页间广播消息
- 同源环境下的全局状态同步
- 简单的应用间通信
- 现代浏览器环境

**使用 postMessage 当**：

- 需要与特定窗口/iframe 通信
- 跨域通信需求
- 需要精确控制消息目标
- 需要兼容旧版浏览器

##### 5. 通信工具类封装

```js
class IframeCommunicator {
  constructor(targetOrigin, iframeId) {
    this.targetOrigin = targetOrigin
    this.iframe = document.getElementById(iframeId)
    this.messageHandlers = new Map()
    
    // 监听消息
    window.addEventListener('message', this.handleMessage.bind(this))
  }
  
  // 发送消息
  send(type, data) {
    this.iframe.contentWindow.postMessage({
      type,
      data,
      timestamp: Date.now()
    }, this.targetOrigin)
  }
  
  // 注册消息处理器
  on(type, handler) {
    this.messageHandlers.set(type, handler)
  }
  
  // 处理接收到的消息
  handleMessage(event) {
    if (event.origin !== this.targetOrigin) return
    
    const { type, data } = event.data
    const handler = this.messageHandlers.get(type)
    
    if (handler) {
      handler(data, event)
    }
  }
}

// 使用示例
const communicator = new IframeCommunicator('https://child-domain.com', 'myIframe')

communicator.on('FORM_SUBMIT', (data) => {
  console.log('表单提交', data)
})

communicator.send('USER_LOGIN', { userId: '123' })
```

##### 6. 安全注意事项

```js
// 1. 始终验证消息来源
window.addEventListener('message', (event) => {
  const allowedOrigins = ['https://trusted-domain.com']
  if (!allowedOrigins.includes(event.origin)) {
    console.warn('收到来自未授权域名的消息', event.origin)
    return
  }
  // 处理消息
})

// 2. 验证消息格式
function validateMessage(data) {
  return data && typeof data.type === 'string' && data.data !== undefined
}

// 3. 设置消息超时
function sendMessageWithTimeout(type, data, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('消息发送超时'))
    }, timeout)
    
    // 发送消息并等待响应
    // ...
  })
}
```

### qiankun 阿里框架

1. 可组合性：PDM 系统调用标签自动化系统的画板编辑功能 ， 因为标签自动化系统依赖 excalidraw 库，必须使用 React 搭建，而 PDM 是 VUE 项目，两个项目无法融合，而微前端可以实现多个应用可以像搭积木一样组合在一起
2. 独立性：每个微前端应用都是独立的，拥有自己的代码库、构建过程、依赖管理和部署流程
3. 动态加载：微前端应用可以按需加载，这意味着只有在需要时才会加载特定的应用，从而提高性能和用户体验。
4. 团队自治：每个微前端应用由一个独立的团队负责，团队可以自主选择技术栈和开发流程

缺点

1. 需要一点配置学习成本

## qiankun 底层原理

### 核心架构

qiankun 基于 **Single-SPA** 框架构建，采用了 **JS 沙箱** + **样式隔离** + **预加载** 的技术方案。

### 主要技术原理

#### 1. 应用注册与路由匹配

```js
// 应用注册机制
registerMicroApps([
  {
    name: 'reactApp',
    entry: '//localhost:3000',
    container: '#container',
    activeRule: '/app-react',
  }
])
```

**原理**：

- 通过 `activeRule` 配置路由匹配规则
- 监听浏览器路由变化（popstate、pushstate、replacestate）
- 当路由匹配时，触发对应应用的加载和渲染

#### 2. 应用加载机制

**HTML Entry 方案**：

```js
// 获取子应用的 HTML 内容
const html = await fetch(entry).then(res => res.text())
// 解析 HTML，提取 JS、CSS 资源
const { scripts, styles } = parseHTML(html)
```

**原理**：

- 通过 `fetch` 获取子应用的 HTML 文件
- 解析 HTML，提取 `<script>` 和 `<link>` 标签
- 动态创建 `<script>` 标签加载 JS 资源
- 动态创建 `<link>` 标签加载 CSS 资源

#### 3. JS 沙箱隔离

**Proxy 沙箱**：

```js
class ProxySandbox {
  constructor() {
    const rawWindow = window
    const fakeWindow = Object.create(null)
    
    const proxy = new Proxy(fakeWindow, {
      get(target, key) {
        // 优先从 fakeWindow 获取，否则从真实 window 获取
        return target[key] || rawWindow[key]
      },
      set(target, key, value) {
        target[key] = value
        return true
      }
    })
    
    this.proxy = proxy
  }
}
```

**原理**：

- 使用 `Proxy` 代理 `window` 对象
- 子应用的全局变量存储在代理对象中
- 避免子应用污染主应用的全局环境
- 支持多实例沙箱（每个子应用独立沙箱）

#### 4. 样式隔离

**动态样式表**：

```js
// 动态添加样式
const styleElement = document.createElement('style')
styleElement.textContent = cssContent
document.head.appendChild(styleElement)

// 应用卸载时移除样式
const removeStyle = () => {
  document.head.removeChild(styleElement)
}
```

**原理**：

- 子应用的 CSS 通过动态 `<style>` 标签注入
- 应用卸载时自动移除对应的样式
- 支持 CSS 前缀隔离（通过 postcss 插件）

#### 5. 生命周期管理

**应用生命周期**：

```js
// 子应用需要导出的生命周期
export async function bootstrap() {
  // 应用初始化
}

export async function mount(props) {
  // 应用挂载
}

export async function unmount() {
  // 应用卸载
}
```

**原理**：

- 主应用通过 `import()` 动态加载子应用
- 调用子应用导出的生命周期函数
- 确保应用的正确加载、挂载和卸载

#### 6. 通信机制

**全局状态管理**：

```js
// 主应用设置全局状态
setGlobalState({ user: 'admin' })

// 子应用监听状态变化
onGlobalStateChange((state, prev) => {
  console.log('状态变化', state, prev)
})
```

**原理**：

- 基于发布订阅模式
- 主应用维护全局状态
- 子应用可以订阅和修改全局状态

#### 7. 预加载机制

```js
// 预加载配置
prefetchApps([
  { name: 'reactApp', entry: '//localhost:3000' }
])
```

**原理**：

- 在空闲时间预加载子应用资源
- 提升用户访问子应用时的加载速度
- 支持多种预加载策略（all、async、manual）

### 关键技术点

#### 1. 路由劫持

- 劫持 `history.pushState`、`history.replaceState`、`popstate` 事件
- 实现主应用和子应用的路由同步

#### 2. 资源加载

- 支持多种资源加载方式（fetch、script 标签）
- 处理资源加载失败和重试机制

#### 3. 错误边界

- 子应用加载失败时的降级处理
- 提供错误恢复机制

#### 4. 性能优化

- 应用缓存机制
- 资源预加载
- 按需加载策略

### 安装

#### 主应用

安装
`yarn add qiankun # 或者 npm i qiankun -S`

#### 路由接入

```js
import { registerMicroApps, start } from 'qiankun'

registerMicroApps([
  {
    name: 'reactApp',
    entry: '//localhost:3000',
    container: '#container',
    activeRule: '/app-react',
  },
  {
    name: 'vueApp',
    entry: '//localhost:8080',
    container: '#container',
    activeRule: '/app-vue',
  },
  {
    name: 'angularApp',
    entry: '//localhost:4200',
    container: '#container',
    activeRule: '/app-angular',
  },
])
// 启动 qiankun
start()
```

#### 手动触发

```js
loadMicroApp({
  name: 'react',
  entry: '//localhost:8000', // 区分环境配置
  container: '#react',
})
```

1. 子应用路由需要和主应用保持一致
2. 主应用 hash 路由， 子应用也适用 hash 路由

#### umi 子应用

安装
`yarn add @umijs/plugin-qiankun -D`

修改 `.umirc.ts`文件

```js
export default defineConfig({
  // hash 路由需要开启
  // history: {
  //   type: 'hash',
  // },
  qiankun: {
    slave: {},
  },
})
```

修改 `app.ts`文件，导出相应的生命周期钩子

```js
export const qiankun = {
  // 应用加载之前
  async bootstrap(props) {
    console.log('react bootstrap', props)
  },
  // 应用 render 之前触发
  async mount(props) {
    console.log('react mount', props)
    props.onGlobalStateChange((state, prev) => {
      // state: 变更后的状态; prev 变更前的状态
      console.log(state, prev)
    })

    props.setGlobalState({ key: 'react 222' })
  },
  // 应用卸载之后触发
  async unmount(props) {
    console.log('react unmount', props)
  },
  /**
   * 可选生命周期钩子，仅使用 loadMicroApp 方式加载微应用时生效
   */
  async update(props) {
    console.log('react update', props)
  },
}
```

### 服务器设置

### 参考文献

1. <https://qiankun.umijs.org/zh/guide/tutorial#%E4%B8%BB%E5%BA%94%E7%94%A8>
2. <https://v3.umijs.org/plugins/plugin-qiankun>
