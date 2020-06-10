# CORS

## 前言

CORS是一个W3C标准，全称是"跨域资源共享"（Cross-origin resource sharing）。
它允许浏览器向跨源服务器，发出XMLHttpRequest请求，从而克服了AJAX只能同源使用的限制。

浏览器将CORS请求分成两类：简单请求（simple request）和非简单请求（not-so-simple request）。

### 简单请求

（1) 请求方法是以下三种方法之一：
    HEAD
    GET
    POST
（2）HTTP的头信息不超出以下几种字段：
    Accept
    Accept-Language
    Content-Language
    Last-Event-ID
    Content-Type：只限于三个值application/x-www-form-urlencoded、multipart/form-data、text/plain

其他是复杂请求

这是为了兼容表单（form），因为历史上表单一直可以发出跨域请求。AJAX 的跨域设计就是，只要表单可以发，AJAX 就可以直接发。

### 例子

app.js

```js
const express = require('express')
const app = express()
const port = 5000
app.use('/', (req, res) => {
  // res.header("Access-Control-Allow-Origin", "*");
  res.send('Hello World!')
  next()
})

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))

```

app2.js

```js
const express = require('express');
const app = express();
const port = 3000
app.use(express.static('./public'));
app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))
```

public/index.html

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <title>option</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body></body>
  <script>
    var url = 'http://127.0.0.1:5000'
    var xhr = new XMLHttpRequest()
    xhr.open('get', url, true)
    // xhr.setRequestHeader('X-Custom-Header', 'value');
    xhr.send()
  </script>
</html>

```

启动
node app.js
node app2.js

访问 <http://127.0.0.1:3000>  自动会发起一请求 <http://127.0.0.1:5000>

浏览器发现这次跨源AJAX请求是简单请求，就自动在头信息之中，添加一个Origin字段。

```
Origin: http://127.0.0.1:3000
```

控制台报错了
Access to XMLHttpRequest at 'http://127.0.0.1:5000/' from origin 'http://127.0.0.1:3000' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
请求的资源没有设置 Access-Control-Allow-Origin 头

我加上了app.js添加头

```js
app.use('/', (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://127.0.0.1:4000");
  res.send('Hello World!')
})
```

重启node

依旧报错，
Access to XMLHttpRequest at 'http://127.0.0.1:5000/' from origin 'http://127.0.0.1:3000' has been blocked by CORS policy: The 'Access-Control-Allow-Origin' header has a value 'http://127.0.0.1:4000' that is not equal to the supplied origin.
因为我设置域名不再支持域名清单内，支持<http://127.0.0.1:4000> 访问

```js
app.use('/', (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.send('Hello World!')
})
```

可以了

我们发现get请求是没有发送option请求的，我们给它加个自定义头

```js
xhr.open('get', url, true)
xhr.setRequestHeader('X-Custom-Header', 'value');
```

``

查看network，发现多了一个option 请求
控制台 显示 x-custom-header 在预检请求中 不被 Access-Control-Allow-Headers允许
Access to XMLHttpRequest at 'http://127.0.0.1:5000/' from origin 'http://127.0.0.1:3000' has been blocked by CORS policy: Request header field x-custom-header is not allowed by Access-Control-Allow-Headers in preflight response.

这时get就成为复杂请求了

app.js
我们要设置Access-Control-Allow-Headers，然后重启  app.js

```js
  res.header("Access-Control-Allow-Headers", "x-custom-header");
```

这样我们简单的复现了option 请求，遇到问题如何去解决，少什么头就需要加什么头

你会发现我们很少见到option请求，而我们刷新页面一次就会发起一次option预检请求

我们要设置 Access-Control-Max-Age 预检请求缓存时间，缓存有效时间不用再次请求

app.js

```js
  res.header(" Access-Control-Max-Age", "60");
```

设置后我发现怎么都不行，原来我设置了 chrome 的disabled cache，关掉就可以缓存了，不用发预检请求了

app.js

```js
  res.header("Access-Control-Allow-Methods", "OPTIONS");
```

index.html

```js
xhr.open('delete', url, true)
```

控制台
Access to XMLHttpRequest at 'http://127.0.0.1:5000/' from origin 'http://127.0.0.1:3000' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: It does not have HTTP ok status.

Status Code: 500 Internal Server Error
预检请求没有通过控制检查，没有成功状态码，脚本报错了 原来我逗号写错了

app.js

```js
  res.header("Access-Control-Allow-Methods", "OPTIONS");
```

控制台
(index):1 Access to XMLHttpRequest at 'http://127.0.0.1:5000/' from origin 'http://127.0.0.1:3000' has been blocked by CORS policy: Method DELETE is not allowed by Access-Control-Allow-Methods in preflight response.
 预检请求的 Access-Control-Allow-Methods 中不允许 使用DELETE 方法

app.js

```js
  res.header("Access-Control-Allow-Methods", "DELETE");
