// vuex/editor/store/index.js
import Vue from 'vue'
import Vuex from 'vuex'
import state from '../state'
import mutations from '../mutations'
// import { actionLogPlugin } from '../plugins'

Vue.use(Vuex)

const store = new Vuex.Store({
  state,
  mutations
  // plugins: [actionLogPlugin]
})

// 提交 mutation 的另一种方式是直接使用包含 type 属性的对象：
// store.commit({
//   type: 'INCREMENT_COUNT',
//   num: 10
// })
// console.log(store.state.count)

export default store
