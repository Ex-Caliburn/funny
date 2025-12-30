# AJAX

## 前言

基础原理在学习一遍，AJAX 引起交互的变革，无刷新拉取数据。

```js
var url = 'http://127.0.0.1:5000'
var xhr = new XMLHttpRequest()
xhr.open('delete', url)
// xhr.withCredentials = true
xhr.onreadystatechange = function () {
    if (xhr.readyState == 4) {
        if (xhr.status >= 200 && xhr.status < 300 || xhr.status == 304) {
            console.log(xhr.response)
        } else {
            console.log(xhr.response)
        }
    }
};
xhr.send()
```

## 核心方法

### open()

```js
XMLHttpRequest.open(method, url); // 常用
XMLHttpRequest.open(method, url, async, user, password); // 其他都是可选
```

**参数说明：**

- **method**: 要使用的 HTTP 方法，比如 "GET"、"POST"、"PUT"、"DELETE" 等。对于非 HTTP(S) URL 被忽略。
- **url**: 一个 DOMString 表示要向其发送请求的 URL。
- **async**: 一个可选的布尔参数，默认为 `true`，表示要不要异步执行操作。如果值为 `false`，`send()` 方法直到收到答复前不会返回。如果 `true`，已完成事务的通知可供事件监听器使用。如果 `multipart` 属性为 `true` 则这个必须为 `true`，否则将引发异常。
- **user**: 可选的用户名用于认证用途；默认为 `null`。
- **password**: 可选的密码用于认证用途，默认为 `null`。

### send()

`XMLHttpRequest.send()` 方法用于发送 HTTP 请求。如果是异步请求（默认为异步请求），则此方法会在请求发送后立即返回；如果是同步请求，则此方法直到响应到达后才会返回。

**语法：**

```js
XMLHttpRequest.send();
XMLHttpRequest.send(ArrayBuffer data);
XMLHttpRequest.send(ArrayBufferView data);
XMLHttpRequest.send(Blob data);
XMLHttpRequest.send(Document data);
XMLHttpRequest.send(DOMString? data);
XMLHttpRequest.send(FormData data);
```

**注意事项：**

- 如果没有使用 `setRequestHeader()` 方法设置 Accept 头部信息，则会发送带有 `"*/*"` 的 Accept 头部。
- 如果发送的数据是 Document 对象，需要在发送之前将其序列化。但如果未指定编码格式，则使用 utf-8 编码格式发送。
- 发送二进制内容的最佳方法（如上传文件）是使用一个与 `send()` 方法结合的 ArrayBufferView 或者 Blobs。

### abort()

如果该请求已被发出，`XMLHttpRequest.abort()` 方法将终止该请求。当一个请求被终止，它的 `readyState` 属性将被置为 0（UNSENT）。

## 属性

### readyState

`XMLHttpRequest.readyState` 属性返回一个 XMLHttpRequest 代理当前所处的状态。

| 值 | 状态 | 描述 |
|:---|:-----|:-----|
| 0 | UNSENT | 代理被创建，但尚未调用 `open()` 方法 |
| 1 | OPENED | 方法已经被调用 |
| 2 | HEADERS_RECEIVED | `send()` 方法已经被调用，并且头部和状态已经可获得 |
| 3 | LOADING | 下载中；`responseText` 属性已经包含部分数据 |
| 4 | DONE | 下载操作已完成 |

### onreadystatechange

只要 `readyState` 属性发生变化，就会调用相应的处理函数。

> **注意：** 当一个 XMLHttpRequest 请求被 `abort()` 方法取消时，其对应的 `readystatechange` 事件不会被触发。

### response

`XMLHttpRequest.response` 属性返回响应的正文。返回的类型为 `ArrayBuffer`、`Blob`、`Document`、JavaScript Object 或 `DOMString` 中的一个。这取决于 `responseType` 属性。

### withCredentials

属性是一个 Boolean 类型，它指示了是否该使用类似 cookies、authorization headers（头部授权）或者 TLS 客户端证书这一类资格证书来创建一个跨站点访问控制（cross-site Access-Control）请求。

**重要说明：**

