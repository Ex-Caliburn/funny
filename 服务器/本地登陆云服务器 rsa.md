# 本地登陆云服务器

## 前言

sh -i "/Users/lijiye/.ssh/id_rsa" root@49.235.164.12
The authenticity of host '49.235.164.12 (49.235.164.12)' can't be established.
ECDSA key fingerprint is SHA256:nKtWh05zzvE7pfRC46ii5oBPf0WLu3b8pVA6MXKhmbQ.
Are you sure you want to continue connecting (yes/no/[fingerprint])?
Host key verification failed.

这段话的意思是，无法确认host主机的真实性，只知道它的公钥指纹，问你还想继续连接吗？

### 解决方式

通过信息提示中的指纹获取远端公钥信息，并加入到 known_hosts 文件中

1. 获取公钥

```shell
ssh-keyscan -t ECDSA -p 22 49.235.164.12
```

2 .将返回的内容追加到 known_hosts 文件内容中

## 总结

SSH 之 konw_hosts
为什么有 known_hosts 这个设计呢？
首先了解 SSH 连接建立的过程：

   1. 客户端发起 SSH 连接请求
   2. 服务端传送公钥给客户端： 此时客户端接收到服务端的公钥
   3. 客户端记录/对比服务器的公钥并记录到~/.ssh/known_hosts ： 若客户端第一次接收到此服务器，则将服务器的公钥记录在 ~/.ssh/known_hosts 。若已经记录过，则会进行对比，如果有差异则报错。
   4. 客户端传送公钥数据到服务端： 此时服务端接收到客户端的公钥
   5. 开始双向加解密来验证登陆权限： 服务端传送数据时用客户端的公钥加密，那么客户端接收用自己的私钥解密；客户端传送数据时用客户端的公钥加密，同理服务端接收用自己的私钥解密。

在实际操作中，有这样的安全问题，有人截获了登陆请求，伪造了公钥，那么真的难以分辨出来。所以在第一次连接某个ip地址时，都会有指纹信息的提示，这个步骤通常情况下是需要人工校验的

为了减少这样的安全风险，连接过的 ip 及其对应公钥信息就存储在客户端本地了，可靠性更高，这就是 known_hosts 的设计目的

### 参考文献

1. <https://blog.liluhui.cn/2019/03/27/SSH%E8%AE%A4%E8%AF%81%E5%A4%B1%E8%B4%A5/>
2. <https://www.ruanyifeng.com/blog/2011/12/ssh_remote_login.html>
