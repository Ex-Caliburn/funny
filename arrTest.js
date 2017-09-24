/**
 * Created by lijiye on 3/13/17.
 */
var a = [123,21,3,1,2]
var b = [3,4.4,4,4,4,4]
// var c = a.concat(b,true)
// console.log(c);
// a[1] = "sss"
// console.log(c);
// c.join('jj')
// console.log(c);
// console.log(a);
// console.log(b.shift());

var d = ["a","b","c"]
var str = 'sfdsdf'


// 数组和字符串都有slice方法,截取第一个元素
// console.log(d,d.slice(0,1))
// console.log(d.slice(1))
// console.log(d.slice(1))
// console.log(d.slice(1,-1))
console.log(str.slice(0));
//
// console.log(typeof 1 === typeof "a");
// console.log(typeof 1 < typeof "a");
// console.log(typeof 1 > typeof "a");
// console.log(typeof 1 );
// console.log(typeof "a");
//
// console.log(Number < String);  // true
// console.log("b" < "A");
// console.log("a" < "A");
// console.log("A" < "a");


// var m = [1,2,21,3,4,2,3,1,11]
//
// m.sort(function (a, b) {
//   return a-b
// })
// console.log(m);

// 删除元素，并在删除元素位置添加元素
// 也可以只在相应位置添加元素
// var a = [1,2,21,3]
// // var r = a.splice(1,1,'b','c')
// var r = a.splice(1,0,'b','c')
// console.log(a,r);

//
// var a = {number:true}
// var b = Object.create(a)
// var t = a.hasOwnProperty('number')
// var u = b.hasOwnProperty('number')
// var v = b.number
// console.log(t,u,v);
// console.log(b);

// var reg111 = /\((\d{3})\)/g;
// var p = '(555)123-1233(112)'.replace(reg111,'$1-');
// console.log(p);
//
// var str = 'Twas the night before Xmas...';
// var newstr = str.replace(/xmas/i, 'Christmas');
// console.log(newstr);
//
// console.log(newstr.slice(-6));
// console.log(newstr.slice(0,4));
// console.log(newstr.slice(4));

var c = '1 , 2, 3 ,4'
console.log(c.split(/\s*,\s*/));
console.log(c.split(/\s+,\s+/));


// 没有理由去使用substring方法(substring不支持负数)，用slice
var  url = 'https://im.dingtalk.com'
// console.log(url.slice(-3)==='com');
// console.log(url.substring(-3));
console.log(url.slice(3));
// console.log(url.substring(3));

console.log(url);
// // []匹配集合中的任意一个字符
// url = 'https im ding talk com,'+'Twas the night before Xmas'
// var word = url.toLocaleLowerCase().split(/[\s,.]+/)
// console.log(word);
// console.log(url);