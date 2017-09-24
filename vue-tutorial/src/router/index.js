import Vue from 'vue'
import Router from 'vue-router'
import Hello from '@/components/Hello'
import Button from '@/components/button/Button'
import Home from '@/components/home/Home'

Vue.use(Router)

var router = new Router({
  routes: [
    {
      path: '/',
      name: 'Hello',
      component: Hello,
      redirect: '/home'
    },
    {
      path: '/button',
      name: 'Button',
      component: Button
    },
    {
      path: '/home',
      name: 'Home',
      component: Home
    },
    {
      path: '/hello',
      name: 'hello',
      component: Hello
    }
  ],
  linkActiveClass: 'active', // 指定当前路由链接的样式名
  history: true // 去掉#!
})
// 现在，应用已经启动了！
export default router
