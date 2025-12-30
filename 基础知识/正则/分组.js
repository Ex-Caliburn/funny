/*
  ①.RegExp 对象的方法
  test 在字符串中测试模式匹配，返回 true 或 false
  exec 在字符串中执行匹配搜索，返回结果数组 或null,和match 不一样,不是正确字串的数组
  ②.String 对象中的正则表达式方法
  match(pattern) 返回 pattern 中的子串或 null(应该开启全局) 或 null
  replace(pattern, replacement) 用 replacement 替换 pattern(应该开启全局)
  search(pattern) 返回字符串中 pattern 开始位置，失败返回-1
  split(pattern) 返回字符串按指定 pattern 拆分的数组
*/

var ip = 'IP:192.168.30.46,sdfsdfasdf,192.168.1.1'
var cc = 'The Quick Brown Fox Jumps Over The Lazy Dog'
var err = 'IP:'
var text = '去试试^赣11选5&吧，体验每天中奖84次！'
var dom ='<title>xxx</title>'
// console.log(/\d{1,3}.\d{1,3}.\d{1,3}.\d{1,3}/g.test(ip));
// console.log(/\d{1,3}.\d{1,3}.\d{1,3}.\d{1,3}/g.exec(ip));
var reg = new RegExp(/\d{1,3}(.\d{1,3}){3}/,'g')
var reg2 = new RegExp(/(\d{1,3}\.){3}\d{1,3}/,'g')
let regex = /quick\s(brown).+?(jumps)/ig;
var regex1 = /quick brown/ig
// var reg3 = /(?<=<title>).*(?=<\/title>)/g

console.log(reg2.exec(ip));
console.log(reg.exec(ip));
console.log(ip.match(reg));
console.log(ip.match(reg2));

console.log(regex.exec(cc));
console.log(regex1.exec(cc));
// console.log(dom.exec(reg3));

str = "img1.jpg,img2.jpg,img3.bmp,img4.jpg";
reg4 = /(\w+)(?=\.jpg)/g;
arr_m = str.match(reg4);//arr_m = ["img1","img2"]
console.log(arr_m);
console.log(text.match(/.*\^(\w+)\&.*/g));
console.log(text.match(/.*(\^)(\w+)\&.*/g));

// reg5 = /(?<=\.).*(?=,)/g
// console.log(str.match(re5));






//　不开全局,不一样
// console.log(ip.match(/\d{1,3}.\d{1,3}.\d{1,3}.\d{1,3}/));
// console.log(ip.match(/\d{1,3}.\d{1,3}.\d{1,3}.\d{1,3}/g));
// console.log(err.match(/\d{1,3}.\d{1,3}.\d{1,3}.\d{1,3}/g));
//
// console.log(ip.search(/\d{1,3}.\d{1,3}.\d{1,3}.\d{1,3}/));
// console.log(ip.search(/\d{1,3}.\d{1,3}.\d{1,3}.\d{1,3}/g));
// console.log(err.search(/\d{1,3}.\d{1,3}.\d{1,3}.\d{1,3}/g));
//
// console.log(text.split(/[\^\&]+/g));