- 在同一个站点下使用 `withCredentials` 属性是无效的
- 默认值是 `false`
- 如果在发送来自其他域的 XMLHttpRequest 请求之前，未设置 `withCredentials` 为 `true`，那么就不能为它自己的域设置 cookie 值
- 通过设置 `withCredentials` 为 `true` 获得的第三方 cookies，将会依旧享受同源策略，因此不能被通过 `document.cookie` 或者从头部相应请求的脚本等访问

### timeout

`XMLHttpRequest.timeout` 是一个无符号长整型数，代表着一个请求在被自动终止前所消耗的毫秒数。

- 默认值为 0，意味着没有超时
- 超时并不应该用在一个 document environment 中的同步 XMLHttpRequests 请求中，否则将会抛出一个 `InvalidAccessError` 类型的错误
- 当超时发生，`timeout` 事件将会被触发

> **IE 兼容性：** 在 IE 中，超时属性可能只能在调用 `open()` 方法之后且在调用 `send()` 方法之前设置。

## 数据处理

### FormData

FormData 接口提供了一种表示表单数据的键值对的构造方式，经过它的数据可以使用 `XMLHttpRequest.send()` 方法送出。

**主要方法：**

- **FormData()**: 创建一个新的 FormData 对象
- **FormData.append()**: 向 FormData 中添加新的属性值，FormData 对应的属性值存在也不会覆盖原值，而是新增一个值，如果属性不存在则新增一项属性值

**特性：**

- 本接口和此方法都相当简单直接
- 如果送出时的编码类型被设为 `"multipart/form-data"`，它会使用和表单一样的格式
- 实现了 FormData 接口的对象可以直接在 `for...of` 结构中使用，而不需要调用 `entries()`：`for (var p of myFormData)` 的作用和 `for (var p of myFormData.entries())` 是相同的

## 错误处理

### 网络错误处理

```js
xhr.onerror = function() {
    console.error('网络错误');
};

xhr.ontimeout = function() {
    console.error('请求超时');
};
```

### 状态码处理

HTTP 状态码是服务器对客户端请求的响应状态，了解这些状态码对于 AJAX 错误处理非常重要。

#### HTTP 状态码分类表

| 状态码范围 | 类别 | 说明 |
|:-----------|:-----|:-----|
| 1xx | 信息响应 | 请求已收到，继续处理 |
| 2xx | 成功响应 | 请求已成功被服务器接收、理解、并接受 |
| 3xx | 重定向 | 需要客户端采取进一步的操作才能完成请求 |
| 4xx | 客户端错误 | 客户端可能发生了错误，妨碍了服务器的处理 |
| 5xx | 服务器错误 | 服务器在处理请求时发生了错误 |

#### 常见状态码详细说明

| 状态码 | 状态文本 | 说明 | 常见场景 |
|:-------|:---------|:-----|:---------|
| **1xx - 信息响应** |
| 100 | Continue | 继续 | 服务器已收到请求头，客户端应继续发送请求体 |
| 101 | Switching Protocols | 切换协议 | 服务器正在切换协议 |
| **2xx - 成功响应** |
| 200 | OK | 成功 | 请求成功，服务器返回请求的数据 |
| 201 | Created | 已创建 | 请求成功，服务器创建了新资源 |
| 202 | Accepted | 已接受 | 请求已接受，但处理尚未完成 |
| 204 | No Content | 无内容 | 请求成功，但响应体为空 |
| **3xx - 重定向** |
| 301 | Moved Permanently | 永久重定向 | 请求的资源已永久移动到新位置 |
| 302 | Found | 临时重定向 | 请求的资源临时从不同的 URI 响应请求 |
| 304 | Not Modified | 未修改 | 资源未修改，可使用缓存的版本 |
| 307 | Temporary Redirect | 临时重定向 | 临时重定向，保持请求方法不变 |
| **4xx - 客户端错误** |
| 400 | Bad Request | 错误请求 | 请求语法错误，服务器无法理解 |
| 401 | Unauthorized | 未授权 | 需要身份验证，未提供有效的认证信息 |
| 403 | Forbidden | 禁止访问 | 服务器理解请求但拒绝执行 |
| 404 | Not Found | 未找到 | 请求的资源不存在 |
| 405 | Method Not Allowed | 方法不允许 | 请求方法不被允许 |
| 409 | Conflict | 冲突 | 请求与服务器当前状态冲突 |
| 422 | Unprocessable Entity | 无法处理的实体 | 请求格式正确，但语义错误 |
| 429 | Too Many Requests | 请求过多 | 请求频率超过限制 |
| **5xx - 服务器错误** |
| 500 | Internal Server Error | 内部服务器错误 | 服务器遇到意外情况，无法完成请求 |
| 502 | Bad Gateway | 网关错误 | 作为网关或代理的服务器收到无效响应 |
| 503 | Service Unavailable | 服务不可用 | 服务器暂时无法处理请求 |
| 504 | Gateway Timeout | 网关超时 | 作为网关或代理的服务器未及时获得响应 |
| 505 | HTTP Version Not Supported | HTTP 版本不支持 | 服务器不支持请求中使用的 HTTP 协议版本 |

