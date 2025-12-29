const { resolve } = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
  entry: "./src/index.js",
  output: {
    filename: "js/built.js",
    path: resolve(__dirname, "dist"),
  },
  module: {
    rules: [
      // loader的配置
      {
        // 处理scss资源
        test: /\.(scss|sass)$/,
        use: [
          // "style-loader", 
          MiniCssExtractPlugin.loader,
          "css-loader", "sass-loader"],
      },
      {
        // 处理css资源
        test: /\.css$/,
        use: [
          // 创建style 标签插入
          // "style-loader",
          // 这个loader取代style-loader，作用提取js中cs成单独文件
          MiniCssExtractPlugin.loader,
          // 将css整合到js文件中，字符串
          "css-loader",
          // 配置postcss，需要用对象的模式
          /*
            css兼容性处理：postcss --> postcss-loader postcss-preset-env

            帮postcss找到package.json中browserslist里面的配置，通过配置加载指定的css兼容性样式
            区分开发和测试没有必要，统一限制就好了
            "browserslist": {
              // 开发环境 --> 设置node环境变量：process.env.NODE_ENV = development
              "development": [
                "last 1 chrome version",
                "last 1 firefox version",
                "last 1 safari version"
              ],
              // 生产环境：默认是看生产环境
              "production": [
                ">0.2%",
                "not dead",
                "not op_mini all"
              ]
            }
          */
          {
            loader: "postcss-loader",
            options: {
              ident: 'postcss',
              plugins: () => [
                // postcss的插件
                require('postcss-preset-env')()
              ]
            }
          },
        ],
      },
      {
        // 处理图片资源
        test: /\.(jpg|png|gif)$/,
        loader: "url-loader",
        options: {
          limit: 8 * 1024,
          name: "[hash:10].[ext]",
          // 关闭es6模块化
          esModule: false,
          outputPath: "imgs",
        },
      },
      {
        // 处理html中img资源
        test: /\.html$/,
        loader: "html-loader",
      },
      {
        // 处理其他资源
        exclude: /\.(html|js|css|scss|sass|jpg|png|gif)/,
        loader: "file-loader",
        options: {
          name: "[hash:10].[ext]",
          outputPath: "media",
        },
      },
    ],
  },
  plugins: [
    // plugins的配置
    new HtmlWebpackPlugin({
      template: "./src/index.html",
    }),
    // 使用提取css插件
    new MiniCssExtractPlugin({
      // 对输出的css重命名
      filename: 'css/index.[hash:8].css'
    })
  ],
  mode: "development",
  devServer: {
    contentBase: resolve(__dirname, "dist"),
    compress: true,
    port: 3000,
    open: true,
  },
};
