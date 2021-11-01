# ctrl+F5和F5有什么区别

## 前言

浏览器刷新操作，ctrl+F5和F5有什么区别
一个是强制刷新，也就是资源都走网络。

一个是正常处理流程。

比如通过网络面板，打开一个站点，再使用强制刷新，可以看到如下信息
176 requests
3.1 MB transferred
3.5 MB resources
Finish: 26.30 s
DOMContentLoaded: 5.04 s
Load: 14.88 s

如果使用正常的刷新，看到的信息如下：
171 requests
419 KB transferred
3.2 MB resources
Finish: 25.09 s
DOMContentLoaded: 1.41 s
Load: 6.24 s

其中的transferred是真正的网络传输的数据，使用强制刷新，传输的数据体积就大多了，而且请求时间也变得更长了。

## 总结

### 参考文献
