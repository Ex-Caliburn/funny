# Content-Type

## 前言

从图中可以看到，响应头中的 Content-type 字段的值是 text/html，这就是告诉浏览器，服务器返回的数据是 HTML 格式。接下来我们再来利用 curl 来请求极客时间安装包的地址，如下所示：

```
curl -I <https://res001.geekbang.org/apps/geektime/android/2.3.1/official/geektime_2.3.1_20190527-2136_offical.apk>
```

请求后返回的响应头信息如下：

含有 stream 格式的 Content-Type从返回的响应头信息来看，其 Content-Type 的值是 application/octet-stream，显示数据是字节流类型的，通常情况下，浏览器会按照下载类型来处理该请求。

需要注意的是，如果服务器配置 Content-Type 不正确，比如将 text/html 类型配置成 application/octet-stream 类型，那么浏览器可能会曲解文件内容，比如会将一个本来是用来展示的页面，变成了一个下载文件。

所以，不同 Content-Type 的后续处理流程也截然不同。如果 Content-Type 字段的值被浏览器判断为下载类型，那么该请求会被提交给浏览器的下载管理器，同时该 URL 请求的导航流程就此结束。但如果是 HTML，那么浏览器则会继续进行导航流程。由于 Chrome 的页面渲染是运行在渲染进程中的，所以接下来就需要准备渲染进程了。

### application/octet-stream

这是应用程序文件的默认值。意思是 *未知的应用程序文件，*浏览器一般不会自动执行或询问执行。浏览器会像对待 设置了 HTTP 头Content-Disposition 值为 attachment 的文件一样来对待这类文件。

### PDF预览

application/octet-stream

1. In Octet-stream you will be receiving the response as "Encoded Binary Data"
2. Your need to convert the response data into "Decoded Base64 String"
3. Finally save it as PDF.

## 总结

### 参考文献

1. <https://time.geekbang.org/column/article/117637>
