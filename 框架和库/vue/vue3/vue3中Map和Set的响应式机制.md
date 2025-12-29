# Vue3 中 Map/Set 的响应式机制

## 核心原理

Map/Set 等集合类型通过专门的 `collectionHandlers` 进行拦截，与普通对象的 `baseHandlers` 不同：

```javascript
// 集合类型的拦截器
const collectionHandlers = {
  get(target, key, receiver) {
    // 拦截 get 操作
    if (key === 'size') {
      track(target, 'ITERATE_KEY') // 追踪 size 变化
      return Reflect.get(target, key, receiver)
    }
    
    if (isRef(target.get(key))) {
      return target.get(key).value // 自动解包 ref
    }
    
    return target.get(key)
  },
  
  set(target, key, value, receiver) {
    const hadKey = target.has(key)
    const oldValue = target.get(key)
    
    const result = Reflect.set(target, key, value, receiver)
    
    if (!hadKey) {
      trigger(target, 'ADD', key, value) // 新增触发 ADD
    } else if (hasChanged(oldValue, value)) {
      trigger(target, 'SET', key, value, oldValue) // 修改触发 SET
    }
    
    return result
  },
  
  deleteProperty(target, key) {
    const hadKey = target.has(key)
    const oldValue = target.get(key)
    
    const result = Reflect.deleteProperty(target, key)
    
    if (hadKey) {
      trigger(target, 'DELETE', key, undefined, oldValue) // 删除触发 DELETE
    }
    
    return result
  },
  
  has(target, key) {
    track(target, key) // 追踪 has 操作
    return Reflect.has(target, key)
  },
  
  forEach(callback, thisArg) {
    track(target, 'ITERATE_KEY') // 追踪遍历操作
    return target.forEach(callback, thisArg)
  },
  
  // Map 特有方法
  get(target, key) {
    track(target, key) // 追踪 get 操作
    return target.get(key)
  },
  
  // Set 特有方法  
  add(target, value) {
    const result = target.add(value)
    trigger(target, 'ADD', value) // 新增触发 ADD
    return result
  }
}
```

## 关键触发点

### 1. **ADD 操作**

- `Map.set(key, value)` - 新增键值对
- `Set.add(value)` - 新增元素
- 触发 `ADD` 类型的响应式更新

### 2. **SET 操作**  

- `Map.set(key, newValue)` - 修改已存在的键值对
- 触发 `SET` 类型的响应式更新

### 3. **DELETE 操作**

- `Map.delete(key)` - 删除键值对
- `Set.delete(value)` - 删除元素
- 触发 `DELETE` 类型的响应式更新

### 4. **遍历操作**

- `Map/Set.forEach()` - 遍历
- `for...of` 循环
- 触发 `ITERATE_KEY` 类型的响应式更新

### 5. **查询操作**

- `Map.has(key)` - 检查键是否存在
- `Map.get(key)` - 获取值
- `Set.has(value)` - 检查值是否存在
- 触发对应 key 的依赖收集

## 实际示例

```javascript
import { reactive } from 'vue'

const map = reactive(new Map())
const set = reactive(new Set())

// 这些操作会触发响应式更新
map.set('key1', 'value1')     // 触发 ADD
map.set('key1', 'newValue')   // 触发 SET  
map.delete('key1')            // 触发 DELETE
map.has('key1')               // 追踪 has 操作

set.add('item1')              // 触发 ADD
set.delete('item1')           // 触发 DELETE
set.has('item1')              // 追踪 has 操作

// 遍历操作
map.forEach((value, key) => {}) // 追踪 ITERATE_KEY
for (const [key, value] of map) {} // 追踪 ITERATE_KEY
```

## 与普通对象的区别

| 操作类型 | 普通对象 | Map/Set |
|---------|---------|---------|
| 新增属性 | `SET` | `ADD` |
| 修改属性 | `SET` | `SET` |
| 删除属性 | `DELETE` | `DELETE` |
| 遍历 | `ITERATE_KEY` | `ITERATE_KEY` |
| 查询 | 属性名追踪 | key 追踪 |

## 响应式追踪机制

### 1. **依赖收集 (track)**

```javascript
// 追踪不同类型的操作
track(target, 'ADD')      // 追踪新增操作
track(target, 'SET')      // 追踪修改操作  
track(target, 'DELETE')   // 追踪删除操作
track(target, 'ITERATE_KEY') // 追踪遍历操作
track(target, key)        // 追踪特定 key 的查询操作
```

### 2. **依赖触发 (trigger)**

```javascript
// 触发不同类型的响应式更新
trigger(target, 'ADD', key, value)           // 触发新增更新
trigger(target, 'SET', key, value, oldValue) // 触发修改更新
trigger(target, 'DELETE', key, undefined, oldValue) // 触发删除更新
trigger(target, 'ITERATE_KEY')                // 触发遍历相关更新
```

## 性能优化

### 1. **惰性代理**

- 只有被访问的属性才会被代理
- 避免不必要的响应式包装

### 2. **精确追踪**

- 区分 ADD/SET/DELETE 操作类型
- 避免相同值重复触发更新

### 3. **批量操作优化**

- 支持批量操作（如 `Map.set()` 多次调用）
- 减少中间状态的响应式触发

## 注意事项

### 1. **方法调用**

```javascript
// 正确：直接调用方法
map.set('key', 'value')
set.add('item')

// 错误：通过属性访问
map['set']('key', 'value') // 不会触发响应式
```

### 2. **遍历操作**

```javascript
// 遍历操作会追踪 ITERATE_KEY
const keys = Array.from(map.keys()) // 会触发响应式追踪
const values = Array.from(map.values()) // 会触发响应式追踪
```

### 3. **嵌套对象**

```javascript
const map = reactive(new Map())
map.set('user', { name: 'John', age: 30 })

// 修改嵌套对象属性
map.get('user').name = 'Jane' // 会触发响应式更新
```

## 总结

Map/Set 的响应式通过专门的 `collectionHandlers` 实现，主要特点：

1. **操作类型区分**：新增用 `ADD`，修改用 `SET`，删除用 `DELETE`
2. **遍历追踪**：统一用 `ITERATE_KEY` 追踪所有遍历操作
3. **方法拦截**：拦截 `get/set/delete/has/add/forEach` 等集合特有方法
4. **自动解包**：自动解包属性中的 ref 值
5. **性能优化**：惰性代理、精确追踪、批量操作优化

这样设计让集合类型能够精确地追踪各种操作，避免不必要的响应式更新，提高性能。

## 参考文献

1. Vue3 源码：packages/reactivity/src/collectionHandlers.ts
2. Vue3 官方文档：Reactivity in Depth
3. Vue3 源码解析：Collection Types Reactivity
