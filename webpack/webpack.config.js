const path = require('path');

// 模块化默认是 commonjs
module.exports = {
    //  入口起点
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist')
  }
};