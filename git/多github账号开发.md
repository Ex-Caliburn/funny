# 多github账号开发

## 前言

场景，公司有个账号，个人有一个账号，推送仓库需要来回切换，很麻烦

### 步骤

```
$ ssh-keygen -t rsa -C "test1@xxx.com"
第一次可以一路回车

$ ssh-keygen -t rsa -C "test2@xxx.com"
这次不要一路回车了，给这个文件起一个名字 不然默认的话就覆盖了之前生成的第一个
test2

$ cd ~/.ssh

$ mv id_rsa test1

$ mv id_rsa.pub test1.pub
```

```
Host test1.github.com
    HostName github.com
    PreferredAuthentications publickey
    IdentityFile ~/.ssh/test1

Host test2.github.com
    HostName github.com
    PreferredAuthentications publickey
    IdentityFile ~/.ssh/test2
```

### 测试配置是否正确

ssh -T git@test1.github.com
Hi xxx! You've successfully authenticated, but GitHub does not provide shell access.
就说明连接成功了

### 操作

修改config文件

 更改[remote "origin"]项中的url中的

 test1.github.com 对应上面配置的host

[remote "origin"]
 url = git@test1.github.com:test1/blog.git

git clone git@test1.github.com:test1/Blog.git

git remote -v
删除原来仓库
git remote rm origin
git remote add origin git@test1.github.com:yourName/Blog.git

### 遇到的错误

Bad owner or permissions on .ssh/config
需要给config 读写权限
sudo chmod 600 config

## 总结

### 参考文献

1. <https://blog.csdn.net/itmyhome1990/article/details/42643233>
2. <https://help.github.com/cn/github/authenticating-to-github/connecting-to-github-with-ssh>