#### 状态码处理示例

```js
xhr.onreadystatechange = function() {
    if (xhr.readyState === 4) {
        if (xhr.status >= 200 && xhr.status < 300) {
            // 成功处理
            console.log('成功:', xhr.responseText);
        } else if (xhr.status === 404) {
            console.error('资源未找到');
        } else if (xhr.status >= 500) {
            console.error('服务器错误');
        } else {
            console.error('请求失败:', xhr.status);
        }
    }
};
```

## 跨域请求 (CORS)

### 简单请求

简单请求不需要预检请求，直接发送：

```js
// 简单请求示例
var xhr = new XMLHttpRequest();
xhr.open('GET', 'https://api.example.com/data');
xhr.send();
```

### 预检请求

复杂请求需要先发送 OPTIONS 请求：

```js
// 需要预检的请求
var xhr = new XMLHttpRequest();
xhr.open('POST', 'https://api.example.com/data');
xhr.setRequestHeader('Content-Type', 'application/json');
xhr.setRequestHeader('Authorization', 'Bearer token');
xhr.send(JSON.stringify({name: 'test'}));
```

### 跨域设置

```js
// 设置跨域凭证
xhr.withCredentials = true;

// 服务器端需要设置
// Access-Control-Allow-Credentials: true
// Access-Control-Allow-Origin: https://yourdomain.com
```

## 实用示例

### GET 请求示例

```js
function getData(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                callback(null, JSON.parse(xhr.responseText));
            } else {
                callback(new Error('请求失败: ' + xhr.status));
            }
        }
    };
    xhr.onerror = function() {
        callback(new Error('网络错误'));
    };
    xhr.send();
}

// 使用示例
getData('https://api.example.com/users', function(err, data) {
    if (err) {
        console.error(err);
        return;
    }
    console.log('用户数据:', data);
});
```

### POST 请求示例

```js
function postData(url, data, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Content-Type', 'application/json');
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status >= 200 && xhr.status < 300) {
                callback(null, JSON.parse(xhr.responseText));
            } else {
                callback(new Error('请求失败: ' + xhr.status));
            }
        }
    };
    
    xhr.send(JSON.stringify(data));
}

// 使用示例
postData('https://api.example.com/users', {
    name: 'John',
    email: 'john@example.com'
}, function(err, result) {
    if (err) {
        console.error(err);
        return;
    }
    console.log('创建成功:', result);
});
```

### 文件上传示例

```js
function uploadFile(url, file, callback) {
    var xhr = new XMLHttpRequest();
    var formData = new FormData();
    formData.append('file', file);
    
    xhr.open('POST', url);
    
    // 上传进度
    xhr.upload.onprogress = function(e) {
        if (e.lengthComputable) {
            var percentComplete = (e.loaded / e.total) * 100;
            console.log('上传进度:', percentComplete + '%');
        }
    };
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                callback(null, JSON.parse(xhr.responseText));
            } else {
                callback(new Error('上传失败: ' + xhr.status));
            }
        }
    };
    
    xhr.send(formData);
}
```

## Fetch API vs XMLHttpRequest

### 主要区别对比

| 特性 | XMLHttpRequest | Fetch API |
|:-----|:---------------|:----------|
| **语法** | 回调函数，事件驱动 | Promise 链式调用，async/await |
| **错误处理** | 需要手动检查状态码 | 只有网络错误才会 reject |
| **超时控制** | 内置 timeout 属性 | 需要 AbortController |
| **请求取消** | 支持 abort() 方法 | 需要 AbortController |
| **进度监控** | 内置 upload.onprogress | 需要 ReadableStream |
| **浏览器支持** | IE6+ | IE 不支持，现代浏览器支持 |
| **代码复杂度** | 较复杂，需要更多样板代码 | 更简洁，现代 JavaScript 风格 |

