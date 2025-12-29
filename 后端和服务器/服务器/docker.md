#

## 前言

### 进入 docker

docker container exec -it f0b1c8ab3633 /bin/bash
退出：输入 exit 命令

ll 无效 使用ls

vim 默认是没有的

### 运行容器

docker run --name nginx-test -p 8080:80 -d nginx

--name nginx-test：容器名称。
-p 8080:80： 端口进行映射，将本地8080端口映射到容器内部的80端口。
-d nginx： 设置容器在后台一直运行。

### 常规

docker ps         # 查看正在运行的容器
docker ps -a      # 查看所有容器
docker ps -l      # 查看最近一次运行的容器

docker create 容器名或者容器ID    # 创建容器
docker start [-i] 容器名        # 启动容器
docker run 容器名或者容器ID       # 运行容器，相当于docker create + docker start
docker attach 容器名或者容器ID bash     # 进入容器的命令行（退出容器后容器会停止）
docker exec -it 容器名或者容器ID bash   # 进入容器的命令行
docker stop 容器名                    # 停止容器
docker rm 容器名                      # 删除容器

docker top 容器名                    # 查看WEB应用程序容器的进程
docker inspect 容器名                # 查看Docker的底层信息

### 复制

docker cp 本地路径 容器长ID:容器路径

docker cp /Users/xubowen/Desktop/auto-post-advance.py 38ef22f922704b32cf2650407e16b146bf61c221e6b8ef679989486d6ad9e856:/root/
auto-post-advance.py

## 总结

### 参考文献

1. <https://www.cnblogs.com/yufeng218/p/8371751.html>
2. <https://blog.csdn.net/qq_43227967/article/details/90243695>
