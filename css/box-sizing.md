# box-sizing

## 前言

什么是标准盒模型 ？

你对一个元素所设置的 width 与 height 只会应用到这个元素的内容区。如果这个元素有任何的 border 或 padding ，绘制到屏幕上时的盒子宽度和高度会加上设置的边框和内边距值。这意味着当你调整一个元素的宽度和高度时需要时刻注意到这个元素的边框和内边距。当我们实现响应式布局时，这个特点尤其烦人。

### 属性

box-sizing 属性可以被用来调整这些表现:

content-box  是默认值。

如果你设置一个元素的宽为100px，那么这个元素的内容区会有100px 宽，并且任何边框和内边距的宽度都会被增加到最后绘制出来的元素宽度中。
宽度和高度的计算值都不包含内容的边框（border）和内边距（padding）。
比如说，.box {width: 350px; border: 10px solid black;} 在浏览器中的渲染的实际宽度将是 370px。

border-box

告诉浏览器：你想要设置的边框和内边距的值是包含在width内的。也就是说，如果你将一个元素的width设为100px，那么这100px会包含它的border和padding，内容区的实际宽度是width减去(border + padding)的值。大多数情况下，这使得我们更容易地设定一个元素的宽高。 再有 padding和border 的情况下，height，width 不能为负值，
译者注: border-box不包含margin

width 和 height 属性包括内容，内边距和边框，但不包括外边距。这是当文档处于 Quirks模式 时Internet Explorer使用的盒模型。注意，填充和边框将在盒子内 , 例如, .box {width: 350px; border: 10px solid black;} 导致在浏览器中呈现的宽度为350px的盒子。内容框不能为负，并且被分配到0，使得不可能使用border-box使元素消失。

### border

边框区域 border area 由边框边界限制，扩展自内边距区域，是容纳边框的区域。其尺寸为 border-box  宽度 和 border-box 高度。

边框的粗细由 border-width 和简写的 border 属性控制。如果 box-sizing 属性被设为 border-box，那么边框区域的大小可明确地通过 width、min-width, max-width、height、min-height，和 max-height 属性控制。假如框盒上设有背景（background-color 或 background-image），背景将会一直延伸至边框的外沿（默认为在边框下层延伸，边框会盖在背景上）。此默认表现可通过 CSS 属性 background-clip 来改变。

#### background-clip

background-clip  设置元素的背景（背景图片或颜色）是否延伸到边框、内边距盒子、内容盒子下面。

## 总结

border-box  是怪异盒模型

html默认效果就和 content-box 一样

border-box  在响应式布局时，特别好用

盒模型 和  渲染的实际宽度 是不一定相同的，但是 渲染的实际宽度是依据盒模型

### 参考文献

1. <https://developer.mozilla.org/zh-CN/docs/Web/CSS/box-sizing>
2. <https://drafts.csswg.org/css-ui-3/#box-sizing>
3. <https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_Box_Model/Introduction_to_the_CSS_box_model>
