
# Number

## 前言

console.log(9 >= undefined)
console.log(9 < undefined)
console.log(Number(undefined))
console.log(Number(null))

// Number('12.3')    // 12.3
// Number('12.00')   // 12
// Number('123e-1')  // 12.3
// Number('')        // 0
// Number(null)      // 0
// Number('0x11')    // 17
// Number('0b11')    // 3
// Number('0o11')    // 9
// Number('foo')     // NaN
// Number('100a')    // NaN
// Number('-Infinity') //-Infinity

// null为0，undefined为NaN；

### Number ( [ value ] )

// When Number is called with argument number, the following steps are taken:

// If no arguments were passed to this function invocation, let n be +0.
// Else, let n be ToNumber(value).
// ReturnIfAbrupt(n).
// If NewTarget is undefined, return n.
// Let O be OrdinaryCreateFromConstructor(NewTarget, "%NumberPrototype%", «[[NumberData]]» ).
// ReturnIfAbrupt(O).
// Set the value of O’s [[NumberData]] internal slot to n.
// Return O.

### ToNumber ( argument )

Completion Record If argument is an abrupt completion, return argument. Otherwise return ToNumber(argument.[[value]]).
Undefined Return NaN.
Null Return +0.
Boolean Return 1 if argument is true. Return +0 if argument is false.
Number Return argument (no conversion).
String See grammar and conversion algorithm below.
Symbol Throw a TypeError exception.
Object
    Apply the following steps:

    Let primValue be ToPrimitive(argument, hint Number).
    Return ToNumber(primValue).

## 总结

### 参考文献

1. <https://262.ecma-international.org/6.0/#sec-tonumber>
