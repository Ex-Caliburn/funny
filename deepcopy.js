/*
 * @Author: Alex(lijiyebest@gmail.com)
 * @Date: 2020-05-30 00:22:51
 * @LastEditTime: 2021-07-28 00:44:26
 * @LastEditors: Alex(lijiyebest@gmail.com)
 * @Description: 几分钟可以写出deepCopy
 * 你需要考虑那些坑
 */

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

function deepCopy(val) {
  if (Object.prototype.toString.call(val) === ['object Object'] || Array.isArray(val)) {
    let res = Array.isArray(val) ? [] : {}
    for (const key in object) {
      if (object.hasOwnProperty(key)) {
        res[key] = deepClone(object[key])
      }
    }
  } else {
    return val
  }
}

// 我的写的啥，不清晰
function extend(target, source, isDeep) {
  for (let key in target) {
    if (isDeep && ['Object', 'Array'].includes(Object.prototype.toString.call(target[key]).slice(8, -1))) {
      let temp = Object.prototype.toString.call(target[key]).slice(8, -1) === 'Object' ? {} : []
      source[key] = temp
      extend(target[key], source[key], isDeep)
    } else {
      source[key] = target[key]
    }
  }
  return source
}

// 优化
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
  o: Symbol('foo')
}

result1 = deepClone2(test, {})


// result = extend(test, {})


// result = deepCopy(test)
result = {
  a: 1,
  b: 0,
  c: '1',
  d: '0',
  e: undefined,
  f: null,
  g: true,
  h: false,
  i: NaN,
  j: {},
  k: { a: 1, b: 0, c: { a: 1 } },
  l: [1, 2, 3, { a: 1 }],
  m: function (a) { },
  n: (arrow) => {
    console.log(arrow)
  }
}

// vue 中实现
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