### Fetch API

#### 基本使用

```js
// 基本使用
fetch('https://api.example.com/data')
    .then(response => {
        if (!response.ok) {
            throw new Error('网络响应错误');
        }
        return response.json();
    })
    .then(data => console.log(data))
    .catch(error => console.error('请求失败:', error));

// 使用 async/await
async function fetchData() {
    try {
        const response = await fetch('https://api.example.com/data');
        if (!response.ok) {
            throw new Error('网络响应错误');
        }
        const data = await response.json();
        console.log(data);
    } catch (error) {
        console.error('请求失败:', error);
    }
}
```

#### 设置请求头

Fetch API 通过第二个参数（配置对象）来设置请求头：

```js
// 基本语法
fetch(url, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
        'X-Custom-Header': 'custom-value'
    },
    body: JSON.stringify(data)
});
```

#### 请求头设置方法详解

**1. 单个请求头设置：**

```js
fetch('https://api.example.com/data', {
    headers: {
        'Authorization': 'Bearer ' + token
    }
});
```

**2. 多个请求头设置：**

```js
fetch('https://api.example.com/data', {
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
        'X-API-Key': 'your-api-key',
        'X-Request-ID': generateUUID(),
        'Accept': 'application/json'
    }
});
```

**3. 使用 Headers 对象：**

```js
const headers = new Headers();
headers.append('Content-Type', 'application/json');
headers.append('Authorization', 'Bearer ' + token);
headers.append('X-Custom-Header', 'custom-value');

fetch('https://api.example.com/data', {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(data)
});
```

**4. 动态设置请求头：**

```js
function createHeaders(token, apiKey) {
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (token) {
        headers['Authorization'] = 'Bearer ' + token;
    }
    
    if (apiKey) {
        headers['X-API-Key'] = apiKey;
    }
    
    return headers;
}

fetch('https://api.example.com/data', {
    method: 'POST',
    headers: createHeaders(userToken, apiKey),
    body: JSON.stringify(data)
});
```

#### 常见请求头设置场景

**1. JSON 数据请求：**

```js
fetch('https://api.example.com/users', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({
        name: 'John Doe',
        email: 'john@example.com'
    })
});
```

**2. 文件上传：**

```js
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('description', 'My file');

fetch('https://api.example.com/upload', {
    method: 'POST',
    headers: {
        'Authorization': 'Bearer ' + token
        // 注意：文件上传时不要设置 Content-Type，让浏览器自动设置
    },
    body: formData
});
```

**3. 表单数据：**

```js
const formData = new FormData();
formData.append('username', 'john');
formData.append('password', 'secret');

fetch('https://api.example.com/login', {
    method: 'POST',
    headers: {
        'Authorization': 'Basic ' + btoa('john:secret')
    },
    body: formData
});
```

**4. 自定义认证：**

```js
fetch('https://api.example.com/protected', {
    method: 'GET',
    headers: {
        'X-API-Key': 'your-api-key',
        'X-Client-ID': 'client123',
        'X-Request-ID': generateUUID(),
        'X-Timestamp': Date.now().toString()
    }
});
```

#### 请求头设置的注意事项

**1. 大小写敏感：**

```js
// 这些是不同的头部
headers: {
    'content-type': 'application/json',  // 小写
    'Content-Type': 'application/json'   // 标准格式
}
```

**2. 特殊头部限制：**

```js
// 以下头部不能通过 JavaScript 设置（浏览器安全限制）
// - Host
// - Origin
// - Referer
// - User-Agent
// - Accept-Encoding
// - Connection
// - Keep-Alive
// - Transfer-Encoding
// - Upgrade
// - Via
```

**3. 默认头部：**

```js
// 浏览器会自动添加以下头部（如果未设置）
// - Accept: */*
// - Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
// - Accept-Encoding: gzip, deflate, br
// - Connection: keep-alive
// - User-Agent: Mozilla/5.0...
```

