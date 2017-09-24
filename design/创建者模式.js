
// 创建一位人类
var Human = function(param){
  this.skill = param && param.skill || '保密；';
  this.hobby = param && param.hobby || '保密；';
}

Human.prototype = {
  getSkill : function () {
    return this.skill;
  },
  getHobby : function () {
    return this.hobby;
  }
}

// 实例化姓名类
var Named = function (name) {
    var that = this;
  (function (name,that) {
      that.wholeName = name;
      if(name.indexOf(' ')  > -1){
        that.FirstName = name.slice(0,name.indexOf(' '))
        that.SecondName = name.slice(name.indexOf(' '))
      }
  })(name,that)
}

// 实例化职位类
var Work = function (work) {
  var that = this;
  (function (work,that) {
    switch (work){
      case 'code':
        that.work = '工程师';
        that.workDescript = 'coder';
        break;
      case 'UI':
        that.work = '设计师';
        that.workDescript = 'designer';
        break;
      default:
        that.work = work;
        that.workDescript = 'none';
    }
  })(work,that)
}

Work.prototype.changeWork = function (work) {
    this.work = work
}

Work.prototype.changeWorkDescript = function (setence) {
  this.workDescript = setence
}

// 应聘者建造者
var Person = function (name, work) {

  var _person= new Human(name);
  _person.name = new Named(name);
  _person.work = new Work(work);
  return _person;
}

var person = new Person('li jiye','code')
console.log(person.work);
console.log(person.name);
console.log(person.work.workDescript);