```

ok！

如果我们想要携带cookie呢？
index.html

```js
    xhr.withCredentials = true
```

控制台报错
Access to XMLHttpRequest at 'http://127.0.0.1:5000/' from origin 'http://127.0.0.1:3000' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: The value of the 'Access-Control-Allow-Origin' header in the response must not be the wildcard '*' when the request's credentials mode is 'include'. The credentials mode of requests initiated by the XMLHttpRequest is controlled by the withCredentials attribute.
没有预检请求没有通过访问控制检查，当请求credentials 是 include ， Access-Control-Allow-Origin不能设置为 通配符*

app.js

```js
  res.header("Access-Control-Allow-Origin", "http://127.0.0.1:3000");
```

还是报错，还得加上 Access-Control-Allow-Credentials ，不然请求不允许带 cookie
app.js

```js
    res.header("Access-Control-Allow-Credentials", "true");
```

服务器要设置cookie呢？

```js
      res.header("set-cookie", "test123");
```

如果不设置 index.html  xhr.withCredentials = true,服务端设置了，浏览器也不会设置cookie成功
app.js

```js
    res.header("Access-Control-Allow-Credentials", "true");
```

#### cors 关键字段

如果Origin指定的域名在许可范围内，服务器返回的响应，会多出几个头信息字段。

```nginx
Access-Control-Allow-Origin: <http://api.bob.com>
Access-Control-Allow-Credentials: true
Access-Control-Expose-Headers: FooBar
Content-Type: text/html; charset=utf-8
```

（1）Access-Control-Allow-Origin

该字段是必须的。它的值要么是请求时Origin字段的值，要么是一个*，表示接受任意域名的请求。

（2）Access-Control-Allow-Credentials

该字段可选。它的值是一个布尔值，表示是否允许发送Cookie。默认情况下，Cookie不包括在CORS请求之中。设为true，即表示服务器明确许可，Cookie可以包含在请求中，一起发给服务器。这个值也只能设为true，如果服务器不要浏览器发送Cookie，删除该字段即可。

（3）Access-Control-Expose-Headers

该字段可选。CORS请求时，XMLHttpRequest对象的getResponseHeader()方法只能拿到6个基本字段：Cache-Control、Content-Language、Content-Type、Expires、Last-Modified、Pragma。如果想拿到其他字段，就必须在Access-Control-Expose-Headers里面指定。上面的例子指定，getResponseHeader('FooBar')可以返回FooBar字段的值。

#### withCredentials 属性

上面说到，CORS请求默认不发送Cookie和HTTP认证信息。如果要把Cookie发到服务器，一方面要服务器同意，指定Access-Control-Allow-Credentials字段。

Access-Control-Allow-Credentials: true
另一方面，开发者必须在AJAX请求中打开withCredentials属性。

var xhr = new XMLHttpRequest();
xhr.withCredentials = true;
否则，即使服务器同意发送Cookie，浏览器也不会发送。或者，服务器要求设置Cookie，浏览器也不会处理。

但是，如果省略withCredentials设置，有的浏览器还是会一起发送Cookie。这时，可以显式关闭withCredentials。

xhr.withCredentials = false;
需要注意的是，如果要发送Cookie，Access-Control-Allow-Origin就不能设为星号，必须指定明确的、与请求网页一致的域名。同时，Cookie依然遵循同源政策，只有用服务器域名设置的Cookie才会上传，其他域名的Cookie并不会上传，且（跨源）原网页代码中的document.cookie也无法读取服务器域名下的Cookie。

### 复杂请求

非简单请求是那种对服务器有特殊要求的请求，比如请求方法是PUT或DELETE，或者Content-Type字段的类型是application/json。

非简单请求的CORS请求，会在正式通信之前，增加一次HTTP查询请求，称为"预检"请求（preflight）。

浏览器先询问服务器，当前网页所在的域名是否在服务器的许可名单之中，以及可以使用哪些HTTP动词和头信息字段。只有得到肯定答复，浏览器才会发出正式的XMLHttpRequest请求，否则就报错。

下面是一段浏览器的JavaScript脚本。

```js
var url = 'http://api.alice.com/cors';
var xhr = new XMLHttpRequest();
xhr.open('PUT', url, true);
xhr.setRequestHeader('X-Custom-Header', 'value');
xhr.send();
```

上面代码中，HTTP请求的方法是PUT，并且发送一个自定义头信息X-Custom-Header。

浏览器发现，这是一个非简单请求，就自动发出一个"预检"请求，要求服务器确认可以这样请求。下面是这个"预检"请求的HTTP头信息。

```nginx
OPTIONS /cors HTTP/1.1
Origin: <http://api.bob.com>
Access-Control-Request-Method: PUT
Access-Control-Request-Headers: X-Custom-Header
Host: api.alice.com
Accept-Language: en-US
Connection: keep-alive
User-Agent: Mozilla/5.0...
```

"预检"请求用的请求方法是OPTIONS，表示这个请求是用来询问的。头信息里面，关键字段是Origin，表示请求来自哪个源。

除了Origin字段，"预检"请求的头信息包括两个特殊字段。

（1）Access-Control-Request-Method

该字段是必须的，用来列出浏览器的CORS请求会用到哪些HTTP方法，上例是PUT。

（2）Access-Control-Request-Headers

该字段是一个逗号分隔的字符串，指定浏览器CORS请求会额外发送的头信息字段，上例是X-Custom-Header。

### 预检请求的回应

服务器收到"预检"请求以后，检查了Origin、Access-Control-Request-Method和Access-Control-Request-Headers字段以后，确认允许跨源请求，就可以做出回应。

```
HTTP/1.1 200 OK
Date: Mon, 01 Dec 2008 01:15:39 GMT
Server: Apache/2.0.61 (Unix)
Access-Control-Allow-Origin: http://api.bob.com
Access-Control-Allow-Methods: GET, POST, PUT
Access-Control-Allow-Headers: X-Custom-Header
Content-Type: text/html; charset=utf-8
Content-Encoding: gzip
Content-Length: 0
Keep-Alive: timeout=2, max=100
Connection: Keep-Alive
Content-Type: text/plain
```

上面的HTTP回应中，关键的是Access-Control-Allow-Origin字段，表示<http://api.bob.com可以请求数据。该字段也可以设为星号，表示同意任意跨源请求。>

```
Access-Control-Allow-Origin: *
```

如果服务器否定了"预检"请求，会返回一个正常的HTTP回应，但是没有任何CORS相关的头信息字段。这时，浏览器就会认定，服务器不同意预检请求，因此触发一个错误，被XMLHttpRequest对象的onerror回调函数捕获。控制台会打印出如下的报错信息。

```
XMLHttpRequest cannot load <http://api.alice.com.>
Origin <http://api.bob.com> is not allowed by Access-Control-Allow-Origin.
```

服务器回应的其他CORS相关字段如下。

```
Access-Control-Allow-Methods: GET, POST, PUT
Access-Control-Allow-Headers: X-Custom-Header
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 1728000
```

（1）Access-Control-Allow-Methods

该字段必需，它的值是逗号分隔的一个字符串，表明服务器支持的所有跨域请求的方法。注意，返回的是所有支持的方法，而不单是浏览器请求的那个方法。这是为了避免多次"预检"请求。

（2）Access-Control-Allow-Headers

如果浏览器请求包括Access-Control-Request-Headers字段，则Access-Control-Allow-Headers字段是必需的。它也是一个逗号分隔的字符串，表明服务器支持的所有头信息字段，不限于浏览器在"预检"中请求的字段。

（3）Access-Control-Allow-Credentials

该字段与简单请求时的含义相同。

（4）Access-Control-Max-Age

该字段可选，用来指定本次预检请求的有效期，单位为秒。上面结果中，有效期是20天（1728000秒），即允许缓存该条回应1728000秒（即20天），在此期间，不用发出另一条预检请求。

### 浏览器的正常请求和回应

一旦服务器通过了"预检"请求，以后每次浏览器正常的CORS请求，就都跟简单请求一样，会有一个Origin头信息字段。服务器的回应，也都会有一个Access-Control-Allow-Origin头信息字段。

下面是"预检"请求之后，浏览器的正常CORS请求。

```
PUT /cors HTTP/1.1
Origin: <http://api.bob.com>
Host: api.alice.com
X-Custom-Header: value
Accept-Language: en-US
Connection: keep-alive
User-Agent: Mozilla/5.0...
```

上面头信息的Origin字段是浏览器自动添加的。

下面是服务器正常的回应。

```
Access-Control-Allow-Origin: <http://api.bob.com>
Content-Type: text/html; charset=utf-8
```

上面头信息中，Access-Control-Allow-Origin字段是每次回应都必定包含的。

### 与JSONP的比较

```js
<script src="http://example.com/data.php?callback=dosomething"></script>
<script type="text/javascript">
    function dosomething(jsondata){
        //处理获得的json数据
    }
</script>
```

JSON大概流程 创建一个script标签，插入请求，带上callback的，当服务器返回数据嵌在 callback() 里面，立即执行

CORS与JSONP的使用目的相同，但是比JSONP更强大。

JSONP只支持GET请求，CORS支持所有类型的HTTP请求。JSONP的优势在于支持老式浏览器，以及可以向不支持CORS的网站请求数据。

## 总结

### 参考文献

1. <http://www.ruanyifeng.com/blog/2016/04/cors.html>
