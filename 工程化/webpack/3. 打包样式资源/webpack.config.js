const path = require('path');

module.exports = {
  // 起点入口
  entry: './src/index.js',
  output: {
    // 输出文件名
    filename: 'bundle.js',
    // __dirname nodejs变量，代表当前文件的目录绝对路径
    path: path.resolve(__dirname, 'dist')
  },
  module: {
    rules: [
      // 详细loader配置
      {
        // 匹配那些文件
        test: /\.css$/,
        // 使用那些loader进行处理
        use: [
          //  use 数组loader执行顺序，从右到左 依次执行
          // 创建style标签，将js中的样式资源进行，添加到head中
          'style-loader',
          // 将css文件变成commonjs模块加载在js中，里面的内容是样式字符串
          'css-loader',
        ]
      },
      {
        test: /\.scss$|\.sass$/,
        use: [
          'style-loader',
          'css-loader',
          'sass-loader',
        ]
      }
    ]
  },
  plugins: [
     // 详细plugins配置
  ],
  mode: 'development'
  // mode: 'production'
};