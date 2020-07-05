# BFC

## 前言

### 在解释 BFC 是什么之前，需要先介绍 Box、Formatting Context的概念

    Box: CSS布局的基本单位
        Box 是 CSS 布局的对象和基本单位， 直观点来说，就是一个页面是由很多个 Box 组成的。
        元素的类型和 display 属性，决定了这个 Box 的类型。 不同类型的 Box， 会参与不同的 Formatting Context（一个决定如何渲染文档的容器），
        因此Box内的元素会以不同的方式渲染。让我们看看有哪些盒子：
            block-level box:
                display 属性为 block, list-item, table 的元素，会生成 block-level box。并且参与 block fomatting context；
            inline-level box:
                display 属性为 inline, inline-block, inline-table 的元素，会生成 inline-level box。
                并且参与 inline formatting context

    Formatting context 　　
            Formatting context 是 W3C CSS2.1 规范中的一个概念。
            它是页面中的一块渲染区域，并且有一套渲染规则，它决定了其子元素将如何定位，以及和其他元素的关系和相互作用。
            最常见的 Formatting context 有 Block fomatting context (简称BFC)
                                        Inline formatting context (简称IFC)。

### BFC是什么

    BFC(Block formatting context)直译为"块级格式化上下文"。它是一个独立的渲染区域，只有Block-level box参与，
    它规定了内部的Block-level Box如何布局，并且与这个区域外部毫不相干

### BFC布局规则

    1.内部的Box会在垂直方向，一个接一个地放置。
    2.内部的Box垂直方向的距离由margin决定。属于同一个BFC的两个相邻Box的margin会发生重叠
    3.每个元素的margin box的左边， 与包含块border box的左边相接触(对于从左往右的格式化，否则相反)。即使存在浮动也是如此。
    4.BFC的区域不会与float box重叠。
    5.BFC就是页面上的一个隔离的独立容器，容器里面的子元素不会影响到外面的元素。反之也如此。
    6.计算BFC的高度时，浮动元素也参与计算。

### BFC什么时候出现(哪些元素会生成BFC?)

    根元素
    float属性不为none
    position为absolute或fixed
    overflow不为visible
    display为inline-block, table-cell, table-caption, flex, inline-flex

### 应用场景和解决方案

#### 两列布局

- 1.内部的Box会在垂直方向，一个接一个地放置。（这个块级格式化上下文就是根元素（body），它规定了内部的Block-level Box如何布局）
- 3.每个元素的margin box的左边， 与包含块border box的左边相接触(对于从左往右的格式化，否则相反)。即使存在浮动也是如此。
- 4.BFC的区域不会与float box重叠。

#### 清除浮动

子元素设置了浮动，父元素高度会塌陷，变现为高度为0

- 6.计算BFC的高度时，浮动元素也参与计算。
- 利用absolute，fixed，overflow不为visible，float属性不为none，都开启了父元素的BFC，解决高度塌陷问题。（position和float都有后遗症）

#### 垂直相邻外边距重叠

- 2.内部的Box垂直方向的距离由margin决定。属于同一个BFC的两个相邻Box的margin会发生重叠
- 解决让他们不相邻（添加border，padding，空标签，before伪类）
