const { resolve } = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCssAssetsWebpackPlugin = require('optimize-css-assets-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'js/built.js',
    path: resolve(__dirname, 'dist'),
  },
  module: {
    rules: [
      // loader的配置
      /*
        语法检查： eslint-loader  eslint
          注意：只检查自己写的源代码，第三方的库是不用检查的
          设置检查规则：
            package.json中eslintConfig中设置~
              "eslintConfig": {
                "extends": "airbnb-base"
              }
            airbnb --> eslint-config-airbnb-base  eslint-plugin-import eslint
      */
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'eslint-loader',
        options: {
          // 自动修复eslint错误
          fix: true,
        },
      },
      {
        // 处理css资源
        test: /\.(scss|sass|css)$/,
        use: [
          // 创建style 标签插入
          // "style-loader",
          // 这个loader取代style-loader，作用提取js中cs成单独文件
          MiniCssExtractPlugin.loader,
          // 将css整合到js文件中，字符串
          'css-loader',
          'sass-loader',
          // 配置postcss，需要用对象的模式
          {
            loader: 'postcss-loader',
            options: {
              ident: 'postcss',
              plugins: () => [
                // postcss的插件
                require('postcss-preset-env')(),
              ],
            },
          },
        ],
      },
    ],
  },
  plugins: [
    // plugins的配置
    new HtmlWebpackPlugin({
      template: './src/index.html',
    }),
    // 使用提取css插件
    new MiniCssExtractPlugin({
      // 对输出的css重命名
      filename: 'css/index.[hash:8].css',
    }),
    new OptimizeCssAssetsWebpackPlugin(),
  ],
  // js 压缩只需要切换到 production mode， 自动使用了uglify压缩js
  // mode: "production",
  mode: 'development',
  devServer: {
    contentBase: resolve(__dirname, 'dist'),
    compress: true,
    port: 3000,
    open: true,
  },
};
