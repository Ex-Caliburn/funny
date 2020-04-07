## preload和prefetch

建议：对于当前页面很有必要的资源使用 preload，对于可能在将来的页面中使用的资源使用 prefetch。


### 缓存

当一个资源被 preload 或者 prefetch 获取后，它可以从 HTTP 缓存移动至渲染器的内存缓存中。如果资源可以被缓存（比如说存在有效的cache-control 和 max-age），它被存储在 HTTP 缓存中可以被现在或将来的任务使用，如果资源不能被缓存在 HTTP 缓存中，作为代替，它被放在内存缓存中直到被使用。

### preload 头
跟其他链接不同，preload 链接即可以放在 HTML 标签里也可以放在 HTTP 头部（preload HTTP 头），每种情况下，都会直接使浏览器加载资源并缓存在内存里，表明页面有很高的可能性用这些资源并且不想等待 preload 扫描器或者解析器去发现它。

你可以使用两种形式的 preload，但应当知道很重要的一点：根据规范，许多服务器当它们遇到 preload HTTP 头会发起 HTTP/2 推送，HTTP/2 推送的性能影响不同于普通的预加载，所以你要确保没有发起不必要的推送。
你可以使用 preload 标签来代替 preload 头以避免不必要的推送，或者在你的 HTTP 头上加一个 “nopush” 属性。

作者：guoyang134340
链接：https://juejin.im/post/58e8acf10ce46300585a7a42
来源：掘金
著作权归作者所有。商业转载请联系作者获得授权，非商业转载请注明出处。


### 参考文献
https://juejin.im/post/58e8acf10ce46300585a7a42