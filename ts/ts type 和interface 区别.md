# ts type 和interface 区别

## 前言

### Interface 接口

TypeScript的核心原则之一是对值所具有的结构进行类型检查。 它有时被称做“鸭式辨型法”或“结构性子类型化”。 在TypeScript里，接口的作用就是为这些类型命名和为你的代码或第三方代码定义契约。

### alias 类型别名

类型别名会给一个类型起个新名字。 类型别名有时和接口很像，但是可以作用于原始值，联合类型，元组以及其它任何你需要手写的类型。

/**

* Interface(接口) vs Type alias(类型别名)
* 相同点-> 都可以描述一个对象或者函数
* -> 都允许拓展（extends） 只是语法不一样
* --->> interface extends interface (接口继承接口)
* --->> type extends type (类型继承类型)
* --->> interface extends type (接口继承类型)
* --->> // type extends interface (类型继承接口)
 */

```js
interface UserOP {  // 描述一个对象
    name: string;
    email: string;
    isBig: boolean;
    age: number;
}

interface SetUser { // 描述一个函数
    (name: string, email: string, isBig: boolean, age: number): UserOP;
}

let pikaqiu: UserOP; // 创建一个变量是 UserOP的类型
pikaqiu = { name: 'zyn', email: 're', isBig: false, age: 34 }

let mySearchXX: SetUser; // 用来描述一个方法
mySearchXX = function (name: string, email: string, isBig: boolean, age: number): UserOP {
    return pikaqiu;
}

// type

type UserTy = {
    name: string
    age: number
};

type SetUserTy = (name: string, age: number) => void;

let pikaqiu1: UserTy;
pikaqiu1 = { name: 'zyn', age: 54 };

let mySearchXXTy: SetUserTy;
mySearchXXTy = function (name: string, age: number) {
}
```

// interface extends interface (接口继承接口)

```js
// 1. interface 属性继承
interface dudu1 {
    name: string
}

interface dudu2 extends dudu1 {
    age: number
}

const duduTest: dudu2 = { name: 'zyb', age: 23 };

// type extends type (类型继承类型)

type Nametype = {
    name: string;
}
type UserType = Nametype & { age: number };
const valueType: UserType = { name: 'zyb', age: 23 };

// interface extends type (接口继承类型)

type LulvwaType = {
    name: string
}

interface LulvwaFace extends LulvwaType {
    age: number;
}

const LulvwaValue: LulvwaFace = { name: 'zyb', age: 23 };

// type extends interface (类型继承接口)

interface shajFace {
    name: string
}

type shajType = shajFace & {
    age: number;
}
const shajValue: shajType = { name: 'zyb', age: 23 };
```

/**

* Interface(接口) vs Type alias(类型别名)
* 不同点-> type 可以而 interface 不行
* -----> type 可以声明基本类型别名，联合类型，元组等类型
* -> interface 可以而 type 不行
* -----> interface 能够声明合并 重名

 */

```js
// 基本类型别名
type DiffName = string;

// 联合类型
interface Dog {
    wong();
}
interface Cat {
    miao();
}

type Pet = Dog | Cat

// 元祖类型
type PetList = [Dog, Pet]

// interface 能够声明合并

interface DiffLx {
    name: string
}
interface DiffLx {
    age: number
}
interface DiffLx {
    sex: string
}

// 合并后的结果
/*
interface DiffLx {
    name: string
    age: number
    sex: string
}
*/
const DiffLxValue: DiffLx = { name: '34', age: 34, sex: 'nv' }
```

type 语句中还可以使用 typeof 获取实例的 类型进行赋值

```js

// 当你想获取一个变量的类型时，使用 typeof
let div = document.createElement('div');
type B = typeof div

// 其他骚操作

type StringOrNumber = string | number;  
type Text = string | { text: string };  
type NameLookup = Dictionary<string, Person>;  
type Callback<T> = (data: T) => void;  
type Pair<T> = [T, T];  
type Coordinates = Pair<number>;  
type Tree<T> = T | { left: Tree<T>, right: Tree<T> };
```

## 总结

像我们提到的，类型别名可以像接口一样；然而，仍有一些细微差别。

其一，接口创建了一个新的名字，可以在其它任何地方使用。 类型别名并不创建新名字—比如，错误信息就不会使用别名。 在下面的示例代码里，在编译器中将鼠标悬停在 interfaced上，显示它返回的是 Interface，但悬停在 aliased上时，显示的却是对象字面量类型。

```js
type Alias = { num: number }
interface Interface {
    num: number;
}
declare function aliased(arg: Alias): Alias;
declare function interfaced(arg: Interface): Interface;
```

另一个重要区别是类型别名不能被 implements。 因为 软件中的对象应该对于扩展是开放的，但是对于修改是封闭的，你应该尽量去使用接口代替类型别名。

另一方面，如果你无法通过接口来描述一个类型并且需要使用联合类型或元组类型，这时通常会使用类型别名。

the key distinction is that a type cannot be re-opened to add new properties vs an interface which is always extendable.
关键区别在于 type 无法重新打开添加新属性，而 interface 经常是可拓展的，重名

网页总结
用interface描述**数据结构**，用type描述**类型关系**

### 参考文献

1. <https://www.tslang.cn/docs/handbook/advanced-types.html>
2. <https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-aliases>
