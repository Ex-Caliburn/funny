## Web Components（Shadow DOM、CSS/Script 与外部关系）

### 核心结论

- **样式隔离**：Shadow DOM 内的样式仅作用于 Shadow 树；外部样式默认无法影响内部，内部样式也不会泄漏到外部。
- **脚本执行与作用域**：`<template>` 内的 `<script>` 内容在作为模板时是惰性的（不执行）；仅当脚本被真正执行时才会产生作用（可能污染全局）。
- **open vs close**：`open` 可通过 `element.shadowRoot` 访问 ShadowRoot；`close` 则返回 `null`，更强封装。

---

### CSS 与外部的关系

- **作用域边界**：
  - Shadow 树内 `<style>` 的规则只影响该 Shadow 树。
  - 外部样式（Document/Light DOM）默认无法穿透进 Shadow 树。
- **向内定制入口**：
  - `:host`：选中宿主元素本身（组件根）。
  - `:host([attr])`：基于宿主的属性做样式变体。
  - `:host-context(selector)`：基于外层环境（例如主题容器）影响宿主样式。
  - `::slotted(selector)`：能选中分发到 `<slot>` 的 Light DOM 内容（仅限“已插槽的外部节点”）。
- **跨组件样式的常见方式**：
  - 通过属性/类名让外部影响 `:host(...)` 条件。
  - 使用 CSS Custom Properties（变量）在外部向内部传值（变量会穿透 Shadow 边界）。
  - 在框架/运行时里使用 `adoptedStyleSheets`（构建期/运行时共享样式，受浏览器支持情况影响）。

---

### Script 与外部的关系

- **模板中的脚本是否执行**：
  - `<template>` 的内容是惰性的（inert）。把 `template.content` 克隆并插入 Shadow DOM 后，原封不动的 `<script>` 节点“不会自动执行”。
  - 若你“新建一个 `<script>` 元素并设置 `textContent`/`src` 再 append”，此时脚本会执行。
- **全局污染何时发生**：
  - 只有当脚本在 Window 全局上下文中执行时，未模块化的顶层声明才会挂到全局（例如 `function foo(){}`）。
  - 避免方式：将逻辑写在组件类内部方法、使用 IIFE/模块化、或通过闭包保留私有性。
- **组件内与外部交互**：
  - 事件派发：`this.dispatchEvent(new CustomEvent(...))` 供外部监听。
  - 属性/方法桥接：在自定义元素实例上暴露受控 API，而不是暴露全局。

---

### attachShadow 的 mode：'open' vs 'close'

#### open（开放模式）

- `const root = el.attachShadow({ mode: 'open' })`
- 外部可通过 `el.shadowRoot` 直接获取 `ShadowRoot`。
- 调试友好，便于测试与定制；安全性相对弱一些（外部可改内部结构）。

#### close（封闭模式）

- `const root = el.attachShadow({ mode: 'close' })`
- 外部访问 `el.shadowRoot` 得到 `null`，更强封装与不变性保障。
- 调试不便；需要通过组件对外暴露的受控 API 进行交互。

#### 共同点与注意

- 一旦创建，`mode` 不能更改。
- 两种模式下样式隔离等 Shadow DOM 语义一致。
- 在极端情况下，内部引用、反射或非标准手段仍可能被用于探测/修改内部结构，故仍应设计好对外 API。

---

### 简要示例（要点展示）

```html
<template id="t">
  <style>
    :host { display: block; }
    ::slotted(p.title) { font-weight: bold; }
  </style>
  <slot></slot>
  <!-- 注意：模板中的脚本在克隆插入后不会自动执行 -->
  <script>function foo(){ console.log('不会自动执行'); }</script>
```

```js
class XCard extends HTMLElement {
  constructor() {
    super()
    const tpl = document.getElementById('t').content
    const root = this.attachShadow({ mode: 'open' })
    root.appendChild(tpl.cloneNode(true))

    // 组件私有逻辑，避免全局污染
    this.log = () => console.log('inner')

    // 若确需执行脚本，需“新建”脚本节点
    // const s = document.createElement('script')
    // s.textContent = 'console.log("exec")'
    // root.appendChild(s)
  }
}
customElements.define('x-card', XCard)
```

---

### 实战建议

- 开发阶段用 `open` 便于调试；发布版本酌情改为 `close` 强化封装（或保留 `open` 以便运维排查）。
- 使用 `:host(...)`、CSS 变量、`::slotted(...)` 提供必要的可定制点，避免样式穿透。
- 不在模板中依赖“隐式执行”的脚本；所有副作用脚本应显式、可控地执行。
- 对外只暴露受控 API（属性/方法/事件），不要依赖全局变量/函数。
