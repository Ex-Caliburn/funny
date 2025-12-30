vue+echarts， 数据量特别大的时候很卡，有没有优化方法？

//如果不把chart写在data里，是不卡的，但是如果把chart放在data里，

chart不用放在data里啊，init用this.$el。 原型链绑一大堆当然卡。

从结构来说，echart图表单独作为一个component比较好，直接搞到$el方便复用，而且建议把整个部分包裹成method，watch data变化方便重绘。看你需求吧。

1. 数据存在localStorage
2. 刷新频率
