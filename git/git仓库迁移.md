# Git仓库迁移

## 前言

Git仓库迁移，包括所有的分支、标签、日志

### 初始

刚开始我是添加origin，将原来的origin改成old-origin，然后将old-origin分支checkout到当前分支，push 上去会报错deny-updating-hidden-ref

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

--bare
Make a bare Git repository. That is, instead of creating <directory> and placing the administrative files in <directory>/.git, make the <directory> itself the $GIT_DIR. This obviously implies the --no-checkout because there is nowhere to check out the working tree. Also the branch heads at the remote are copied directly to corresponding local branch heads, without mapping them to refs/remotes/origin/. When this option is used, neither remote-tracking branches nor the related configuration variables are created.

--mirror
Set up a mirror of the source repository. This implies --bare. Compared to --bare, --mirror not only maps local branches of the source to local branches of the target, it maps all refs (including remote-tracking branches, notes etc.) and sets up a refspec configuration such that all these refs are overwritten by a git remote update in the target repository.

## 总结

推荐第二个，更简洁

### 参考文献

1. <https://stackoverflow.com/questions/54341191/git-push-fails-with-deny-updating-hidden-ref>
2. [git-clone](https://git-scm.com/docs/git-clone)
