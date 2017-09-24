/**
 * Created by lijiye on 17-5-19.
 */
var text = 'hi，hello hill　him　,　history,　hi high'
var ss = '去试试^赣11选5&吧,体验每^天中奖&84'
// 匹配到所有hi
console.log(text.match(/hi/g))

// 匹配单词hi,\b,字符边界
console.log(text.match(/\bhi\b/g))
console.log(/\bhi\b/g.exec(text))

// 匹配单词hi后面跟着high　
console.log(text.match(/(\bhi\b).*(\bhigh\b)/g))

// console.log(/.*(\^\w{0,5}\$).*/g.match(ss));
// console.log(ss.replace(/.*(\^\w{0,5}\$).*/g,'$1'));

var reg = new RegExp(/\(?0\d{2}[) -]?\d{8}/,'g')
console.log('(010)88886666'.match(reg));

// 原因是匹配分枝条件时，将会从左到右地测试每个条件，如果满足了某个分枝的话，就不会去再管其它的条件了
// 匹配ip地址
console.log(/25[1-5]|2[0-4]\d|[01]\d\d|[/d]/.test(123));

// 分组
/((2[0-4]\d|25[0-5]|[01]?\d\d?)\.){3}(2[0-4]\d|25[0-5]|[01]?\d\d?)/.test('192.123.123.213')


var a = "<a href='www.c.com'/>"
console.log(/\<a[^\>]+\>/g.exec(a));
console.log(a.match(/\<a[^\>]+\>/g));
console.log(a.match(/\<a[^\>]+\>/g)[0].replace("\'","'"))



console.log("dog   dog".match(/\b(\w+)\b\s+\1\b/g));

// 零宽度正预测先行断言
var song = "I'm singing while you're dancing"
console.log(song.match(/\b\w+(?=ing\b)/g))

//　零宽度正回顾后发断言 js不支持
var book  ="reading a book";
// console.log(book.match(/(?<=\bre)\w+\b/g))
var nnn = '1234567890';
console.log(nnn.match(/((?<=\d)\d{3})+\b/g));

// console.log(ss.match(/\w{1,5}(?=&\w+)/g));