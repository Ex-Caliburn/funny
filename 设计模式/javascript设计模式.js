// 1. 我们创建时经常忘了添加new 关键字
let Book = function (name) {
  this.name = name
}

book = Book('我的故事')
console.log(book) // 猜猜打印什么

// 这个this 访问的是window。window.name = '我的故事'

// 2. 安全模式
let Book = function (name) {
  if (this instanceof Book) {
    this.name = name
  } else {
    return new Book(name)
  }
}

/**
 * 继承 有三部分
 * 1. 构造函数，供实例对象使用
 * 2. 原型中，实例可以通过原型链访问到
 * 3. 通过点方式添加的属性和方法，供类使用
 */

// 1. 类式继承
function SuperClass() {
  this.superValue = true
}
SuperClass.prototype.getSuperValue = function () {
  return this.superValue
}
function SubClass() {
  this.subValue = false
}

SubClass.prototype = new SuperClass()

SubClass.prototype.getSubValue = function () {
  return this.subValue
}

instance = new SubClass()

console.log(instance instanceof SubClass)
console.log(instance instanceof SuperClass)
console.log(SubClass instanceof SuperClass) // 参照我以前写的instanceof 判断规则

// 缺点
function SuperClass() {
  this.book = [1, 2]
}

function SubClass() {}

SubClass.prototype = new SuperClass()

instance = new SubClass()
instance2 = new SubClass()
instance.book.push(3)
console.log(instance)
console.log(instance2)

// 缺陷，因为共享同一个 prototype, 同一个__proto__ 指向，一个实例修改了 prototype 方法，会影响所有实例
// 因为子类的实现的继承是靠其原型prototype对父类的实例化实现的，因此创建父类的时候 无法向父类传传递参数，
// 因而在实例化父类的时候也无法对父类构造函数内的属性进行实例化

// 构造函数继承
function SuperClass(id) {
  this.book = ['js', '设计模式']
  this.id = id
}
SuperClass.prototype.showBook = function () {
  return this.book
}
function subClass(id) {
  SuperClass.call(this, id)
}

instance = new subClass(1)
instance2 = new subClass(2)
instance.showBook() // undefined

// 缺点， SuperClass 父类的原型 方法不能被继承，如果想要被继承就必须放到构造函数中去，这样，每个实例都会单独拥有一份，不能共用
// 这样违背了代码复用的原则，味了综合这两中模式的有点，有了组合继承

// 我想的是这样，但是这样，但是修改subClass.prototype 就会影响 到  SuperClass.prototype
subClass.prototype = SuperClass.prototype

// 实际
function SuperClass(id) {
  this.book = ['js', '设计模式']
  this.id = id
}
SuperClass.prototype.showBook = function () {
  return this.book
}
function subClass(id, time) {
  SuperClass.call(this, id)
  this.time = time
}

subClass.prototype = new SuperClass()
subClass.prototype.getTime = function () {
  return this.time
}

instance = new subClass(1, 1977)
instance.showBook()
instance.getTime()

instance2 = new subClass(2, 1933)
instance2.showBook()
instance2.getTime()

// 缺点， 构造函数继承调用两次 父类的构造函数   SuperClass.call(this,id)， new SuperClass()

// 原型式继承
function inheritObject(o) {
  let F = function () {}
  F.prototype = o
  return new F()
}

SuperClass = {
  book: ['js', '设计模式']
}

instance1 = inheritObject(SuperClass)
instance2 = inheritObject(SuperClass)
instance1.book.push('tt')
console.log(instance1 instanceof subClass)
console.log(instance1 instanceof superClass)

// 由于过度函数中无内容，所以开销小，使用方便，当然如果你感觉有必要可以缓存起来,不必每次都创建一个过度类，
//当然这种顾虑是没有必要的，随着这种思想的深入，后面出现了Object.create
// 和类式继承有点，不能传递参数，而且会污染父类

// 寄生式继承
let obj = {
  book: ['js', '设计模式']
}
function createBook(obj) {
  let o = new inheritObject(obj)
  o.getBook = function () {
    return this.book
  }
  return o
}

// 二次封装，对继承的对象进行了拓展，如其名，寄生虫一样住在某个对象里面，寄托于原型继承
//  缺点，子类不是父类的实例
/**
 * @description: 寄生组合式继承
 * @param {*}
 * @return {*}
 */
function inheritObject(o) {
  let F = function () {}
  F.prototype = o
  return new F()
}

// 寄生
function inheritPrototype(subClass, superClass) {
  let p = inheritObject(superClass.prototype)
  p.constructor = subClass // 如果不做这一步， p的 constructor指向 Function
  subClass.prototype = p
}

function superClass(name) {
  this.name = name
  this.book = ['js', '设计模式']
}
superClass.prototype.getBook = function () {
  return this.book
}

// 组合
function subClass(name, time) {
  superClass.call(this, name)
  this.time = time
}

inheritPrototype(subClass, superClass)

instance1 = new subClass('1', 2020)
instance2 = new subClass('2', 2020)
console.log(instance1, instance2)

instance1.book.push(3)
console.log(instance1, instance2)
console.log(instance1 instanceof subClass)
console.log(instance1 instanceof superClass)
// instance1.__proto__ = subClass.prototype = p => p.__proto__ = superClass.prototype

// p.constructor = subClass 这个会导致  constructor
instance1.constructor  // 有， constructor 是 subClass
instance1.constructor  //  无 ，constructor 是 superClass

// 组合和寄生式继承组合