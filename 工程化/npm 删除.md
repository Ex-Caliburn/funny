# NPM卸载全局包

## 前言

卸载全局安装命令
npm uninstall -g <package>

全局包安装位置
C:\Users\用户名\AppData\Roaming\npm\node_modules

这个位置用于定位安装了什么包，因为查看全局包的命令npm ls -g确实不好看明白安装了那些包。
还有以下常用命令
查看所有全局安装的模块 npm ls -g
查看npm默认设置（部分） npm config ls
查看npm默认设置（全部） npm config ls -l

修改全局依赖下载位置
npm config set prefix "D:\Program Files\npm_global_modules\node_modules"

强化版
npm list -g --depth 0

npm list 显示安装过的包
-g 指全局安装过的包
--depth 0 限制输出模块层级

当使用npm安装一些全局的软件包时，不知道安装到了什么位置，可以使用命令 npm root -g 进行查询

npm root -g

通常默认会保存在以下位置：
C:\Users\username\AppData\Roaming\npm\node_modules

### 检测npm包版本状态

运行npm -g outdated，查看包的版本状态。如下所示：

更新全局安装包
按指定包名更新：npm update -g <package>
查看需要更新的包：npm outdated -g --depth=0
更新所有全局依赖包：npm update -g或者npm i -g <package> --force

## 总结

### 参考文献
