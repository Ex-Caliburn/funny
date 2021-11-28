# Serverless

## 前言

Serverless = Faas (Function as a service) + Baas (Backend as a service)
Serverless 让我们更专注于业务开发, 一些常见的服务端问题, Serverless 都帮我们解决了:

- Serverless 不需要搭建服务端环境, 下发环境变量, 保持各个机器环境一致 (Serverless 的机制天然可复制)
- Serverless 不需要预估流量, 关心资源利用率, 备份容灾, 扩容机器 (Serverless 可以根据流量动态扩容, 按真实请求计费)
- Serverless 不需要关心内存泄露, (Serverless 的云函数服务完后即销毁)
- Serverless 有完善的配套服务, 如云数据库, 云存储, 云消息队列, 云音视频和云 AI 服务等, 利用好这些云服务, 可以极大得减少我们的工作量

以上前三点是 Faas 的范畴, 第四点是 Baas 的范畴. 简单来讲, Serverless 可以理解为有个系统, 可以上传或在线编辑一个函数, 这个函数的运行环境由系统提供, 来一个请求, 系统就自动启动一个函数进行服务, 我们只需要写函数的代码, 提交后, 系统根据流量自动扩缩容, 而函数里可以调用各种现有的云服务 api 来简化我们的开发与维护成本.

### 例子

![alt](https://user-gold-cdn.xitu.io/2019/12/2/16ec45a99f64b3b9?imageView2/0/w/1280/h/960/format/webp/ignore-error/1)

### FaaS

FaaS 提供了一个计算平台，在这个平台上，应用以一个或多个函数的形式开发、运行和管理。FaaS 平台提供了函数式应用的运行环境，一般支持多种主流的编程语言，如 Java、PHP 及 Python 等。FaaS 可以根据实际的访问量进行应用的自动化动态加载和资源的自动化动态分配。大多数 FaaS 平台基于事件驱动（Event Driven）的思想，可以根据预定义的事件触发指定的函数应用逻辑。

目前业界 FaaS 平台非常成功的一个代表就是 AWS Lambda 平台。AWS Lambda 是 AWS 公有云服务的函数式计算平台。通过 AWS Lambda，AWS 用户可以快速地在 AWS 公有云上构建基于函数的应用服务。

### BaaS

为了实现应用后台服务的 Serverless 化，BaaS（后台即服务）也应该被纳入一个完整的 Serverless 实现的范畴内。通过 BaaS 平台将应用所依赖的第三方服务，如数据库、消息队列及存储等服务化并发布出来，用户通过向 BaaS 平台申请所需要的服务进行消费，而不需要关心这些服务的具体运维。
BaaS 涵盖的范围很广泛，包含任何应用所依赖的服务。一个比较典型的例子是数据库即服务（Database as a Service，DBaaS）。许多应用都有存储数据的需求，大部分应用会将数据存储在数据库中。传统情况下，数据库都是运行在数据中心里，由用户运维团队负责运维。在DBaaS的场景下，用户向 DBaaS 平台申请数据库资源，而不需要关心数据库的安装部署及运维。

## 总结

### 参考文献

1. <https://juejin.im/post/5d42945ff265da03a715b2f0#heading-0>
2. <https://juejin.im/post/5de470a55188256e885f4fb7#heading-12>
