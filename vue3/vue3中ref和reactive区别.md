# ref和reactive区别

## 前言

ref 和 reactive我们一直再用，但是一直不明所以

### reactive

比如，reactive的参数只能传递一个对象吗，如果传递其他值会怎么样？
比如，返回的响应式数据的本质是什么，为啥就能让数据变成响应式？
比如，"副本"是不是意味着响应式数据与原始数据没有关联？
比如，返回的响应式副本里头的数据是深度响应式吗，即是否递归监听对象的所有属性？等等

1. reactive的参数可以传递对象也可以传递原始值。但是原始值并不会包装成响应式数据

2. 返回的响应式数据的本质Proxy对象

3. 返回的响应式"副本"与原始数据有关联，当原始对象里头的数据或者响应式对象里头的数据发生，会彼此相互影响。两种都可以触发界面更新，操作时建议只使用响应式代理对象

4. 返回的响应式对象里头时深度递归监听每一层的，每一层都会被包装成Proxy对象

### ref

ref接受的原始数据是什么类型？是原始值还是引用值，还是都行？
返回的响应式数据本质具体是什么？根据传递的数据类型不同，返回的响应式对象是否不同？
响应式数据改变会触发界面更新，那原始数据改变会触发界面更新吗？即原始数据和返回的响应式数据是否有关联

### 小结一下

1. ref本质是将一个数据变成一个对象，这个对象具有响应式特点
2. ref接受的原始数据可以是原始值也可以是引用值，返回的对象本质都是RefImpl类的实例`
3. 无论传入的原始数据时什么类型，当原始数据发生改变时，并不会影响响应数据，更不会触发UI的更新。但当响应式数据发生改变，对应界面UI是会自动更新的，注意不影响原始数据。所以ref中，原始数据和经过ref包装后的响应式数据是无关联的

### 底层差异（精炼）

- 核心形态（实现）
  - ref：创建一个 RefImpl 实例（唯一响应键为 value），通过访问器触发依赖收集与派发（track／trigger）
  - reactive：返回原对象的 Proxy 代理，利用一组拦截器（baseHandlers／collectionHandlers）拦截 get／set／delete／has／iterate 等，再调用 track／trigger

- 创建行为（包装策略）
  - ref（x）：若 x 为对象（含数组、Map／Set 等），内部会用 reactive 包装放入 ref.value；若为原始值，仅以 RefImpl 包装
  - reactive（obj）：仅对对象／集合有效；传入原始值原样返回（不会变成响应式）

- 依赖收集与触发点（粒度）
  - ref：以固定键（value）收集与触发（读 .value → track，写 .value → trigger）
  - reactive：以属性名或迭代键为粒度（属性读 → track；写／新增／删除 → trigger；集合类型对 get／set／add／delete／iterate 分别仪表化）

- 深度与惰性（深浅）
  - ref：本体是浅的（仅 .value 是响应点）；若 .value 是对象，会被 reactive 深度代理（惰性创建子代理）
  - reactive：默认深度响应（子层按需惰性代理），亦有 shallowReactive／readonly 变体

- 解包规则（unwrap）
  - 模板中：ref 自动解包（无需写 .value）
  - reactive 属性读取：若值是 ref，自动解包为其 .value（数组索引等场景保留外壳）
  - reactive 属性写入：旧值为 ref、新值非 ref 时，写入旧值的 .value（保留外壳）

- 引用关系（与原值绑定）
  - ref：与初始传入值无绑定关系（以 .value 为准）
  - reactive：与原对象共享底层引用，通过代理访问与变更

- 解构与辅助 API
  - reactive 解构会丢失响应，需要 toRefs／toRef 保持响应
  - ref 解构不丢响应，仍通过 .value 驱动

- 集合类型（Map／Set 等）
  - reactive：对集合进行专门仪表化，按 key 与遍历维度进行依赖收集与触发
  - ref：不处理集合语义，需将集合放入 reactive 或置于 ref.value 中

- 类型与可读性（TS／模板）
  - ref：类型为 Ref<T>（通过 .value 获取 T）；模板自动解包更简洁
  - reactive：保持原结构形状，属性级追踪更细

- 性能取舍（粗细粒度）
  - 单值频繁变更：ref 更轻（单键追踪）
  - 大对象多属性：reactive 属性粒度更细，子层按需代理

- 选择建议（实践）
  - 单值状态（表单字段、开关、计数等）：优先用 ref（ ）
  - 结构化对象或集合（树、表单对象、Map／Set）：优先用 reactive（ ）
  - 需要把 reactive 的属性暴露出去给解构使用：toRefs／toRef（ ）

- 一句话总结
  - ref＝「单键容器」（响应点是 .value）
  - reactive＝「对象代理」（响应点是各属性／集合操作）
  - 模板自动解包 ref；reactive 读时解包属性里的 ref、写时尽量保留外壳

- 变更判断
  - 二者都会用 hasChanged（对 Object.is 的反判）避免相同值重复触发；reactive 对新增、删除、遍历有 ADD／DELETE／ITERATE_KEY 等触发通道

## 总结

ref 如果是传入的是一个对象，走的是 reactive 的方法

### 参考文献

1. <https://juejin.cn/post/6992976063479431175>
