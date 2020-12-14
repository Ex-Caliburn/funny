### decorator

装饰器（Decorator）是一种与类（class）相关的语法，用来注释或修改类和类方法。许多面向对象的语言都有这项功能，目前有一个提案将其引入了 ECMAScript。

装饰器是一种函数，写成@ + 函数名。它可以放在类和类方法的定义前面。

```
@frozen class Foo {
  @configurable(false)
  @enumerable(true)
  method() {}

  @throttle(500)
  expensiveMethod() {}
}
```

上面代码一共使用了四个装饰器，一个用在类本身，另外三个用在类方法。它们不仅增加了代码的可读性，清晰地表达了意图，而且提供一种方便的手段，增加或修改类的功能。

### 类的装饰

```
基本上，装饰器的行为就是下面这样。

@decorator
class A {}

// 等同于

class A {}
A = decorator(A) || A;
```

如果觉得一个参数不够用，可以在装饰器外面再封装一层函数。

```
function testable(isTestable) {
  return function(target) {
    target.isTestable = isTestable;
  }
}

@testable(true)
class MyTestableClass {}
MyTestableClass.isTestable // true

@testable(false)
class MyClass {}
MyClass.isTestable // false
```

### 方法的装饰

```
class Person {
  @readonly
  name() { return `${this.first} ${this.last}` }
}
```

### 参考文档

1. <https://es6.ruanyifeng.com/?search=defineProperty&x=0&y=0#docs/decorator>
