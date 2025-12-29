/* require exports 导出多个，谁在前谁先导出 
require 读取一次，之后读取就会读取缓存
*/

const a = require('./ 模块化_exports.js')
const {g, h} = require('./ 模块化_exports.js')
console.log(a, g, h)
require('./ 模块化_exports.js').b = 3
console.log(a)

setTimeout(() => {
    const a = require('./ 模块化_exports.js')
    console.log(a, g, h)
}, 500);