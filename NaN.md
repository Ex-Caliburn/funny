# NAN

## 前言

如何判断NAN ？
NAN == NAN // false
NAN === NAN // false

### isNAN

isNaN(NaN) // true
isNaN({}) // true

必须加一层
typeof val === 'number' && !isNaN(val)

### es6 Number.isNaN()

Number.isNaN(NaN) // true
Number.isNaN({}) // true
Number.isNaN(9/NaN) // true
Number.isNaN('true' / 0) // true
Number.isNaN('true' / 'true') // true
Number.isNaN("a123") // false
Number.isNaN(+"a123") // true

### Object.is()

它用来比较两个值是否严格相等，与严格比较运算符（===）的行为基本一致。

Object.is(NaN, NaN) // true

不同之处只有两个：一是+0不等于-0，二是NaN等于自身。

+0 === -0 //true
Object.is(+0, -0) // false

## 总结

它们与传统的全局方法isNaN()的区别在于，传统方法先调用Number()将非数值的值转为数值，再进行判断，而这两个新方法只对数值有效，

### 参考文献

1. <https://es6.ruanyifeng.com/?search=isnumber&x=0&y=0#docs/number#Number-isFinite-Number-isNaN>
