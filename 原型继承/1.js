/**
 * Created by Alex on 2017/11/27.
 */

// 1. 如果真的是一种简易的脚本语言，其实不需要有"继承"机制。但是，Javascript里面都是对象，必须有一种机制，将所有对象联系起来。所以，Brendan Eich最后还是设计了"继承"。

// 因此，他就把new命令引入了Javascript，用来从原型对象生成一个实例对象。但是，Javascript没有"类"，怎么来表示原型对象呢？
// 这时，他想到C++和Java使用new命令时，都会调用"类"的构造函数（constructor）。他就做了一个简化的设计，在Javascript语言中，new命令后面跟的不是类，而是构造函数。

function DOG(name) {
    this.name = name;
}

// var dogA = new DOG('大毛');
// console.log(dogA.name); // 大毛

// 2.用构造函数生成实例对象，有一个缺点，那就是无法共享属性和方法。
// 设置一个共有属性

// function DOG(name) {
//   this.name = name;
//   this.species = 'dog'
// }
//
// var dogA = new DOG('大毛');
// var dogB = new DOG('二毛');

// dogA.species = "111";
// console.log(dogA.species );
// console.log(dogB.species );

// 每一个实例对象，都有自己的属性和方法的副本。这不仅无法做到数据共享，也是极大的资源浪费。



// 3.考虑到这一点，Brendan Eich决定为构造函数设置一个prototype属性。
// 这个属性包含一个对象（以下简称"prototype对象"），所有实例对象需要共享的属性和方法，都放在这个对象里面；那些不需要共享的属性和方法，就放在构造函数里面。
// 实例对象一旦创建，将自动引用prototype对象的属性和方法。也就是说，实例对象的属性和方法，分成两种，一种是本地的，另一种是引用的

// function DOG(name) {
//   this.name = name;
// }
//
// DOG.prototype.species = 'dog';
//
// var dogA = new DOG('大毛');
// var dogB = new DOG('二毛');
// // dogA.species = '111'
// DOG.prototype.species = '111';
//
// console.log(dogA.species);
// console.log(dogB.species);

// 现在，species属性放在prototype对象里，是两个实例对象共享的。只要修改了prototype对象，就会同时影响到两个实例对象。


// 4.
function DOG(name) {
  this.name = name;
}

var dogA = new DOG('大毛');
var dogB = new DOG('二毛');
DOG.prototype.species = '111';

console.log(dogA.species);
console.log(dogB.species);

// 由于所有的实例对象共享同一个prototype对象，那么从外界看起来，prototype对象就好像是实例对象的原型，而实例对象则好像"继承"了prototype对象一样。











