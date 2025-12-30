# cookie和session关系

## 背景

HTTP 是无状态协议，说明它不能以状态来区分和管理请求和响应。也就是说，服务器单从网络连接上无从知道客户身份。
cookie就是用来携带用户信息，相当于通行证，服务端可以通过通行证来区分客户

### cookie

Cookie是客户端保存用户信息的一种机制，用来记录用户的一些信息，实际上Cookie是服务器在本地机器上存储的一小段文本，并随着每次请求发送到服务器

Cookie会根据响应报文里的一个叫做Set-Cookie的首部字段信息，通知客户端保存Cookie。当下客户端再向服务端发起请求时，客户端会自动在请求报文中加入Cookie值之后发送出去.
客户端可以设置 withCredentials 携带cookie

### Set-Cookie

```javascript
Set-Cookie: logcookie=3qjj; expires=Wed, 13-Mar-2019 12:08:53 GMT; Max-Age=31536000; path=/;
 domain=fafa.com;secure; HttpOnly;
```

1. logcookie=3qjj 赋予Cookie的名称和值，logcookie是名字 ，3qjj是值
2. expires 是设置cookie有效期。当省略expires属性时，Cookie仅在关闭浏览器之前有效。可以通过覆盖已过期的Cookie，设置这个Cookie的过期时间是过去的时间，实现对客户端Cookie 的实质性删除操作。
3. path 是限制指定Cookie 的发送范围的文件目录。不过另有办法可避开这项限制，看来对其作为安全机制的效果不能抱有期待。
4. domain 通过domain属性指定的域名可以做到与结尾匹配一致。比如，指定domain是fafa.com，除了fafa.com那么www.fafa.com等都可以发送Cookie。
5. secure 设置web页面只有在HTTPS安全连接时，才可以发送Cookie。HHTP则不可以进行回收。
6. HttpOnly 它使JavaScript 脚本无法获得Cookie，通过上述设置，通常从Web 页面内还可以对Cookie 进行读取操作。但使用JavaScript 的document.cookie 就无法读取附加HttpOnly 属性后的Cookie 的内容了，不会影响请求携带 Cookie：设置了 HttpOnly 的 Cookie 仍会在浏览器发起的请求中自动携带（包括 XHR/fetch），只要同站或跨站时满足 withCredentials=true 且服务端 CORS 允许携带凭据。

7. Max-Age 设置从现在开始的存活秒数。优先级高于expires（两者同时存在时以Max-Age为准）。设置为0或负数可让浏览器删除该Cookie。
8. SameSite 用来限制第三方上下文携带Cookie，降低CSRF风险。可选值：
   - Lax 大多数跨站导航不会携带（如a链接、GET表单提交在现代浏览器通常会携带，具体实现有差异），同站请求总是携带。
   - Strict 仅同站请求携带，最安全但兼容性影响大。
   - None 表示允许第三方上下文携带，但必须同时设置Secure（否则会被浏览器丢弃）。
9. Partitioned 将Cookie分区存储（CHIPS），同一顶级站点下不同第三方来源各自有独立的Cookie分区，缓解跨站跟踪。示例：`Partitioned`。需要与`Secure; SameSite=None`配合，具体受浏览器支持情况影响。

附加说明：

- Domain 前导点（.example.com）在RFC 6265后已被忽略，写与不写前导点效果一致；未设置Domain表示“主机专属Cookie”。
- Path 默认为设置该Cookie的响应路径的目录部分。
- 删除Cookie通常通过设置过期时间到过去（expires）或`Max-Age=0`并保持相同的`Name/Path/Domain`组合。

示例：

```http
Set-Cookie: sessionId=abc123; Path=/; Domain=example.com; Max-Age=1800; Secure; HttpOnly; SameSite=Lax
Set-Cookie: ads=optout; Path=/; SameSite=None; Secure; Partitioned
Set-Cookie: __Host-pref=dark; Path=/; Secure; HttpOnly; SameSite=Strict
```

### Session

上面我讲到服务端执行session机制时候会生成session的id值，这个id值会发送给客户端，客户端每次请求都会把这个id值放到http请求的头部发送给服务端，而这个id值在客户端会保存下来，保存的容器就是cookie，因此当我们完全禁掉浏览器的cookie的时候，服务端的session也会不能正常使用。

流程

1. 客户端发起请求 如登陆，带上账号密码
2. 服务端校验通过给用户发放sessionID，在响应头设置 Set-Cookie，客户端会将cookie写在本地
3. 后续打向同一个客户端请求会自动带上cookie

### Cookie与Session的区别

1. Cookie在客户端，Session在服务端
2. cookie 不安全可以被篡改，设置HttpOnly js无法读取到cookie了
3. cookie越多也会占用带宽，服务端的解析资源，session保存在服务端，访问增多，也会占用服务器的性能
4. cookie 大小限制4kb,是所有的cookie大小总和，写入溢出不会报错，也不会写入成功

### 参考文献

1. <https://juejin.im/post/5aa783b76fb9a028d663d70a>
