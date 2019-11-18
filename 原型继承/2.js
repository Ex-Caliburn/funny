function DOG(name) {
  this.name = name;
}
DOG.prototype.age  = 10;

var a = new DOG("li");

// console.log(DOG.constructor);
// console.log(DOG.constructor.prototype);
// console.log(DOG.constructor.prototype.constructor.constructor);
// console.log(DOG.constructor.prototype);

console.log("constructor:" +a.constructor);
console.log("constructor:" +a.propertyIsEnumerable("constructor"));
console.log("constructor:" +a.__proto__.propertyIsEnumerable("age"));

for (var obj in a) {
  console.log(obj);
  console.log(a.hasOwnProperty(obj));
  // 是否枚举， 来自非内建对象（未设置）返回true，自建对象一般返回false，原型链上属性返回false
  console.log(a.propertyIsEnumerable(obj));
}