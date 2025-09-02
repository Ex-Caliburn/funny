# 从输入url发生了什么

## 前言

这道题涉及范围广，而且可以很深，简单列步骤，再又浅入深入

1. DNS 解析（优先命中各级缓存）
2. 建立传输层连接：TCP 三次握手/四次挥手；HTTPS 需 TLS 握手；HTTP/1.1 默认 Keep-Alive，HTTP/2 复用单连接，HTTP/3 基于 QUIC/UDP
3. 发送 HTTP 请求并接收响应
4. 提交文档（完成导航），进入渲染流程
5. 解析 HTML（标记化与建树，生成 DOM）；解析 CSS，构建 CSSOM
6. 样式计算 → 布局（生成渲染/布局树）→ 分层与合成 → 分块与栅格化 → 合成输出到屏幕

### 正确姿势

先分成大框架，然后学习细节，层层递进，方便理解和记忆

1. 网络
2. 构建Dom树
3. 样式计算
4. 生成布局树(Layout Tree)
5. 建图层树
6. 绘制

#### 网络

1. 构建请求行
2. 查找强缓存（命中则直接使用本地缓存，不发起网络请求；开发者工具可能显示 200 (from cache)）
   1. 未命中强缓存且具备验证器（ETag/Last-Modified）时，将准备条件请求（If-None-Match/If-Modified-Since）。该条件请求会在后续完成 DNS 解析与（可能的）TCP/TLS 建连后发送；若复用现有连接（HTTP/2/3、Keep-Alive）可跳过新的 DNS/握手；若有 Service Worker 也可能本地拦截而不触发 DNS。
3. DNS解析
   1. 浏览器提供了DNS数据缓存功能。即如果一个域名已经解析过，那会把解析的结果缓存下来，下次处理直接走缓存，不需要经过 DNS解析
4. 建立TCP连接
   1. 3次握手 4次挥手
5. 发送http请求
   1. 请求行、请求头和请求体
6. 网络响应
   1. 响应行、响应头和响应体

响应完成之后怎么办？TCP 连接就断开了吗？
不一定。这时候要判断Connection字段, 如果请求头或响应头中包含Connection: Keep-Alive，表示建立了持久连接，这样TCP连接会一直保持，之后请求同一站点的资源会复用这个连接（HTTP/2 可在单连接上多路复用）。
否则断开TCP连接, 请求-响应流程结束。

