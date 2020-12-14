# NODE_ENV

## 前言

在node 中
process 对象是一个全局变量，提供了有关当前 Node.js 进程的信息并对其进行控制。 作为全局变量，它始终可供 Node.js 应用程序使用，无需使用 require()。 它也可以使用 require() 显式地访问：

在node中，有全局变量process表示的是当前的node进程。process.env包含着关于系统环境的信息。但是process.env中并不存在NODE_ENV这个东西。NODE_ENV是用户一个自定义的变量，在webpack中它的用途是判断生产环境或开发环境的依据的。

### 在浏览器端

在mian.js 打印一下

```
console.log(process, process.env, process.env.NODE_ENV)
process中 env是空的，打断点也是空的，但是控制台输出 process.env 是有值
```

### node中常用的到的环境变量是NODE_ENV，首先查看是否存在

echo $NODE_ENV

### 如果不存在则添加环境变量

export NODE_ENV=production

### 环境变量追加值

export path=$path:/home/download:/usr/local/

### 某些时候需要删除环境变量

unset NODE_ENV

### 某些时候需要显示所有的环境变量

env

注意：如果我们在命令行中设置环境变量后，比如设置 production 后，如下设置：
export NODE_ENV=production ，那么会在所有的项目下都是正式环境，当我们使用命令 npm install 后下载依赖包时，只会把 package.json中的dependencies依赖项下载下来，对于devDependencies中的依赖包是下载不下来的。
因此我们需要使用上面的命令 unset NODE_ENV 删除刚刚设置的环境变量。

### cross-env

1. 什么是cross-env呢？
它是运行跨平台设置和使用环境变量的脚本。

2. 它的作用是啥？

当我们使用 NODE_ENV = production 来设置环境变量的时候，大多数windows命令会提示将会阻塞或者异常，或者，windows不支持NODE_ENV=development的这样的设置方式，会报错。因此 cross-env 出现了。我们就可以使用 cross-env命令，这样我们就不必担心平台设置或使用环境变量了。也就是说 cross-env 能够提供一个设置环境变量的scripts，这样我们就能够以unix方式设置环境变量，然而在windows上也能够兼容的。

要使用该命令的话，我们首先需要在我们的项目中进行安装该命令，安装方式如下：

```shell
npm install --save-dev cross-env
```

然后在package.json中的scripts命令如下如下：

```js
"scripts": {
  "dev": "cross-env NODE_ENV=development webpack-dev-server --progress --colors --devtool cheap-module-eval-source-map --hot --inline",
  "build": "cross-env NODE_ENV=production webpack --progress --colors --devtool cheap-module-source-map",
  "build:dll": "webpack --config webpack.dll.config.js"
}
```

### 有意思的东西

```
a = 'a'
"a"
JSON.stringify(a)
""a""
```

这个是因为 JSON.parse()的语法原因
比如：
 JSON.parse("a")和JSON.parse('"a"')  
第一个就会报错

### 在客户端侧代码中使用环境变量

只有以 VUE_APP_ 开头的变量会被 webpack.DefinePlugin 静态嵌入到客户端侧的包中。你可以在应用的代码中这样访问它们：

console.log(process.env.VUE_APP_SECRET)
在构建过程中，process.env.VUE_APP_SECRET 将会被相应的值所取代。在 VUE_APP_SECRET=secret 的情况下，它会被替换为 "secret"。

除了 VUE_APP_* 变量之外，在你的应用代码中始终可用的还有两个特殊的变量：

NODE_ENV - 会是 "development"、"production" 或 "test" 中的一个。具体的值取决于应用运行的模式。
BASE_URL - 会和 vue.config.js 中的 publicPath 选项相符，即你的应用会部署到的基础路径。
所有解析出来的环境变量都可以在 public/index.html 中以 HTML 插值中介绍的方式使用。

tip 提示 你可以在 vue.config.js 文件中计算环境变量。它们仍然需要以 VUE_APP_ 前缀开头。这可以用于版本信息:

```
process.env.VUE_APP_VERSION = require('./package.json').version

module.exports = {
  // config
}
```

```js
const prefixRE = /^VUE_APP_/

module.exports = function resolveClientEnv (options, raw) {
  const env = {}
  Object.keys(process.env).forEach(key => {
    if (prefixRE.test(key) || key === 'NODE_ENV') {
      env[key] = process.env[key]
    }
  })
  env.BASE_URL = options.publicPath

  if (raw) {
    return env
  }

  for (const key in env) {
    env[key] = JSON.stringify(env[key])
  }
  return {
    'process.env': env
  }
}
```

#### vue的readMe

使用了 DefinePlugin去 定义 process.env
Use Webpack's [DefinePlugin](https://webpack.js.org/plugins/define-plugin/):

``` js
var webpack = require('webpack')

module.exports = {
  // ...
  plugins: [
    // ...
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify('production')
      }
    })
  ]
}
```

#### 总结

#### 参考文献

1. <https://zhuanlan.zhihu.com/p/141437178?from_voters_page=true>
2. <http://nodejs.cn/api/process.html#process_process_env>
3. <https://github.com/vuejs/vue-cli/blob/01e36f30cfbc82814cf0fea8da1c408667daa052/packages/%40vue/cli-service/lib/util/resolveClientEnv.js>
