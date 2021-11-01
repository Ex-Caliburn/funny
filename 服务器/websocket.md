# websocket

## 前言

WebSocket协议还很年轻，RFC文档相比HTTP的发布时间也很短，它的诞生是为了创建一种「双向通信」的协议，来作为HTTP协议的一个替代者。那么首先看一下它和HTTP（或者HTTP的长连接）的区别。
为什么要用WebSocket来替代HTTP

上一篇中提到WebSocket的目的就是解决网络传输中的双向通信的问题，HTTP1.1默认使用持久连接（persistent connection），在一个TCP连接上也可以传输多个Request/Response消息对，但是HTTP的基本模型还是一个Request对应一个Response。这在双向通信（客户端要向服务器传送数据，同时服务器也需要实时的向客户端传送信息，一个聊天系统就是典型的双向通信）时一般会使用这样几种解决方案：

- 轮训，轮询就会造成对网络和通信双方的资源的浪费，且非实时。
- 长轮训，客户端发送一个超时时间很长的Request，服务器hold住这个连接，在有新数据到达时返回Response，相比#1，占用的网络带宽少了，其他类似。
- 长连接，其实有些人对长连接的概念是模糊不清的，我这里讲的其实是HTTP的长连接（1）。如果你使用Socket来建立TCP的长连接（2），那么，这个长连接（2）跟我们这里要讨论的WebSocket是一样的，实际上TCP长连接就是WebSocket的基础，但是如果是HTTP的长连接，本质上还是Request/Response消息对，仍然会造成资源的浪费、实时性不强等问题。

### 链接

如果服务器接受了这个请求，可能会发送如下这样的返回信息，这是一个标准的HTTP的Response消息。101表示服务器收到了客户端切换协议的请求，并且同意切换到此协议。RFC2616规定只有切换到的协议「比HTTP1.1更好」的时候才能同意切换。

```http
    HTTP/1.1 101 Switching Protocols //1
    Upgrade: websocket. //2
    Connection: Upgrade. //3
    Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=  //4
    Sec-WebSocket-Protocol: chat. //5
```

Upgrade：upgrade是HTTP1.1中用于定义转换协议的header域。它表示，如果服务器支持的话，客户端希望使用现有的「网络层」已经建立好的这个「连接（此处是TCP连接）」，切换到另外一个「应用层」（此处是WebSocket）协议。

Connection：HTTP1.1中规定Upgrade只能应用在「直接连接」中，所以带有Upgrade头的HTTP1.1消息必须含有Connection头，因为Connection头的意义就是，任何接收到此消息的人（往往是代理服务器）都要在转发此消息之前处理掉Connection中指定的域（不转发Upgrade域）。
如果客户端和服务器之间是通过代理连接的，那么在发送这个握手消息之前首先要发送CONNECT消息来建立直接连接。

Sec-WebSocket-＊：第7行标识了客户端支持的子协议的列表（关于子协议会在下面介绍），第8行标识了客户端支持的WS协议的版本列表，第5行用来发送给服务器使用（服务器会使用此字段组装成另一个key值放在握手返回信息里发送客户端）。

Origin：作安全使用，防止跨站攻击，浏览器一般会使用这个来标识原始域。

## 总结

与HTTP比较
同样作为应用层的协议，WebSocket在现代的软件开发中被越来越多的实践，和HTTP有很多相似的地方，这里将它们简单的做一个纯个人、非权威的比较：

### 相同点

都是基于TCP的应用层协议。
都使用Request/Response模型进行连接的建立。
在连接的建立过程中对错误的处理方式相同，在这个阶段WS可能返回和HTTP相同的返回码。
都可以在网络中传输数据。

### 不同点

WS使用HTTP来建立连接，但是定义了一系列新的header域，这些域在HTTP中并不会使用。
WS的连接不能通过中间人来转发，它必须是一个直接连接。
WS连接建立之后，通信双方都可以在任何时刻向另一方发送数据。
WS连接建立之后，数据的传输使用帧来传递，不再需要Request消息。
WS的数据帧有序。

### 参考文献

1 . <https://juejin.im/post/57b07b6e2e958a005459ece3>
