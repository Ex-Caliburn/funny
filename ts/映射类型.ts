// 一个常见的任务是将一个已知的类型每个属性都变为可选的：

interface PersonPartial {
    name?: string;
    age?: number;
}
// 或者我们想要一个只读版本：

interface PersonReadonly {
    readonly name: string;
    readonly age: number;
}
// 这在JavaScript里经常出现，TypeScript提供了从旧类型中创建新类型的一种方式 — 映射类型。 在映射类型里，新类型以相同的形式去转换旧类型里每个属性。 例如，你可以令每个属性成为 readonly类型或可选的。 下面是一些例子：

type Readonly<T> = {
    readonly [P in keyof T]: T[P];
}
type Partial<T> = {
    [P in keyof T]?: T[P];
}
// 像下面这样使用：

type PersonPartial = Partial<Person>;
type ReadonlyPerson = Readonly<Person>;
// 下面来看看最简单的映射类型和它的组成部分：

type Keys = 'option1' | 'option2';
type Flags = { [K in Keys]: boolean };
// 它的语法与索引签名的语法类型，内部使用了 for .. in。 具有三个部分：

// 类型变量 K，它会依次绑定到每个属性。
// 字符串字面量联合的 Keys，它包含了要迭代的属性名的集合。
// 属性的结果类型。
// 在个简单的例子里， Keys是硬编码的的属性名列表并且属性类型永远是 boolean，因此这个映射类型等同于：

type Flags = {
    option1: boolean;
    option2: boolean;
}
// 在真正的应用里，可能不同于上面的 Readonly或 Partial。 它们会基于一些已存在的类型，且按照一定的方式转换字段。 这就是 keyof和索引访问类型要做的事情：

type NullablePerson = { [P in keyof Person]: Person[P] | null }
type PartialPerson = { [P in keyof Person]?: Person[P] }
// 但它更有用的地方是可以有一些通用版本。

type Nullable<T> = { [P in keyof T]: T[P] | null }
type Partial<T> = { [P in keyof T]?: T[P] }
// 在这些例子里，属性列表是 keyof T且结果类型是 T[P]的变体。 这是使用通用映射类型的一个好模版。 因为这类转换是 同态的，映射只作用于 T的属性而没有其它的。 编译器知道在添加任何新属性之前可以拷贝所有存在的属性修饰符。 例如，假设 Person.name是只读的，那么 Partial<Person>.name也将是只读的且为可选的。

// 下面是另一个例子， T[P]被包装在 Proxy<T>类里：

type Proxy<T> = {
    get(): T;
    set(value: T): void;
}
type Proxify<T> = {
    [P in keyof T]: Proxy<T[P]>;
}
function proxify<T>(o: T): Proxify<T> {
   // ... wrap proxies ...
}
let proxyProps = proxify(props);
// 注意 Readonly<T>和 Partial<T>用处不小，因此它们与 Pick和 Record一同被包含进了TypeScript的标准库里：

type Pick<T, K extends keyof T> = {
    [P in K]: T[P];
}
type Record<K extends string, T> = {
    [P in K]: T;
}
// Readonly， Partial和 Pick是同态的，但 Record不是。 因为 Record并不需要输入类型来拷贝属性，所以它不属于同态：

type ThreeStringProps = Record<'prop1' | 'prop2' | 'prop3', string>
// 非同态类型本质上会创建新的属性，因此它们不会从它处拷贝属性修饰符。

// 由映射类型进行推断
// 现在你了解了如何包装一个类型的属性，那么接下来就是如何拆包。 其实这也非常容易：

function unproxify<T>(t: Proxify<T>): T {
    let result = {} as T;
    for (const k in t) {
        result[k] = t[k].get();
    }
    return result;
}

let originalProps = unproxify(proxyProps);
// 注意这个拆包推断只适用于同态的映射类型。 如果映射类型不是同态的，那么需要给拆包函数一个明确的类型参数。

// 预定义的有条件类型
// TypeScript 2.8在lib.d.ts里增加了一些预定义的有条件类型：

// Exclude<T, U> -- 从T中剔除可以赋值给U的类型。
// Extract<T, U> -- 提取T中可以赋值给U的类型。
// NonNullable<T> -- 从T中剔除null和undefined。
// ReturnType<T> -- 获取函数返回值类型。
// InstanceType<T> -- 获取构造函数类型的实例类型。

// 示例
type T00 = Exclude<"a" | "b" | "c" | "d", "a" | "c" | "f">;  // "b" | "d"
type T01 = Extract<"a" | "b" | "c" | "d", "a" | "c" | "f">;  // "a" | "c"

type T02 = Exclude<string | number | (() => void), Function>;  // string | number
type T03 = Extract<string | number | (() => void), Function>;  // () => void

type T04 = NonNullable<string | number | undefined>;  // string | number
type T05 = NonNullable<(() => string) | string[] | null | undefined>;  // (() => string) | string[]

function f1(s: string) {
    return { a: 1, b: s };
}

class C {
    x = 0;
    y = 0;
}

type T10 = ReturnType<() => string>;  // string
type T11 = ReturnType<(s: string) => void>;  // void
type T12 = ReturnType<(<T>() => T)>;  // {}
type T13 = ReturnType<(<T extends U, U extends number[]>() => T)>;  // number[]
type T14 = ReturnType<typeof f1>;  // { a: number, b: string }
type T15 = ReturnType<any>;  // any
type T16 = ReturnType<never>;  // any
type T17 = ReturnType<string>;  // Error
type T18 = ReturnType<Function>;  // Error

type T20 = InstanceType<typeof C>;  // C
type T21 = InstanceType<any>;  // any
type T22 = InstanceType<never>;  // any
type T23 = InstanceType<string>;  // Error
type T24 = InstanceType<Function>;  // Error
// 注意：Exclude类型是建议的Diff类型的一种实现。我们使用Exclude这个名字是为了避免破坏已经定义了Diff的代码，并且我们感觉这个名字能更好地表达类型的语义。我们没有增加Omit<T, K>类型，因为它可以很容易的用Pick<T, Exclude<keyof T, K>>来表示。

