# node-sass 安装问题

## 前言

 `node-sass` 每次安装环境都会有点问题， `node-sass` 需要依赖 `python` ，依赖 `node` 版本

每次在本地成功构建，发布到服务器上构建总会出现各种各样问题

有些报错看着和 `node-sass` 没有关系，但是其根本还是 `node-sass` 引起

### 解决方案

1. 安装 `docker` ，本地使用 `docker` ，服务器使用同样的 `docker` 容器，这样可以保持一致，不用担心各种兼容性问题
2. 使用  `yarn`  固定版本
3. 使用  `dart-sass`  替代  `node-sass`

#### 解决历程，问题重现

 `docker` 成本比较高，这里暂且不表

服务器构建报错

第一次是服务器拉取不到对应的资源，证书过期了，我是用的淘宝镜像

`
npm ERR! request to https://registry.npm.taobao.org/js-cookie failed, reason: certificate has expired。
`

网上一搜淘宝 `npm` 镜像过期了，将 `npm` 淘宝镜像切换至淘宝的新镜像域名，步骤如下：

切换镜像源
`npm config set registry https://registry.npmmirror.com`

检测是否切换成功
`npm config get registry`

而且  `cnpm` ,  `yarn` 的 `npm` 镜像和  `bpm`  使用的  `npm`  镜像是可以不一样的
把上面的  `npm`  替换成  `yarn`  命令或者  `cnpm`  即可

我本地使用的 `cnpm` ，安装 `cnpm` 方式

```cmd
npm install -g cnpm --registry=https://registry.npmmirror.com
```

查看 `cnpm` 是否安装成功 `cnpm -v`

服务器切换了镜像继续报错

```text
error /home/jenkins/workspace/jay/node_modules/node-sass: Command failed.
Exit code: 1
Command: node scripts/build.js
Arguments: 
Directory: /home/jenkins/workspace/jay/node_modules/node-sass
Output:
Building: /usr/local/node/bin/node /home/jenkins/workspace/jay/node_modules/node-gyp/bin/node-gyp.js rebuild --verbose --libsass_ext= --libsass_cflags= --libsass_ldflags= --libsass_library=
```

我发现我本地用的 `cnpm` ，本地用的 `yarn` ，而且我 `node` 版本是 14.21，服务器是12.18

我让运维将服务器 `node` 版本升级到 14.21，并且切换到 `cnpm` 安装依赖，并且我看到官网  `node-sass`  和  `Node` 版本关系

```
NodeJS Supported node-sass version Node Module
Node 20 9.0+ 115
Node 19 8.0+ 111
Node 18 8.0+ 108
Node 17 7.0+, <8.0 102
Node 16 6.0+ 93
Node 15 5.0+, <7.0 88
Node 14 4.14+, <9.0 83
Node 13 4.13+, <5.0 79
Node 12 4.12+, <8.0 72
Node 11 4.10+, <5.0 67
Node 10 4.9+, <6.0 64
Node 8 4.5.3+, <5.0 57
Node <8 <5.0 <57
```

我把版本固定在4.14，然后构建，依旧报错，服务器和本地还是天差地别

网上找到一个方法

```
yarn add node-sass@yarn:dart-sass -D
```

```JSON
  {
    "node-sass": "npm:dart-sass"
  }
```

同时把 `/deep/` 替换成 `::v-deep`,  在我 `vue2.7` 版本，发现不起作用， 遂改为 `>>>` 就可以了

## 总结

### 参考文献

1. <https://www.npmjs.com/package/node-sass>
