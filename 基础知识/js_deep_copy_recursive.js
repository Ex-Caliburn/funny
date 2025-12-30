/*
 * 几分钟可以写出deepCopy?
 * 你需要考虑那些坑
 * 1. 对象分类型讨论
 * 2.解决循环引用（环）,栈爆炸
 * 4. 区分null
 * 5. 匿名/箭头函数处理,函数上挂私有变量
 * 6 复杂的还有 buffer Uint32Array 等 参考 https://github.com/lodash/lodash/blob/master/cloneDeep.js
 */
// 处理原始类型 如： Number String Boolean Symbol Null Undefined处理不可遍历类型
// 如： Date RegExp Function处理循环引用情况
// 使用：WeakMap处理
// 可遍历类型 如： Set Map Array Object

function deepCopy(obj, target = {}) {
  for (const key in obj) {
    if (obj[key] === null || typeof obj[key] !== 'object') {
      target[key] = obj[key]
    } else {
      target[key] = obj[key] instanceof Array ? [] : {}
      deepCopy(obj[key], target[key])
    }
  }
  return target
}

function deepCopy(source) {
  if (
    Object.prototype.toString.call(source) === '[object Object]' ||
    Array.isArray(source)
  ) {
    let res = Array.isArray(source) ? [] : {}
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        res[key] = deepCopy(source[key])
      }
    }
    return res
  } else {
    return source
  }
}

// 我的写的啥，不清晰
function extend(target, source, isDeep) {
  for (let key in target) {
    if (
      isDeep &&
      ['Object', 'Array'].includes(
        Object.prototype.toString.call(target[key]).slice(8, -1)
      )
    ) {
      let temp =
        Object.prototype.toString.call(target[key]).slice(8, -1) === 'Object' ? {} : []
      source[key] = temp
      extend(target[key], source[key], isDeep)
    } else {
      source[key] = target[key]
    }
  }
  return source
}

// 优化
// 考虑不周全
function deepClone2(target, source, isDeep) {
  for (let k in target) {
    let v = target[k]
    if (Array.isArray(v) || (v !== null && typeof v === 'object')) {
      source[k] = deepClone2(target[k], Array.isArray(v) ? [] : {}, isDeep)
    } else {
      source[k] = target[k]
    }
  }
  return source
}

let temp = { a: 1 }
let key = { b: 2 }
let value = { c: 3 }
let set1 = new Set()
set1.add(temp)
let map1 = new Map()
map1.set(key, value)

let test = {
  a: 1,
  b: 0,
  c: '1',
  d: '0',
  e: undefined,
  f: null,
  g: true,
  h: false,
  i: NaN,
  j: new Date(),
  k: { a: 1, b: 0, c: { a: 1 } },
  l: [1, 2, 3, { a: 1 }],
  m: function (a) {
    console.log(a)
  },
  n: (arrow) => {
    console.log(arrow)
  },
  o: Symbol('foo'),
  reg: /^(123123)\$/gi,
  set1: set1,
  map1: map1,
  [Symbol('1')]: 2
}

// vue 中实现
// 缺点，对数组并没有深度复制，如果是对象数组类型，复制后的对象依旧和原对象的引用关系依旧存在
function deepClone(val) {
  if (Object.prototype.toString.call(val) === '[object Object]') {
    const res = {}
    for (const key in val) {
      res[key] = deepClone(val[key])
    }
    return res
  } else if (Array.isArray(val)) {
    return val.slice()
  } else {
    return val
  }
}

// 循环引用
let b = { a: '1' }

let obj = {
  a: b
}

b.a = obj.a

function deepCopy4(source) {
  let target
  if (
    Object.prototype.toString.call(source) === '[object Object]' ||
    Array.isArray(source)
  ) {
    target = Array.isArray(source) ? [] : {}
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        target[key] = deepCopy4(source[key])
      }
    }
  } else {
    target = source
  }
  return target
}

deepCopy4(test)

deepCopy4(b)
// Uncaught RangeError: Maximum call stack size exceeded

// 包含缓存

// 很显然这种情况下我们使用Map，以key-value来存储就非常的合适：

// 用has方法检查Map中有无克隆过的对象
// 有的话就获取Map存入的值后直接返回
// 没有的话以当前对象为key，以拷贝得到的值为value存储到Map中
// 继续进行克隆

// 是否是引用类型
const isObject = (source) => {
  return source !== null && ['object', 'function'].includes(typeof source)
}

function getRealType(source) {
  return Object.prototype.toString.call(source).slice(8, -1)
}
function deepCopy4(source) {
  // Symbol, String ,Boolean, BigInt, Null, undefined,
  if (isObject(source)) {
    return source
  }
  if (deepCopy4.cache.get(source)) {
    return deepCopy4.cache.get(source)
  }
  let target
  let realType = getRealType(source)
  switch (realType) {
    case 'Object':
    case 'Array':
      target = realType === 'Array' ? [] : {}
      deepCopy4.cache.set(source, target)
      // 可以改写为 Object.keys 但是要考虑 Symbol 属性名 Object.keys不会遍历原型上的
      let temp = [...Object.keys(aa), ...Object.getOwnPropertySymbols(aa)]
      temp.forEach((key) => {
        target[key] = deepCopy4(source[key])
      })
      return target
    case 'Map':
      target = new Map()
      deepCopy4.cache.set(source, target)
      // key如果是对象，断掉了话，怎么找到key，复制了又有什么用，
      source.forEach((key, val) => {
        target.set(key, clone(val))
      })
      return target
    case 'Set':
      target = new Set()
      deepCopy4.cache.set(source, target)
      source.forEach((item) => {
        target.add(item)
      })
      return target
    // 其余三种非遍历引用类型
    case 'Date':
      return new Date(source)
    case 'RegExp':
      // 两种写法 第二种更简单
      // const reg = /\w*$/
      // const result = new RegExp(source.source, reg.exec(source)[0])
      // result.lastIndex = source.lastIndex // lastIndex 表示每次匹配时的开始位置
      return new RegExp(source)
    case 'Function':
      return target
    default:
      return source
  }
}
deepCopy4.cache = new WeakMap()

res = deepCopy4(test)
console.log(res)

res.map1.get(key) === value
res.set1.has(temp)
