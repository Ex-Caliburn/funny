<template>
  <div class="home">
    <h1 @click="add">点击</h1>
    <h1>{{ test }}</h1>
    <!-- 使用 router-link 组件来导航. -->
    <!-- 通过传入 `to` 属性指定链接. -->
    <!-- <router-link> 默认会被渲染成一个 `<a>` 标签 -->
    <ul v-for="i in arr.length">
      <li>{{item}}</li>
    </ul>
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

  export default {
    data () {
      return {
        msg: '跳转',
        name: true,
        openflag: false,
        test: this.editor,
        count: 1,
        num: '',
        arr: [6, 11, 3, 4, 5, 3]
      }
    },
    methods: {
      add () {
        this.count ++
        let num = this.count
//        console.log(this.$store.state.editor)
        incrementCount(this.$store, {num})
//        this.$store.commit({
//          type: 'INCREMENT_COUNT',
//          num
//        })
      }
    },
    computed: {
      test () {
        console.log(this.$store.state.editor.text)
        return this.$store.state.editor.text
      }
    },
    vuex: {
      getters: {
        editor (state) {
          return state.editor
        },
        page (state) {
          return state.page
        }
      },
      actions: {
        delLayer,
        delScene,
        removeFromArr,
        incrementCount
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
