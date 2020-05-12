## Unicode
Unicode源于一个很简单的想法：将全世界所有的字符包含在一个集合里，计算机只要支持这一个字符集，就能显示所有的字符，再也不会有乱码了。


它从0开始，为每个符号指定一个编号，这叫做"码点"（code point）。比如，码点0的符号就是null（表示所有二进制位都是0）。

U+0000 = null


### 历史
两者的关系简单说，就是UTF-16取代了UCS-2，或者说UCS-2整合进了UTF-16。所以，现在只有UTF-16，没有UCS-2。


### JavaScript字符函数的局限
由于JavaScript只能处理UCS-2编码，造成所有字符在这门语言中都是2个字节，如果是4个字节的字符，会当作两个双字节的字符处理。JavaScript的字符函数都受到这一点的影响，无法返回正确结果。
只支持16位UTF-16编码，不支持32位

还是以字符![icon][base64str]
为例，它的UTF-16编码是4个字节的0xD834 DF06。问题就来了，4个字节的编码不属于UCS-2，JavaScript不认识，只会把它看作单独的两个字符U+D834和U+DF06。前面说过，这两个码点是空的，所以JavaScript会认为是两个空字符组成的字符串！

```
'­'.charCodeAt(0) // 173
'­'.charAt(0) // ''
'­' === '\u00ad' // true 看不见的符号是-
 
```

### es6大幅支持unicode

### Unicode和  UTF-8 
Unicode 是「字符集」
UTF-8 是「编码规则」

字符集：为每一个「字符」分配一个唯一的 ID（学名为码位 / 码点 / Code Point）
编码规则：将「码位」转换为字节序列的规则（编码/解码 可以理解为 加密/解密 的过程）

### 参考文献
1. https://www.ruanyifeng.com/blog/2014/12/unicode.html
2. https://www.zhihu.com/question/23374078

[base64str]:data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAWCAYAAAAvg9c4AAAAWklEQVQ4T2P8DwQMVAaMQ8/Qv3//Mnz//p3sgODh4YHrhXv/wIEDDI6OjmQb+vr1awYRERGwftoaSrYTsWiEu3Q0TKkWrKNhSsNSajSdUj+dUs1E5KJv0BsKAPvEn7+vXHZxAAAAAElFTkSuQmCC
