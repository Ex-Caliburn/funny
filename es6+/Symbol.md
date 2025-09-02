# Symbol

## 前言

ES5 的对象属性名都是字符串，这容易造成属性名的冲突。比如，你使用了一个他人提供的对象，但又想为这个对象添加新的方法（mixin 模式），新方法的名字就有可能与现有方法产生冲突。如果有一种机制，保证每个属性的名字都是独一无二的就好了，这样就从根本上防止属性名的冲突。这就是 ES6 引入Symbol的原因。

ES6 引入了一种新的原始数据类型Symbol，表示独一无二的值。它是 JavaScript 语言的第七种数据类型，前六种是：undefined、null、布尔值（Boolean）、字符串（String）、数值（Number）、对象（Object）。

### 例子

Symbol 值通过Symbol函数生成。这就是说，对象的属性名现在可以有两种类型，一种是原来就有的字符串，另一种就是新增的 Symbol 类型。凡是属性名属于 Symbol 类型，就都是独一无二的，可以保证不会与其他属性名产生冲突。

```js
let s = Symbol();

typeof s
// "symbol"
```

上面代码中，变量s就是一个独一无二的值。typeof运算符的结果，表明变量s是 Symbol 数据类型，而不是字符串之类的其他类型。

注意，Symbol函数前不能使用new命令，否则会报错。这是因为生成的 Symbol 是一个原始类型的值，不是对象。也就是说，由于 Symbol 值不是对象，所以不能添加属性。基本上，它是一种类似于字符串的数据类型。

Symbol函数可以接受一个字符串作为参数，表示对 Symbol 实例的描述，主要是为了在控制台显示，或者转为字符串时，比较容易区分。

```js
let s1 = Symbol('foo');
let s2 = Symbol('bar');

s1 // Symbol(foo)
s2 // Symbol(bar)

s1.toString() // "Symbol(foo)"
s2.toString() // "Symbol(bar)"

let a = Symbol();
let b = Symbol();
a.toString() === b.toString() 
```

上面代码中，s1和s2是两个 Symbol 值。如果不加参数，它们在控制台的输出都是Symbol()，不利于区分。有了参数以后，就等于为它们加上了描述，输出的时候就能够分清，到底是哪一个值。

如果 Symbol 的参数是一个对象，就会调用该对象的toString方法，将其转为字符串，然后才生成一个 Symbol 值。

```js
const obj = {
  toString() {
    return 'abc';
  }
};
const sym = Symbol(obj);
sym // Symbol(abc)
```

注意，Symbol函数的参数只是表示对当前 Symbol 值的描述，因此相同参数的Symbol函数的返回值是不相等的。

```js
// 没有参数的情况
let s1 = Symbol();
let s2 = Symbol();

s1 === s2 // false

// 有参数的情况
let s1 = Symbol('foo');
let s2 = Symbol('foo');

s1 === s2 // false
```

上面代码中，s1和s2都是Symbol函数的返回值，而且参数相同，但是它们是不相等的。

Symbol 值不能与其他类型的值进行运算，会报错。

```js
let sym = Symbol('My symbol');

"your symbol is " + sym
// TypeError: can't convert symbol to string
`your symbol is ${sym}`
// TypeError: can't convert symbol to string
```

但是，Symbol 值可以显式转为字符串。

```js
let sym = Symbol('My symbol');

String(sym) // 'Symbol(My symbol)'
sym.toString() // 'Symbol(My symbol)'
```

另外，Symbol 值也可以转为布尔值，但是不能转为数值。

```js
let sym = Symbol();
Boolean(sym) // true
!sym  // false

if (sym) {
  // ...
}

Number(sym) // TypeError
sym + 2 // TypeError
```

Symbol 属性名无法被  Object.keys 找到
Object.getOwnPropertySymbols(target)

```js
let test = {
  [Symbol('1')]: 2
}

Object.keys(test) // []
Object.getOwnPropertySymbols(test) // [Symbol(1)]

let aa = {
  b: 2,
  [Symbol(1)]: Symbol(2)
}
aa.__proto__.bbb = 3
aa.__proto__[Symbol(4)] = Symbol(5)

temp = [...Object.keys(aa), ...Object.getOwnPropertySymbols(aa)]
console.log(temp)

for (const key in aa) {
  console.log(key)
}

temp.forEach((item) => {
  console.log(item)
})
```

## Symbol 的应用场景

### 1. 私有属性

Symbol 可以用来创建真正的私有属性，因为 `Object.keys()`、`for...in` 等遍历方法无法获取到 Symbol 属性：

