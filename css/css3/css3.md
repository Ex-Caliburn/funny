# css3

## 前言

### transition

transition： CSS属性，花费时间，效果曲线(默认ease)，延迟时间(默认0)

### animation

animation：动画名称，一个周期花费时间，运动曲线（默认ease），动画延迟（默认0），播放次数（默认1），是否反向播放动画（默认normal），是否暂停动画（默认running）

@keyframes logo1 {
    0%{
        transform:rotate(180deg);
        opacity: 0;
    }
    100%{
        transform:rotate(0deg);
        opacity: 1;
    }
}

transform:适用于2D或3D转换的元素
transform-origin：转换元素的位置（围绕那个点进行转换）。默认(x,y,z)：(50%,50%,0)

### 选择器

子串匹配的属性选择器， E[attribute^="value"]， E[attribute$="value"]， E[attribute*="value"]。
新的伪类：:target， :enabled 和 :disabled， :checked， :indeterminate， :root， :nth-child 和 :nth-last-child， :nth-of-type 和 :nth-last-of-type， :last-child， :first-of-type 和 :last-of-type， :only-child 和 :only-of-type， :empty， 和 :not。
伪元素使用两个冒号而不是一个来表示：:after 变为 ::after， :before 变为 ::before， :first-letter 变为 ::first-letter， 还有 :first-line 变为 ::first-line。
新的 general sibling combinator(普通兄弟选择器)  ( h1~pre )。

nth-child
nth-of-type
last-child
element1~element2

```css
p~ul
{
background:#ff0000; // 为所有相同的父元素中位于 p 元素之后的所有 ul 元素设置背景
}
```

### box-shadow

box-shadow: 水平阴影的位置 垂直阴影的位置 模糊距离 阴影的大小 阴影的颜色 阴影开始方向（默认是从里往外，设置inset就是从外往里）;

### border-image border-radius

border-image: 图片url 图像边界向内偏移 图像边界的宽度(默认为边框的宽度) 用于指定在边框外部绘制偏移的量（默认0） 铺满方式--重复（repeat）、拉伸（stretch）或铺满（round）（默认：拉伸（stretch））;

border-radius: n1,n2,n3,n4;

### 背景

background-clip 制定背景绘制（显示）区域
background-size
background-origin

### 反射

-webkit-box-reflect:方向[ above-上 | below-下 | right-右 | left-左 ]，偏移量，遮罩图片

### 文字

语法：word-break: normal|break-all|keep-all;
语法：word-wrap: normal|break-word;

省略

```css
    overflow:hidden;
    white-space:nowrap;
    text-overflow:ellipsis;
```

多行省略

```css
    line-height:30px;
    height:60px;
    overflow : hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
```

### 渐变

background: linear-gradient(60deg, red, yellow, red, yellow, red);
radial-gradient

### Filter（滤镜）

filter:blur(3px);
filter: grayscale(100%);
....

### flex

### grid

### 盒模型

box-sizing

### 媒体查询

```css
@media screen and (max-width: 960px) {
    body {
        background-color: darkgoldenrod;
    }
}
@media screen and (max-width: 480px) {
    body {
        background-color: lightgreen;
    }
}

```

### Values and Units

定义了新的相对字体长度单位：rem 和 ch。
定义了相对视口长度单位：vw，vh，vmax 和 vmin 。
精确了绝对长度单位的实际尺寸，此前它们并非是绝对值，而是使用了 reference pixel(参考像素) 来定义。
定义 <angle>，<time>， <frequency>，<resolution>。
规范 <color>，<image> 和 <position> 定义的值。
calc()，attr()和 toggle() 函数符号的定义。

### color

增加 opacity 属性，还有 hsl()， hsla()， rgba() 和 rgb() 函数来创建 <color> 值。 它还将 currentColor 关键字定义为合法的颜色值。

transparent 颜色目前是真彩色 (多亏了支持 alpha 通道) 并且是 rgba(0,0,0,0.0) 的别名。

## 总结

### 参考文献

1. [CSS3 选择器
](https://www.w3school.com.cn/cssref/css_selectors.asp)
2. [background-clip](https://developer.mozilla.org/zh-CN/docs/Web/CSS/background-clip)
3. <https://juejin.im/post/5a0c184c51882531926e4294#heading-53>
4. <https://developer.mozilla.org/zh-CN/docs/Archive/CSS3>
