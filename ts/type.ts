// 类型别名
// 类型别名会给一个类型起个新名字。 类型别名有时和接口很像，但是可以作用于原始值，联合类型，元组以及其它任何你需要手写的类型。

type Name = string;
type NameResolver = () => string;
type NameOrResolver = Name | NameResolver;
function getName(n: NameOrResolver): Name {
    if (typeof n === 'string') {
        return n;
    }
    else {
        return n();
    }
}

// 起别名不会新建一个类型 - 它创建了一个新 名字来引用那个类型。 给原始类型起别名通常没什么用，尽管可以做为文档的一种形式使用。

// 同接口一样，类型别名也可以是泛型 - 我们可以添加类型参数并且在别名声明的右侧传入：

type Container<T> = { value: T };
// 我们也可以使用类型别名来在属性里引用自己：

type Tree<T> = {
    value: T;
    left: Tree<T>;
    right: Tree<T>;
}

// 与交叉类型一起使用，我们可以创建出一些十分稀奇古怪的类型。

type LinkedList<T> = T & { next: LinkedList<T> };

interface Person {
    name: string;
}

var people: LinkedList<Person>;
var s = people.name;
var s1 = people.next.name;
var s2 = people.next.next.name;
var s3 = people.next.next.next.name;
// 然而，类型别名不能出现在声明右侧的任何地方。

type Yikes = Array<Yikes>; // error


// 接口 vs. 类型别名
// 像我们提到的，类型别名可以像接口一样；然而，仍有一些细微差别。

// 其一，接口创建了一个新的名字，可以在其它任何地方使用。 类型别名并不创建新名字—比如，错误信息就不会使用别名。 
// 在下面的示例代码里，在编译器中将鼠标悬停在 interfaced上，显示它返回的是 Interface，但悬停在 aliased上时，显示的却是对象字面量类型。
type Alias = { num: number }
interface Interface {
    num: number;
}
declare function aliased(arg: Alias): Alias;
declare function interfaced(arg: Interface): Interface;
// 另一个重要区别是类型别名不能被 extends和 implements（自己也不能 extends和 implements其它类型）。 
// 因为 软件中的对象应该对于扩展是开放的，但是对于修改是封闭的，你应该尽量去使用接口代替类型别名。

// 另一方面，如果你无法通过接口来描述一个类型并且需要使用联合类型或元组类型，这时通常会使用类型别名。

interface interface2 extends Interface{
    string:string
}

let b1:interface2 = {
    string: '1'
}

let b2:interface2 = {
    num: 1
}

// 字符串字面量类型
// 字符串字面量类型允许你指定字符串必须的固定值。 在实际应用中，字符串字面量类型可以与联合类型，类型保护和类型别名很好的配合。 通过结合使用这些特性，你可以实现类似枚举类型的字符串。

type Easing = "ease-in" | "ease-out" | "ease-in-out";
class UIElement {
    animate(dx: number, dy: number, easing: Easing) {
        if (easing === "ease-in") {
            // ...
        }
        else if (easing === "ease-out") {
        }
        else if (easing === "ease-in-out") {
        }
        else {
            // error! should not pass null or undefined.
        }
    }
}

let button = new UIElement();
button.animate(0, 0, "ease-in");
button.animate(0, 0, "uneasy"); // error: "uneasy" is not allowed here
// 你只能从三种允许的字符中选择其一来做为参数传递，传入其它值则会产生错误。

// Argument of type '"uneasy"' is not assignable to parameter of type '"ease-in" | "ease-out" | "ease-in-out"'
// 字符串字面量类型还可以用于区分函数重载：

function createElement(tagName: "img"): HTMLImageElement;
function createElement(tagName: "input"): HTMLInputElement;
// ... more overloads ...
function createElement(tagName: string): Element {
    // ... code goes here ...
}

// 数字字面量类型
// TypeScript还具有数字字面量类型。

function rollDie(): 1 | 2 | 3 | 4 | 5 | 6 {
    // ...
}
// 我们很少直接这样使用，但它们可以用在缩小范围调试bug的时候：

function foo(x: number) {
    if (x !== 1 || x !== 2) {
        //         ~~~~~~~
        // Operator '!==' cannot be applied to types '1' and '2'.
    }
}
// 换句话说，当 x与 2进行比较的时候，它的值必须为 1，这就意味着上面的比较检查是非法的。

// 可辨识联合（Discriminated Unions）
// 你可以合并单例类型，联合类型，类型保护和类型别名来创建一个叫做 可辨识联合的高级模式，它也称做 标签联合或 代数数据类型。 可辨识联合在函数式编程很有用处。 一些语言会自动地为你辨识联合；而TypeScript则基于已有的JavaScript模式。 它具有3个要素：

// 具有普通的单例类型属性— 可辨识的特征。
// 一个类型别名包含了那些类型的联合— 联合。
// 此属性上的类型保护。
interface Square {
    kind: "square";
    size: number;
}
interface Rectangle {
    kind: "rectangle";
    width: number;
    height: number;
}
interface Circle {
    kind: "circle";
    radius: number;
}
// 首先我们声明了将要联合的接口。 每个接口都有 kind属性但有不同的字符串字面量类型。 kind属性称做 可辨识的特征或 标签。
//  其它的属性则特定于各个接口。 注意，目前各个接口间是没有联系的。 下面我们把它们联合到一起：

type Shape = Square | Rectangle | Circle;
// 现在我们使用可辨识联合:

function area(s: Shape) {
    switch (s.kind) {
        case "square": return s.size * s.size;
        case "rectangle": return s.height * s.width;
        case "circle": return Math.PI * s.radius ** 2;
    }
}
