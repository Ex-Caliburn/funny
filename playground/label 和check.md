## label 和 input

###  优点
标签文本不仅与其相应的文本输入在视觉上相关联; 它也以编程方式与它相关联。 这意味着，当用户点击到表单输入时，屏幕阅读器可以读出标签，使在使用辅助技术的用户更容易理解应输入哪些数据.
你可以单击关联的标签来聚焦或者激活 input，以及 input 本身。这种增加的命中区域为激活 input 提供了方便，包括那些使用触摸屏设备的。

### 如何建立 label 和input 关系

使用 for 属性
```
<label for="username">Click me</label>
<input type="text" id="username">
```

使用 label包裹input， 这种情况就不需要 for 和 id 属性了，这时关联是隐含的：
```
<label for="username">
    <input type="text" id="username">
</label>
```

第一种灵活性更好，不用写在一块

### 注意
1. 标签标记的表单控件称为标签元素的标签控件。一个 input 可以与多个标签相关联。
2. 标签本身并不与表单直接相关。它们只通过与它们相关联的控件间接地与表单相关联。
3. 当点击或者触碰（tap）一个与表单控件相关联的 <label> 时，关联的控件的 click 事件也会触发。
4. 不要在label元素内部放置会相互影响的元素，比如anchors，或者buttons。这样做会让用户更难激活/触发与label相关联的表单元素input，也会触发其他影响


### 参考文献
1. https://developer.mozilla.org/zh-CN/docs/Web/HTML/Element/label