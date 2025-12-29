const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  // 起点入口
  entry: "./src/index.js",
  output: {
    // 输出文件名
    filename: "bundle.js",
    // __dirname nodejs变量，代表当前文件的目录绝对路径
    path: path.resolve(__dirname, "dist"),
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
        // 处理不了html 中img 图片
        // 处理图片资源
        test: /\.(png|jpg|gif)$/,
        // 下载 file-loader url-loader
        loader: "url-loader",
        options: {
          //  图片大小小雨8kb，就会被base64处理
          // 优点： 减少请求数量 (减轻服务器压力)
          // 缺点： 图片体积会更大（文件请求速度更慢）
          limit: 9 * 1024,
          // 如果出现 【object module】
          //  问题 url-loader 是es6 module 解析的， 而 html-loader 引入图片是common.js
          //  解决关闭url-loader的es6模块化，使用common.js 解析
          // esModule: false
          // 图片名字 hash:10 取hash 前10位
          // ext 拓展名
          name: '[hash:10].[ext]'
        },
      },
      {
        test: /\.html$/,
        // 处理html文件的img 图片(负责引入img，从而能被url-loader进行处理)
        loader: "html-loader",
      },
    ],
  },
  plugins: [
    // 默认会创建一个空的html，引并自动引入打包的所有资源 （js/css）
    new HtmlWebpackPlugin({
      // 复制 './src/index.html', 并自动引入打包的所有资源，不需要手动引入导致重复 （js/css）
      template: "./src/index.html",
    }),
  ],
  mode: "development",
  // mode: 'production'
};
