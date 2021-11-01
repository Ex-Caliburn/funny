function f1() {
  return this
}
//在浏览器中：
//   f1() === window;   //在浏览器中，全局对象是window

//在Node中：
f1() === globalThis
console.log(f1() === globalThis, this)
console.log(global)

var id = 1
function foo() {
  console.log(this)
  setTimeout(() => {
    console.log('id:', this.id)
  }, 100)
}
foo()

// 第二种
var id = 1
function foo() {
  console.log(this)
  setTimeout(() => {
    console.log('id:', this.id)
  }, 100)
}
foo.call({ id: 3 })



// 箭头函数无法绑定this，this沿着作用域找寻
let b = () => {
  console.log(this.id)
}
b.call({id: 5})


// 所有的箭头函数都没有自己的this，都指向外层
// “箭头函数”的this，总是指向定义时所在的对象，而不是运行时所在的对象。
// 总是指向所在函数运行时的this
function foo() {
  return () => {
    return () => {
      return () => {
        console.log("id:", this.id);
      };
    };
  };
}

var f = foo.call({id: 1});

var t1 = f.call({id: 2})()();
var t2 = f().call({id: 3})();
var t3 = f()().call({id: 4});