### commonjs
CommonJS是一个项目，其目标是为JavaScript在网页浏览器之外创建模块约定

#### 定义暴露模块 : exports
```
exports.xxx = value
module.exports = value
```

#### 引入模块 : require
```
var module = require('模块名/模块相对路径')
```
#### 引入模块发生在什么时候?
Node : 运行时, 动态同步引入
Browserify : 在运行前对模块进行编译/转译/打包的处理(已经将依赖的模块包含进来了),
运行的是打包生成的js, 运行时不存在需要再从远程引入依赖模块

#### 特点
所有代码都运行在模块作用域，不会污染全局作用域。
模块可以多次加载，但是只会在第一次加载时运行一次，然后运行结果就被缓存了，以后再加载，就直接读取缓存结果。要想让模块再次运行，必须清除缓存。
模块加载的顺序，按照其在代码中出现的顺序。

### AMD
Asynchronous Module Definition
require.js
```
define(['package/lib'], function(lib){
  function foo(){
    lib.log('hello world!');
  }

  return {
    foo: foo
  };
});
```
### CMD
Common Module Definition
sea.js
```
define(function(require, module, exports){
  通过require引入依赖模块
  通过module/exports来暴露模块
  exports.xxx = value
})
```



### import

使用Babel将ES6--->ES5(使用了CommonJS) ----浏览器还不能直接支行

### 区别
CommonJS规范加载模块是同步的，也就是说，只有加载完成，才能执行后面的操作。AMD规范则是非同步加载模块，允许指定回调函数。由于Node.js主要用于服务器编程，模块文件一般都已经存在于本地硬盘，所以加载起来比较快，不用考虑非同步加载的方式，所以CommonJS规范比较适用。但是，如果是浏览器环境，要从服务器端加载模块，这时就必须采用非同步模式，因此浏览器端一般采用AMD规范。

### 参考文献