// function deepCopy(p, c) {
//     var c = c || {};
//     for (var i in p) {
//         if (typeof p[i] === 'object') {
//             c[i] = (p[i].constructor === Array) ? [] : {};
//             deepCopy(p[i], c[i]);
//         } else {
//             c[i] = p[i];
//         }
//     }
//     return c;
// }

function clone(obj) {
    //判断是对象，就进行循环复制
    if (typeof obj === 'object' && typeof obj !== 'null') {
        // 区分是数组还是对象，创建空的数组或对象
        var o = Object.prototype.toString.call(obj).slice(8, -1) === "Array" ? [] : {};
        for (var k in obj) {
            console.log(k);
            // 如果属性对应的值为对象，则递归复制
            if(typeof obj[k] === 'object' && typeof obj[k] !== 'null'){
                o[k] = clone(obj[k])
            }else{
                console.log(k);
                o[k] = obj[k];
            }
        }
    }else{ //不为对象，直接把值返回
        return obj;
    }
    return o;
}

// var arrayLike = {
//     '0': 'a',
//     '1': 'b',
//     '2': 'c',
//     length: 3
// };
// // ES5的写法 
// var arr = [1,2,3,4]
// console.log(typeof arrayLike );
// var arr1 = [].slice.call(arrayLike); // ['a', 'b', 'c']
// console.log(arr1 );
// console.log(arr.slice(0,0));

var a = {
    "c": null,
    2: {1: 1},
    3: [
        {
            2: 2
        }
    ]
}
console.log(clone(a));
