// 1 刚入行业，领导让我们写表单校验， 我们写的函数都是这样，现在还是很多情况会这么写

function checkEmail() {
  // 校验邮箱
}
function checkName() {
  // 校验名字
}
// 缺点很明显，多了几个全局变量， 而且容易覆盖别人的代码

// 2  放在 对象里，进行收编

let checkObject = {
  checkEmail: function () {
    // 校验邮箱
  },
  checkName: function () {
    // 校验名字
  }
}
// 减少被覆盖的风险， 如果被覆盖了，很容易就能察觉到

// 3 对象的另一中形式
let checkObject = function () {}

checkObject.checkEmail = function () {
  // 校验邮箱
}
checkObject.checkName = function () {
  // 校验邮箱
}

// 缺点 如果别人要用你的对象会比较麻烦， 方法是挂在checkObject 上的，新的对象是不会继承这些方法

// 4 返回一个对象
let checkObject = function () {
  return {
    checkEmail: function () {
      // 校验邮箱
    },
    checkName: function () {
      // 校验名字
    }
  }
}
let a = checkObject()
a.checkEmail()

// 每个人使用都是单独的对象,相互不影响，但是 创建出的对象和checkObject 没有任何关系

// 5 类的方式，复用
let checkObject = function () {
  this.checkEmail = function () {
    // 校验邮箱
  }
  this.checkName = function () {
    // 校验邮箱
  }
}
let a = new checkObject()
a.checkEmail()

// 这样创建的对象，是实例对象， 通过new 的方式创建
// 每次通过new 关键词创建新对象的时候，新创建的对象都会对类的this的属性进行复制，所以这些实例都会有自己的一套方法，然后这样的操作造成的消耗是很奢侈的

// 6 原型
let checkObject = function () {}
checkObject.prototype.checkEmail = function () {
  // 校验邮箱
}
checkObject.prototype.checkName = function () {
  // 校验邮箱
}

// 这样多次写了checkObject.prototype ，还可以这样用

let checkObject = function () {}
checkObject.prototype = {
  checkEmail: function () {
    // 校验邮箱
  },
  checkName: function () {
    // 校验名字
  }
}

let a = new checkObject()
checkObject.checkEmail()
checkObject.checkName()

// 这两种方法不能混着用， 第二个会覆盖第一个

// 8 链式调用， 你发现上面每次都要书写checkObject
let checkObject = {
  checkEmail: function () {
    // 校验邮箱
    return this
  },
  checkName: function () {
    // 校验名字
    return this
  }
}
checkObject.checkEmail().checkName()

//   也可以放在原型上

let checkObject = function () {}
checkObject.prototype = {
  checkEmail: function () {
    // 校验邮箱
    return this
  },
  checkName: function () {
    // 校验名字
    return this
  }
}
let a = new checkObject()
checkObject.checkEmail().checkName()

// 9 函数的祖先
Function.prototype.checkEmail = function () {
  // 校验邮箱
}

let a = new Function()
a.checkEmail()

// 这样污染 原生对象Function， 别人创建的函数也会被你创建的函数所污染
// 我们可以写一个添加方法的函数

Function.prototype.addMethod = function (methodName, fn) {
  this[methodName] = fn
  return this
}
// 添加方可以这么做
let method = function () {}
method
  .addMethod('checkEmail', function () {
    // 校验邮箱
  })
  .addMethod('checkName', function () {
    // 校验邮箱
  })

// 还可以这样
method.addMethod('checkEmail', function () {
  // 校验邮箱
  return this
})
method.addMethod('checkName', function () {
  // 校验邮箱
  return this
})
method.checkEmail().checkName()

// 10 类式调用
Function.prototype.addMethod = function (methodName, fn) {
  this.prototype[methodName] = fn
  return this
}
// 需要通过new 的方式添加了

let Method = function () {}
Method.addMethod('checkEmail', function () {
  // 校验邮箱
}).addMethod('checkName', function () {
  // 校验邮箱
})
let method = new Method()
method.checkEmail()

// 另外的思路，一次添加多个方法
Function.prototype.addMethod = function (methods) {
  Object.keys(methods).forEach((item) => {
    this.prototype[item] = methods[item]
  })
  return this
}
let Method = function () {}

Method.addMethod({
  test: function () {
    console.log('test')
    return this
  },
  checkName: function () {
    console.log('checkName')
    return this
  }
})
method = new Method()
method.test().checkName()

// 另外的思路，可以为自己添加也可以原型添加
Function.prototype.addMethod = function (methods, isPrototype) {
  Object.keys(methods).forEach((item) => {
    if (isPrototype) {
      this.prototype[item] = methods[item]
    } else {
      this[item] = methods[item]
    }
  })
  return this
}
