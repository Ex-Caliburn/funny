function foo() {
  let myName = '极客时间'
  var bar = {
    printName: function () {
      console.log(myName)
    }
  }
  return bar
}
let myName = '极客邦'
let _printName = foo()
_printName()
bar.printName()

var bar = {
  myName: 'time.geekbang.com',
  printName: function () {
    console.log(myName)
  }
}
let myName = '极客邦'
bar.printName()

let userInfo = {
  name: 'jack.ma',
  age: 13,
  sex: male,
  updateInfo: function () {
    setTimeout(function () {
      this.name = 'pony.ma'
      this.age = 39
      this.sex = female
    }, 100)
  }
}
userInfo.updateInfo()

var myObj = {
  name: '极客时间',
  showThis: function () {
    console.log(this)
    function bar() {
      console.log(this)
    }
    bar()
  }
}
myObj.showThis()
