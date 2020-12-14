# URI和URL

## 前言

URI("Uniform Resource Identifier") 更多的归类于 定位符，名称或两者， "Uniform Resource Locator" (URL)是指URIs的子集，，除了标识资源，提供的一种手段通过描述其主要访问机制定位资源（例如，它的网络的“位置”）。历史上一直使用术语“统一资源名称” （URN）来指代“ urn”方案[ RFC2141 ] 下的两个URI ，即使资源不再存在或变得不可用，它们也必须保持全局唯一性和持久性。具有名称属性的任何其他URI。

“名称”或“定位器”的名称。来自任何给定方案的URI实例可能具有名称或定位符或这两者的特征，通常取决于命名机构对标识符分配的持久性和谨慎性，而不是取决于方案的任何质量。未来的规范和相关文档应使用通用术语“ URI”，而不是限制性更强的术语 “ URL”和“ URN” [ RFC3305 ]

### URIs example

The following example URIs illustrate several URI schemes and
   variations in their common syntax components:

```
      ftp://ftp.is.co.za/rfc/rfc1808.txt

      http://www.ietf.org/rfc/rfc2396.txt

      ldap://[2001:db8::7]/c=GB?objectClass?one

      mailto:John.Doe@example.com

      news:comp.infosystems.www.servers.unix

      tel:+1-816-555-1212

      telnet://192.0.2.16:80/

      urn:oasis:names:specification:docbook:dtd:xml:4.1.2
```

### Data URI

可以将数据直接放在URI，而不必在internet 上定位或者命名，一个例子是

```
data:,Hello%20World
```

### URI和URI 例子

URI负责识别，URL负责定位;然而，定位符也是标识符，因此每个URL都是URI，但是每个URI并不全是URL。

      Roger Pate
这是我的名字，这是一个标识符。它就像一个URI，但它不是一个URL，因为它没告诉你我的位置以及如何联系到我。在这种情况下，单单在美国至少就能找到5个与我同名的。

      4914 West Bay Street，Nassau，Bahamas
这是一个带有物理位置标识符的定位符。它像URL和URI（因为所有URL都是URI），并且间接把我识别为“..的居民”。在这种情况下，它可以唯一标识我，但如果新搬来一个室友，那将会改变。

我“喜欢(栗子)”，因为这些示例不依托于必要的语法。

### 参考文献

1. <https://stackoverflow.com/questions/176264/what-is-the-difference-between-a-uri-a-url-and-a-urn>
2. <https://juejin.im/entry/58ff07b2a0bb9f0065d1667f>
3. <https://tools.ietf.org/html/rfc3986#page-4>
