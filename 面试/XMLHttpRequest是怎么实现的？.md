# XMLHttpRequest是怎么实现的？

## 前言

### 系统调用栈

那就是当循环系统在执行一个任务的时候，都要为这个任务维护一个系统调用栈。这个系统调用栈类似于 JavaScript 的调用栈，只不过系统调用栈是 Chromium 的开发语言 C++ 来维护的，其完整的调用栈信息你可以通过 chrome://tracing/ 来抓取。当然，你也可以通过 Performance 来抓取它核心的调用信息，如下图所示：

![alt](https://static001.geekbang.org/resource/image/d3/77/d3d66afb1a103103e5c3f86c823efb77.png)

这幅图记录了一个 Parse HTML 的任务执行过程，其中黄色的条目表示执行 JavaScript 的过程，其他颜色的条目表示浏览器内部系统的执行过程。

通过该图你可以看出来，Parse HTML 任务在执行过程中会遇到一系列的子过程，比如在解析页面的过程中遇到了 JavaScript 脚本，那么就暂停解析过程去执行该脚本，等执行完成之后，再恢复解析过程。然后又遇到了样式表，这时候又开始解析样式表……直到整个任务执行完成。

需要说明的是，整个 Parse HTML 是一个完整的任务，在执行过程中的脚本解析、样式表解析都是该任务的子过程，其下拉的长条就是执行过程中调用栈的信息。

每个任务在执行过程中都有自己的调用栈，那么同步回调就是在当前主函数的上下文中执行回调函数，这个没有太多可讲的。下面我们主要来看看异步回调过程，异步回调是指回调函数在主函数之外执行，

一般有两种方式：
第一种是把异步函数做成一个任务，添加到信息队列尾部；
第二种是把异步函数添加到微任务队列中，这样就可以在当前任务的末尾处执行微任务了。

### XMLHttpRequest 运作机制

具体工作过程你可以参考下图：

![alt](https://static001.geekbang.org/resource/image/29/c6/2914a052f4f249a52077692a22ee5cc6.png)

 function GetWebData(URL){
    /**
     * 1:新建XMLHttpRequest请求对象
     */
    let xhr = new XMLHttpRequest()

    /**
     * 2:注册相关事件回调处理函数 
     */
    xhr.onreadystatechange = function () {
        switch(xhr.readyState){
          case 0: //请求未初始化
            console.log("请求未初始化")
            break;
          case 1://OPENED
            console.log("OPENED")
            break;
          case 2://HEADERS_RECEIVED
            console.log("HEADERS_RECEIVED")
            break;
          case 3://LOADING  
            console.log("LOADING")
            break;
          case 4://DONE
            if(this.status == 200||this.status == 304){
                console.log(this.responseText);
                }
            console.log("DONE")
            break;
        }
    }

    xhr.ontimeout = function(e) { console.log('ontimeout') }
    xhr.onerror = function(e) { console.log('onerror') }

    /**
     * 3:打开请求
     */
    xhr.open('Get', URL, true);//创建一个Get请求,采用异步


    /**
     * 4:配置参数
     */
    xhr.timeout = 3000 //设置xhr请求的超时时间
    xhr.responseType = "text" //设置响应返回的数据格式
    xhr.setRequestHeader("X_TEST","time.geekbang")

    /**
     * 5:发送请求
     */
    xhr.send();
}

1. 创建XMLHTTPRequest对象
2. 为XHR 注册对象回调函数
3. 配置基础请求信息
4. 发起请求

渲染进程会将请求发送给网络进程，然后网络进程负责资源的下载，等网络进程接收到数据之后，就会利用 IPC 来通知渲染进程；渲染进程接收到消息之后，会将 xhr 的回调函数封装成任务并添加到消息队列中，等主线程循环系统执行到该任务的时候，就会根据相关的状态来调用对应的回调函数。

- 如果网络请求出错了，就会执行 xhr.onerror；
- 如果超时了，就会执行 xhr.ontimeout；
- 如果是正常的数据接收，就会执行 onreadystatechange 来反馈相应的状态。

## 总结

 fetch采用了promise来封装，在使用方式上更强现代化，同时还原生支持async/await。在chromium中，fetch是完全重新实现的，和xmlhttprequest没有什么关系！

在项目中推荐使用fetch

fetch有一点不太友好，就是自己内部没有设置超时时间，这块需要自行完善，个人觉得还是使用axios比较方便顺手

### 参考文献
