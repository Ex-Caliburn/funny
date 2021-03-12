// http://www.conardli.top/docs/JavaScript/%E6%89%8B%E5%8A%A8%E5%AE%9E%E7%8E%B0call%E3%80%81apply%E3%80%81bind.html#%E6%A8%A1%E6%8B%9F%E5%AE%9E%E7%8E%B0apply

Function.prototype._call = function(context = window, ...args) {
  if (this === Function.prototype) {
    return undefined // 用于防止 Function.prototype.myCall() 直接调用
  }
  context = context || window
  let fn = Symbol()
  context[fn] = this
  const result = context[fn](...args)
  delete context[fn]
  return result
}

function fn(...arg) {
  console.log(this, arg)
}

let b = {}
// fn._call(fn, 1)
// Function.prototype._call()

Function.prototype._apply = function(context = window, arr) {
  if (this === Function.prototype) {
    return undefined
  }
  context = context || window
  let fn = Symbol()
  context[fn] = this
  let result
  if (Array.isArray(arr)) {
    result = context[fn](...arr)
  } else {
    result = context[fn]()
  }
  delete context[fn]
  return result
}

// fn._apply(b, [1, 2])

Function.prototype._bind = function(context, ...args) {
  if (this === Function.prototype) {
    return undefined
  }
  let _this = this
  return function F(...args2) {
    console.log(this, this instanceof F)
    if (this instanceof F) {
      return new _this(...args, ...args2)
    } else {
      return _this.apply(context, args.concat(args2))
    }
  }
}

let test = fn._bind(b, 1, 2)
// test(3)
console.log(new test(3)) //  test is not a constructor
