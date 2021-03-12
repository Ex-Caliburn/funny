# mvc和mvvm

## 前言

### mvc

视图（View）：用户界面。
控制器（Controller）：业务逻辑
模型（Model）：数据保存

![alt](http://www.ruanyifeng.com/blogimg/asset/2015/bg2015020105.png)

View 传送指令到 Controller
Controller 完成业务逻辑后，要求 Model 改变状态
Model 将新的数据发送到 View，用户得到反馈

所有通信都是单向的。

### MVVM

![alt](http://www.ruanyifeng.com/blogimg/asset/2015/bg2015020110.png)

MVVM 模式将 Presenter 改名为 ViewModel，基本上与 MVP 模式完全一致。

唯一的区别是，它采用双向绑定（data-binding）：View的变动，自动反映在 ViewModel，反之亦然。Angular 和 Ember 都采用这种模式。

## 总结

### 参考文献
1. http://www.ruanyifeng.com/blog/2015/02/mvcmvp_mvvm.html
