
Function.prototype.addMethod = function (name,fn) {
    this[name] = fn
    return this;  // 链式添加方法
}

var a = function () {}
// a.addMethod('test',function () {
//     console.log('test');
//     return this;    // 链式调用
// })
// a.addMethod('walk',function () {
//   console.log('walk');
//   return this;
// })
a.addMethod('test',function () {
  console.log('test');
  return this;    // 链式调用
}).addMethod('walk',function () {
  console.log('walk');
  return this;
})

a.test().walk()

