// 索引类型（Index types）
// 使用索引类型，编译器就能够检查使用了动态属性名的代码。 例如，一个常见的JavaScript模式是从对象中选取属性的子集。

function pluck(o, names) {
    return names.map(n => o[n]);
}
// 下面是如何在TypeScript里使用此函数，通过 索引类型查询和 索引访问操作符：

function pluck<T, K extends keyof T>(o: T, names: K[]): T[K][] {
  return names.map(n => o[n]);
}

interface Person {
    name: string;
    age: number;
}
let person: Person = {
    name: 'Jarid',
    age: 35
};
let strings: string[] = pluck(person, ['name']); // ok, string[]
// 编译器会检查 name是否真的是 Person的一个属性。 本例还引入了几个新的类型操作符。 首先是 keyof T， 索引类型查询操作符。 对于任何类型 T， keyof T的结果为 T上已知的公共属性名的联合。 例如：

let personProps: keyof Person; // 'name' | 'age'
// keyof Person是完全可以与 'name' | 'age'互相替换的。 不同的是如果你添加了其它的属性到 Person，例如 address: string，那么 keyof Person会自动变为 'name' | 'age' | 'address'。 你可以在像 pluck函数这类上下文里使用 keyof，因为在使用之前你并不清楚可能出现的属性名。 但编译器会检查你是否传入了正确的属性名给 pluck：

pluck(person, ['age', 'unknown']); // error, 'unknown' is not in 'name' | 'age'
// 第二个操作符是 T[K]， 索引访问操作符。 在这里，类型语法反映了表达式语法。 这意味着 person['name']具有类型 Person['name'] — 在我们的例子里则为 string类型。 然而，就像索引类型查询一样，你可以在普通的上下文里使用 T[K]，这正是它的强大所在。 你只要确保类型变量 K extends keyof T就可以了。 例如下面 getProperty函数的例子：

function getProperty<T, K extends keyof T>(o: T, name: K): T[K] {
    return o[name]; // o[name] is of type T[K]
}
// getProperty里的 o: T和 name: K，意味着 o[name]: T[K]。 当你返回 T[K]的结果，编译器会实例化键的真实类型，因此 getProperty的返回值类型会随着你需要的属性改变。

let name: string = getProperty(person, 'name');
let age: number = getProperty(person, 'age');
let unknown = getProperty(person, 'unknown'); // error, 'unknown' is not in 'name' | 'age'
// 索引类型和字符串索引签名
// keyof和 T[K]与字符串索引签名进行交互。 如果你有一个带有字符串索引签名的类型，那么 keyof T会是 string。 并且 T[string]为索引签名的类型：

interface Map<T> {
    [key: string]: T;
}
let keys: keyof Map<number>; // string
let value: Map<number>['foo']; // number