# Code Review

## 前言

在构建项目的前期，前端对业务项目按端来划分人员，各端各司其职，各自沉淀。

中期随着产品的基本成型，前端团队人员按照业务领域划分成了多个子业务组前端，各组负责4端中对应模块的业务。

于是，我们团队20个前端几乎每个人都要维护4个不同的编码上下文的项目，好处是技术多样性丰富，但是瓶颈也同样存在，一个人需要拥有多端的开发能力，在编码规范和代码风格检查尽可能统一的情况下，因为上述技术体系的差异，我们还是不得不需要熟悉四端的技术架构、开发流程、数据流处理、资产市场、最佳实践。

这是很有挑战的，业务小组之间成立了一个小型的前端技术委员会，来应对这种变化：

总结原先的项目技术规范，统一宣讲、培训、文档化
打造统一标准化的研发流程
并且持续汲取新的实践并迭代

### 代码质量问题

随即，我们在代码质量上迎来了一些问题：

项目Bug较多，同样的坑不同的人会踩
迭代后的代码难维护，包括代码可读性差、复用度低等
模块的整体设计也欠缺，扩展能力难以支撑业务发展。
对代码质量的把控方面，现状流程是：我们半年要对几端的项目代码进行一次整体的code review。

但是和垃圾回收一样，整体的标记清除占用人员的时间较长，会影响届时涉及人员的业务开发进度。

于是我们想探索一种适合我们团队和业务发展，小步快跑模式的code Review，尽可能早的从一开始就参与进来，更高频率，增强审查和设计把控，减少后面返工和带来Bug所影响的整体效率。

有了这样的背景和改进诉求，我发现我们得重新定义一下我们做这件事情的目的和价值。

经过思考和讨论，我们做 Code Review 的核心目的只有两个：

### 二、定义需求

1. 从源头把控代码质量和效率
统一代码评判标准和认知
发现边界问题
提出改进建议
2. 共享和迭代集体代码智慧
交流计思路和编码实践
沉淀最佳实践
迭代统一规范
同时要做上述理想中的 Code Review，我们可能不得不面临这些实践过程中会遇到的问题：

基于这些诉求和待解决问题，我们需要对整体的标准和每一次 Code Review 的关键控制点进行细化和量化，于是有了我们第一版 Code Review 的 SOP（标准作业流程）。

### 1.2 review 小组

成立专门的 code review 小组，小组成员是各端经验丰富的人员，这样才能比较好的保障初期 Review 有比较好的效果，可以让 Code 人员有更大所获，先富带后富，经过多次 Code Review 对齐标准之后，更多 Code 优秀的同学也可以加入进来，讨论对规范和原则的实践。

1.3 设定可迭代的代码质量评价维度和标准：
每项1~5分，基准分为3分，得分在此基础上根据评分点浮动，总评分为各项得分的平均分。

① 基本面：对团队既定规范的遵循和代码开发的改动量是我们做评分的第一个基础。

难度大、工作量大，可酌情加分
是否符合基本规范

② 架构设计：是否有整体设计，设计是否合理，设计是否遵循了设计，这是第二个维度

如果有设计文档，是否按照设计文档思路来写代码，是可酌情加分
review的人是否发现了更好的解决方案
代码是否提供了很好的解决思路

③ 代码：代码细节上是否尽可能保持简单和易读，同时鼓励细节优化是我们的第三个维度

是否明显重复代码
是否合理抽取枚举值，禁止使用“魔法值”
是否合理使用已有的组件和方法
对已有的、不合理的代码进行重构和优化
职责（组件、方法）、概念是否清晰

④ 健壮性：错误处理、业务逻辑的边界和基本的安全性是我们的第四个维度

边界和异常是否考虑完备
在review阶段是否发现明显bug
是否考虑安全性（xss）

⑤ 效率：是否贡献了整体，为物料库和工具库添砖加瓦，与整体沉淀形成闭环，是我们第五个维度的初衷

是否抽取共用常量到beauty-const库，加分
是否抽取沉淀基础组件和通用业务组件到组件库，加分

## 总结

### 参考文献

1. <https://segmentfault.com/a/1190000025141916>