#### 全局请求头设置

**1. 创建自定义 fetch 函数：**

```js
function customFetch(url, options = {}) {
    const defaultHeaders = {
        'Content-Type': 'application/json',
        'X-Client-Version': '1.0.0',
        'X-Request-ID': generateUUID()
    };
    
    const finalOptions = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers
        }
    };
    
    return fetch(url, finalOptions);
}

// 使用
customFetch('https://api.example.com/data', {
    headers: {
        'Authorization': 'Bearer ' + token
    }
});
```

**2. 使用拦截器模式：**

```js
class FetchClient {
    constructor(baseURL, defaultHeaders = {}) {
        this.baseURL = baseURL;
        this.defaultHeaders = defaultHeaders;
    }
    
    request(endpoint, options = {}) {
        const url = this.baseURL + endpoint;
        const finalOptions = {
            ...options,
            headers: {
                ...this.defaultHeaders,
                ...options.headers
            }
        };
        
        return fetch(url, finalOptions);
    }
    
    get(endpoint, headers = {}) {
        return this.request(endpoint, { method: 'GET', headers });
    }
    
    post(endpoint, data, headers = {}) {
        return this.request(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...headers
            },
            body: JSON.stringify(data)
        });
    }
}

// 使用
const api = new FetchClient('https://api.example.com', {
    'X-API-Key': 'your-api-key',
    'X-Client-ID': 'client123'
});

api.get('/users', { 'Authorization': 'Bearer ' + token });
api.post('/users', { name: 'John' }, { 'Authorization': 'Bearer ' + token });
```

### 详细对比分析

#### 1. 语法和可读性

**XMLHttpRequest (传统 AJAX):**

```js
// 传统方式 - 回调地狱
var xhr = new XMLHttpRequest();
xhr.open('GET', 'https://api.example.com/data');
xhr.onreadystatechange = function() {
    if (xhr.readyState === 4) {
        if (xhr.status === 200) {
            var data = JSON.parse(xhr.responseText);
            console.log(data);
        } else {
            console.error('请求失败:', xhr.status);
        }
    }
};
xhr.onerror = function() {
    console.error('网络错误');
};
xhr.send();
```

**Fetch API (现代方式):**

```js
// 现代方式 - Promise 链
fetch('https://api.example.com/data')
    .then(response => response.json())
    .then(data => console.log(data))
    .catch(error => console.error('请求失败:', error));

// 或者使用 async/await
async function getData() {
    try {
        const response = await fetch('https://api.example.com/data');
        const data = await response.json();
        console.log(data);
    } catch (error) {
        console.error('请求失败:', error);
    }
}
```

#### 2. 错误处理差异

**XMLHttpRequest 错误处理:**

```js
xhr.onreadystatechange = function() {
    if (xhr.readyState === 4) {
        if (xhr.status >= 200 && xhr.status < 300) {
            // 成功
            console.log(xhr.responseText);
        } else {
            // HTTP 错误状态码
            console.error('HTTP 错误:', xhr.status);
        }
    }
};
xhr.onerror = function() {
    // 网络错误
    console.error('网络错误');
};
```

**Fetch API 错误处理:**

```js
fetch('https://api.example.com/data')
    .then(response => {
        // Fetch 只有在网络错误时才会 reject
        // HTTP 错误状态码（如 404、500）不会触发 catch
        if (!response.ok) {
            throw new Error(`HTTP 错误: ${response.status}`);
        }
        return response.json();
    })
    .then(data => console.log(data))
    .catch(error => {
        // 这里会捕获网络错误和手动抛出的 HTTP 错误
        console.error('请求失败:', error);
    });
```

#### 3. 超时和取消控制

**XMLHttpRequest 超时控制:**

```js
var xhr = new XMLHttpRequest();
xhr.timeout = 5000; // 5秒超时
xhr.ontimeout = function() {
    console.log('请求超时');
};
xhr.open('GET', 'https://api.example.com/data');
xhr.send();

// 取消请求
xhr.abort();
```

**Fetch API 超时和取消控制:**

