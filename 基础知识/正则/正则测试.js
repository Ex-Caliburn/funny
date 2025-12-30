var directSingleReg = /^(\d(\s\d){0,9}(\|)){2}\d(\s\d){0,9}(\[ZHIXUAN\])$/;   // 直选
var groupThreeDoubleReg  = /^\d(\s\d){1,9}(\[ZUXUAN3\])$/;           // 3组复选
var groupThreeSingleReg = /^(\d)\1(?!\1{1})\d{1}(\[ZUXUAN3\])$/; // 3组单选         // (?!(\1)\1{1})：断案后面不能用和前面相同的数字
var groupSixReg = /^\d(\s\d){2,9}(\[ZUXUAN6\])$/;        // 6组选

// "1 5 8[ZUXUAN6]"  空格隔开 不能重复(未写)
// "3 8[ZUXUAN3]"  空格隔开，不能重复(未写)
// "775[ZUXUAN3]"  前两个相同，第三个与前面不同
// "5|3 1|0[ZHIXUAN]"  竖线隔开


lottery = '3625148136.15元'
lottery = '恭喜【彩民3802】投注鄂11选5中奖190元'
console.log(lottery.slice(-9,-5) );

console.log('00123'.replace(/^0+/g,''));
console.log(lottery.replace('元','').split('.')[0]);
// slice(-4,0)
var poolBonus = lottery.replace('元','').split('.')[0];
console.log(poolBonus.slice(0, -8), poolBonus.slice(-8, -4))

console.log('0780123'.slice(-5,-4));

var test = lottery.replace(/[^0-9]/ig,"");

var test1 = lottery.replace(/[0-9]+元$/g,"<span style='color:#e63222'>"+test+"</span>");
console.log(lottery,11);
console.log(test1);


var str1="aaa@hotmail.com";//要截取@到.之间的内容
var reg=new RegExp('.*[\@]+(.*)[\.]+.*');
var str2=str1.replace(reg,"$1");
console.log(str2);

// 去试试^赣11选5&吧，体验每天中奖84次！
var sssss ='去试试^赣11选5&吧,体验每天中奖84次！'
  console.log(sssss.replace(/.*[\^]+(.*)[\&]+.*/,'<span class="cui-font-17 confirm-sort cui-color-red">'+"$1"+'</span>'));
// console.log(sssss.split(',')[1]);

var ddd ='去试试^赣11选5&吧,体验每天^中奖&84次！'
// console.log(ddd.replace(/.*[\^]+(.*)[\&]+.*/,"$0","$1"));



var str1 = '去试试^赣11选5&吧，体验^84&每天中奖84次！';
var reg1= /\^([\d\u4e00-\u9fa5])+\&/g;
// console.log(str1.replace(reg1,''));
//匹配多个特殊字符中内容
// console.log(str1.match(reg1));
res = str1.replace(reg1,function (re,$1, $2,$3,$4,$5) {
    // console.log(re,$1, $2,$3,$4,$5);
    return re.replace(/[\^\&]+/g,'')
})

// // 替换位置
// var re = /(\w+)\s(\w+)/;
// var str = "John Smith";
// var newstr = str.replace(re, "$2, $1");
// // Smith, John
// console.log(newstr);


// match	匹配的子串。（对应于上述的$&。）
// p1,p2, ...
// 假如replace()方法的第一个参数是一个RegExp 对象，则代表第n个括号匹配的字符串。（对应于上述的$1，$2等。）
//
// offset
// 匹配到的子字符串在原字符串中的偏移量。（比如，如果原字符串是“abcd”，匹配到的子字符串是“bc”，那么这个参数将是1）
//
// string	被匹配的原字符串。

// function replacer(match, p1, p2, p3, offset, string) {
//     return [p1, p2, p3].join(' - ');
// }
// var newString = 'abc12345#$*%'.replace(/([^\d]*)(\d*)([^\w]*)/, replacer);