// 基本字符串和字符串对象的区别
// 请注意区分 JavaScript 字符串对象和基本字符串值 . ( 对于 Boolean 和Numbers 也同样如此.)

// 字符串字面量 (通过单引号或双引号定义) 和 直接调用 String 方法(没有通过 new 生成字符串对象实例)的字符串都是基本字符串。JavaScript会自动将基本字符串转换为字符串对象，只有将基本字符串转化为字符串对象之后才可以使用字符串对象的方法。当基本字符串需要调用一个字符串对象才有的方法或者查询值的时候(基本字符串是没有这些方法的)，JavaScript 会自动将基本字符串转化为字符串对象并且调用相应的方法或者执行查询。

var s_prim = "foo";
var s_obj = new String(s_prim);

console.log(typeof s_prim); // Logs "string"
console.log(typeof s_obj);  // Logs "object"


// 当使用 eval时，基本字符串和字符串对象也会产生不同的结果。eval 会将基本字符串作为源代码处理; 而字符串对象则被看作对象处理, 返回对象。 例如：

s1 = "2 + 2";               // creates a string primitive
s2 = new String("2 + 2");   // creates a String object
console.log(eval(s1));      // returns the number 4
console.log(eval(s2));      // returns the string "2 + 2"


// 字符串比较 字符串比较则是使用基于标准字典的 Unicode 值来进行比较的。
var a = "a";
var b = "b";
if (a < b) // true
  console.log(a + " is less than " + b);
else if (a > b)
  console.log(a + " is greater than " + b);
else
  console.log(a + " and " + b + " are equal.");

// JavaScript 有两种比较方式：严格比较运算符和转换类型比较运算符。对于严格比较运算符（===）来说，
// 仅当两个操作数的类型相同且值相等为 true，而对于被广泛使用的比较运算符（==）来说，
// 会在进行比较之前，将两个操作数转换成相同的类型。
// 对于关系运算符（比如 <=）来说，会先将操作数转为原始值，使它们类型相同，再进行比较运算。

// 我一直一来的误区 if() 是用的 ===  其实算是 ==
// 不要将原始布尔值的true和false与Boolean对象的真或假混淆。任何一个值，
// 只要它不是 undefined、null、 0、NaN或空字符串（""），
// 那么无论是任何对象，即使是值为假的Boolean对象，在条件语句中都为真。例如：

// var b = new Boolean(false);
// if (b) //表达式的值为true


// ### 比较操作符   会影响涉数据类型的隐式转换
// 当比较运算涉及类型转换时 (i.e., non–strict comparison), JavaScript 会按以下规则对字符串，数字，布尔或对象类型的操作数进行操作:
//
//   当比较数字和字符串时，字符串会转换成数字值。 JavaScript 尝试将数字字面量转换为数字类型的值。 首先, 一个数学上的值会从数字字面量中衍生出来，然后这个值将被转为一个最接近的Number类型的值。
// 如果其中一个操作数为布尔类型，那么布尔操作数如果为true，那么会转换为1，如果为false，会转换为整数0，即0。
// 如果一个对象与数字或字符串相比较，JavaScript会尝试返回对象的默认值。操作符会尝试通过方法valueOf和toString将对象转换为其原始值（一个字符串或数字类型的值）。如果尝试转换失败，会产生一个运行时错误。
// 注意：当且仅当与原始值比较时，对象会被转换为原始值。当两个操作数均为对象时，它们作为对象进行比较，仅当它们引用相同对象时返回true。
