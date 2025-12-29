
//test1.js文件
let test = require("./test");
let test2 = require("./test2");
let p = test.add;
let b = test;
console.log("p的值是：" + p);
console.log("b的值是：" + b);

let p2 = test2.add;
let b2 = test2;
console.log("p的值是：" + p2);
console.log("b的值是：" + b2);

