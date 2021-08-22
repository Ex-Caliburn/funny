# class

## 前言

es5的继承

```js
//动物
function Animal(){
    this.eat = function (){
        console.log('Animal eat')
    }
}

//狗
function Dog() {
    this.bark = function (){
        console.log('Dog bark')
    }
}

Dog.prototype = new Animal()

var hashiqi = new Dog()
hashiqi.bark()
hashiqi.eat()
```

### 注意点

类不存在变量提升（hoist），这一点与 ES5 完全不同。

```js
class Person {
    constructor(val) {
      this.a = val
      console.log(1, val)
    }
    name= 111;
    run(){
      console.log(111)
    }
}
class student extends Person{
    name = 2
    constructor(val) {
        super(val)
        this.a = val + 1
        this.run()
        console.log(2, val)
    }
}
ming = new student('123123')
```

```js
student.__proto__ === Person // true
student.prototype.__proto__ === Person.prototype // true
ming.__proto__ ===  student.prototype === Person // true
```

extends 操作做了什么？
constructor 依旧指向自己

```js
student.prototype = new Person()
student.constructor = student
```

### 提升hoist

函数声明和类声明之间的一个重要区别在于, 函数声明会提升，类声明不会。你首先需要声明你的类，然后再访问它，否则类似以下的代码将抛出ReferenceError：

```js

let p = class Person {}; // ReferenceError

class Person {}
```

### 静态方法

static 关键字用来定义一个类的一个静态方法。调用静态方法不需要实例化该类，但不能通过一个类实例调用静态方法。静态方法通常用于为一个应用程序创建工具函数。

```js
class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    static displayName = "Point";

    static distance(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return Math.hypot(dx, dy);
    }
}

const p1 = new Point(5, 5);
const p2 = new Point(10,10);
p1.displayName;
// undefined
p1.distance;
// undefined

console.log(Point.displayName);
// "Point"
console.log(Point.distance(p1, p2));
// 7.0710678118654755
```

### 用原型和静态方法绑定 this

当调用静态或原型方法时没有指定 this 的值，那么方法内的 this 值将被置为 undefined。即使你未设置 "use strict" ，因为 class 体内部的代码总是在严格模式下执行。

```js
class Animal {
  speak() {
    return this;
  }
  static eat() {
    return this;
  }
}

Animal.speak // undefined

let obj = new Animal();
obj.speak(); // Animal {}
let speak = obj.speak;
speak(); // undefined

Animal.eat() // class Animal
let eat = Animal.eat;
eat(); // undefined
```

如果上述代码通过传统的基于函数的语法来实现，那么依据初始的 this 值，在非严格模式下方法调用会发生自动装箱。若初始值是 undefined，this 值会被设为全局对象。

严格模式下不会发生自动装箱，this 值将保留传入状态。

```js
function Animal() { }

Animal.prototype.speak = function() {
  return this;
}

Animal.eat = function() {
  return this;
}

let obj = new Animal();
let speak = obj.speak;
speak(); // global object

let eat = Animal.eat;
eat(); // global object
```

### 实例属性

实例的属性必须定义在类的方法里：

```js
class Rectangle {
  constructor(height, width) {
    this.height = height;
    this.width = width;
  }
}
```

静态的或原型的数据属性必须定义在类定义的外面。或者 static

```js
Rectangle.staticWidth = 20;
Rectangle.prototype.prototypeWidth = 25;
```

### 使用 extends 扩展子类

extends 关键字在 类声明 或 类表达式 中用于创建一个类作为另一个类的一个子类。

```js
class Animal {
  constructor(name) {
    this.name = name;
  }

  speak() {
    console.log(`${this.name} makes a noise.`);
  }
}

class Dog extends Animal {
  constructor(name) {
    super(name); // 调用超类构造函数并传入name参数
  }

  speak() {
    console.log(`${this.name} barks.`);
  }
}

var d = new Dog('Mitzie');
d.speak();// 'Mitzie barks.'
```

如果子类中定义了构造函数，那么它必须先调用 super() 才能使用 this 。或者不定义构造函数，可以访问this

```js
class Dog extends Animal {
  constructor(name) {
  }
}
```

// Must call super constructor in derived class before accessing 'this' or returning from derived constructor
constructor 中不调用 super 就会报错，要不就子类不要使用constructor，自动会调用父类的constructor

#### 可以继承传统的基于函数的“类”

```js
function Animal (name) {
  this.name = name;
}
Animal.prototype.speak = function () {
  console.log(this.name + ' makes a noise.');
}

class Dog extends Animal {
  speak() {
    super.speak();
    console.log(this.name + ' barks.');
  }
}

var d = new Dog('Mitzie');
d.speak();//Mitzie makes a noise.  Mitzie barks.
```

请注意，类不能继承常规对象（不可构造的）。如果要继承常规对象，可以改用Object.setPrototypeOf()：

