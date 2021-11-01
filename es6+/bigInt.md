# bigInt

## 前言

BigInt 是一种内置对象，它提供了一种方法来表示大于 2^53 - 1 的整数。这原本是 Javascript中可以用 Number 表示的最大数字。BigInt 可以表示任意大的整数。

```js
const theBiggestInt = 9007199254740991n;

const alsoHuge = BigInt(9007199254740991);
// ↪ 9007199254740991n

const hugeString = BigInt("9007199254740991");
// ↪ 9007199254740991n

const hugeHex = BigInt("0x1fffffffffffff");
// ↪ 9007199254740991n

const hugeBin = BigInt("0b11111111111111111111111111111111111111111111111111111");
// ↪ 9007199254740991n
```

它在某些方面类似于 Number ，但是也有几个关键的不同点：不能用于 Math 对象中的方法；不能和任何 Number 实例混合运算，两者必须转换成同一种类型。在两种类型来回转换时要小心，因为 BigInt 变量在转换成 Number 变量时可能会丢失精度。

### 类型信息

使用 typeof 测试时， BigInt 对象返回 "bigint" ：

```js
typeof 1n === 'bigint'; // true
typeof BigInt('1') === 'bigint'; // true
// 使用 Object 包装后， BigInt 被认为是一个普通 "object" ：

typeof Object(1n) === 'object'; // true
```

### 运算

以下操作符可以和 BigInt 一起使用： +、`*`、`-`、`**`、`%` 。除 >>> （无符号右移）之外的 位操作 也可以支持。因为 BigInt 都是有符号的， >>> （无符号右移）不能用于 BigInt。为了兼容 asm.js ，BigInt 不支持单目 (+) 运算符。

### 比较

BigInt 和 Number 不是严格相等的，但是宽松相等的。

```js
0n === 0
// ↪ false

0n == 0
// ↪ true
```

Number 和 BigInt 可以进行比较。

```js
1n < 2
// ↪ true

2n > 1
// ↪ true

2 > 2
// ↪ false

2n > 2
// ↪ false

2n >= 2
// ↪ true
```

两者也可以混在一个数组内并排序。

```js
const mixed = [4n, 6, -12n, 10, 4, 0, 0n];
// ↪  [4n, 6, -12n, 10, 4, 0, 0n]

mixed.sort();
// ↪ [-12n, 0, 0n, 10, 4n, 4, 6]
```

注意被  Object 包装的 BigInts 使用 object 的比较规则进行比较，只用同一个对象在比较时才会相等。

```js
0n === Object(0n); // false
Object(0n) === Object(0n); // false

const o = Object(0n);
o === o // true
```

### 在 JSON 中使用

对任何 BigInt 值使用 JSON.stringify() 都会引发 TypeError，因为默认情况下 BigInt 值不会在 JSON 中序列化。但是，如果需要，可以实现 toJSON 方法：

```js
BigInt.prototype.toJSON = function() { return this.toString(); }
JSON.stringify 现在生成如下字符串，而不是抛出异常:

JSON.stringify(BigInt(1));
// '"1
```

## 总结

由于在 Number 与 BigInt 之间进行转换会损失精度，因而建议仅在值可能大于2^53 时使用 BigInt 类型，并且不在两种类型之间进行相互转换。
注意是整数，不适用小数

### 参考文献

1. [bigInt](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/BigInt#%E8%BF%90%E7%AE%97)
