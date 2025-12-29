const { resolve } = require('path');
var HelloWorldPlugin = require('./hello-world.js');
var SetScriptTimestampPlugin = require('./SetScriptTimestampPlugin.js');
const HtmlWebpackPlugin = require("html-webpack-plugin")

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'js/built.js',
    path: resolve(__dirname, 'dist'),
  },
  module: {
    rules: [
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/index.html",
    }),
    // new HelloWorldPlugin({ options: true }),
    new SetScriptTimestampPlugin({ options: true }),
  ],
  // js 压缩只需要切换到 production mode， 自动使用了uglify压缩js
  mode: 'production',
  // mode: "development",
};
