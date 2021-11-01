interface Bird {
    fly();
    layEggs();
}

interface Fish {
    swim();
    layEggs();
}

function getSmallPet(): Fish | Bird {
    // ...
}

let pet = getSmallPet();
pet.layEggs(); // okay
pet.swim();    // errors

// 联合类型表示一个值可以是几种类型之一。 我们用竖线（ |）分隔每个类型，所以 number | string | boolean表示一个值可以是 number， string，或 boolean。

// 这里的联合类型可能有点复杂，但是你很容易就习惯了。 如果一个值的类型是 A | B，我们能够
//  确定的是它包含了 A 和 B中共有的成员。 这个例子里， Bird具有一个 fly成员。 
//  我们不能确定一个 Bird | Fish类型的变量是否有 fly方法。 如果变量在运行时是 Fish类型，那么调用 pet.fly()就出错了。


// 每一个成员访问都会报错
if (pet.swim) {
    pet.swim();
}
else if (pet.fly) {
    pet.fly();
}

// 为了让这段代码工作，我们要使用类型断言：

if ((<Fish>pet).swim) {
    (<Fish>pet).swim();
}
else {
    (<Bird>pet).fly();
}

// 用户自定义的类型保护
// 这里可以注意到我们不得不多次使用类型断言。 假若我们一旦检查过类型，就能在之后的每个分支里清楚地知道 pet的类型的话就好了。

// TypeScript里的 类型保护机制让它成为了现实。 类型保护就是一些表达式，它们会在运行时检查以确保在某个作用域里的类型。 要定义一个类型保护，我们只要简单地定义一个函数，它的返回值是一个 类型谓词：

function isFish(pet: Fish | Bird): pet is Fish {
    return (<Fish>pet).swim !== undefined;
}
// 在这个例子里， pet is Fish就是类型谓词。 谓词为 parameterName is Type这种形式， parameterName必须是来自于当前函数签名里的一个参数名。

// 每当使用一些变量调用 isFish时，TypeScript会将变量缩减为那个具体的类型，只要这个类型与变量的原始类型是兼容的。

// 'swim' 和 'fly' 调用都没有问题了
if (isFish(pet)) {
    pet.swim();
} else {
    pet.fly();
}
// 注意TypeScript不仅知道在 if分支里 pet是 Fish类型； 它还清楚在 else分支里，一定 不是 Fish类型，一定是 Bird类型。


// typeof类型保护
// 现在我们回过头来看看怎么使用联合类型书写 padLeft代码。 我们可以像下面这样利用类型断言来写：

function isNumber(x: any): x is number {
    return typeof x === "number";
}

function isString(x: any): x is string {
    return typeof x === "string";
}

function padLeft(value: string, padding: string | number) {
    if (isNumber(padding)) {
        return Array(padding + 1).join(" ") + value;
    }
    if (isString(padding)) {
        return padding + value;
    }
    throw new Error(`Expected string or number, got '${padding}'.`);
}
// 然而，必须要定义一个函数来判断类型是否是原始类型，这太痛苦了。 幸运的是，现在我们不必将 typeof x === "number"抽象成一个函数，
// 因为TypeScript可以将它识别为一个类型保护。 也就是说我们可以直接在代码里检查类型了。

function padLeft2(value: string, padding: string | number) {
    if (typeof padding === "number") {
        return Array(padding + 1).join(" ") + value;
    }
    if (typeof padding === "string") {
        return padding + value;
    }
    throw new Error(`Expected string or number, got '${padding}'.`);
}
// 这些* typeof类型保护*只有两种形式能被识别： typeof v === "typename"和 typeof v !== "typename"， 
// "typename"必须是 "number"， "string"， "boolean"或 "symbol"。 但是TypeScript并不会阻止你与其它字符串比较，语言不会把那些表达式识别为类型保护。

// 可以为null的类型
// TypeScript具有两种特殊的类型， null和 undefined，它们分别具有值null和undefined. 我们在[基础类型](./Basic Types.md)一节里已经做过简要说明。 默认情况下，类型检查器认为 null与 undefined可以赋值给任何类型。 null与 undefined是所有其它类型的一个有效值。 这也意味着，你阻止不了将它们赋值给其它类型，就算是你想要阻止这种情况也不行。 null的发明者，Tony Hoare，称它为 价值亿万美金的错误。

// --strictNullChecks标记可以解决此错误：当你声明一个变量时，它不会自动地包含 null或 undefined。 你可以使用联合类型明确的包含它们：

let s = "foo";
s = null; // 错误, 'null'不能赋值给'string'
let sn: string | null = "bar";
sn = null; // 可以

sn = undefined; // error, 'undefined'不能赋值给'string | null'
// 注意，按照JavaScript的语义，TypeScript会把 null和 undefined区别对待。 
// string | null， string | undefined和 string | undefined | null是不同的类型。

interface A {
    a: number
}
interface B {
    b: number
}
let c: A | B