<template>
  <div class="home">
    <h1 @click="add">点击</h1>
    <!--<h1 ><div>{{ count }}</div></h1>-->
    <h1 >{{doneTodosCount}}</h1>
    <h1 >{{doneTodos}}</h1>
    <!--<h1>{{ editor }}</h1>-->
    <!-- 使用 router-link 组件来导航. -->
    <!-- 通过传入 `to` 属性指定链接. -->
    <!-- <router-link> 默认会被渲染成一个 `<a>` 标签 -->
    <ul>
          <li><a href="http://router.vuejs.org/" target="_blank">vue-router</a></li>
          <li><a href="http://vuex.vuejs.org/" target="_blank">vuex</a></li>
          <li><a href="http://vue-loader.vuejs.org/" target="_blank">vue-loader</a></li>
          <li><a href="https://github.com/vuejs/awesome-vue" target="_blank">awesome-vue</a></li>
        </ul>
    <router-link to="/button">Go to button</router-link>
    <router-link to="/hello">Go to hello</router-link>
    <router-link to="/">Go to hello</router-link>
    <!-- 路由出口 -->
    <!-- 路由匹配到的组件将渲染在这里 -->
    <router-view></router-view>
  </div>
</template>

<script>
  import {
    delLayer,
    delScene,
    removeFromArr,
    incrementCount
  } from '../../vuex/editor/actions'
import { mapState } from 'vuex'
import { mapGetters } from 'vuex'

  export default {
    data () {
      return {
        msg: '跳转',
        name: true,
        openflag: false,
        test: this.editor,
        num:0
      }
    },
    methods: {
      add () {
        this.num ++
//        let num = this.count
//        incrementCount(this.$store, {num})
//        this.$store.commit({
//          type: 'INCREMENT_COUNT',
//          num
//        })
      }
    },
//    computed: mapState({
//      // 箭头函数可使代码更简练
//      count: state => state.count,
//
//      // 传字符串参数 'count' 等同于 `state => state.count`
//      countAlias: 'count',
//
//      // 为了能够使用 `this` 获取局部状态，必须使用常规函数
//      countPlusLocalState (state) {
//        this.$store.state.count = this.num
//        return state.count + this.num
//      }
//    }),
    computed: {
//      doneTodosCount () {
//          console.log(this.$store.state.todos.filter(todo => todo.done))
//        return this.$store.state.todos.filter(todo => todo.done).length
//      },
      doneTodosCount () {
        return this.$store.getters.doneTodos.length
      },
      ...mapGetters([
        'doneTodos',
        'anotherGetter',
      ])
    },

    vuex: {
      getters: {
        editor (state) {
          return state.editor
        },
        page (state) {
          return state.page
        }
      }
    }
}

</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h1, h2 {
  font-weight: normal;
}

ul {
  list-style-type: none;
  padding: 0;
}

li {
  display: inline-block;
  margin: 0 10px;
}

a {
  color: #42b983;
}
</style>
