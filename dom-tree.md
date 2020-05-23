### dom-tree
html 文档的骨架是标签
根据文档对象模型，任何一个html标签是一个对象，内嵌的标签是包裹标签的孩子，标签中的文字也是一个对象

### 自动修正
如果浏览器遇到畸形的html，当创建DOM的时候会自动修正他们
html 文件只写个hello会变成
```
hello

<html><head></head><body>hello</body></html>
```

Tables always have <tbody>

### 任何东西在html中，即使是评论，也会变成DOM的一部分

这里有12节点类型，但是常用的有四种
    1. 文档节点， DOM的入口
    2. 元素节点， html标签，文档树的建筑的砖石
    3. 文本节点， 包含文本
    4. 评论      我们有时会把信息放在这里，他不会展示，js可以从DOM读取它


### DOM
```
<html> = document.documentElement
The topmost document node is document.documentElement. That’s the DOM node of the <html> tag.
<body> = document.body
Another widely used DOM node is the <body> element – document.body.
<head> = document.head
```

### parentNode parentElement
parentElement属性返回的是元素父亲，然后 parentNode返回的是任何节点父母，这些属性常常一样，都获取父母

意外情况

```
alert( document.documentElement.parentNode ); // document
alert( document.documentElement.parentElement ); // null
```
原因： 根节点  document.documentElement (<html>) 的父亲是document，但是document不是元素节点，所以parentNode返回document，parentElement返回null


### 参考文献
1. https://javascript.info/dom-nodes