```js
// 使用 AbortController 实现超时和取消
function fetchWithTimeout(url, timeout = 5000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    return fetch(url, { signal: controller.signal })
        .then(response => {
            clearTimeout(timeoutId);
            return response;
        })
        .catch(error => {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('请求超时');
            }
            throw error;
        });
}

// 使用
fetchWithTimeout('https://api.example.com/data', 3000)
    .then(response => response.json())
    .then(data => console.log(data))
    .catch(error => console.error('请求失败:', error));
```

#### 4. 进度监控

**XMLHttpRequest 进度监控:**

```js
xhr.upload.onprogress = function(e) {
    if (e.lengthComputable) {
        var percentComplete = (e.loaded / e.total) * 100;
        console.log('上传进度:', percentComplete + '%');
    }
};

xhr.onprogress = function(e) {
    if (e.lengthComputable) {
        var percentComplete = (e.loaded / e.total) * 100;
        console.log('下载进度:', percentComplete + '%');
    }
};
```

**Fetch API 进度监控:**

```js
// Fetch API 本身不支持进度监控，需要使用 ReadableStream
async function fetchWithProgress(url) {
    const response = await fetch(url);
    const reader = response.body.getReader();
    const contentLength = +response.headers.get('Content-Length');
    
    let receivedLength = 0;
    const chunks = [];
    
    while(true) {
        const {done, value} = await reader.read();
        
        if (done) break;
        
        chunks.push(value);
        receivedLength += value.length;
        
        // 计算进度
        const progress = (receivedLength / contentLength) * 100;
        console.log('下载进度:', progress.toFixed(2) + '%');
    }
    
    // 合并数据
    const chunksAll = new Uint8Array(receivedLength);
    let position = 0;
    for(let chunk of chunks) {
        chunksAll.set(chunk, position);
        position += chunk.length;
    }
    
    return new TextDecoder().decode(chunksAll);
}
```

#### 5. 何时使用哪种方式

**使用 XMLHttpRequest 的场景:**

- 需要支持 IE 浏览器
- 需要精确的进度监控
- 需要简单的超时控制
- 项目对浏览器兼容性要求较高

**使用 Fetch API 的场景:**

- 现代浏览器环境
- 使用 Promise 和 async/await 语法
- 需要更好的错误处理
- 代码简洁性和可维护性要求高

#### 6. 凭证处理对比

**XMLHttpRequest 的 withCredentials:**

```js
var xhr = new XMLHttpRequest();
xhr.open('GET', 'https://api.example.com/data');
xhr.withCredentials = true;  // 布尔值，简单直接
xhr.send();
```

**Fetch API 的 credentials:**

```js
// 更灵活的选项
fetch('https://api.example.com/data', {
    credentials: 'include'  // 字符串选项，功能更丰富
});

// 可以针对不同请求设置不同的凭证策略
fetch('https://api.example.com/public-data', {
    credentials: 'omit'  // 公开数据不需要凭证
});

fetch('https://api.example.com/user-data', {
    credentials: 'include'  // 用户数据需要凭证
});
```

**主要区别：**

- **XMLHttpRequest**: `withCredentials` 是布尔值，只有 true/false 两种选择
- **Fetch API**: `credentials` 有三个选项，提供更精细的控制
- **功能等价**: `credentials: 'include'` 等同于 `withCredentials: true`

### 8. withCredentials 与自定义请求头的关系

#### 重要澄清：withCredentials 不影响自定义请求头

**关键点：`withCredentials` 只影响 cookies 等凭证的自动传递，不影响手动设置的请求头！**

```js
// 即使不设置 withCredentials，Authorization 等自定义请求头仍然会正常发送
var xhr = new XMLHttpRequest();
xhr.open('GET', 'https://api.example.com/data');

// 这些请求头无论 withCredentials 如何设置都会发送
xhr.setRequestHeader('Authorization', 'Bearer token123');
xhr.setRequestHeader('X-Custom-Header', 'custom-value');
xhr.setRequestHeader('Content-Type', 'application/json');

// withCredentials 只影响 cookies 等凭证
xhr.withCredentials = false;  // 不发送 cookies，但 Authorization 仍然发送

xhr.send();
```

#### 实际请求对比

**不设置 withCredentials 的请求：**

```http
GET /api/data HTTP/1.1
Host: api.example.com
Authorization: Bearer token123
X-Custom-Header: custom-value
Content-Type: application/json
Accept: */*
```

**设置 withCredentials 的请求：**

