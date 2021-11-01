# ast

## 前言

AST 是什么?

Abstract Syntax Tree - 抽象语法树

当我们查看目前主流的项目中的 devDependencies，会发现各种各样的模块工具。归纳一下有：JavaScript转译、css预处理器、elint、pretiier 等等。这些模块我们不会在生产环境用到，但它们在我们的开发过程中充当着重要的角色，而所有的上述工具，都建立在 AST 的基础上。

### AST 工作流程

![图](https://mmbiz.qpic.cn/mmbiz_png/Z6bicxIx5naIHzTVz2UnkrzvJvoS4sziaib2UwOBUvQVlmnTwm3icOWicxHibqibMqebWwkWCbdOZIO7p89rQUF6ficJXA/640?wx_fmt=png&tp=webp&wxfrom=5&wx_lazy=1&wx_co=1)

parse：把代码解析为AST。

transform：对AST中的各个节点做相关操作，如新增、删除、替换、追加。业务开发 95%的代码都在这里。

generator：把AST转换为代码。

## 总结

### 参考文献

1. ![AST 辅助开发工具]([https://link](https://astexplorer.net/))
2. ![用JS解释JS！详解AST及其应用
](https://mp.weixin.qq.com/s/j8_8QwFnyOr66m9aekor1g))
