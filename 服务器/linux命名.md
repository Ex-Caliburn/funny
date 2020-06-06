# linux 常用命令

## 前言

服务器全是linux，自己总是忘记，所以记下来

### vim

 1. n yy 复制n行

 2. p 粘贴

 3. % s/a/b/g 全局替换a为b

 4. u 撤销

 5. /name 查找name

 6. i 插入

 7. v v视图

 8. 10 ==　缩进10行

 9. q 退出

- :q!强制退出并忽略所有更改
- :wq 保存并退出
- ZZ 保存并退出

 10. exit 退出

 11. dd 剪切一行

 12. n dd 剪切n行

 13. :n 到指定行

 14. :set number   显示行数

 15. 多行注释：

- 首先按esc进入命令行模式下，按下Ctrl + v，进入列（也叫区块）模式;
- 在行首使用上下键选择需要注释的多行;
- 按下键盘（大写）“I”键，进入插入模式；
- 然后输入注释符（“//”、“#”等）;
- 最后按下“Esc”键。 注：在按下esc键后，会稍等一会才会出现注释，不要着急~~时间很短的

 16. 取消多行注释：

- 首先按esc进入命令行模式下，按下Ctrl + v, 进入列模式;
- 选定要取消注释的多行;
- 按下“x”或者“d”. 注意：如果是“//”注释，那需要执行两次该操作，如果是“#”注释，一次即可

### shell

 1. 显示当前所有文件  ls

- ls -a显示隐藏文件

 2. 进入 某个文件夹 cd app（app是文件夹名）

- cd ～返回 home目录下d

- cd .. 返回上一层

- cd /  返回根目录

 3. 复制文件从现路径到目标路径： cp src desc

 4. 没有权限命令之前加上  sudo

 5. 更新系统配置： sudo apt-get update

 6. 删除： rm 1.js(文件名)

 7. 创建 'dir1' 目录： mkdir dir1

 8. ifconfig 显示网络配置

 9. 打开编辑器：vi 1.js（文件名）

 10. 查找:

- find / -name 文件名

  - locate 文件名

 11. 重新加载 ngxin服务 sudo service nginx reload

 12. 开启openvpn: sudo service openvpn restart
 13. ps -ef | grep （进程名 eg：node）查看node进程

- kill -9 进程号　杀死这个进程

 14. forever stop index.js (目录下 停止nodejs进程）

- forever start index.js

- forever restart index.js

- tail -f    /data/caiqiu/log/node_log.log(查看日志)  

 15. 继续ctrl +r 输出上一条使用过的相似命令

 16. tail -f nohup.out 实时输出log数据

 17. cp -r directory toDirectoryName 复制文件夹

 18. mv 移动文件或文件夹,rm 删除文件 rm -rf 删除文件夹

 19. df -al　查看磁盘使用情况

 20. ln -s filename filename 建立软连接

 21. 解压

- tar  -cf 创建压缩文件

- tar -xf 解压文件

- unzip 解压zip包

### 退出当前服务器

1. exit
2. ctrl + d

## 总结

### 参考文献
