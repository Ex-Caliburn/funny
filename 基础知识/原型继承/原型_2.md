# prototype

## F.prototype

对象都是由构造函数创建的，如new F()，如果 F.prototype 是一个对象，new 操作符 使用它去设置新对象的[[prototype]]

js一开始就有原型继承，这是js语言的核心功能，但是在过去，无法直接访问它，唯一可靠运行的是"prototype"构造函数的属性

F.prototype 是F上的常规属性，听起来像术语 “prototype”，其实不是

```
let animal = {
  eats: true
};

function Rabbit(name) {
  this.name = name;
}

Rabbit.prototype = animal;

let rabbit = new Rabbit("White Rabbit"); //  rabbit.__proto__ == animal

alert( rabbit.eats ); // true
```

### Default F.prototype, constructor property

prototype拥有一个唯一属性 constructor指向函数本身

```
function Rabbit() {}

/* default prototype
Rabbit.prototype = { constructor: Rabbit };
*/
```

#### js无法确保constructor值不会被改变

如果我们替换prototype，这里将不会有constructor在里面

```
function Rabbit() {}
Rabbit.prototype = {
  jumps: true
};

let rabbit = new Rabbit();
alert(rabbit.constructor === Rabbit); // false
```

建议通过修改和添加方式修改prototype，而不是覆盖

```
function Rabbit() {}

// Not overwrite Rabbit.prototype totally
// just add to it
Rabbit.prototype.jumps = true
// the default Rabbit.prototype.constructor is preserved
```

可以通过手动创建 constructor属性

```
Rabbit.prototype = {
  jumps: true,
  constructor: Rabbit
};

// now constructor is also correct, because we added it
```

有一个obj被不知道那个constructor创建，但是我想创建一个新的对象并使用它

```
let obj2 = new obj.constructor();
```

1. 正常情况可以使用

```
function User(name) {
  this.name = name;
}

let user = new User('John');
let user2 = new user.constructor('Pete');

alert( user2.name ); // Pete (worked!)
```

2. 如果某人覆盖了构建函数的 prototype并且忘记去重新创建引用，就会失败

```
function User(name) {
  this.name = name;
}
User.prototype = {}; // (*)

let user = new User('John');
let user2 = new user.constructor('Pete');

alert( user2.name ); // undefined
```

### 参考文献

1. <https://javascript.info/function-prototype>
