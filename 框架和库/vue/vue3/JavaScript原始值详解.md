# JavaScript原始值详解

## 什么是原始值？

原始值（Primitive Values）是JavaScript中最基本的数据类型，它们不是对象，也没有方法。原始值是不可变的（immutable），一旦创建就不能被修改。

## JavaScript中的原始值类型

### 1. Number（数字）

```javascript
// 整数
42
-17
0

// 浮点数
3.14
-2.5

// 特殊值
Infinity    // 正无穷
-Infinity   // 负无穷
NaN         // 非数字（Not a Number）
```

### 2. String（字符串）

```javascript
// 双引号
"hello world"

// 单引号
'JavaScript'

// 模板字符串（ES6）
`Hello ${name}`

// 转义字符
"Line 1\nLine 2"  // 换行
"Tab\there"       // 制表符
```

### 3. Boolean（布尔值）

```javascript
true
false
```

### 4. Undefined（未定义）

```javascript
undefined
```

### 5. Null（空值）

```javascript
null
```

### 6. Symbol（符号，ES6）

```javascript
// 创建符号
const sym1 = Symbol();
const sym2 = Symbol('description');

// 全局符号
const globalSym = Symbol.for('key');
```

### 7. BigInt（大整数，ES2020）

```javascript
// 在数字后面加 n
const bigInt = 9007199254740991n;
const anotherBigInt = BigInt(9007199254740991);
```

## 原始值的特点

### 1. 不可变性（Immutability）

原始值一旦创建就不能被修改：

```javascript
let str = "hello";
str.toUpperCase(); // 返回新字符串 "HELLO"
console.log(str);  // 仍然是 "hello"

let num = 42;
num.toString();    // 返回字符串 "42"
console.log(num);  // 仍然是 42
```

### 2. 按值传递（Pass by Value）

在函数参数传递时，传递的是值的副本：

```javascript
let num = 42;
let str = "hello";

function changeValues(n, s) {
    n = 100;        // 只修改局部变量
    s = "world";    // 只修改局部变量
}

changeValues(num, str);
console.log(num);   // 仍然是 42
console.log(str);   // 仍然是 "hello"
```

### 3. 存储在栈内存

原始值直接存储在栈内存中，访问速度快。

## 原始值的包装对象

虽然原始值没有方法，但JavaScript提供了包装对象：

```javascript
// 字符串原始值
let str = "hello";

// 自动包装成String对象来调用方法
console.log(str.length);        // 5
console.log(str.toUpperCase()); // "HELLO"

// 等价于
let strObj = new String("hello");
console.log(strObj.toUpperCase()); // "HELLO"
```

## 原始值与引用值的对比

| 特性 | 原始值 | 引用值 |
|------|--------|--------|
| 类型 | Number, String, Boolean, Undefined, Null, Symbol, BigInt | Object, Array, Function, Date, RegExp等 |
| 可变性 | 不可变 | 可变 |
| 传递方式 | 按值传递 | 按引用传递 |
| 存储位置 | 栈内存 | 堆内存 |
| 比较方式 | 值比较 | 引用比较 |

### 示例对比

```javascript
// 原始值比较
let a = 42;
let b = 42;
console.log(a === b); // true

// 引用值比较
let obj1 = { name: "John" };
let obj2 = { name: "John" };
console.log(obj1 === obj2); // false

// 原始值传递
let num = 42;
function changeNum(val) {
    val = 100;
}
changeNum(num);
console.log(num); // 42

// 引用值传递
let obj = { name: "John" };
function changeObj(val) {
    val.name = "Jane";
}
changeObj(obj);
console.log(obj.name); // "Jane"
```

## 类型检查

### typeof 操作符

```javascript
typeof 42;           // "number"
typeof "hello";      // "string"
typeof true;         // "boolean"
typeof undefined;    // "undefined"
typeof null;         // "object" (这是JavaScript的一个已知bug)
typeof Symbol();     // "symbol"
typeof 42n;          // "bigint"
```

### 更准确的类型检查

```javascript
// 检查null
function isNull(value) {
    return value === null;
}

// 检查数组
function isArray(value) {
    return Array.isArray(value);
}

// 检查对象
function isObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
```

## 在Vue3中的应用

在Vue3的响应式系统中：

### ref处理原始值

```javascript
import { ref } from 'vue'

// ref可以包装原始值
const count = ref(0)        // Number
const message = ref('hello') // String
const isVisible = ref(true)  // Boolean

// 访问和修改
console.log(count.value)     // 0
count.value = 1              // 修改值
```

### reactive处理对象

```javascript
import { reactive } from 'vue'

// reactive只能处理对象
const state = reactive({
    count: 0,
    message: 'hello',
    isVisible: true
})

// 直接访问和修改
console.log(state.count)     // 0
state.count = 1              // 修改值
```

## 总结

1. **原始值**是JavaScript的基本数据类型，包括7种类型
2. **不可变性**是原始值的重要特征
3. **按值传递**意味着函数内部修改不会影响外部变量
4. **存储在栈内存**中，访问速度快
5. 在Vue3中，`ref`可以包装原始值，而`reactive`只能处理对象

理解原始值的概念对于深入理解JavaScript和Vue3的响应式系统非常重要。
