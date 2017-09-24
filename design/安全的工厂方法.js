
var Factory = function (type, content) {
    if(this instanceof Factory){
      var s = new this[type](content);
      return s;
    }else{
      return new Factory(type, content)
    }
}

Factory.prototype = {
  java: function (content) {
     //处理函数
    console.log(content);
  },
  php: function (content) {
    //
    console.log(content);
  },
  ui: function (content) {
    //
    console.log(content);
  }
};

var b = Factory('ui',"hello")