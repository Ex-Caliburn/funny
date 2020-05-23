/**
 * Created by Alex on 2017/11/28.
 */

// 按照字符串内的数字排序
var arr = ["test1", "this2", "a3"];
console.log(arr[1].match(/\d+/));

var temp = [];
// for (var i = 0; i < arr.length; i++) {
//   for (var j = 0; j < arr.length; j++) {
//     if((i+1).toString().indexOf(arr[j].match(/\d+/)[0])>-1){
//       temp[i] = arr[j].replace(/\d/g,'');
//     }
//   }
// }
console.log(temp.join(" "));

var arr1 = [7, 6, 5, 123, 3, 9];
var arr2 = [7, 6, 5, 123, 3, 9];
var arr3 = [7, 6, 5, 123, 3, 9];
var arr4 = [7, 6, 5, 123, 3, 9];

//冒泡
// es6值互换
[arr5[j],  arr5[j + 1]] = [arr5[j + 1], arr5[j]]

// 先选出最轻的气泡排在第一个，然后再剩余再冒第二小的

// for (var i = 0; i < arr1.length-1; i++) {
//   for (var j = arr1.length-1 ; j > i; j--) {
//     if(arr1[j] < arr1[j-1]){
//       temp = arr1[j];
//       arr1[j] = arr1[j-1];
//       arr1[j-1] = temp;
//     }
//   }
// }
// console.log(arr1);

//先排出最重的
//
// for (var i = 0; i < arr2.length-1; i++) {
//   for (var j = 0 ; j < arr2.length-1-i; j++) {
//     if(arr2[j] > arr2[j+1]){
//       temp = arr2[j];
//       arr2[j] = arr2[j+1];
//       arr2[j+1] = temp;
//     }
//   }
// }
// console.log(arr2);

//由大到小
// for (var i = 0; i < arr3.length-1; i++) {
//   for (var j = 0 ; j < arr3.length-1-i; j++) {
//     if(arr3[j] < arr3[j+1]){
//       temp = arr3[j];
//       arr3[j] = arr3[j+1];
//       arr3[j+1] = temp;
//     }
//   }
// }

console.log(arr3);

// map 方法简单重写
if (!Array.prototype.forr) {
  Array.prototype.forr = function (param) {
    if (typeof param === "function") {
      var temp = [];
      for (var i = 0; i < this.length; i++) {
        if (param.apply(this, [this[i], i, this])) {
          temp.push(this[i]);
        }
      }
      return temp;
    }
  };
}

var b = arr4.forr(function (item) {
  return item > 5;
});

console.log(b);

// 从小到大
var arr5 = [7, 6, 5, 123, 3, 9];
for (let i = 0; i < arr5.length - 1; i++) {
  for (let j = 0; j < arr5.length - 1 - i; j++) {
    if (arr5[j] > arr5[j + 1]) {
      [arr5[j],  arr5[j + 1]] = [arr5[j + 1], arr5[j]]
    }
  }
}
// 冒泡
var arr5 = [7, 6, 5, 123, 3, 9];
for (let i = 0; i < arr5.length - 1; i++) {
  for (let j = arr5.length - 1; j > i; j--) {
    if (arr5[j] < arr5[j - 1]) {
      [arr5[j],  arr5[j - 1]] = [arr5[j - 1], arr5[j]]
    }
  }
}