```js
var Animal = {
  speak() {
    console.log(this.name + ' makes a noise.');
  }
};

class Dog {
  constructor(name) {
    this.name = name;
  }
}
// Dog.prototype = Animal // 使用折中方式会在 d.speak()报错 Uncaught TypeError: d.speak is not a function
Object.setPrototypeOf(Dog.prototype, Animal);// 如果不这样做，在调用speak时会返回TypeError

var d = new Dog('Mitzie');
d.speak(); // Mitzie makes a noise.
```

### Species

你可能希望在派生数组类 MyArray 中返回 Array对象。这种 species 方式允许你覆盖默认的构造函数。

例如，当使用像map()返回默认构造函数的方法时，您希望这些方法返回一个父Array对象，而不是MyArray对象。Symbol.species 符号可以让你这样做：

```js
class MyArray extends Array {
  // Overwrite species to the parent Array constructor
  static get [Symbol.species]() { return Array; }
}
var a = new MyArray(1,2,3);
var mapped = a.map(x => x * x);

console.log(mapped instanceof MyArray);
// false
console.log(mapped instanceof Array);
// true
```

### 使用 super 调用超类

super 关键字用于调用对象的父对象上的函数。

```js
class Cat {
  constructor(name) {
    this.name = name;
  }
  speak() {
    console.log(this.name + ' makes a noise.');
  }
}

class Lion extends Cat {
  speak() {
    super.speak();
    console.log(this.name + ' roars.');
  }
}
```

### Mix-ins / 混入

抽象子类或者 mix-ins 是类的模板。 一个 ECMAScript 类只能有一个单超类，所以想要从工具类来多重继承的行为是不可能的。子类继承的只能是父类提供的功能性。因此，例如，从工具类的多重继承是不可能的。该功能必须由超类提供。

一个以超类作为输入的函数和一个继承该超类的子类作为输出可以用于在ECMAScript中实现混合：

```js
var calculatorMixin = Base => class extends Base {
  calc() {
      console.log('calc')
  }
};

var randomizerMixin = Base => class extends Base {
  randomize() { 
      console.log('randomize')
  }
};
```

使用 mix-ins 的类可以像下面这样写：

```js
class Foo { }
class Bar extends calculatorMixin(randomizerMixin(Foo)) { }
```

### 总结

Class本质上是一个特别的函数
class在语法上更贴近面向对象的写法。
class实现继承更加易读易理解。

class 和普通构造函数的相同

1. 都是通过new 的方式创建实例
2. 实例的[[prototype]]/__proto__ 指向 构造函数

class 和普通构造函数的区别

1. class通过extend 可以让 class 和父类建立关系
2. class 没有变量提升
3. class 同名不能重复声明，会报错
4. class 的 [[Scopes]] 包含了 父类， student的  [[Scopes]]  有 Script {Person, student}
5. 类声明和类表达式的主体都执行在严格模式下。比如，构造函数，静态方法，原型方法，getter和setter都在严格模式下执行。
6. 一个构造函数可以使用 super 关键字来调用一个父类的构造函数。
7. 可以寄继承function 的构造函数达成继承

所以class 的继承 和 普通构造函数的继承它 多做这几步

1. 改变 prototype指向
2. 将constructor指向当前class

```js
Dog.prototype = Object.create(Animal.prototype)
//  第4步优化 所有对象都会从它的原型上继承一个 constructor 属性：
Dog.prototype.constructor = Dog
```

```js

class Person {
    constructor(val) {
    }
}
class student extends Person{
}

ming = new student('')
console.log(ming instanceof student)
console.log(ming instanceof Person)


function Animal (name) {
    this.arr = [];
    this.name = name;
}

function Dog (name) {
}

// 第2步优化
function Dog (name) {
  Animal.call(this, name)
}

// Dog.prototype = Animal  // b instanceof Animal 为false

Dog.prototype = new Animal()
// 第2步优化
Dog.prototype = Animal.prototype // 不再共享, 但是实例上的 __proto__ 还是共享的
// 第3步优化
Dog.prototype = Object.create(Animal.prototype)
//  第4步优化 所有对象都会从它的原型上继承一个 constructor 属性：
Dog.prototype.constructor = Dog


b1 = new Dog(222)
b = new Dog(123)
b.__proto__.add= 2
b1.__proto__.add= 3
b.arr.push(222)

console.log(b instanceof Animal)
console.log(b instanceof Dog)
console.log(b1.name,  b1.arr)
console.log(b.name, b.arr)
console.log(b.constructor) // 不设置第4布，constructor会指向 prototype.constructor
```

b instanceof Animal 和 instanceof 查找方式有关，左边 __proto__一直往上原型链查找 __proto__，
b.__proto__ 是 Animal 但是 不等于  Animal.prototype
b.__proto__.__proto__ 是 Function

### 参考文献

1. <https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Classes>
