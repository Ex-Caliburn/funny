var arr = [1, 2, 3, 4]
var arr2 = [1, 2, 3, 4, 5]
var arr3 = [{ name: 1 }, { name: 2 }]
let arr4 = [{ name: 1 }, { name: 2 }]

// console.log(Object.freeze(arr4))
// arr4[1].name = 5
// console.log(arr4)

// map遍历数组 低版本兼容性不好, 返回一个新数组 如果有return 返回一个所有return结果的数组，
// 如果是修改数组对象，可以生效
temp = arr.map(function (item, index) {
	return item = item + 1
})
temp.push(9)
console.log(temp, arr)

temp3 = arr3.map(function (item, index) {
	return item.name += 1
})
console.log(temp3, arr3)

// filter过滤
temp2 = arr2.filter(function (item, index) {
	return item > 2
})
console.log(temp2, arr2)

// 实现 ECMA-262, Edition 5, 15.4.4.19
// 参考: http://es5.github.com/#x15.4.4.19
if (!Array.prototype.map) {
	Array.prototype.map = function (callback, thisArg) {

		var T, A, k

		if (this == null) {
			throw new TypeError(' this is null or not defined')
		}

		// 1. 将O赋值为调用map方法的数组.
		var O = Object(this)

		// 2.将len赋值为数组O的长度.
		var len = O.length >>> 0

		// 3.如果callback不是函数,则抛出TypeError异常.
		if (Object.prototype.toString.call(callback) != '[object Function]') {
			throw new TypeError(callback + ' is not a function')
		}

		// 4. 如果参数thisArg有值,则将T赋值为thisArg;否则T为undefined.
		if (thisArg) {
			T = thisArg
		}

		// 5. 创建新数组A,长度为原数组O长度len
		A = new Array(len)

		// 6. 将k赋值为0
		k = 0

		// 7. 当 k < len 时,执行循环.
		while (k < len) {

			var kValue, mappedValue

			//遍历O,k为原数组索引
			if (k in O) {

				//kValue为索引k对应的值.
				kValue = O[k]

				// 执行callback,this指向T,参数有三个.分别是kValue:值,k:索引,O:原数组.
				mappedValue = callback.call(T, kValue, k, O)

				// 返回值添加到新数组A中.
				A[k] = mappedValue
			}
			// k自增1
			k++
		}

		// 8. 返回新数组A
		return A
	}
}

// var o = new Object(true)
// console.log(typeof o, o)
// console.log(typeof true)
// console.log(Object([{name: 1},{name: 2}]))