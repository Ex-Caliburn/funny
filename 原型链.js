function fun() {};
var f = new fun();
f.__proto__ // === ? 1
f.__proto__.__proto__ // === ? 2
f.__proto__.__proto__.__proto__ // === ? 3
f.__proto__.__proto__.__proto__.__proto__ // === ? 4
fun.__proto__ // === ? 5
fun.__proto__.__proto__ // === ? 6
f.prototype // ? 7


fun.prototype
Object.prototype
null
error
Function.prototype
Object.prototype
undefined