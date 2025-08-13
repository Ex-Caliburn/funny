# Vue2到Vue3组件迁移指南

## 1. 组件语法变更

### 1.1 选项式API到组合式API

```vue
<!-- Vue2 选项式API -->
<template>
  <div>
    <el-button @click="handleClick">{{ message }}</el-button>
  </div>
</template>

<script>
export default {
  data() {
    return {
      message: 'Hello Vue2'
    }
  },
  methods: {
    handleClick() {
      this.$message.success(this.message)
    }
  },
  mounted() {
    console.log('组件已挂载')
  }
}
</script>

<!-- Vue3 组合式API -->
<template>
  <div>
    <el-button @click="handleClick">{{ message }}</el-button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

const message = ref('Hello Vue3')

const handleClick = () => {
  ElMessage.success(message.value)
}

onMounted(() => {
  console.log('组件已挂载')
})
</script>
```

### 1.2 生命周期钩子变更

| Vue2 | Vue3 |
|------|------|
| beforeCreate | setup() |
| created | setup() |
| beforeMount | onBeforeMount |
| mounted | onMounted |
| beforeUpdate | onBeforeUpdate |
| updated | onUpdated |
| beforeDestroy | onBeforeUnmount |
| destroyed | onUnmounted |

### 1.3 响应式数据

```javascript
// Vue2
data() {
  return {
    count: 0,
    user: {
      name: 'John',
      age: 30
    }
  }
}

// Vue3
import { ref, reactive } from 'vue'

const count = ref(0)
const user = reactive({
  name: 'John',
  age: 30
})
```

## 2. Element UI 到 Element Plus

### 2.1 组件导入方式

```javascript
// Vue2 + Element UI
import { Message, MessageBox } from 'element-ui'

// Vue3 + Element Plus
import { ElMessage, ElMessageBox } from 'element-plus'
```

### 2.2 全局配置

```javascript
// Vue2
Vue.use(ElementUI, {
  size: 'mini'
})

// Vue3
app.use(ElementPlus, {
  size: 'mini'
})
```

### 2.3 事件修饰符变更

```vue
<!-- Vue2 -->
<el-button @click.native="handleClick">点击</el-button>

<!-- Vue3 (.native修饰符被移除) -->
<el-button @click="handleClick">点击</el-button>
```

## 3. 路由变更

### 3.1 路由实例创建

```javascript
// Vue2
import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

export default new Router({
  mode: 'history',
  routes: [...]
})

// Vue3
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [...]
})

export default router
```

### 3.2 路由导航

```javascript
// Vue2
this.$router.push('/home')
this.$route.params.id

// Vue3
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

router.push('/home')
route.params.id
```

## 4. 状态管理 (Vuex 到 Pinia)

### 4.1 Store定义

```javascript
// Vue2 + Vuex
const store = new Vuex.Store({
  state: {
    count: 0
  },
  mutations: {
    increment(state) {
      state.count++
    }
  },
  actions: {
    incrementAsync({ commit }) {
      setTimeout(() => {
        commit('increment')
      }, 1000)
    }
  }
})

// Vue3 + Pinia
import { defineStore } from 'pinia'

export const useCounterStore = defineStore('counter', {
  state: () => ({
    count: 0
  }),
  actions: {
    increment() {
      this.count++
    },
    incrementAsync() {
      setTimeout(() => {
        this.increment()
      }, 1000)
    }
  }
})
```

### 4.2 在组件中使用

```javascript
// Vue2 + Vuex
export default {
  computed: {
    count() {
      return this.$store.state.count
    }
  },
  methods: {
    increment() {
      this.$store.commit('increment')
    }
  }
}

// Vue3 + Pinia
import { useCounterStore } from '@/stores/counter'

const counterStore = useCounterStore()

// 直接访问state
console.log(counterStore.count)

// 调用action
counterStore.increment()
```

## 5. 全局属性变更

### 5.1 全局方法

```javascript
// Vue2
Vue.prototype.$message = Message
Vue.prototype.$http = axios

// Vue3
app.config.globalProperties.$message = ElMessage
app.config.globalProperties.$http = axios
```

### 5.2 全局组件

```javascript
// Vue2
Vue.component('MyComponent', MyComponent)

// Vue3
app.component('MyComponent', MyComponent)
```

## 6. 事件总线

```javascript
// Vue2
Vue.prototype.$bus = new Vue()

// 发送事件
this.$bus.$emit('custom-event', data)

// 监听事件
this.$bus.$on('custom-event', handler)

// Vue3
import mitt from 'mitt'
const emitter = mitt()

app.config.globalProperties.$bus = emitter

// 发送事件
emitter.emit('custom-event', data)

// 监听事件
emitter.on('custom-event', handler)
```

## 7. 模板语法变更

### 7.1 v-model

```vue
<!-- Vue2 -->
<el-input v-model="message" />

<!-- Vue3 -->
<el-input v-model="message" />
<!-- 或者使用modelValue -->
<el-input :model-value="message" @update:model-value="message = $event" />
```

### 7.2 多根节点

```vue
<!-- Vue2 (需要根节点) -->
<template>
  <div>
    <header>Header</header>
    <main>Content</main>
  </div>
</template>

<!-- Vue3 (支持多根节点) -->
<template>
  <header>Header</header>
  <main>Content</main>
</template>
```

## 8. 常见问题解决

### 8.1 this指向问题

```javascript
// Vue2
export default {
  methods: {
    handleClick() {
      // this指向组件实例
      this.message = 'updated'
    }
  }
}

// Vue3
const message = ref('')
const handleClick = () => {
  // 直接使用变量
  message.value = 'updated'
}
```

### 8.2 异步组件

```javascript
// Vue2
const AsyncComponent = () => import('./AsyncComponent.vue')

// Vue3
const AsyncComponent = defineAsyncComponent(() => import('./AsyncComponent.vue'))
```

### 8.3 自定义指令

```javascript
// Vue2
Vue.directive('focus', {
  inserted: function (el) {
    el.focus()
  }
})

// Vue3
app.directive('focus', {
  mounted(el) {
    el.focus()
  }
})
```

## 9. 迁移检查清单

- [ ] 更新组件语法 (选项式API → 组合式API)
- [ ] 更新生命周期钩子
- [ ] 更新Element UI组件到Element Plus
- [ ] 更新路由使用方式
- [ ] 更新状态管理 (Vuex → Pinia)
- [ ] 更新全局属性访问
- [ ] 更新事件总线
- [ ] 检查模板语法兼容性
- [ ] 测试所有功能
- [ ] 性能优化

## 10. 性能优化建议

1. **使用组合式API**：更好的tree-shaking
2. **按需导入Element Plus组件**
3. **使用Vite的HMR**：更快的热更新
4. **代码分割**：利用Vite的自动代码分割
5. **预加载**：使用Vite的预加载功能 