![alt](https://user-gold-cdn.xitu.io/2019/12/15/16f080b095268038?imageView2/0/w/1280/h/960/format/webp/ignore-error/1)

#### 解析算法篇

1. 构建 DOM 树
   1. HTML5 使用专门的解析算法（标记化 + 建树 + 插入模式等），并非典型的上下文无关文法（CFG）
   2. 解析算法
      1. 标记化。
      2. 建树。
         1. 将DOM对象加入 DOM 树中。
         2. 将对应标记压入存放开放(与闭合标签意思对应)元素的栈中。
      3. 容错机制
2. 样式计算
   1. 构建 CSSOM（例如可通过 document.styleSheets 访问样式表）
   2. 标准化样式属性，计算 specified/computed/used/actual 值
   3. 计算每个节点的具体样式
3. 计算每个节点的具体样式
   1. 继承， 每个子节点都会默认继承父节点的样式属性，如果父节点中没有找到，就会采用浏览器默认样式，也叫UserAgent样式。这就是继承规则
   2. 层叠
4. 生成布局/渲染树
   1. 遍历生成的 DOM 树节点，并把它们添加到布局/渲染树中。带有 display:none 的节点不会进入渲染树，但 visibility:hidden 会进入（只是不可见）。
   2. 计算布局树节点的几何与坐标位置。

![alt](https://user-gold-cdn.xitu.io/2019/12/15/16f080b2f718e4ad?imageView2/0/w/1280/h/960/format/webp/ignore-error/1)

#### 渲染

1. 建立图层树(Layer Tree)
   1. 显式合成
   2. 隐式合成
2. 生成绘制列表
   1. 接下来渲染引擎会将图层的绘制拆分成一个个绘制指令，比如先画背景、再描绘边框......然后将这些指令按顺序组合成一个待绘制列表，相当于给后面的绘制操作做了一波计划
   2. 大家可以在 Chrome 开发者工具中在设置栏中展开 more tools, 然后选择Layers面板，就能看到下面的绘制列表
3. 生成图块并栅格化
   1. 合成线程负责分层、分块（tile）与调度；实际像素栅格化由栅格线程池/GPU 完成。
4. 显示器显示内容
   1. 栅格化完成后，合成线程会生成绘制命令（如 DrawQuad）并提交给浏览器进程的 Viz 组件，最终输出到帧缓冲并显示。

浏览器进程中的viz组件接收到这个命令，根据这个命令，把页面内容绘制到内存，也就是生成了页面，然后把这部分内存发送给显卡。为什么发给显卡呢？我想有必要先聊一聊显示器显示图像的原理。
无论是 PC 显示器还是手机屏幕，都有一个固定的刷新频率，一般是 60 HZ，即 60 帧，也就是一秒更新 60 张图片，一张图片停留的时间约为 16.7 ms。而每次更新的图片都来自显卡的前缓冲区。而显卡接收到浏览器进程传来的页面后，会合成相应的图像，并将图像保存到后缓冲区，然后系统自动将前缓冲区和后缓冲区对换位置，如此循环更新。
看到这里你也就是明白，当某个动画大量占用内存的时候，浏览器生成图像的时候会变慢，图像传送给显卡就会不及时，而显示器还是以不变的频率刷新，因此会出现卡顿，也就是明显的掉帧现象。

![alt](https://user-gold-cdn.xitu.io/2019/12/15/16f080b7b8926b7f?imageView2/0/w/1280/h/960/format/webp/ignore-error/1)

#### 分层

第一点，拥有层叠上下文属性的元素不一定都会成为独立合成层；常见触发包括 3D transform、video/canvas、滤镜 filter、will-change、position: fixed 与 transform 组合等。
第二点，发生复杂剪裁（clip）时可能引入额外图层，但并非必然。

##### 资料佐证：层叠上下文 ≠ 合成层

- [MDN：will-change](https://developer.mozilla.org/zh-CN/docs/Web/CSS/will-change)
  - will-change 只是“提示”浏览器可能即将发生的变化，浏览器可能因此创建新层或优化，但并非保证；同时会创建层叠上下文。
- [MDN：层叠上下文](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_positioned_layout/Stacking_context)
  - 定义了层叠上下文与创建条件，强调其是绘制顺序/堆叠规则概念，非合成层等价物。
- [web.dev：High performance animations](https://web.dev/articles/animations-guide)
  - 建议优先使用 transform/opacity 进行 compositor-only 动画，浏览器“可能”为之提升图层，是否提升取决于实现与启发式。
- [Chrome DevTools：Layers 面板](https://developer.chrome.com/docs/devtools/evaluate-performance/reference/#layers)
  - 介绍合成层的可视化与调试，说明图层由浏览器按需创建，层并非越多越好，也非任何条件下必然创建。
- [Chrome Blog：Inside look at modern web browser (Part 3)](https://developer.chrome.com/blog/inside-browser-part3/)
  - 讲解渲染管线中的分层、合成与栅格化职责分离，强调分层是优化手段而非语义层（如层叠上下文）。

#### 栅格化

通常一个页面可能很大，但是用户只能看到其中的一部分，我们把用户可以看到的这个部分叫做视口（viewport）。

在有些情况下，有的图层可以很大，比如有的页面你使用滚动条要滚动好久才能滚动到底部，但是通过视口，用户只能看到页面的很小一部分，所以在这种情况下，要绘制出所有图层内容的话，就会产生太大的开销，而且也没有必要。

基于这个原因`合成线程会将图层划分为图块（tile）`，这些图块的大小通常是 256x256 或者 512x512，如下图所示：

然后合成线程会按照视口附近的图块来优先栅格化。所谓栅格化，是指将图块转换为位图；图块是栅格化执行的最小单位。

1. 渲染进程将 HTML 内容转换为能够读懂的 DOM 树结构。
2. 渲染引擎将 CSS 样式表转化为浏览器可以理解的 styleSheets，
3. 计算出 DOM 节点的样式。创建布局树，并计算元素的布局信息。
4. 对布局树进行分层，并生成分层树。为每个图层生成绘制列表，并将其提交到合成线程。
5. 合成线程将图层分成图块，并在光栅化线程池中将图块转换成位图。
6. 合成线程发送绘制图块命令 DrawQuad 给浏览器进程。
7. 浏览器进程根据 DrawQuad 消息生成页面，并显示到显示器上。

### 二刷

1. 导航
   1. 浏览器进程检查url，组装协议，构成完整的url
   2. 浏览器进程通过进程间通信（IPC）把url请求发送给网络进程
   3. 拿到 IP 地址后，检查缓存：强缓存命中则直接使用（可能显示 200 (from cache)），协商缓存命中则返回 304。
      - 协商缓存需要发起“条件请求”（If-None-Match/If-Modified-Since），因此发生在完成 DNS 解析与（可能的）TCP/TLS 建连之后；若复用现有连接（HTTP/2/3、Keep-Alive）可跳过新的 DNS/握手；有 Service Worker 时也可能本地拦截而不触发 DNS。
      - DNS 缓存与 HTTP 缓存不是一回事：前者缓存域名到 IP（受 TTL 控制），后者缓存 URL→响应（受 Cache-Control/ETag/Last-Modified 控制）。
   4. DNS解析，检查是否有DNS缓存
   5. 发起请求获取根据域名解析出来的IP和端口号，如果没有端口号，http默认80，https默认443。如果是https请求，还需要建立TLS连接
   6. 构建请求行与请求头
   7. 开始导航，触发beforeunload，该事件来取消导航，让浏览器不再执行任何后续工作
   8. 页面并不会马上被替换，有个等待过程，需要等待提交文档阶段，页面内容才会被替换
   9. 检查是否有重定向；根据 Content-Type 与 Content-Disposition 决定处理方式：text/html 进入渲染流程；二进制资源可能下载或由内置解码器/插件渲染
   10. Chrome 进程模型受“站点隔离”等策略影响。一般会为页面分配独立渲染进程，但也可能复用。同站点页面有时会复用进程，跨站点通常隔离到不同进程。官方称默认策略为 process-per-site-instance（是否复用受站点隔离、内存、打开方式等影响）。
   11. 提交文档，就是指浏览器进程将网络进程接收到的 HTML 数据提交给渲染进程，具体流程是这样的：
       1. 首先当浏览器进程接收到网络进程的响应头数据之后，便向渲染进程发起“提交文档”的消息；
       2. 渲染进程接收到“提交文档”的消息后，会和网络进程建立传输数据的“管道”；
       3. 等文档数据传输完成之后，渲染进程会返回“确认提交”的消息给浏览器进程；
       4. 浏览器进程在收到“确认提交”的消息后，会更新浏览器界面状态，包括了安全状态、地址栏的 URL、前进后退的历史状态，并更新 Web 页面。
   12. 开始渲染

### 问题

#### <https://linkmarket.aliyun.com>内新开的页面都是新开一个渲染进程，能帮忙解释下吗

我看了下代码，因为连接里面使用了 rel="noopener noreferrer"这个属性。

这个涉及到安全了，要完整解释起来就话长了，我长话短说，先看阿里这个网站的连接是下面这种形式：

<a target="_blank" rel="noopener noreferrer" class="hover" href="https://linkmarket.aliyun.com/hardware_store?spm=a2c3t.11219538.iot-navBar.62.4b5a51e7u2sXtw" data-spm-anchor-id="a2c3t.11219538.iot-navBar.62">硬件商城</a>

使用 noopener noreferrer 就是告诉浏览器，新打开的子窗口不需要访问父窗口的任何内容（window.opener 为空），用于防止一些钓鱼网站窃取父窗口的信息。

注意：rel=noopener 并不强制新开一个渲染进程，是否新进程取决于站点隔离与进程分配策略。

### 同一站点共用一个渲染进程，那假设有2个标签页是同一站点，我在A标签页面写个死循环，导致页面卡死，B页面是否也是卡死了呢？

作者回复: 你能想到这个问题，说明你已经快思考到最核心的---事件循环机制了，非常好。

多个页面公用一个渲染进程，也就意味着多个页面公用同一个主线程，所有页面的任务都是在同一个主线程上执行，这些任务包括渲染流程，JavaScript 执行，用户交互事件的响应等等。@@@但是@@@ 只有在“确实共享同一渲染进程”时，一个标签页里的死循环才可能拖慢或卡死另一个页面；若分别运行在不同渲染进程，则互不影响！

关于循环系统，

例子
在同一域名打开两个tap，刚开始是两个tab卡住，慢慢整个浏览器变卡，不是一瞬间就卡住了，优化做的不错
在控制台输入一下代码：

```js
for(;;) {
console.log(Math.pow(2, 100))
}

```

#### 二进制资源下载是交给哪个进程？

- 下载场景（如 Content-Disposition: attachment、未知类型或用户选择下载）：由浏览器进程统筹（DownloadManager），通过 Network Service 拉取数据并直接写盘，通常不经渲染进程。
- 可内联渲染的二进制（image/video/audio 等）：仍由渲染进程负责显示（数据获取仍经 Network Service）。
- 特例（如 PDF）：由内置查看器或隔离站点渲染，但调度与保存仍由浏览器进程协调。
- 若被 Service Worker 拦截，可能直接返回缓存或自定义响应，再由浏览器进程决定下载或渲染。

### 建议补充

- 资源加载与阻塞
  - 预加载扫描器（preload scanner）；`<link rel="preload">`、`<link rel="prefetch">`、`<link rel="prerender">`
  - 脚本加载：parser-blocking 脚本会阻塞解析；`defer/async` 能缓解；`type="module"` 默认 `defer`
  - 样式阻塞：CSS 会阻塞首次渲染；避免 `@import` 链式加载；抽取并内联关键 CSS
- 关键时序与指标
  - DOMContentLoaded、load
  - 性能指标：FCP、LCP、CLS、INP
- 网络与连接细节
  - DNS 多级缓存（浏览器/OS/hosts/DoH）
  - 连接复用/池化：HTTP/1.1 Keep-Alive；HTTP/2 多路复用；HTTP/3 基于 QUIC
  - TLS：SNI/ALPN 协商
- Service Worker 与离线缓存
  - 可拦截请求；常见缓存策略：Cache First、Network First、Stale-While-Revalidate
- 渲染与交互优化
  - 优先使用 transform/opacity 与 `requestAnimationFrame`
  - 谨慎使用 `will-change`（提示而非保证，会增加内存）
  - 使用 `content-visibility`、`contain` 隔离渲染范围

## 总结

### 参考文献

1. <https://juejin.cn/post/6844904021308735502#heading-26>
2. <https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_Positioning/Understanding_z_index/The_stacking_context>
