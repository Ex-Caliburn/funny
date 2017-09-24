var arr = [1,2,3,4];
var arr2 = [1,2,3,4,5];
// map遍历数组 低版本兼容性不好
temp = arr.map(function (item,index) {
    return ++item;
})
console.log(temp,arr);


// filter过滤
temp2 = arr2.filter(function (item,index) {
    return item>2;
})
console.log(temp2,arr2);