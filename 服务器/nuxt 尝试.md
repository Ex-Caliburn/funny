
## nuxt

文档写的是真的不错！

### 服务器端渲染 (SSR)优点

更好的 SEO，由于搜索引擎爬虫抓取工具可以直接查看完全渲染的页面。
服务端渲染利于seo，爬虫搜索
更快的内容到达时间 (time-to-content)，解决首屏白屏

### 静态页面

nuxt generate ，为基于 Vue.js 的应用提供生成对应的静态站点的功能。

### 安装

```
$ yarn create nuxt-app <项目名>
express
Element UI
选择你想要的Nuxt模式 Universal
```

### 路由配置很简单

<https://zh.nuxtjs.org/guide/routing>

```
pages/
--| _slug/
-----| comments.vue
-----| index.vue
--| users/
-----| _id.vue
--| index.vue
```

```
router: {
  routes: [
    {
      name: 'index',
      path: '/',
      component: 'pages/index.vue'
    },
    {
      name: 'users-id',
      path: '/users/:id?',
      component: 'pages/users/_id.vue'
    },
    {
      name: 'slug',
      path: '/:slug',
      component: 'pages/_slug/index.vue'
    },
    {
      name: 'slug-comments',
      path: '/:slug/comments',
      component: 'pages/_slug/comments.vue'
    }
  ]
}
```

### 获取数据

### asyncData

由于asyncData方法是在组件 初始化 前被调用的，所以在方法内是没有办法通过 this 来引用组件的实例对象。

```
export default {
  asyncData ({ params }) {
    return axios.get(`https://my-api/posts/${params.id}`)
      .then((res) => {
        return { title: res.data.title }
      })
  }
}
```

### fetch

fetch 方法用于在渲染页面前填充应用的状态树（store）数据， 与 asyncData 方法类似，不同的是它不会设置组件的数据。
如果页面组件设置了 fetch 方法，它会在组件每次加载前被调用（在服务端或切换至目标路由之前）。

```
<template>
  <h1>Stars: {{ $store.state.stars }}</h1>
</template>
fetch({ store, params }) {
    // console.log(store, params)
    return getData('/UserC/Login', {
      email: '111',
      password: '222',
      is_new: 'true'
    })
      .then((res) => {
        store.commit('setStars', 11)
        console.log(res)
      })
      .catch((err) => {
        console.log(err)
      })
  },
```

### vuex

如果要在fetch中调用并操作store，请使用store.dispatch，但是要确保在内部使用async / await等待操作结束：

```
<script>
export default {
  async fetch ({ store, params }) {
    await store.dispatch('GET_STARS');
  }
}
</script>
store/index.js

export const actions = {
  async GET_STARS ({ commit }) {
    const { data } = await axios.get('http://my-api/stars')
    commit('SET_STARS', data)
  }
}
```

### 生命周期

服务端生命周期
beforeCreate， create

对比客户端
所有vue钩子函数 beforeCreate， create...

### SSR执行流程

nuxtServerInit
asyncData
beforeCreated
created
fetch

### 参考文献

1. <https://zh.nuxtjs.org/api/pages-fetch/>
