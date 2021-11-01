# WebComponent

## 前言

其实组件化并没有一个明确的定义，不过这里我们可以使用 10 个字来形容什么是组件化，那就是：对内高内聚，对外低耦合。对内各个元素彼此紧密结合、相互依赖，对外和其他组件的联系最少且接口简单。

### 阻碍前端组件化的因素

1. css是可以影响全局的，不影响全局必须设定特殊的标识，但是标识符号还是可能一样
2. DOM 也是阻碍组件化的一个因素，因为在页面中只有一个 DOM，任何地方都可以直接读取和修改 DOM

### WebComponent组件化

WebComponent 是一套技术的组合，具体涉及到了 Custom elements（自定义元素）、Shadow DOM（影子 DOM）和HTML templates（HTML 模板）

- Custom elements（自定义元素）：一组JavaScript API，允许您定义custom elements及其行为，然后可以在您的用户界面中按照需要使用它们。
- Shadow DOM（影子DOM）：一组JavaScript API，用于将封装的“影子”DOM树附加到元素（与主文档DOM分开呈现）并控制其关联的功能。通过这种方式，您可以保持元素的功能私有，这样它们就可以被脚本化和样式化，而不用担心与文档的其他部分发生冲突。
- HTML templates（HTML模板）： `<template>` 和 `<slot>` 元素使您可以编写不在呈现页面中显示的标记模板。然后它们可以作为自定义元素结构的基础被多次重用。

参考 WebComponent.html例子

### 浏览器如何实现影子 DOM

影子 DOM 的作用主要有以下两点：

1. 影子 DOM 中的元素对于整个网页是不可见的；
2. 影子 DOM 的 CSS 不会影响到整个网页的 CSSOM，影子 DOM 内部的 CSS 只对内部的元素起作用。

每个影子 DOM 都有一个 shadow root 的根节点，我们可以将要展示的样式或者元素添加到影子 DOM 的根节点上，每个影子 DOM 你都可以看成是一个独立的 DOM，它有自己的样式、自己的属性，内部样式不会影响到外部样式，外部样式也不会影响到内部样式。

浏览器为了实现影子 DOM 的特性，在代码内部做了大量的条件判断，比如当通过 DOM 接口去查找元素时，渲染引擎会去判断 geek-bang 属性下面的 shadow-root 元素是否是影子 DOM，如果是影子 DOM，那么就直接跳过 shadow-root 元素的查询操作。所以这样通过 DOM API 就无法直接查询到影子 DOM 的内部元素了。

另外，当生成布局树的时候，渲染引擎也会判断 geek-bang 属性下面的 shadow-root 元素是否是影子 DOM，如果是，那么在影子 DOM 内部元素的节点选择 CSS 样式的时候，会直接使用影子 DOM 内部的 CSS 属性。所以这样最终渲染出来的效果就是影子 DOM 内部定义的样式。

## 总结

影子 DOM 的 JavaScript 脚本是不会被隔离的，比如在影子 DOM 定义的 JavaScript 函数依然可以被外部访问，
我觉原因在于，因为无法通过dom去获取shadow-root里元素，那就需要向外暴露方法可以访问影子 DOM的元素

WebComponent是从浏览器引擎实现层面解决了组件化的问题，Vue，React是从开发者层面解决了组件化的问题，提高了效率

vue和react组件化是闭包的方式生成单独函数执行上下文，vue通过css 属性选择器来生成一个封闭的环境，但是外部会出现同名属性影响到组件样式，react 函数式编程，更多的css是行内样式，但是react和vue的函数作用域无法影响全局的，WebComponent还有很远的路要走，但是思想是共通的

### 参考文献

1. <https://developer.mozilla.org/zh-CN/docs/Web/Web_Components>
