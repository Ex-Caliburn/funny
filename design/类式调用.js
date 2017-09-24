
Function.prototype.addMethod = function (name,fn) {
  this.prototype[name] = fn
  return this;  // 链式添加方法
}

var a = function () {}

a.addMethod('test',function () {
  console.log('test');
  return this;    // 链式调用
}).addMethod('walk',function () {
  console.log('walk');
  return this;
})


var method = new a();
method.test().walk()
