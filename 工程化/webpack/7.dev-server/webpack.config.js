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
          "style-loader",
          // 将css文件变成commonjs模块加载在js中，里面的内容是样式字符串
          "css-loader",
        ],
      },
      // 打包其他资源(除了 html/js/css)
      {
        // 排除 （html/js/css）
        exclude: /\.(css|html|js)$/,
        // 处理html文件的img 图片(负责引入img，从而能被url-loader进行处理)
        loader: "file-loader",
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
  // mode: 'production'，
  // 开发者服务器 devServer 用来自动化，自动编译，自动打开浏览器，自动刷新
  // 特点： 只会在内存中编译打包，不会有任何输出，不会生成dist文件夹
  // 安装 webpack-dev-server  启动方式： npx  webpack-dev-server
  devServer: {
    //  构建后的路径 
    contentBase: path.resolve(__dirname, 'dist'),
    // 启动gzip压缩
    compress: true,
    port: 9000,
    // 自动打开浏览器
    open: true
  }
};