```http
GET /api/data HTTP/1.1
Host: api.example.com
Authorization: Bearer token123
X-Custom-Header: custom-value
Content-Type: application/json
Accept: */*
Cookie: sessionId=abc123; userId=456
```

**区别：只有 Cookie 头部会变化，自定义请求头不受影响！**

#### 详细说明

**1. withCredentials 的作用范围：**

```js
// withCredentials 只影响以下内容的自动传递：
// ✅ Cookies（当前域名的 cookies）
// ✅ TLS 客户端证书
// ✅ HTTP 基本认证信息

// withCredentials 不影响以下内容：
// ❌ 手动设置的请求头（如 Authorization、X-Custom-Header 等）
// ❌ 请求体内容
// ❌ URL 参数
```

**2. 自定义请求头的传递规则：**

```js
// 这些请求头总是会发送，不受 withCredentials 影响
xhr.setRequestHeader('Authorization', 'Bearer ' + token);
xhr.setRequestHeader('X-API-Key', 'your-api-key');
xhr.setRequestHeader('X-Request-ID', generateUUID());
xhr.setRequestHeader('User-Agent', 'CustomApp/1.0');

// 即使 withCredentials = false，这些头部仍然会发送
xhr.withCredentials = false;
```

**3. 实际应用场景：**

**场景1：只需要 API Key，不需要 cookies**

```js
var xhr = new XMLHttpRequest();
xhr.open('GET', 'https://api.example.com/public-data');
xhr.setRequestHeader('X-API-Key', 'your-public-api-key');
xhr.withCredentials = false;  // 不发送 cookies，节省带宽
xhr.send();
```

**场景2：需要用户认证，包含 cookies**

```js
var xhr = new XMLHttpRequest();
xhr.open('GET', 'https://api.example.com/user-data');
xhr.setRequestHeader('Authorization', 'Bearer ' + userToken);
xhr.withCredentials = true;  // 发送 cookies + Authorization
xhr.send();
```

**场景3：混合认证方式**

```js
var xhr = new XMLHttpRequest();
xhr.open('POST', 'https://api.example.com/data');
xhr.setRequestHeader('Authorization', 'Bearer ' + token);
xhr.setRequestHeader('X-Client-ID', 'client123');
xhr.withCredentials = false;  // 不发送 cookies，但 Authorization 和 X-Client-ID 仍然发送

var data = { name: 'test' };
xhr.send(JSON.stringify(data));
```

#### 跨域请求的特殊情况

**简单请求（不需要预检）：**

```js
// GET 请求，只设置 Authorization 头部
var xhr = new XMLHttpRequest();
xhr.open('GET', 'https://api.example.com/data');
xhr.setRequestHeader('Authorization', 'Bearer token');
xhr.withCredentials = false;  // Authorization 仍然会发送

xhr.send();
```

**复杂请求（需要预检）：**

```js
// POST 请求，设置多个自定义头部
var xhr = new XMLHttpRequest();
xhr.open('POST', 'https://api.example.com/data');
xhr.setRequestHeader('Authorization', 'Bearer token');
xhr.setRequestHeader('X-Custom-Header', 'value');
xhr.setRequestHeader('Content-Type', 'application/json');
xhr.withCredentials = false;  // 所有自定义头部仍然会发送

xhr.send(JSON.stringify({data: 'test'}));
```

#### 总结

**重要结论：**

1. **`withCredentials` 只控制 cookies 等凭证的自动传递**
2. **自定义请求头（如 `Authorization`）总是会发送，不受 `withCredentials` 影响**
3. **`withCredentials = false` 时，仍然可以正常使用 API Key、JWT Token 等认证方式**
4. **`withCredentials = true` 主要用于需要发送 cookies 的场景**

**混合使用策略:**

```js
// 根据浏览器支持情况选择
function makeRequest(url, options = {}) {
    if (window.fetch) {
        // 使用 Fetch API
        return fetch(url, options);
    } else {
        // 降级到 XMLHttpRequest
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open(options.method || 'GET', url);
            
            if (options.headers) {
                Object.keys(options.headers).forEach(key => {
                    xhr.setRequestHeader(key, options.headers[key]);
                });
            }
            
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve({
                            ok: true,
                            status: xhr.status,
                            json: () => Promise.resolve(JSON.parse(xhr.responseText)),
                            text: () => Promise.resolve(xhr.responseText)
                        });
                    } else {
                        reject(new Error(`HTTP ${xhr.status}`));
                    }
                }
            };
            
            xhr.onerror = () => reject(new Error('网络错误'));
            xhr.send(options.body);
        });
    }
}

### Axios

```js
// 安装: npm install axios
import axios from 'axios';

