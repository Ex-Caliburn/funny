// vuex/editor/store/index.js
import Vue from 'vue'
import Vuex from 'vuex'
// import state from '../state'
// import mutations from '../mutations'
// import { actionLogPlugin } from '../plugins'

Vue.use(Vuex)

const store = new Vuex.Store({
  state: {
    count: 10,
    todos: [
      { id: 1, text: '...', done: true },
      { id: 2, text: '...', done: false },
      { id: 3, text: 'ASDASD', done: true }
    ]
  },
  mutations: {
    increment (state) {
      state.count++
    }
  },
  getters: {
    doneTodos: state => {
      return state.todos.filter(todo => todo.done)
    }
  }
})

// 提交 mutation 的另一种方式是直接使用包含 type 属性的对象：
// store.commit({
//   type: 'INCREMENT_COUNT',
//   num: 10
// })
// console.log(store.state.count)

export default store
