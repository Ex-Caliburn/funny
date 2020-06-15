# class

## 前言

### 注意点

类不存在变量提升（hoist），这一点与 ES5 完全不同。

```
class Person {
    constructor(val) {
        this.a = val
    console.log(1, val)
}
   name= 111;
    run(){
    console.log(111)
}
}
class student extends Person{
    name = 2
    constructor(val) {
        super(val)
        this.a = val + 1
        this.run()

    console.log(2, val)
}
}
ming = new student('123123')
```

student.__proto__ === Person // true
student.prototype.__proto__ === Person.prototype // true
ming.__proto__ ===  student.prototype === Person // true

extends 操作做了什么？
student.prototype = new Person()
student.constructor = student

### 参考文献