```js
const _name = Symbol('name');
const _age = Symbol('age');

class Person {
  constructor(name, age) {
    this[_name] = name;
    this[_age] = age;
  }
  
  getName() {
    return this[_name];
  }
  
  getAge() {
    return this[_age];
  }
}

const person = new Person('Alice', 25);
console.log(person.getName()); // 'Alice'
console.log(Object.keys(person)); // []
console.log(Object.getOwnPropertySymbols(person)); // [Symbol(name), Symbol(age)]
```

### 2. 避免属性名冲突

在 mixin 模式中，使用 Symbol 可以避免属性名冲突：

```js
const eventEmitter = Symbol('eventEmitter');

class MyClass {
  constructor() {
    this[eventEmitter] = new EventEmitter();
  }
  
  addListener(event, callback) {
    this[eventEmitter].on(event, callback);
  }
}

// 即使 MyClass 的原型链上有 eventEmitter 属性，也不会冲突
MyClass.prototype.eventEmitter = 'some value';
```

### 3. 元编程和元数据

Symbol 可以用于存储对象的元数据：

```js
const metadata = Symbol('metadata');

class User {
  constructor(name) {
    this.name = name;
    this[metadata] = {
      createdAt: new Date(),
      version: '1.0.0'
    };
  }
  
  getMetadata() {
    return this[metadata];
  }
}
```

### 4. 内置 Symbol 值

ES6 提供了多个内置的 Symbol 值，用于改变 JavaScript 对象的行为：

#### Symbol.iterator

定义对象的默认迭代器：

```js
const collection = {
  items: ['a', 'b', 'c'],
  [Symbol.iterator]() {
    let index = 0;
    return {
      next: () => {
        if (index < this.items.length) {
          return { value: this.items[index++], done: false };
        }
        return { done: true };
      }
    };
  }
};

for (const item of collection) {
  console.log(item); // 'a', 'b', 'c'
}
```

#### Symbol.toStringTag

自定义对象的字符串表示：

```js
class MyArray {
  get [Symbol.toStringTag]() {
    return 'MyArray';
  }
}

const arr = new MyArray();
console.log(Object.prototype.toString.call(arr)); // '[object MyArray]'
```

#### Symbol.toPrimitive

控制对象转换为原始值的行为：

```js
const obj = {
  [Symbol.toPrimitive](hint) {
    switch (hint) {
      case 'number':
        return 42;
      case 'string':
        return 'hello';
      default:
        return 'default';
    }
  }
};

console.log(+obj); // 42
console.log(`${obj}`); // 'hello'
console.log(obj + ''); // 'default'
```

#### Symbol.species

控制继承对象的构造函数：

```js
class MyArray extends Array {
  static get [Symbol.species]() {
    return Array;
  }
}

const myArr = new MyArray(1, 2, 3);
const mapped = myArr.map(x => x * 2);
console.log(mapped instanceof MyArray); // false
console.log(mapped instanceof Array); // true
```

### 5. 单例模式

使用 Symbol 可以创建真正的单例：

```js
const instance = Symbol('instance');

class Singleton {
  static getInstance() {
    if (!this[instance]) {
      this[instance] = new Singleton();
    }
    return this[instance];
  }
  
  constructor() {
    if (Singleton[instance]) {
      return Singleton[instance];
    }
  }
}

const s1 = Singleton.getInstance();
const s2 = Singleton.getInstance();
console.log(s1 === s2); // true
```

### 6. 接口和契约

Symbol 可以用于定义接口和契约：

```js
const render = Symbol('render');
const update = Symbol('update');

class Component {
  [render]() {
    console.log('Rendering component');
  }
  
  [update]() {
    console.log('Updating component');
  }
}

// 外部无法直接调用这些方法，只能通过特定的接口
const component = new Component();
// component[render](); // 需要知道 Symbol 才能调用
```

### 7. 配置对象

Symbol 可以用于创建配置对象，避免键名冲突：

```js
const config = {
  [Symbol('api')]: 'https://api.example.com',
  [Symbol('timeout')]: 5000,
  [Symbol('retries')]: 3
};

// 外部无法通过 Object.keys 获取这些配置
console.log(Object.keys(config)); // []
```

## 总结

Symbol 的主要应用场景包括：

1. **私有属性**：创建真正的私有属性，避免被外部访问
2. **避免冲突**：在 mixin 和库开发中避免属性名冲突
3. **元编程**：存储元数据和改变对象行为
4. **内置 Symbol**：使用 ES6 提供的内置 Symbol 值
5. **单例模式**：创建真正的单例实例
6. **接口契约**：定义内部接口和契约
7. **配置对象**：创建不可枚举的配置项

Symbol 为 JavaScript 提供了更强大的元编程能力，使得我们可以更好地控制对象的行为和属性访问。

### 参考文献
