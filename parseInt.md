# parseInt

## 前言

JavaScript经常使用parseInt(string)来解析字符串的数字，很少输入parseInt(string,radix)第二个参数。

```js
parseInt(8,8)  
parseInt(08,8)
parseInt(10,8)
parseInt('08',8)
parseInt("1a")
parseInt("a1")
```

结果

    NaN
    NaN
    8
    0
    1
    NaN

### parseInt(string,radix)

parseInt(string,radix) 函数解析字符串，返回整数。

string : 必需，被解析的字符串。

radix：可选，解析数字的基数，也即数字是由多少进制表示。是2-36之间的整数，请注意，10不是默认值！

如果忽略或者为0，那么数字使用十进制表示的。

如果数字是以0x或0X开头的那么数字使用十六进制表示。

#### 解析规则

除了字符串开头和结尾的空白字符外，从第一个字符开始解析，如果字符属于radix进制的字符，那么解析直到出现不符合radix进制的字符处终止。如果第一个字符就不符合radix表示进制的字符，那么返回NaN。

十进制用0-9十个数字表示。上面的例子中，radix=3为三进制。三进制用0，1，2这三个数字表示。

字符8不符合，“8”和第一个数字为8的“80”都不符合，所以

    parseInt("8",3) == NaN
    parseInt("80",3) == NaN
"08"第一个数字“0”符合，所以

    parseInt("08",3) == 0   
同理，十进制中，符合条件的字符为0-9，所以有

    parseInt("a1") == NaN
    parseInt("1a") == 1
但注意a不符合十进制字符，在十六进制是合法字符，如

    parsInt("0xa1")  == 161

### ECMAScript 5 移除了八进制解析

ECMAScript 5 规范不再允许parseInt函数的实现环境把以0字符开始的字符串作为八进制数值。ECMAScript 5 陈述如下：

根据给定radix，parseInt函数产生一个由字符串参数内容解析过来的整数值。字符串中开头的空白会被忽略。如果radix没有指定或者为0，参数会被假定以10为基数来解析，如果数值以字符对0x或0X开头，会假定以16为基数来解析。

这与ECMAScript 3有所不同，ECMAScript 3仅仅是不提倡这种做法但并没有禁止这种做法。

直至2013年，很多实现环境并没有采取新的规范所规定的做法, 而且由于必须兼容旧版的浏览器，所以永远都要明确给出radix参数的值.

### 参考文献

1. <https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/parseInt>
