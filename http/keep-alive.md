# keep-alive

### 目的

tcp连接启动资源消耗大，而且慢
http协议采用‘请求-应答’模式
不开启keep-alive时，每个req，res客户端和服务端都要建立一个新连接，完成之后连接断开
开始keep-alive（持久连接，连接复用）时，keep-alive能使客户端和服务端的连接持续有效，当出现对服务器的后续请求时，keep-alive功能避免建立或者重新建立连接

需要服务端和客户端都开启
开启之后，后续请求相同接口可以走相同的端口

### 语法

Keep-Alive: parameters

parameters
一系列用逗号隔开的参数，每一个参数由一个标识符和一个值构成，并使用等号 ('=') 隔开。下述标识符是可用的：
timeout：指定了一个空闲连接需要保持打开状态的最小时长（以秒为单位）。需要注意的是，如果没有在传输层设置 keep-alive TCP message 的话，大于 TCP 层面的超时设置会被忽略。
max：在连接关闭之前，在此连接可以发送的请求的最大值。在非管道连接中，除了 0 以外，这个值是被忽略的，因为需要在紧跟着的响应中发送新一次的请求。HTTP 管道连接则可以用它来限制管道的使用。

### 缺点

节约了大量时间，但是它并不是没有缺点的。我们都知道一个操作系统的能支撑的连接数是有限的，使用ulimit命令可以查看当前系统的最大连接数。

```
ulimit -n
2560
```

一台服务器的连接数超过这个数量之后，后面的网络请求无法到达服务器，keep-alive会让client和server之间的服务器不断断开，即使它们之间没有数据连接，所以要控制好这个连接闲置的时间

长连接现在socket 去实现，会比这个好，操作频繁的场景是相对节约资源的，不是特别频繁，短连接能承担更大的并发量

### note

从HTTP/1.1起，默认都开启了Keep-Alive，保持连接特性， 除非在Header中指明要关闭：Connection: Close

需要将 The Connection 首部的值设置为  "keep-alive" 这个首部才有意义。同时需要注意的是，在HTTP/2 协议中， Connection 和 Keep-Alive  是被忽略的；在其中采用其他机制来进行连接管理。

### 参考文献

1. <https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Headers/Keep-Alive>
2. <https://www.jianshu.com/p/e99e0e505c79>
