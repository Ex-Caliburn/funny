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
Child3.prototype = new Parent3()

var c31 = new Child3()
var c32 = new Child3()

c31.say()
c31.arr.push('9')
c31.__proto__.add = 1
  Child3.prototype.add = 1
console.log('c31.arr : ', c31.arr, c31.__proto__)
console.log('c31.arr : ', c32.arr, c32.__proto__)
console.log(Child3.prototype, Parent3.prototype)

/* 

 生成一个实例要执行 Parent3.call(this) ， new Child3()，也就是Parent3执行了两遍。
// c31 和 c32   __proto__ 指向同一个，修改一个另外一个也会变

*/