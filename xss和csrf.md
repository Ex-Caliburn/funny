# xss和csrf

## 前言

项目有用到xss，但是只是片面了解，没有全面了解

## xss

XSS 全称是 Cross Site Scripting(即跨站脚本)，为了和 CSS 区分，故叫它XSS。XSS 攻击是指浏览器中执行恶意脚本(无论是跨域还是同域)，从而拿到用户的信息并进行操作。

这些操作一般可以完成下面这些事情:

- 窃取Cookie。
- 监听用户行为，比如输入账号密码后直接发送到黑客服务器。
- 修改 DOM 伪造登录表单。
- 在页面中生成浮窗广告。

### 存储型

将脚本代码存贮起来，前端没有做好转义工作，导致脚本代码存放在服务器，一般是留言框输入，在其他用户留言页面都会渲染这个脚本代码

### 反射型

反射型XSS指的是恶意脚本作为网络请求的一部分。

```javascript
http://sanyuan.com?q=<script>alert("你完蛋了")</script>

```

在服务器端会拿到q参数,然后将内容返回给浏览器端，浏览器将这些内容作为HTML的一部分解析，发现是一个脚本，直接执行，这样就被攻击了。
之所以叫它反射型, 是因为恶意脚本是通过作为网络请求的参数，经过服务器，然后再反射到HTML文档中，执行解析。和存储型不一样的是，服务器并不会存储这些恶意脚本。

### 文档型

文档型的 XSS 攻击并不会经过服务端，而是作为中间人的角色，在数据传输过程劫持到网络数据包，然后修改里面的 html 文档！

这样的劫持方式包括WIFI路由器劫持或者本地恶意软件等。

## 防范措施

共同点: 都是让恶意脚本直接能在浏览器中执行
千万不要相信任何用户的输入！

### 利用 CSP

CSP，即浏览器中的内容安全策略，它的核心思想就是服务器决定浏览器加载哪些资源，具体来说可以完成以下功能:

- 限制其他域下的资源加载。
- 禁止向其它域提交数据。
- 提供上报机制，能帮助我们及时发现 XSS 攻击。

你可以使用  Content-Security-Policy HTTP头部 来指定你的策略，像这样:

一个网站管理者想要所有内容均来自站点的同一个源 (不包括其子域名)

```header
Content-Security-Policy: default-src 'self'
```

### 利用 HttpOnly

很多 XSS 攻击脚本都是用来窃取Cookie, 而设置 Cookie 的 HttpOnly 属性后，JavaScript 便无法读取 Cookie 的值。这样也能很好的防范 XSS 攻击。

## csrf

CSRF(Cross-site request forgery), 即跨站请求伪造，指的是黑客诱导用户点击链接，打开黑客的网站，然后黑客利用用户目前的登录状态发起跨站请求。

### 1. 自动发 GET 请求

```javascript
<img src="https://xxx.com/info?user=hhh&count=100">
<img src="http://bank.example.com/withdraw?account=bob&amount=1000000&for=mallory">
```

进入页面后自动发送 get 请求，值得注意的是，这个请求会自动带上关于 xxx.com 的 cookie 信息(这里是假定你已经在 xxx.com 中登录过)。
假如服务器端没有相应的验证机制，它可能认为发请求的是一个正常的用户，因为携带了相应的 cookie，然后进行相应的各种操作，可以是转账汇款以及其他的恶意操作。

### 2. 自动发 POST 请求

```javascript
<form id='hacker-form' action="https://xxx.com/info" method="POST">
  <input type="hidden" name="user" value="hhh" />
  <input type="hidden" name="count" value="100" />
</form>
<script>document.getElementById('hacker-form').submit();</script>
```

提交会携带相应的用户 cookie 信息，让服务器误以为是一个正常的用户在操作，让各种恶意的操作变为可能。

### 3. 诱导点击发送 GET 请求

```javascript
<a href="https://xxx/info?user=hhh&count=100" taget="_blank">点击进入修仙世界</a>
```

这就是CSRF攻击的原理。和XSS攻击对比，CSRF 攻击并不需要将恶意代码注入用户当前页面的html文档中，而是跳转到新的页面，利用服务器的验证漏洞和用户之前的登录状态来模拟用户进行操作。

### 防范措施

#### 1. 利用Cookie的SameSite属性 和 HttpOnly

 HttpOnly阻止了JavaScript对Cookie的访问性
CSRF攻击中重要的一环就是自动发送目标站点下的 Cookie,然后就是这一份 Cookie 模拟了用户的身份。因此在Cookie上面下文章是防范的不二之选。
恰好，在 Cookie 当中有一个关键的字段，可以对请求中 Cookie 的携带作一些限制，这个字段就是SameSite。
SameSite可以设置为三个值，Strict、Lax和None。
a. 在Strict模式下，浏览器完全禁止第三方请求携带Cookie。比如请求sanyuan.com网站只能在sanyuan.com域名当中请求才能携带 Cookie，在其他网站请求都不能。
b. 在Lax模式，就宽松一点了，但是只能在 get 方法提交表单况或者a 标签发送 get 请求的情况下可以携带 Cookie，其他情况均不能。
c. 在None模式下，也就是默认模式，请求会自动携带上 Cookie。

#### 2. 验证来源站点

这就需要要用到请求头中的两个字段: Origin和Referer。

其中，Origin只包含域名信息，而Referer包含了具体的 URL 路径。

当然，这两者都是可以伪造的，通过 Ajax 中自定义请求头即可，安全性略差。

### 小结

CSRF(Cross-site request forgery), 即跨站请求伪造，指的是黑客诱导用户点击链接，打开黑客的网站，然后黑客利用用户目前的登录状态发起跨站请求。

## 总结

XSS和CSRF原来就摸个门道，js安全也很重要，前端断绝就直接断绝了入口

### Cookie

Cookie使基于无状态的HTTP协议记录稳定的状态信息成为了可能。cookie 渐渐也会被淘汰

主要用于以下三个方面：

会话状态管理（如用户登录状态、购物车、游戏分数或其它需要记录的信息）
个性化设置（如用户自定义设置、主题等）
浏览器行为跟踪（如跟踪分析用户行为等）

## 参考文献

1. <https://developer.mozilla.org/zh-CN/docs/Web/HTTP/CSP>
2. <https://juejin.im/post/5df5bcea6fb9a016091def69#heading-70>
3. <https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Cookies>
