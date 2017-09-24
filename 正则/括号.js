// 括号匹配的字符串，不是正则
var re = /(\w+)\s(\w+)/;
var str = "John Smith";
var newstr = str.replace(re, "$2, $1");
console.log(newstr);

var names = "Harry Trump ;Fred Barney; Helen Rigby ; Bill Abel ; Chris Hand ";


var pattern = /\s*;\s*/;

var nameList = names.split(pattern);

pattern = /(\w+)\s+(\w+)/;

var bySurnameList = [];
var output = [];


var i, len;
for (i = 0, len = nameList.length; i < len; i++){
  output.push(nameList[i]);
  bySurnameList[i] = nameList[i].replace(pattern, "$2, $1");
}

for (i = 0, len = bySurnameList.length; i < len; i++){
  output.push(bySurnameList[i]);
}

bySurnameList.sort();
for (i = 0, len = bySurnameList.length; i < len; i++){
  output.push(bySurnameList[i]);
}

console.log(output.join("\n"));
// console.log(bySurnameList);