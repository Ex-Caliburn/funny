# 前端存储

## 前言

各种各样的存储方式，在什么场景使用呢

### localStorage

持久性数据存贮，用户不删除永久存在
多个tab标签页，共享localStorage存储信息
浏览器提供api
缺点：
5M
只能存放字符串，其他格式需要转换为字符串

### sessionStorage

持久性数据存贮，用户不删除永久存在
生命周期是tap标签页，相同域名下，多个tab标签页，不共享sessionStorage存储信息
浏览器提供api
安全性的东西可以暂时放这里
缺点：5M

### cookie

存放服务端session，解决http无状态问题，请求资源时会携带cookie，跨站点访问需要设置withCredentials才会携带cookie

缺点：

1. 4kb
2. 容易被恶意窃取设置的信息

### withCredentials

MLHttpRequest.withCredentials  属性是一个Boolean类型，它指示了是否该使用类似cookies,authorization headers(头部授权)或者TLS客户端证书这一类资格证书来创建一个跨站点访问控制（cross-site Access-Control）请求。在同一个站点下使用withCredentials属性是无效的。

#### Secure 和HttpOnly

标记为 Secure 的Cookie只应通过被HTTPS协议加密过的请求发送给服务端。但即便设置了 Secure 标记，敏感信息也不应该通过Cookie传输，因为Cookie有其固有的不安全性，Secure 标记也无法提供确实的安全保障。从 Chrome 52 和 Firefox 52 开始，不安全的站点（http:）无法使用Cookie的 Secure 标记。

为避免跨域脚本 (XSS) 攻击，通过JavaScript的 Document.cookie API无法访问带有 HttpOnly 标记的Cookie，它们只应该发送给服务端。如果包含服务端 Session 信息的 Cookie 不想被客户端 JavaScript 脚本调用，那么就应该为其设置 HttpOnly 标记。

#### SameSite

SameSite Cookie允许服务器要求某个cookie在跨站请求时不会被发送，从而可以阻止跨站请求伪造攻击

None

浏览器会在同站请求、跨站请求下继续发送cookies，不区分大小写。

Strict

浏览器将只在访问相同站点时发送cookie。（在原有Cookies的限制条件上的加强，如上文“Cookie的作用域” 所述）

Lax

在新版本浏览器中，为默认选项，Same-site cookies 将会为一些跨站子请求保留，如图片加载或者frames的调用，但只有当用户从外部站点导航到URL时才会发送。如link链接

### indexDB

前端数据库
储存较大数据结构，关系型数据库

## 总结

### 参考文献

1. <https://developer.mozilla.org/zh-CN/docs/Web/API/XMLHttpRequest/withCredentials>
