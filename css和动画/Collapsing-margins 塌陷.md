# Collapsing-margins 外边距塌陷

## 前言

平常经常会遇到这个问题，但是有时候解决得很快，加个font-size:0 就好了，也不知道什么原理，我一路追寻，道了官方文档

官方定义:
 在css 中，两个或者多个盒子(无论他们是不是兄弟)的毗临的margin可以组合表现为一个margin，以此方式合并的边距被称为塌陷，并且合并后的边距称为margin 塌陷

相邻的垂直margin塌陷，除了一下者两种情况：

- 根元素(html)的margin 不会塌陷
- 如果具有间隙的元素的顶部和底部边距相邻，它的margin会于后续同级的margin形成塌陷，但结果边距不会与父块的底部边距一起折叠

### 间隙

间隙 定义我看得有点蒙

### 1

## 总结

### 参考文献

1. <https://www.w3.org/TR/CSS21/box.html#collapsing-margins>
2. <https://www.w3.org/TR/CSS21/visuren.html#clearance>
