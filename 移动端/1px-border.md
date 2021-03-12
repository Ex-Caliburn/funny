# 0.5px 实现

## 前言

首先想要实现0.5px的直线，一定要记住不能用空标签去实现，因为这违背了CSS3和HTML5分离的宗旨，HTML5只用于页面的结构

### 实验

```html
  <div style="border-bottom: 1px solid #000;"></div>
    111
    <div style="border-bottom: 0.5px solid #000"></div>
    222
    <div class="border-1px"></div>
    333
    <div class="border-1px-2"></div>
```

#### PC

chrome 中 都是显示 1px，可以通过 element  compute 面板 看到

##### 移动端

浏览器不同显示不同
webkit 浏览器 可以显示 0.5px
x5内核 0.5px 那条线直接不见了
safari 0.5px 可以显示

### 方案

#### 伪类 + transform: scale

参考vant, 可以实现 1px-border

```css
[class*='border-1px'] {
  position: relative;
  &::after {
    position: absolute;
    box-sizing: border-box;
    content: ' ';
    pointer-events: none;
    top: -50%;
    right: -50%;
    bottom: -50%;
    left: -50%;
    border: 0 solid #eaeaea;
    -webkit-transform: scale(0.5);
    transform: scale(0.5);
  }
}

.border-1px__top-bottom::after {
  border-width: 1px 0;
}
```

0.5px border

```scss
.border-1px {
  width: 100%;
  position: relative;
  &:after {
    content: '';
    height: 1px;   //控制边框宽度
    left:200%;  //控制边框长度
    position: absolute;
    left: 0px;
    top: auto;
    right: auto;
    bottom: 0px;
    background-color: #000;
    border: 0px solid transparent;
    border-radius: 0px;
    transform: scale(0.5); //缩放宽度，达到0.5px的效果
    transform-origin: top left; //定义缩放基点
  }
}
```

#### 使用SVG

完美的解决方案，还可以适配不同形状的图形。

原理是利用SVG的描边属性为1物理像素（物理像素最低也必须得有1，不然什么也看不见了），是高清屏的0.5px。

缺点是有些复杂，简单的直线不必上SVG。

若用SVG时，部分场景也需要绝对定位和设置pointer-events : none;

```
<object data="./halfLine.svg" type="image/svg+xml" />
```

SVG文件（halfLine.svg）

```
<svg xmlns='http://www.w3.org/2000/svg' width='100%' height='1px'>
    <line x1='0' y1='0' x2='100%' y2='0' stroke='#000'></line>
</svg>
```

### viewport

最后还有一个万能的方法，那就是通过控制viewport，在移端开发里面一般会把viewport的scale设置成1：

## 总结

### 参考文献
