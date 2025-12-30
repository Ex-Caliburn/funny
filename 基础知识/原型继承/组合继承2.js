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
Child3.prototype = Parent3.prototype

var c31 = new Child3()
var c32 = new Child3()

c31.say()
c31.arr.push('9')
c31.__proto__.add = 1
console.log('c31.arr : ', c31.arr, c31.__proto__)
console.log('c31.arr : ', c32.arr, c32.__proto__)
console.log(Child3.prototype, Parent3.prototype) // 多了个 add

/* 

缺点 ： 很明显，无法定义子类构造函数原型私有的方法

*/