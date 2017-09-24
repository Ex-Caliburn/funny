// state 是用于存储各种状态的核心仓库，让我们一瞥 vuex/editor/state/index.js 中的内容：

// 编辑器相关状态
const editor = {
  text: 50
}

// 页面相关状态

let page = {
}

const state = {
  editor,
  page,
  count: 0
}

export default state
