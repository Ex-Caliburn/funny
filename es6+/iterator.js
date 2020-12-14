
// Iterator（遍历器）的概念
// JavaScript 原有的表示“集合”的数据结构，主要是数组（Array）和对象（Object），ES6 又添加了Map和Set。这样就有了四种数据集合，用户还可以组合使用它们，定义自己的数据结构，比如数组的成员是Map，Map的成员是对象。这样就需要一种统一的接口机制，来处理所有不同的数据结构。

// 遍历器（Iterator）就是这样一种机制。它是一种接口，为各种不同的数据结构提供统一的访问机制。任何数据结构只要部署 Iterator 接口，就可以完成遍历操作（即依次处理该数据结构的所有成员）。

// Iterator 的作用有三个：
// 一是为各种数据结构，提供一个统一的、简便的访问接口；
// 二是使得数据结构的成员能够按某种次序排列；
// 三是 ES6 创造了一种新的遍历命令for...of循环，Iterator 接口主要供for...of消费。

var someArray = [1, 5, 7];
var someArrayEntries = someArray.entries();

someArrayEntries.toString();           // "[object Array Iterator]"
someArrayEntries === someArrayEntries[Symbol.iterator]();    // true


// String 是一个内置的可迭代对象:

var someString = "hi";
typeof someString[Symbol.iterator];          // "function"
// String 的默认迭代器会一个接一个返回该字符串的字符：

var iterator = someString[Symbol.iterator]();
iterator + "";                               // "[object String Iterator]"

// iterator.next();                             // { value: "h", done: false }
// iterator.next();                             // { value: "i", done: false }
// iterator.next();

console.log(someString[Symbol.iterator])
console.log(iterator.next())
console.log(iterator.next())
console.log(iterator.next())


console.log([...someString])

// 我们可以通过自己的 @@iterator 方法重新定义迭代行为：

var someString = new String("hi");          // need to construct a String object explicitly to avoid auto-boxing

someString[Symbol.iterator] = function() {
  return { // this is the iterator object, returning a single element, the string "bye"
    next: function() {
      if (this._first) {
        this._first = false;
        return { value: "bye", done: false };
      } else {
        return { done: true };
      }
    },
    _first: true
  };
};
// 注意重新定义 @@iterator 方法是如何影响内置语法结构的行为的，它使用数据对象相同的迭代协议:

  [...someString];                              // ["bye"]
someString + "";                              // "hi"

// 内置可迭代对象
// String, Array, TypedArray, Map and Set 是所有内置可迭代对象， 因为它们的原型对象都有一个 @@iterator 方法.


// 自定义可迭代对象
var myIterable = {};
myIterable[Symbol.iterator] = function* () {
  yield 1;
  yield 2;
  yield 3;
};
[...myIterable]; // [1, 2, 3]


async function test() {
  let arr = [4, 2, 1]
  arr.forEach(async item => {
    console.log('forEach', item)
    const res = await handle(item)
    console.log(res)
  })
  console.log('结束')
}

function handle(x) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(x)
    }, 1000 * x)
  })
}

// test()

async function test2() {
  let arr = [4, 2, 1]
  for(const item of arr) {
    console.log('for of', item)
    const res = await handle(item)
    console.log(res)
  }
  console.log('结束')
}

test2()

/* iterator  语法糖*/
async function test3() {
  let arr = [4, 2, 1]
  let iterator = arr[Symbol.iterator]();
  let res = iterator.next();
  while(!res.done) {
    let value = res.value;
    console.log(value);
    await handle(value);
    res = iterater.next();
  }
  console.log('结束')
}
// 4
// 2
// 1
// 结束


// 对于for...of的循环，可以由break, throw  continue    或return终止。在这些情况下，迭代器关闭。


function* foo(){
  yield 1;
  yield 2;
  yield 3;
};

for (let o of foo()) {
  console.log(o);
  break; // closes iterator, triggers return
}

// 无论是for...in还是for...of语句都是迭代一些东西。它们之间的主要区别在于它们的迭代方式。

// for...in 语句以任意顺序迭代对象的可枚举属性。

// for...of 语句遍历可迭代对象定义要迭代的数据。

Object.prototype.objCustom = function() {};
Array.prototype.arrCustom = function() {};

let iterable = [3, 5, 7];
iterable.foo = 'hello';

for (let i in iterable) {
  console.log(i); // logs 0, 1, 2, "foo", "arrCustom", "objCustom"
}

for (let i in iterable) {
  if (iterable.hasOwnProperty(i)) {
    console.log(i); // logs 0, 1, 2, "foo"
  }
}

for (let i of iterable) {
  console.log(i); // logs 3, 5, 7
}
