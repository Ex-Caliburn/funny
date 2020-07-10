# Preload，Prefetch 和 Preconnect

## 前言

今天，我们将探索当前的资源提示和指令，它们可能是提高网站或Web应用程序性能的另一种好方法。您可能听说过的preload，prefetch和preconnect，但我们要深入探讨它们之间的差异如何如何，你可以从中受益。这些优点中的一些优点是，它们使Web开发人员可以优化资源的传递，减少往返行程并获取资源以在用户浏览页面时更快地传递内容。

### Preload

Preload 是一个新的控制特定资源如何被加载的新的 Web 标准，这是已经在 2016 年 1 月废弃的 subresource prefetch 的升级版。这个指令可以在 <link> 中使用，比如 <link rel="preload">。一般来说，最好使用 preload 来加载你最重要的资源，比如图像，CSS，JavaScript 和字体文件。这不要与浏览器预加载混淆，浏览器预加载只预先加载在HTML中声明的资源。preload 指令事实上克服了这个限制并且允许预加载在 CSS 和JavaScript 中定义的资源，并允许决定何时应用每个资源。
Preload 与 prefetch 不同的地方就是它专注于当前的页面，并以高优先级加载资源，Prefetch 专注于下一个页面将要加载的资源并以低优先级加载。同时也要注意 preload 并不会阻塞 window 的 onload 事件。

#### 使用 Preload 的好处

- 允许浏览器来设定资源加载的优先级因此可以允许前端开发者来优化指定资源的加载。
- 赋予浏览器决定资源类型的能力，因此它能分辨这个资源在以后是否可以重复利用。
- 浏览器可以通过指定 as 属性来决定这个请求是否符合 content security policy。
- 浏览器可以基于资源的类型（比如 image/webp）来发送适当的 accept 头。

#### 举例

这里有一个非常基本的预加载图像的例子：

```html
<link rel="preload" href="image.png">
```

这里有一个预加载字体的例子，记住：如果你的预加载需要 CORS 的跨域请求，那么也要加上 crossorigin 的属性。

```html
<link rel="preload" href="https://example.com/fonts/font.woff" as="font" crossorigin>
```

这里有一个通过 HTML 和 JavaScript 预加载样式表的例子：

```html
<!-- Via markup -->
<link rel="preload" href="/css/mystyles.css" as="style">

<!-- Via JavaScript -->
<script>
var res = document.createElement("link");
res.rel = "preload";
res.as = "style";
res.href = "css/mystyles.css";
document.head.appendChild(res);
</script>
```

#### 浏览器支持

firefox 还是没支持preload，其他都可以

### Prefetch

Prefetch 是一个低优先级的资源提示，允许浏览器在后台（空闲时）获取将来可能用得到的资源，并且将他们存储在浏览器的缓存中。一旦一个页面加载完毕就会开始下载其他的资源，然后当用户点击了一个带有 prefetched 的连接，它将可以立刻从缓存中加载内容。有三种不同的 prefetch 的类型，link，DNS 和 prerendering，下面来详细分析。

#### Link Prefetching

像上面提到的，link prefetching 假设用户将请求它们，所以允许浏览器获取资源并将他们存储在缓存中。浏览器会寻找 HTML  <link>  元素中的 prefetch 或者 HTTP 头中如下的 Link：

```html
HTML: <link rel="prefetch" href="/uploads/images/pic.png">
HTTP Header: Link: </uploads/images/pic.png>; rel=prefetch
```

"这项技术有为很多有交互网站提速的潜力，但并不会应用在所有地方。对于某些站点来说，太难猜测用户下一步的动向，对于另一些站点，提前获取资源可能导致数据过期失效。还有很重要的一点，不要过早进行 prefetch，否则会降低你当前浏览的页面的加载速度 —— Google Developers"
除了 Safari， iOS Safari 和 Opera Mini，现代浏览器已经支持了 link Prefetch，Chrome 和 Firefox 还会在网络面板上显示这些 prefetched 资源。

#### DNS Prefetching

您可以通过名称来记住站点，但是服务器可以通过IP地址来记住它们。这就是为什么存在域名系统（DNS）的原因。浏览器使用DNS将站点名称转换为IP地址。此过程（  域名解析）是建立连接的第一步。

如果页面需要建立与许多第三方域的连接，则预先连接所有这些都是适得其反的。该preconnect提示最好仅用于最关键的连接。对于其余所有内容，请使用 <link rel=dns-prefetch>第一步来节省时间，即DNS查找，通常需要20-120毫秒左右。

DNS prefetching 允许浏览器在用户浏览页面时在后台运行 DNS 的解析。如此一来，DNS 的解析在用户点击一个链接时已经完成，所以可以减少延迟。可以在一个 link 标签的属性中添加 rel="dns-prefetch'  来对指定的 URL 进行 DNS prefetching，我们建议对 Google fonts，Google Analytics 和 CDN 进行处理。

    "DNS 请求在带宽方面流量非常小，可是延迟会很高，尤其是在移动设备上。通过 prefetching 指定的 DNS 可以在特定的场景显著的减小延迟，比如用户点击链接的时候。有些时候，甚至可以减小一秒钟的延迟 —— Mozilla Developer Network"

