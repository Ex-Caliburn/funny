function Parent3(){
	this.name = 'Parent3'
	this.arr = [1,2]
}
Parent3.prototype.say = function () {
    console.log('say')
}
function Child3(){
	Parent3.call(this)
	this.type = 'type'
}
// Child3.prototype = new Parent3()
// Child3.prototype = Parent3.prototype
Child3.prototype = Object.create(Parent3.prototype)
Child3.prototype.constructor = Child3

var c31 = new Child3()
var c32 = new Child3()

c31.say()
c31.arr.push('9')
c31.__proto__.add = 1
console.log('c31.arr : ', c31.arr, c31.__proto__)
console.log('c31.arr : ', c32.arr, c32.__proto__)
console.log(Child3.prototype, Parent3.prototype)


console.log(c31 instanceof Child3) // true
console.log(c31 instanceof Parent3) // true
console.log(c31.constructor === Child3) // false
console.log(c31.constructor === Parent3) // true

/* 

缺点 ：需要重新赋值一下子类构造函数的constructor： Child3.prototype.constructor = Child3，完整版如下

*/