# 微前端与qiankun框架

## 微前端概述

微前端（Micro Frontends）是一种新兴的前端架构模式，它将大型的前端应用程序拆分为多个独立的、可管理的小型应用或服务。这种方法允许不同的团队使用不同的技术栈开发和维护各自的部分，同时还能将它们无缝地集成到一个统一的用户界面中。

### 为什么选择微前端

在我们的场景中，PDM系统（基于Vue）需要调用标签自动化系统（基于React）的Excalidraw画板编辑功能。由于技术栈的差异，传统方法难以实现两个项目的融合。微前端架构为我们提供了一种优雅的解决方案，使得不同技术栈的应用可以像搭积木一样组合在一起。

### 微前端的优势

1. **技术栈无关**：允许在同一个项目中使用不同的前端框架。
2. **独立开发部署**：各个微应用可以独立开发、测试和部署。
3. **增量升级**：可以逐步升级旧系统，降低风险。
4. **团队自治**：不同团队可以负责不同的微应用，提高开发效率。

## 微前端实现方案比较

### 1. iframe方案

#### 优点

- 实现简单，是最古老且稳定的集成方式
- 天然的JS沙箱隔离

#### 缺点

1. URL不同步，影响浏览器的前进/后退功能
2. UI不同步，难以实现跨iframe的UI交互
3. 全局上下文隔离，跨应用通信较困难
4. 性能较差，每次都需要重新加载资源

### 2. 使用script或fetch动态加载HTML

这种方法灵活性较高，但需要自行处理很多集成问题，如样式隔离、JS沙箱等。

### 3. qiankun框架（推荐）

qiankun是阿里巴巴开源的一个基于single-spa的微前端实现库，它提供了更完善的功能和更好的开发体验。

#### 优点

1. 技术栈无关
2. HTML Entry接入方式，让接入微应用像使用iframe一样简单
3. 样式隔离，确保微应用之间样式不会互相影响
4. JS沙箱，提供安全的运行环境
5. 资源预加载，优化性能
6. umi插件支持，简化接入流程

#### 缺点

- 有一定的学习成本

## qiankun框架接入指南

### 主应用配置

1. 安装qiankun

   ```bash
   yarn add qiankun # 或 npm i qiankun -S
   ```

2. 注册微应用

   ```javascript
   import { registerMicroApps, start } from 'qiankun';

   registerMicroApps([
     {
       name: 'reactApp',
       entry: '//localhost:3000',
       container: '#container',
       activeRule: '/app-react',
     },
     // ... 其他微应用
   ]);

   start();
   ```

3. 手动加载微应用（可选）

   ```javascript
   import { loadMicroApp } from 'qiankun';

   loadMicroApp({
     name: 'react',
     entry: '//localhost:8000',
     container: '#react',
   });
   ```

#### 注意事项

1. 子应用路由需要和主应用保持一致
2. 主应用 hash 路由， 子应用也适用 hash 路由

### 子应用配置（以umi为例）

1. 安装umi的qiankun插件

   ```bash
   yarn add @umijs/plugin-qiankun -D
   ```

2. 修改`.umirc.ts`配置文件

   ```javascript
   export default defineConfig({
     // hash 路由需要开启
     // history: {
     //   type: 'hash',
     // },
     qiankun: {
       slave: {},
     },
   });
   ```

3. 在`app.ts`中导出生命周期钩子

   ```javascript
   export const qiankun = {
     // 应用加载之前
     async bootstrap(props) {
       console.log('react bootstrap', props)
     },
     // 应用 render 之前触发
     async mount(props) {
      console.log('react mount', props)
      props.onGlobalStateChange((state, prev) => {
        // state: 变更后的状态; prev 变更前的状态
        console.log(state, prev)
      })

      props.setGlobalState({ key: 'react 222' })
    },
    // 应用卸载之后触发
    async unmount(props) {
      console.log('react unmount', props)
    },
    /**
     * 可选生命周期钩子，仅使用 loadMicroApp 方式加载微应用时生效
     */
     async update(props) {
       console.log('react update', props)
     },
   }
   ```

## 注意事项

1. 确保子应用的路由与主应用保持一致
2. 如果主应用使用hash路由，子应用也应使用hash路由
3. 处理好应用间的通信机制
4. 注意样式隔离和JS沙箱的使用

## 结论

微前端架构，特别是使用qiankun框架，为我们提供了一种强大的方式来集成不同技术栈的应用。虽然有一定的学习和配置成本，但它带来的灵活性和可维护性是值得的。在我们的PDM系统与标签自动化系统集成的场景中，qiankun将是一个理想的选择。

## 参考资料

1. [qiankun官方文档](https://qiankun.umijs.org/zh/guide)
2. [umi插件-qiankun](https://v3.umijs.org/plugins/plugin-qiankun)
3. [微前端的核心价值](https://micro-frontends.org/)
