function Parent() {
  this.num = 1
}
console.log(new Parent()) //输出Parent对象：{num:1}
console.log(new Parent()) //输出Parent对象：{num:1}

function Parent() {
  this.num = 1
}
console.log(new Parent().num) //1
console.log(new Parent.num()) // Parent.num is not a constructor

// 引擎自动会帮你补全 new 后面() 并且带括号提高了优先级
// 不带的话  new Parent.num 相当于 new (Parent.num)

// new fn() 的过程
// 1 创建一个对象 temp = {}
// 3. temp.__proto__ = this.prototype
// 2. fn.call(temp,...arguments)
// 4 如果设置了return， return xx 不是对象或者null，则返回temp，是则返回 xx
;```
new Person("John") = {
    var obj = {};
     obj.__proto__ = Person.prototype; // 此时便建立了obj对象的原型链：
     // obj->Person.prototype->Object.prototype->null
     var result = Person.call(obj,"John"); // 相当于obj.Person("John")
     return typeof result === 'object' ? result : obj; // 如果无返回值或者返回一个非对象值,或者是null，则将obj返回作为新对象
}
```

function Parent() {
  this.num = 1
  return 1
}
function Parent2() {
  this.num = 1
  return null
}
function Parent3() {
  this.num = 1
  return {
    test: 4
  }
}

function Parent4() {
  this.num = 1
  return function b() {
    this.a = 3
  }
}

new Parent() // {num: 1}
new Parent2() // {num: 1}
new Parent3() // {test: 4}
new Parent4() // function b() { this.a = 3 }
new new Parent4 // {a: 3}
