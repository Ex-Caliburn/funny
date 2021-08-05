JSON.stringify([undefined, Object, Symbol(''), NaN, Infinity])
// '[null,null,null,null,null]'

JSON.stringify({
  x: undefined,
  z: Infinity,
  y: Object,
  o: Symbol('foo'),
  m: function (a) {
    console.log(a)
  },
  n: (arrow) => {
    console.log(arrow)
  }
})
// "{z: null}"

const testObj = { x: undefined, y: Object, z: Symbol('test') }

const result = JSON.stringify(testObj, function (key, value) {
  if (value === undefined) {
    return 'undefined'
  } else if (typeof value === 'symbol' || typeof value === 'function') {
    return value.toString()
  }
  return value
})

console.log(result)
// {"x":"undefined","y":"function Object() { [native code] }","z":"Symbol(test)"}

// 以 symbol 为属性键的属性，慎用

// 所有以 symbol 为属性键的属性都会被完全忽略掉，即便 replacer 参数中强制指定包含了它们。

JSON.stringify({ [Symbol.for('foo')]: 'foo' }, [Symbol.for('foo')])
// '{}'

JSON.stringify({ [Symbol.for('foo')]: 'foo' }, function (k, v) {
  if (typeof k === 'symbol') {
    return 'a symbol'
  }
})
// undefined


// 日期对象也要慎用，默认转成 ISO 格式

// 具有不可枚举的属性值时，慎用

// 不可枚举的属性默认会被忽略：

let person = Object.create(null, {
  name: { value: "Gopal", enumerable: false },
  age: { value: "25", enumerable: true },
})

console.log(JSON.stringify(person))
// {"age":"25"}


// JSON.stringify 强大的第二个参数 replacer

// 这个参数是可选的，可以是一个函数，也可以是一个数组
// 当是一个函数的时候，则在序列化的过程中，被序列化的每个属性都会经过该函数的转换和处理，看如下代码：

let replacerFun = function (key, value) {
  console.log(key, value)
  if (key === 'name') {
    return undefined
  }
  return value
}

let myIntro = {
  name: 'Gopal',
  age: 25,
  like: 'FE'
}

console.log(JSON.stringify(myIntro, replacerFun))
// {"age":25,"like":"FE"}

// 这里其实就是一个筛选的作用，利用的是 JSON.stringify 中对象属性值为 undefined 就会在序列化中被忽略的特性（后面我们会提到）
// 值得注意的是，在一开始 replacer 函数会被传入一个空字符串作为 key 值，代表着要被 stringify 的这个对象
// 上面 console.log(key, value) 输出的值如下：

 { name: 'Gopal', age: 25, like: 'FE' }

// name Gopal
// age 25
// like FE
// {"age":25,"like":"FE"}

// 可以看出，通过第二个参数，我们可以更加灵活的去操作和修改被序列化目标的值
// 当第二个参数为数组的时候，只有包含在这个数组中的属性名才会被序列化

JSON.stringify(myIntro, ['name']) // {"name":"Gopal"}