# grid

## 前言

grid-column-start 开始位置
grid-column-end 结束位置
grid-column: 1/4  span开始结束位置/结束为止  span区间

grid-row 和上面类似

grid-area: 横向和纵向区间缩写； grid-row-start, grid-column-start, grid-row-end, followed by grid-column-end

层级 可以为负值
order:1

有多少格子，占据多少空间
grid-template-columns: 20% 20% 20% 20% 20%;

grid-template-rows: 20% 20% 20% 20% 20%;

可以重复，占据的空间
grid-template-columns: repeat(5,12.5%)

不仅仅是百分比
grid-template-columns: 100px 3em 40%

fractional fr 分数,分为很多片

grid-template： grid-template-rows and grid-template-columns.
grid-template：50% 50% / 200px；

## 总结

grid 比 flex 更强，定制化

### 参考文献

1. <http://cssgridgarden.com/>
