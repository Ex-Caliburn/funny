# Git仓库迁移

## 前言

Git仓库迁移，包括所有的分支、标签、日志

### 初始

刚开始我是添加origin，将原来的origin改成old-origin，然后将old-origin分支checkout到当前分支，push 上去会报错

然后参考了gitlab步骤

```shell
Existing Git repository
cd existing_repo
git remote rename origin old-origin
git remote add origin git@***.git
git push -u origin --all
git push -u origin --tags
```

刚开始用总是报错，因为公司不支持 ssh，使用的https，

```shell
git remote add origin https://g666it.jingdaka.com/jingdaka/jdk_front_op.git
```

### 第二种

更简单的方法

```shell
git clone --bare ***.git

cd 仓库名称.git

git push --mirror ***.git
```

## 总结

### 参考文献
