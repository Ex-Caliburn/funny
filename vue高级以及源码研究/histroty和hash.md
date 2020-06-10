# vue-router

## 前言

### history

url变化
onpopstatechange

back(), forward(), go()等方法，我们可以读取浏览器历史记录栈的信息，进行各种跳转操作。

从HTML5开始，History interface提供了两个新的方法：pushState(), replaceState()

```
window.history.pushState(stateObject, title, URL)
window.history.replaceState(stateObject, title, URL)
```

### hash

url变化
onhashchange

push
window.location.hash = path;

replaceHash
window.location.replace

### 区别

pushState设置的新URL可以是与当前URL同源的任意URL；而hash只可修改#后面的部分，故只可设置与当前同文档的URL

pushState通过stateObject可以添加任意类型的数据到记录中；而hash只可添加短字符串

pushState可额外设置title属性供后续使用

history模式则会将URL修改得就和正常请求后端的URL一样,如后端没有配置对应/user/id的路由处理，则会返回404错误
路由需要对 * 进行处理

```
#nginx
    location / {
    try_files $uri $uri/ /index.html;
    }
```

```
const router = new VueRouter({
  mode: 'history',
  routes: [
    { path: '*', component: NotFoundComponent }
  ]
})
```

### 向下兼容

```
      window.location[replace ? 'replace' : 'assign'](url);
```

### 基本流程

```
$router.push() //调用方法

2 HashHistory.push() //根据hash模式调用,设置hash并添加到浏览器历史记录（添加到栈顶）（window.location.hash= XXX）

3 History.transitionTo() //监测更新，更新则调用History.updateRoute()

4 History.updateRoute() //更新路由

5 {app._route= route} //替换当前app路由

6 vm.render() //更新视图
```

url 发生改变触发了url监听， 用户手动触发跳转 transitionTo =>  confirmTransition => 更新视图， 路由最初始时，defineProperty 绑定了路由名和页面组件的关系，当_router 发生改变的时候触发了_router的setter方法，然后触发了render页面的更新

### 参考文献

1. <https://www.jianshu.com/p/4295aec31302>
