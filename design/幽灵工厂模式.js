
var VehicleFactory = function (subType, superType) {
    // 判断抽象工厂中是否有该抽象类
  if(typeof VehicleFactory[superType] === "function"){
    // 缓存类
    function F() {};
    // 继承父类的属性
    F.prototype = new VehicleFactory[superType];
    // 将子类的constructor 指向子类
    subType.constructor = subType;
    // 将子类的原型继承父类
    subType.prototype = new F();
  }
}

VehicleFactory.Car = function () {
    this.type = 'car';
}
VehicleFactory.Car.prototype = {
  getPrice: function () {
    return new error('无抽象方法')
  },
  getSpeed: function () {
    return new error('无抽象方法')
  }
}
VehicleFactory.Bus = function () {
  this.type = 'bus';
}
VehicleFactory.Bus.prototype = {
  getPrice: function () {
    return new error('无抽象方法')
  },
  getSpeed: function () {
    return new error('无抽象方法')
  }
}

var BMW = function (price,speed) {
  this.price = price;
  this.speed = speed;
}
VehicleFactory(BMW,'Car');
BMW.prototype.getPrice = function () {
  return this.price
}
BMW.prototype.getSpeed = function () {
  return this.speed
}

// 测试
var bmw2 = new BMW(1,100)
console.log(bmw2.getPrice());
console.log(bmw2.getSpeed());