# pm2

## 前言

$ npm install pm2@latest -g

 or

$ yarn global add pm2
To install Node.js and NPM you can use NVM

Start an app
The simplest way to start, daemonize and monitor your application is by using this command line:

$ pm2 start app.js

### Max Memory Threshold Auto Reload

pm2 start api.js --max-memory-restart 300M

### 监控

打印日志实时
pm2 logs

pm2 monit

线上监控
<https://app.pm2.io/bucket/5982b9bfbdbc77d879b01294/backend/overview/servers>

### 静态文件服务器

使用pm2启动静态文件服务器的方法如下：

pm2 serve path port
pm2 serve . 9001
这样就可以把当前文件夹下的静态文件跑起来了，而且端口号是9001，

同样也支持进阶的使用，如下

pm2 serve . 9001 --name  test  -- watch
这样就启动了一个名字为test，端口号为9001，且监听文件变化的静态文件服务器

## 总结

问题查找
chrome 的 memory
profiler

减少不必要的全局变量，使用严格模式避免意外创建全局变量。
在你使用完数据后，及时解除引用（闭包中的变量，dom引用，定时器清除）。
组织好你的逻辑，避免死循环等造成浏览器卡顿，崩溃的问题。

### 参考文献

1. <https://pm2.keymetrics.io/docs/usage/monitoring/>
2. <https://github.com/aliyun-node/Node.js-Troubleshooting-Guide/blob/master/0x01_%E9%A2%84%E5%A4%87%E7%AF%87_%E5%B8%B8%E8%A7%84%E6%8E%92%E6%9F%A5%E7%9A%84%E6%8C%87%E6%A0%87.md>
3. <https://blog.csdn.net/nnxxyy1111/article/details/84648950>
4. <https://zhuanlan.zhihu.com/p/36340263>
5. https://blog.csdn.net/weixin_44829437/article/details/94540808
