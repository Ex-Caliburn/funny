console.log(module.exports === exports); // true
console.log(module.exports, exports) // {} {}


exports.array = [0, 1];
console.log(module.exports === exports); // true
console.log(module.exports, exports) // { array: [ 0, 1 ] } { array: [ 0, 1 ] }


exports = 3
console.log(module.exports === exports); // false
console.log(module.exports, exports) // { array: [ 0, 1 ] }  3
