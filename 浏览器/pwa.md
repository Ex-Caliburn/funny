# PWA

## 前言

浏览器的三大进化路线：

1. 第一个是应用程序 Web 化；
2. 第二个是 Web 应用移动化；
3. 第三个是 Web 操作系统化；

### 定义

PWA 的定义就是：它是一套理念，渐进式增强 Web 的优势，并通过技术手段渐进式缩短和本地应用或者小程序的距离。基于这套理念之下的技术都可以归类到 PWA。

### Web 应用 VS 本地应用

那相对于本地应用， Web 页面到底缺少了什么？

1. 首先，Web 应用缺少离线使用能力，在离线或者在弱网环境下基本上是无法使用的。而用户需要的是沉浸式的体验，在离线或者弱网环境下能够流畅地使用是用户对一个应用的基本要求。
2. 其次，Web 应用还缺少了消息推送的能力，因为作为一个 App 厂商，需要有将消息送达到应用的能力。
3. 最后，Web 应用缺少一级入口，也就是将 Web 应用安装到桌面，在需要的时候直接从桌面打开 Web 应用，而不是每次都需要通过浏览器来打开。

针对以上 Web 缺陷，PWA 提出了两种解决方案：通过引入 Service Worker 来试着解决离线存储和消息推送的问题，通过引入 manifest.json 来解决一级入口的问题。下面我们就来详细分析下 Service Worker 是如何工作的。

### 什么是 Service Worker

![alt](https://static001.geekbang.org/resource/image/23/12/23b97b087c346cdd378b26b2d158e812.png)

在没有安装 Service Worker 之前，WebApp 都是直接通过网络模块来请求资源的。安装了 Service Worker 模块之后，WebApp 请求资源时，会先通过 Service Worker，让它判断是返回 Service Worker 缓存的资源还是重新去网络请求资源。一切的控制权都交由 Service Worker 来处理。

### service worker

service worker是实现PWA的核心，service worker是一个独立的浏览器线程，不会对当前程序的执行线程造成阻塞，通过service worker可以实现页面离线访问、用户消息推送等功能

### Service Worker 的设计思路

现在我们知道 Service Worker 的主要功能就是拦截请求和缓存资源，接下来我们就从 Web 应用的需求角度来看看 Service Worker 的设计思路。

#### 架构

架构通过前面页面循环系统的分析，我们已经知道了 JavaScript 和页面渲染流水线的任务都是在页面主线程上执行的，如果一段 JavaScript 执行时间过久，那么就会阻塞主线程，使得渲染一帧的时间变长，从而让用户产生卡顿的感觉，这对用户来说体验是非常不好的。

为了避免 JavaScript 过多占用页面主线程时长的情况，浏览器实现了 Web Worker 的功能。Web Worker 的目的是让 JavaScript 能够运行在页面主线程之外，不过由于 Web Worker 中是没有当前页面的 DOM 环境的，所以在 Web Worker 中只能执行一些和 DOM 无关的 JavaScript 脚本，并通过 postMessage 方法将执行的结果返回给主线程。所以说在 Chrome 中， Web Worker 其实就是在渲染进程中开启的一个新线程，它的`生命周期是和页面关联`的。

`“让其运行在主线程之外”`就是 Service Worker 来自 Web Worker 的一个核心思想。不过 Web Worker 是临时的，每次 JavaScript 脚本执行完成之后都会退出，执行结果也不能保存下来，如果下次还有同样的操作，就还得重新来一遍。所以 Service Worker 需要在 Web Worker 的基础之上加上储存功能。

另外，由于 Service Worker 还需要会为多个页面提供服务，所以还`不能把 Service Worker 和单个页面绑定起来`。在目前的 Chrome 架构中，`Service Worker 是运行在浏览器进程中`的，因为浏览器进程生命周期是最长的，所以在浏览器的生命周期内，能够为所有的页面提供服务。

#### 消息推送

消息推送也是基于 Service Worker 来实现的。因为消息推送时，浏览器页面也许并没有启动，这时就需要 Service Worker 来接收服务器推送的消息，并将消息通过一定方式展示给用户。关于消息推送的细节这里我们就不详述了，如果你感兴趣的话可以自行搜索相关资料去学习。

#### 安全

基于 Web 应用的业务越来越多了，其安全问题是不可忽视的，所以在设计 Service Worker 之初，安全问题就被提上了日程。关于安全，其中最为核心的一条就是 HTTP。我们知道，HTTP 采用的是明文传输信息，存在被窃听、被篡改和被劫持的风险，在项目中使用 HTTP 来传输数据无疑是“裸奔”。

所以在设计之初，就考虑对 Service Worker 采用 HTTPS 协议，因为采用 HTTPS 的通信数据都是经过加密的，即便拦截了数据，也无法破解数据内容，而且 HTTPS 还有校验机制，通信双方很容易知道数据是否被篡改。

所以要使站点支持 Service Worker，首先必要的一步就是要将站点升级到 HTTPS。除了必须要使用 HTTPS，Service Worker 还需要同时支持 Web 页面默认的安全策略，诸如同源策略、内容安全策略（CSP）等

### 优点

PWA(Progressive web apps, 渐进式Web应用)，它有什么优点呢？

1. 可以生成桌面小图标，不需要打开浏览器，方便用户访问
2. 通过网络缓存提升页面访问速度，达到渐进式的页面甚至离线访问，提升用户体验
3. 实现类似app的推送功能，生成系统通知推送给用户

上面的这些优点足以让它吸引大量的开发者来探索和应用，毕竟对于web应用来说，用户体验才是检验web应用的好坏的至高标准，而PWA的这些优点恰恰是开发者在开发时一直追求的

## 总结

你觉得 PWA 能进入移动设备吗？
谷歌的思路是超前的，但是ios和安卓手机厂商不会让PWA分一杯羹，现在每个大app都有自己小程序，手机厂商有快应用，都在抢夺用户的注意力，但是底层其实基于webkit实现，如果要说谁能把这个做到最好，那就是谷歌，但是谷歌容易被强，PWA很符合用完即走的概念，chromeOS 很好 实现了 PWA的想法

### 参考文献

1. <https://github.com/vuejs/vue-docs-zh-cn/blob/master/vue-cli-plugin-pwa/README.md>
2. <https://zhuanlan.zhihu.com/p/169828368>
