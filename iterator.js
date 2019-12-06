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
