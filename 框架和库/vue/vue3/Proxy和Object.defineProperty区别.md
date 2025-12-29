# Proxy 和 Object.defineProperty 的区别、优缺点

## 一、基本概念

### 1. Object.defineProperty
- `Object.defineProperty` 是 ES5 引入的方法，可以在对象上定义新的属性，或修改已有属性的特性（如 getter/setter、可枚举性等）。
- 主要用于“数据劫持”，实现响应式（如 Vue2）。

### 2. Proxy
- `Proxy` 是 ES6 引入的构造函数，可以用来创建一个对象的代理，实现对对象的拦截和自定义操作。
- 可以拦截几乎所有对对象的操作（如读取、赋值、删除、枚举、函数调用等）。

---

## 二、区别对比

| 特性/能力                | Object.defineProperty                | Proxy                        |
|--------------------------|--------------------------------------|------------------------------|
| 作用对象                 | 只能直接操作对象的属性               | 可以代理整个对象             |
| 监听类型                 | 只能监听属性的读写（get/set）        | 几乎所有操作都能拦截         |
| 新增/删除属性监听        | 不能监听新增/删除属性                | 可以监听新增/删除属性        |
| 数组监听                 | 不能监听数组下标变化                 | 可以监听数组下标变化         |
| 深度监听                 | 需要递归遍历每一层                   | 一次代理即可深度监听         |
| 返回值                   | 原对象                               | 代理对象                     |
| 性能                     | 较好（对象属性少时）                 | 较好（大对象、深层对象）     |
| 兼容性                   | IE9+                                 | IE不支持，需现代浏览器       |

---

## 三、优缺点分析

### 1. Object.defineProperty
**优点：**
- 兼容性好（IE9+ 支持）
- 实现简单，适合属性较少、层级较浅的对象

**缺点：**
- 只能劫持已存在的属性，新增/删除属性无法监听
- 需要递归遍历对象的每一层，代码复杂且性能差（深层对象）
- 不能监听数组下标和 length 的变化
- 只能劫持 get/set，无法拦截其他操作（如 in、delete、Object.keys 等）

### 2. Proxy
**优点：**
- 能代理整个对象，支持深度监听
- 能拦截几乎所有操作（get、set、deleteProperty、has、ownKeys、apply、construct 等）
- 能监听数组下标、length 变化
- 代码简洁，易于维护

**缺点：**
- 兼容性较差（IE 不支持，仅现代浏览器支持）
- 返回的是代理对象，原对象不会被自动响应，需要注意引用一致性

---

## 四、代码示例

### Object.defineProperty 示例
```javascript
const obj = {};
Object.defineProperty(obj, 'name', {
  get() {
    return this._name;
  },
  set(val) {
    console.log('name属性被修改:', val);
    this._name = val;
  }
});
obj.name = 'Tom'; // name属性被修改: Tom
console.log(obj.name); // Tom
```

### Proxy 示例
```javascript
const obj = {};
const proxy = new Proxy(obj, {
  get(target, key) {
    console.log('读取属性:', key);
    return target[key];
  },
  set(target, key, value) {
    console.log('设置属性:', key, value);
    target[key] = value;
    return true;
  },
  deleteProperty(target, key) {
    console.log('删除属性:', key);
    delete target[key];
    return true;
  }
});
proxy.name = 'Tom'; // 设置属性: name Tom
console.log(proxy.name); // 读取属性: name
delete proxy.name; // 删除属性: name
```

---

## 五、总结

- Vue2 使用 `Object.defineProperty` 实现响应式，存在深度监听、数组监听等局限。
- Vue3 使用 `Proxy` 实现响应式，功能更强大，代码更简洁，性能更优。 