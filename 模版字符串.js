// 考虑嵌套变量, 我实现无论多少层都可以
// String.prototype.render = function (obj) {
//     // str = this.replace(/\$\{(\w+|\w+\.\w+)\}/gi, (match) => {
//   str = this.replace(/\$\{(\w+|(\w+\.*?)+)\}/gi, (match) => {
//     str = match.replace('${', '').replace('}', '').split('.')
//     return str.reduce((pre, cur) => pre ? pre[cur] :obj[cur], '')
//   })
//   return str
// }

// with
// 'with'语句將某个对象添加到作用域链的顶部，如果在statement中有某个未使用命名空间的变量
// ，跟作用域链中的某个属性同名，则这个变量将指向这个属性值
// String.prototype.render = function (obj) {
//     with(obj) {
//         return eval('`' + this + '`')
//     }
// }

String.prototype.render = function (obj) {
  // 利用了ES6的解构、对象keys新方法，在函数内部解构并自动展开变量
  eval(`var {${Object.keys(obj).join(',')}} = obj`)
  // 利用eval使字符串直接作为ES6解析
  return eval('`' + this + '`')
}

var greeting =
  'My name is ${name}, age ${age}, I am a ${job.jobName}, ${job.home.c}'
var employee = {
  name: 'XiaoMing',
  age: 11,
  job: {
    jobName: 'designer',
    jobLevel: 'senior',
    home: {
      location: 'HN'
    }
  }
}
var result = greeting.render(employee)
console.log(result)
