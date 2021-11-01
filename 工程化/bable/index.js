const { transform } = require('@babel/core')

const fs = require('fs')

//读取需要转换的js字符串
const before = fs.readFileSync('./before.js', 'utf-8')

// 使用babel-core 的transform API 和插件进行字符串 > AST的转换
const res = transform(`${before}`, {
  plugins: [require('./plugin')]
})
// console.log('res--', res)
// 存在 after.js 删除
fs.existsSync('./after.js') && fs.unlinkSync('./after.js')
// 写入转换后的结果到after.js
fs.writeFileSync('./after.js', res.code, 'utf-8')


