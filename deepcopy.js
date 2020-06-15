/*
 * @Author: Alex(lijiyebest@gmail.com)
 * @Date: 2020-05-30 00:22:51
 * @LastEditTime: 2020-06-12 14:20:58
 * @LastEditors: Alex(lijiyebest@gmail.com)
 * @Description: 几分钟可以写出deepCopy
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
    let res =  Array.isArray(val) ? [] : {}
    for (const key in object) {
      if (object.hasOwnProperty(key)) {
        res[key] = deepClone(object[key])
      }
    }
  } else {
    return val
  }
}

// 如何复制函数,暂时不考虑原型
// 箭头函数可以复制，但是普通函数不行
// new 函数内部语句不会复制，只有内部绑定this的方法和属性会复制
// 转化为string，然后eval，但是对普通函数不管用

// 测试用例
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
result = deepCopy(test)
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
  m: function (a) {},
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
