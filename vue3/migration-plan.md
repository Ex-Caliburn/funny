# Vue2+Webpack 到 Vue3+Vite 迁移计划

## 阶段一：基础架构迁移

### 1.1 创建新的Vite配置文件

```javascript
// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import legacy from '@vitejs/plugin-legacy'

export default defineConfig({
  plugins: [
    vue(),
    legacy({
      targets: ['ie >= 11'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime']
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia'],
          element: ['element-plus']
        }
      }
    }
  }
})
```

### 1.2 更新package.json依赖

```json
{
  "dependencies": {
    "vue": "^3.3.0",
    "vue-router": "^4.2.0",
    "pinia": "^2.1.0",
    "element-plus": "^2.3.0",
    "axios": "^1.4.0",
    "dayjs": "^1.11.7",
    "js-cookie": "^3.0.5",
    "vue-i18n": "^9.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^4.2.0",
    "@vitejs/plugin-legacy": "^4.1.0",
    "vite": "^4.3.0",
    "sass": "^1.62.0",
    "unplugin-vue-components": "^0.24.0",
    "unplugin-auto-import": "^0.16.0"
  }
}
```

## 阶段二：核心文件迁移

### 2.1 更新main.js

```javascript
// src/main.js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'normalize.css/normalize.css'
import '@/styles/index.scss'

import App from './App.vue'
import router from './router'
import i18n from './locales'

// 全局组件
import DictTag from '@/components/DictTag'
import SplitPane from '@/components/SplitPane'

// 全局方法
import { getDicts, addDateRange, handleTree, resetForm } from '@/utils'
import { download, exportFile } from '@/utils/request'

const app = createApp(App)

// 全局属性
app.config.globalProperties.getDicts = getDicts
app.config.globalProperties.resetForm = resetForm
app.config.globalProperties.addDateRange = addDateRange
app.config.globalProperties.download = download
app.config.globalProperties.exportFile = exportFile
app.config.globalProperties.handleTree = handleTree

// 全局组件
app.component('DictTag', DictTag)
app.component('SplitPane', SplitPane)

app.use(createPinia())
app.use(router)
app.use(i18n)
app.use(ElementPlus, {
  size: 'mini'
})

app.mount('#app')
```

### 2.2 更新路由配置

```javascript
// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import Layout from '@/views/layout/Layout.vue'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/login/index.vue'),
    meta: { hidden: true }
  },
  // ... 其他路由配置保持不变
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

export default router
```

### 2.3 状态管理迁移到Pinia

```javascript
// src/stores/index.js
import { createPinia } from 'pinia'

export const pinia = createPinia()

// src/stores/app.js
import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', {
  state: () => ({
    sidebar: {
      opened: true
    },
    device: 'desktop'
  }),
  actions: {
    toggleSideBar() {
      this.sidebar.opened = !this.sidebar.opened
    }
  }
})
```

## 阶段三：组件迁移

### 3.1 Vue2组件语法更新

```vue
<!-- Vue2 -->
<template>
  <div>
    <el-button @click="handleClick">点击</el-button>
  </div>
</template>

<script>
export default {
  data() {
    return {
      message: 'Hello'
    }
  },
  methods: {
    handleClick() {
      this.$message.success(this.message)
    }
  }
}
</script>

<!-- Vue3 -->
<template>
  <div>
    <el-button @click="handleClick">点击</el-button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

const message = ref('Hello')

const handleClick = () => {
  ElMessage.success(message.value)
}
</script>
```

### 3.2 生命周期钩子更新

```javascript
// Vue2
export default {
  mounted() {
    // 组件挂载后
  },
  beforeDestroy() {
    // 组件销毁前
  }
}

// Vue3
import { onMounted, onBeforeUnmount } from 'vue'

export default {
  setup() {
    onMounted(() => {
      // 组件挂载后
    })
    
    onBeforeUnmount(() => {
      // 组件销毁前
    })
  }
}
```

## 阶段四：Element UI 到 Element Plus

### 4.1 组件名称变更

```javascript
// 主要变更
// el-button -> el-button (基本不变)
// el-table -> el-table
// el-form -> el-form
// el-input -> el-input
// el-select -> el-select

// 事件名称变更
// @click.native -> @click (Vue3中.native修饰符被移除)
```

### 4.2 图标系统更新

```javascript
// 旧版本
import { Message } from 'element-ui'

// 新版本
import { ElMessage } from 'element-plus'
```

## 阶段五：兼容性处理

### 5.1 全局API变更

```javascript
// Vue2
Vue.prototype.$message = Message

// Vue3
app.config.globalProperties.$message = ElMessage
```

### 5.2 事件总线替代

```javascript
// Vue2 事件总线
Vue.prototype.$bus = new Vue()

// Vue3 使用 mitt
import mitt from 'mitt'
const emitter = mitt()
app.config.globalProperties.$bus = emitter
```

## 阶段六：构建优化

### 6.1 Vite插件配置

```javascript
// vite.config.js
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  plugins: [
    vue(),
    Components({
      resolvers: [ElementPlusResolver()]
    })
  ]
})
```

### 6.2 环境变量处理

```javascript
// .env.development
VITE_API_BASE_URL=http://localhost:3000/api

// .env.production
VITE_API_BASE_URL=https://api.example.com
```

## 迁移检查清单

- [ ] 更新package.json依赖
- [ ] 创建vite.config.js
- [ ] 更新main.js入口文件
- [ ] 迁移路由配置
- [ ] 迁移状态管理到Pinia
- [ ] 更新组件语法
- [ ] 处理Element UI到Element Plus的变更
- [ ] 更新全局API调用
- [ ] 处理事件总线
- [ ] 更新构建脚本
- [ ] 测试所有功能
- [ ] 性能优化

## 注意事项

1. **渐进式迁移**：可以同时维护Vue2和Vue3版本
2. **兼容性测试**：确保所有功能正常工作
3. **性能监控**：对比迁移前后的性能表现
4. **文档更新**：更新开发文档和部署文档
5. **团队培训**：确保团队熟悉Vue3语法