这也对需要重定向的资源很有用，如下：

```html
<!-- Prefetch DNS for external assets -->
 <link rel="dns-prefetch" href="//fonts.googleapis.com">
 <link rel="dns-prefetch" href="//www.google-analytics.com">
 <link rel="dns-prefetch" href="//opensource.keycdn.com">
 <link rel="dns-prefetch" href="//cdn.domain.com">
```

DNS prefetch 已经被除了 Opera Mini 之外的所有现代浏览器支持了。

#### Prerender

Prerendering 和 prefetching 非常相似，它们都优化了可能导航到的下一页上的资源的加载，区别是 prerendering 在后台渲染了整个页面，整个页面所有的资源。如下：

```html
<link rel="prerender" href="https://www.keycdn.com">
```

    "prerender 提示可以用来指示将要导航到的下一个 HTML：用户代理将作为一个 HTML 的响应来获取和处理资源，要使用适当的 content-types 获取其他内容类型，或者不需要 HTML 预处理，可以使用 prefetch。—— W3C"

要小心的使用 prerender，因为它将会加载很多资源并且可能造成带宽的浪费，尤其是在移动设备上。还要注意的是，你无法在 Chrome DevTools 中进行测试，而是在 chrome://net-internals/#prerender 中看是否有页面被 prerendered 了，你也可以在  prerender-test.appspot.com 进行测试。

除了 Mozilla Firefox，Safari，iOS  Safari，Opera Mini 和 Android 浏览器外的一些现代浏览器已经支持了 prerendering。

##### 缺陷

除了多余的资源加载外，使用 prefetch 还有一切 额外的副作用，比如对隐私的损害：

Web 统计将会收到影响而变大，尽管 Google 说已经限制了这个标签。看看这个关于页面分析将会被影响而在一次点击时产生两个 session 的 文章。
由于可能从未访问的站点下载了更多的页面（尤其是隐匿下载正在变得更加先进和多样化），用户的安全将面临更多的风险。
如果预取访问未经授权的内容，用户可能违反其网络或组织的可接受使用策略。

### Preconnect

本文介绍的最后一个资源提示是 preconnect，preconnect 允许浏览器在一个 HTTP 请求正式发给服务器前预先执行一些操作，这包括 DNS 解析，TLS 协商，TCP 握手，这消除了往返延迟并为用户节省了时间。

    "Preconnect 是优化的重要手段，它可以减少很多请求中的往返路径 —— 在某些情况下可以减少数百或者数千毫秒的延迟。——  lya Grigorik"

![alt](https://user-gold-cdn.xitu.io/2018/7/26/164d5ae9810c7382?imageView2/0/w/1280/h/960/format/webp/ignore-error/1)

preconnect 可以直接添加到 HTML 中 link 标签的属性中，也可以写在 HTTP 头中或者通过 JavaScript 生成，如下是一个为 CDN 使用 preconnect 的例子：

```html
<link href="https://cdn.domain.com" rel="preconnect" crossorigin>
```

如下是为 Google Fonts 使用 preconnect 的例子，通过给 fonts.gstatic.com 加入 preconnect 提示，浏览器将立刻发起请求，和 CSS 请求并行执行。在这个场景下，preconnect 从关键路径中消除了三个 RTTs（Round-Trip Time） 并减少了超过半秒的延迟，lya Grigorik 的 eliminating RTTS with preconnect 一文中有更详细的分析。

使用 preconnect 是个有效而且克制的资源优化方法，它不仅可以优化页面并且可以防止资源利用的浪费。
建立连接通常会在慢速的网络中花费大量时间，尤其是在进行安全连接时，因为它可能涉及DNS查找，重定向以及到处理用户请求的最终服务器的多次往返。
提前做好所有这些工作，可以使您的应用程序对用户而言更加敏捷，而不会负面影响带宽的使用。建立连接的大部分时间都花在等待而不是交换数据上。

请记住，尽管<link rel="preconnect">价格便宜，但它仍然会占用宝贵的CPU时间，尤其是在安全连接上。如果在10秒钟内不使用连接，这会特别糟糕，因为浏览器会关闭它，浪费所有早期的连接工作。

通常，请尝试使用<link rel="preload">，因为它是更全面的性能调整，但<link rel="preconnect">请注意以下情况：

- 用例：知道从何而来，而不是从中获取
- 用例：流媒体

除了 Internet Explorer，Safari，IOS Safari 和 Opera Mini 的现代浏览器已经支持了 preconnect。

## 总结

希望你现在对 preload，prefetch 和 preconnect 有了一些理解并知道如何利用它们来加速资源的加载，希望在未来的几个月能看到更多的浏览器支持这些预加载提示并且有更多的开发者使用它们。

### 参考文献

1. <https://juejin.im/post/5b5984b851882561da216311#heading-3>
2. <https://www.w3.org/TR/resource-hints/>
3. <https://www.igvita.com/2015/08/17/eliminating-roundtrips-with-preconnect/>