// 基本请求
axios.get('https://api.example.com/data')
    .then(response => console.log(response.data))
    .catch(error => console.error(error));

// 配置默认值
axios.defaults.baseURL = 'https://api.example.com';
axios.defaults.timeout = 5000;
axios.defaults.headers.common['Authorization'] = 'Bearer token';

// 拦截器
axios.interceptors.request.use(config => {
    console.log('发送请求:', config);
    return config;
});

axios.interceptors.response.use(response => {
    console.log('收到响应:', response);
    return response;
});
```

## 性能优化

### 请求缓存

```js
// 添加缓存头
xhr.setRequestHeader('Cache-Control', 'max-age=3600');
xhr.setRequestHeader('ETag', 'etag-value');
```

### 请求取消

```js
// 创建 AbortController
var controller = new AbortController();
var signal = controller.signal;

// 使用 Fetch API 的 signal
fetch('https://api.example.com/data', { signal })
    .then(response => response.json())
    .catch(error => {
        if (error.name === 'AbortError') {
            console.log('请求被取消');
        }
    });

// 取消请求
controller.abort();
```

### 并发控制

```js
// 限制并发请求数量
class RequestQueue {
    constructor(maxConcurrent = 3) {
        this.maxConcurrent = maxConcurrent;
        this.running = 0;
        this.queue = [];
    }
    
    add(requestFn) {
        return new Promise((resolve, reject) => {
            this.queue.push({ requestFn, resolve, reject });
            this.process();
        });
    }
    
    async process() {
        if (this.running >= this.maxConcurrent || this.queue.length === 0) {
            return;
        }
        
        this.running++;
        const { requestFn, resolve, reject } = this.queue.shift();
        
        try {
            const result = await requestFn();
            resolve(result);
        } catch (error) {
            reject(error);
        } finally {
            this.running--;
            this.process();
        }
    }
}
```

## 兼容性

### IE 兼容性

IE 5 和 6 可以通过使用 `ActiveXObject()` 支持 AJAX。

### 现代浏览器支持

| 特性 | Chrome | Firefox | Safari | Edge |
|:-----|:-------|:--------|:-------|:-----|
| XMLHttpRequest | 1+ | 1+ | 1.2+ | 12+ |
| Fetch API | 42+ | 39+ | 10.1+ | 14+ |
| AbortController | 66+ | 57+ | 12.1+ | 16+ |

## 最佳实践

1. **错误处理**: 始终处理网络错误和状态码错误
2. **超时设置**: 为长时间运行的请求设置合理的超时时间
3. **请求取消**: 在组件卸载或页面切换时取消未完成的请求
4. **重试机制**: 对于临时性错误实现重试逻辑
5. **缓存策略**: 合理使用缓存减少重复请求
6. **安全性**: 验证响应数据，防止 XSS 攻击
7. **性能**: 避免频繁的请求，考虑使用防抖和节流

## 总结

AJAX 是现代 Web 开发中不可或缺的技术，它通过 XMLHttpRequest 对象实现了无刷新的数据交互，大大提升了用户体验。

虽然现代开发中更推荐使用 Fetch API 或 Axios 等更现代的方案，但理解 XMLHttpRequest 的工作原理仍然很重要，特别是在处理复杂的浏览器兼容性需求时。

## 参考文献

1. [XMLHttpRequest.readyState - Web API 接口参考 | MDN](https://developer.mozilla.org/zh-CN/docs/Web/API/XMLHttpRequest/readyState)
2. [FormData - Web API 接口参考 | MDN](https://developer.mozilla.org/zh-CN/docs/Web/API/FormData)
3. [Fetch API - Web API 接口参考 | MDN](https://developer.mozilla.org/zh-CN/docs/Web/API/Fetch_API)
4. [CORS - 跨源资源共享 | MDN](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/CORS)
