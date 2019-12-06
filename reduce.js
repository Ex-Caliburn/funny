// reducer 函数接收4个参数:
//
//   Accumulator (acc) (累计器)
// Current Value (cur) (当前值)
// Current Index (idx) (当前索引)
// Source Array (src) (源数组)

// 您的 reducer 函数的返回值分配给累计器，该返回值在数组的每个迭代中被记住，并最后成为最终的单个结果值。

a = [0, 1, 2, 3, 4].reduce(function(accumulator, currentValue, currentIndex, array){
  console.log(accumulator, currentValue, currentIndex, array)
  return accumulator + currentValue;
});

// b = [                      ].reduce( () => {} )

console.log(a)
// console.log(b)

var initialValue = 4;
var sum = [{x: 1}, {x:2}, {x:3}].reduce(
  (accumulator, currentValue) => accumulator + currentValue.x
  ,initialValue
);

console.log(sum) // logs 6

var flattened = [[0, 1], [2, 3], [4, 5]].reduce(
  function(a, b) {
    return a.concat(b);
  },
  []
);
// flattened is [0, 1, 2, 3, 4, 5]
console.log(flattened)

// 按顺序运行Promise。 Promise.all(iterable); 并不是按顺序执行
/**
 * Runs promises from array of functions that can return promises
 * in chained manner
 *
 * @param {array} arr - promise arr
 * @return {Object} promise object
 */
function runPromiseInSequence(arr, input) {
  return arr.reduce(
    (promiseChain, currentFunction) => {
     return promiseChain.then(currentFunction)
    },
    Promise.resolve(input)
  );
}

// promise function 1
function p1(a) {
  return new Promise((resolve, reject) => {
    resolve(a * 5);
  });
}

// promise function 2
function p2(a) {
  return new Promise((resolve, reject) => {
    resolve(a * 2);
  });
}

// function 3  - will be wrapped in a resolved promise by .then()
function f3(a) {
  return a * 3;
}

// promise function 4
function p4(a) {
  return new Promise((resolve, reject) => {
    resolve(a * 4);
  });
}

const promiseArr = [p1, p2, f3, p4];
runPromiseInSequence(promiseArr, 10)
  .then(console.log);   // 1200


// Building-blocks to use for composition
const double = x => x + x;
const triple = x => 3 * x;
const quadruple = x => 4 * x;

// Function composition enabling pipe functionality
// const pipe = (...functions) => input => functions.reduce(
//   (acc, fn) => fn(acc),
//   input
// );

/* 柯里化函数 */
const pipe = (...functions) => {
  return input => functions.reduce(
    (acc, fn) => fn(acc),
    input
  );
}

// Composed functions for multiplication of specific values
const multiply6 = pipe(double, triple);
const multiply9 = pipe(triple, triple);
const multiply16 = pipe(quadruple, quadruple);
const multiply24 = pipe(double, triple, quadruple);

// Usage
multiply6(6); // 36
multiply9(9); // 81
multiply16(16); // 256
multiply24(10); // 240


