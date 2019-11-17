/**
 * Created by Alex on 2017/11/30.
 */

// function add(a,b) {
//   if(typeof a == 'number' && !isNaN(a) ){
//     if(typeof b == 'number' && !isNaN(b) ){
//       a += b;
//     }
//     console.log(arguments);
//     // return add.apply(this,[null,a]);
//   }
// }
//
// (function (obj) {
//   obj.add = function (num) {
//     if (typeof(obj.result) == 'undefined' || !isNaN(num)) {
//       obj.result = 0
//     }
//     obj.result += num;
//     console.error(obj.result);
//     return obj.add;
//   };
// })(window)

function add(val) {
  function _retFun(v) {
    return add(val + v);
  }

  _retFun.toString = _retFun.valueOf = function () {
    return val;
  };
  return _retFun;
}

console.log(add(1)(2)(3)(4));

// var arr4 = ['a2','test3','this1','bbb11'];
//
// var temp = [];
// for (var i = 0; i < arr4.length; i++) {
//   arr4[i].replace(/\d+/g , function ($0,$1,$2,$3,$4) {
//     // console.log($0,$1,$2,$3,$4);
//     temp[$0-1] = $2.replace(/\d+/g,'')
//   })
// }
// console.log(temp);
//
// var str2 = "ab123bc"
// // a123bc 转换a[1][2][3]bc？
// var res2 =str2.replace(/\d/g,function ($0,$1,$2) {
//   // console.log($0,$1,$2);
//   // console.log(arguments);
//   return "[" +$0+ "]"
// })
// console.log(res2);
//
// var str3 = "adc-des-eee";
//
// // adc-des-eee（驼峰可能很长）变成驼峰命名法 adcDesEee？
// var res3 = str3.replace(/-(\w)/g,function (match,$1,$2) {
//   console.log(match,$1,$2);
//   return $1.toUpperCase()
// })
// console.log(res3);
//
// // 反过来？
//
// var res4 = res3.replace(/([A-Z])/g,function (match,$1,$2) {
//   console.log(match,$1,$2);
//   return "-" + $1.toLowerCase();
// })
// console.log(res4);







