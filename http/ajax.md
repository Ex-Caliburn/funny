# ajax

## 前言

基础原理在学习一遍，ajax引起交互的变革，无刷新拉去数据

```js
    var url = 'http://127.0.0.1:5000'
    var xhr = new XMLHttpRequest()
    xhr.open('delete', url)
    // xhr.withCredentials = true
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4 ) {
          if((xhr.status >= 200 || xhr.status < 300 || xhr.status == 304)){
            console.log(xhr.response)
          }else{
            console.log(xhr.response)
          }
        }
      };
    xhr.send()
```

### open()

XMLHttpRequest.open(method, url); // 常用
XMLHttpRequest.open(method, url, async, user, password); // 其他都是可选

method
要使用的HTTP方法，比如「GET」、「POST」、「PUT」、「DELETE」、等。对于非HTTP(S) URL被忽略。

url
一个DOMString表示要向其发送请求的URL。

async
 一个可选的布尔参数，默认为true，表示要不要异步执行操作。如果值为false，send()方法直到收到答复前不会返回。如果true，已完成事务的通知可供事件监听器使用。如果multipart属性为true则这个必须为true，否则将引发异常。

user 可选
可选的用户名用于认证用途；默认为null。

password 可选
可选的密码用于认证用途，默认为null。

### send()

XMLHttpRequest.send() 方法用于发送 HTTP 请求。如果是异步请求（默认为异步请求），则此方法会在请求发送后立即返回；如果是同步请求，则此方法直到响应到达后才会返回。XMLHttpRequest.send() 方法接受一个可选的参数，其作为请求主体；如果请求方法是 GET 或者 HEAD，则应将请求主体设置为 null。

如果没有使用 setRequestHeader() 方法设置 Accept 头部信息，则会发送带有 "*/*" 的Accept 头部。

    XMLHttpRequest.send();
    XMLHttpRequest.send(ArrayBuffer data);
    XMLHttpRequest.send(ArrayBufferView data);
    XMLHttpRequest.send(Blob data);
    XMLHttpRequest.send(Document data);
    XMLHttpRequest.send(DOMString? data);
    XMLHttpRequest.send(FormData data);

如果发送的数据是Document对象，需要在发送之前将其序列化。但如果未指定编码格式，则使用utf-8编码格式发送。

发送二进制内容的最佳方法（如上传文件）是使用一个与send（）方法结合的 ArrayBufferView 或者Blobs

### abort()

如果该请求已被发出，XMLHttpRequest.abort() 方法将终止该请求。当一个请求被终止，它的 readyState 属性将被置为0（ UNSENT )

### readyState

XMLHttpRequest.readyState 属性返回一个 XMLHttpRequest  代理当前所处的状态。一个 XHR 代理总是处于下列状态中的一个：

| 值 | 状态 |描述|
| :-----| ----: | ----: |
|0| UNSENT            | 代理被创建，但尚未调用 open() 方法。
|1| OPENED            | 方法已经被调用。
|2| HEADERS_RECEIVED  ｜send() 方法已经被调用，并且头部和状态已经可获得。
|3| LOADING           | 下载中； responseText 属性已经包含部分数据。
|4| DONE              | 下载操作已完成。

### onreadystatechange

只要 readyState 属性发生变化，就会调用相应的处理函数

当一个 XMLHttpRequest 请求被 abort() 方法取消时，其对应的 readystatechange 事件不会被触发。

### response

XMLHttpRequest response 属性返回响应的正文。返回的类型为 ArrayBuffer 、 Blob 、 Document 、 JavaScript Object 或 DOMString 中的一个。 这取决于 responseType 属性。

### withCredentials

属性是一个Boolean类型，它指示了是否该使用类似cookies,authorization headers(头部授权)或者TLS客户端证书这一类资格证书来创建一个跨站点访问控制（cross-site Access-Control）请求。在同一个站点下使用withCredentials属性是无效的。

此外，这个指示也会被用做响应中cookies 被忽视的标示。默认值是false。

如果在发送来自其他域的XMLHttpRequest请求之前，未设置withCredentials 为true，那么就不能为它自己的域设置cookie值。而通过设置withCredentials 为true获得的第三方cookies，将会依旧享受同源策略，因此不能被通过document.cookie或者从头部相应请求的脚本等访问。

### timeout

XMLHttpRequest.timeout 是一个无符号长整型数，代表着一个请求在被自动终止前所消耗的毫秒数。默认值为 0，意味着没有超时。超时并不应该用在一个 document environment 中的同步 XMLHttpRequests  请求中，否则将会抛出一个 InvalidAccessError 类型的错误。当超时发生， timeout 事件将会被触发。

在IE中，超时属性可能只能在调用 open() 方法之后且在调用 send() 方法之前设置。

### FormData

FormData 接口提供了一种表示表单数据的键值对的构造方式，经过它的数据可以使用 XMLHttpRequest.send() 方法送出，本接口和此方法都相当简单直接。如果送出时的编码类型被设为 "multipart/form-data"，它会使用和表单一样的格式。

如果你想构建一个简单的GET请求，并且通过<form>的形式带有查询参数，可以将它直接传递给URLSearchParams。

实现了 FormData 接口的对象可以直接在for...of结构中使用，而不需要调用entries() : for (var p of myFormData) 的作用和 for (var p of myFormData.entries()) 是相同的。

FormData()
创建一个新的 FormData 对象。

FormData.append()
向 FormData 中添加新的属性值，FormData 对应的属性值存在也不会覆盖原值，而是新增一个值，如果属性不存在则新增一项属性值。

### 备注

IE 5 和 6可以通过使用 ActiveXObject() 支持ajax。

## 总结

### 参考文献

1. <https://developer.mozilla.org/zh-CN/docs/Web/API/XMLHttpRequest/readyState>
2. <https://developer.mozilla.org/zh-CN/docs/Web/API/FormData>
