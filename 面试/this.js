function f1(){
    return this;
  }
  //在浏览器中：
//   f1() === window;   //在浏览器中，全局对象是window
  
  //在Node中：
  f1() === globalThis;   
  console.log(f1() === globalThis, this)
  console.log(global)