# scroll

## 前言

在移动端会有回弹橡皮筋效果，如果要提升性能
设置让滑动流畅

```
  -webkit-overflow-scrolling: touch; /*Lets it scroll lazy*/
  ```

### overscroll-behavior

默认情况下，当触及页面顶部或者底部时（或者是其他可滚动区域），移动端浏览器倾向于提供一种“触底”效果，甚至进行页面刷新。你可能也发现了，当对话框中含有可滚动内容时，一旦滚动至对话框的边界，对话框下方的页面内容也开始滚动了——这被称为“滚动链”。 

- auto
默认效果

- contain
    设置这个值后，默认的滚动边界行为不变（“触底”效果或者刷新），但是临近的滚动区域不会被滚动链影响到，比如对话框后方的页面不会滚动。
- none
    临近滚动区域不受到滚动链影响，而且默认的滚动到边界的表现也被阻止。

在pc也出现了回弹效果，我不想要回弹效果，设置

overscroll-behavior: none;

## 总结

### 参考文献

1. <https://developer.mozilla.org/en-US/docs/Web/CSS/-webkit-overflow-scrolling>
2. <https://developer.mozilla.org/en-US/docs/Web/CSS/overscroll-behavior>
