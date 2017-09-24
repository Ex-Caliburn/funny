
var book = {
  name:'alex',
  age:[1,2,3,4]
}

function inheritObject(o) {
    function F() {
    }
    F.prototype = o;
    return new F();
}

function createBook(obj) {
    var o = new inheritObject(obj)
  o.getName = function () {
      console.log(name);
  }
  return o
}

var a = createBook(book)
a.name = 'a'
a.age.push(121)
console.log(book);