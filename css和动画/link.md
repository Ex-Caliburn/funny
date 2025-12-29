# link

## 前言

HTML外部资源链接元素 (<link>) 规定了当前文档与外部资源的关系。该元素最常用于链接样式表，此外也可以被用来创建站点图标(比如PC端的“favicon”图标和移动设备上用以显示在主屏幕的图标) 。

### crossorigin

此枚举属性指定在加载相关资源时是否必须使用 CORS. 启用 CORS 的图片 可以在 <canvas> 元素中重复使用, 并避免其被污染. 可取的值如下:

#### "anonymous"

会发起一个跨域请求(即包含 Origin: HTTP 头). 但不会发送任何认证信息 (即不发送 cookie, X.509 证书和 HTTP 基本认证信息). 如果服务器没有给出源站凭证 (不设置 Access-Control-Allow-Origin: HTTP 头), 资源就会被污染并限制使用.

#### "use-credentials"

会发起一个带有认证信息 (发送 cookie, X.509 证书和 HTTP 基本认证信息) 的跨域请求 (即包含 Origin: HTTP 头). 如果服务器没有给出源站凭证 (不设置 Access-Control-Allow-Origin: HTTP 头), 资源就会被污染并限制使用.
当不设置此属性时, 资源将会不使用 CORS 加载 (即不发送 Origin: HTTP 头), 这将阻止其在 <canvas> 元素中进行使用. 若设置了非法的值, 则视为使用 anonymous. 前往 CORS settings attributes 获取更多信息.

### importance

指示资源的相对重要性。 优先级提示使用以下值委托：

auto: 表示没有偏好。 浏览器可以使用其自己的启发式方法来确定资源的优先级。

high: 向浏览器指示资源具有高优先级。

low: 向浏览器指示资源的优先级较低。

Note: 只有存在rel=“preload”或rel=“prefetch”时，importance属性才能用于<link>元素。

#### 通过媒体查询有条件地加载资源

您可以在media属性中提供媒体类型或查询; 然后，只有在媒体条件为true时，才会加载此资源。 例如：

```html
<link href="print.css" rel="stylesheet" media="print">
<link href="mobile.css" rel="stylesheet" media="all">
<link href="desktop.css" rel="stylesheet" media="screen and (min-width: 600px)">
<link href="highres.css" rel="stylesheet" media="screen and (min-resolution: 300dpi)">
```

## 总结

1. <https://developer.mozilla.org/zh-CN/docs/Web/HTML/Element/link>

### 参考文献
