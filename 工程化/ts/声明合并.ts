// 声明合并
// 介绍
// TypeScript中有些独特的概念可以在类型层面上描述JavaScript对象的模型。 这其中尤其独特的一个例子是“声明合并”的概念。 理解了这个概念，将有助于操作现有的JavaScript代码。 同时，也会有助于理解更多高级抽象的概念。

// 对本文件来讲，“声明合并”是指编译器将针对同一个名字的两个独立声明合并为单一声明。 合并后的声明同时拥有原先两个声明的特性。 任何数量的声明都可被合并；不局限于两个声明。

// 基础概念
// TypeScript中的声明会创建以下三种实体之一：命名空间，类型或值。 创建命名空间的声明会新建一个命名空间，它包含了用（.）符号来访问时使用的名字。 创建类型的声明是：用声明的模型创建一个类型并绑定到给定的名字上。 最后，创建值的声明会创建在JavaScript输出中看到的值。

// Declaration Type	Namespace	Type	Value
// Namespace	         X	          X
// Class		                    X     X
// Enum		                        X	  X
// Interface		                X	
// Type Alias		                X	
// Function		                    	X
// Variable		                    	X
// 理解每个声明创建了什么，有助于理解当声明合并时有哪些东西被合并了。

// 合并接口
// 最简单也最常见的声明合并类型是接口合并。 从根本上说，合并的机制是把双方的成员放到一个同名的接口里。

interface Box {
    height: number;
    width: number;
}

interface Box {
    scale: number;
}

let box: Box = {height: 5, width: 6, scale: 10};
// 接口的非函数的成员应该是唯一的。如果它们不是唯一的，那么它们必须是相同的类型。如果两个接口中同时声明了同名的非函数成员且它们的类型不同，则编译器会报错。

// 对于函数成员，每个同名函数声明都会被当成这个函数的一个重载。 同时需要注意，当接口 A与后来的接口 A合并时，后面的接口具有更高的优先级。

// 如下例所示：

interface Cloner {
    clone(animal: Animal): Animal;
}

interface Cloner {
    clone(animal: Sheep): Sheep;
}

interface Cloner {
    clone(animal: Dog): Dog;
    clone(animal: Cat): Cat;
}
// 这三个接口合并成一个声明：

interface Cloner {
    clone(animal: Dog): Dog;
    clone(animal: Cat): Cat;
    clone(animal: Sheep): Sheep;
    clone(animal: Animal): Animal;
}
// 注意每组接口里的声明顺序保持不变，但各组接口之间的顺序是后来的接口重载出现在靠前位置。

// 这个规则有一个例外是当出现特殊的函数签名时。 如果签名里有一个参数的类型是 单一的字符串字面量（比如，不是字符串字面量的联合类型），那么它将会被提升到重载列表的最顶端。

// 比如，下面的接口会合并到一起：

interface Document {
    createElement(tagName: any): Element;
}
interface Document {
    createElement(tagName: "div"): HTMLDivElement;
    createElement(tagName: "span"): HTMLSpanElement;
}
interface Document {
    createElement(tagName: string): HTMLElement;
    createElement(tagName: "canvas"): HTMLCanvasElement;
}
// 合并后的 Document将会像下面这样：

interface Document {
    createElement(tagName: "canvas"): HTMLCanvasElement;
    createElement(tagName: "div"): HTMLDivElement;
    createElement(tagName: "span"): HTMLSpanElement;
    createElement(tagName: string): HTMLElement;
    createElement(tagName: any): Element;
}