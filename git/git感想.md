# 分支管理，gitflow

## 前言

### 分支

基本分支有develop(dev) ，master

临时分支有
feature branch 功能分支
fix branch 修补程序分支
release branch 发布分支(在我这里可能用不着)

这些分支提交完，他的使命就完成了，留着是可以查看历史版本的迭代，修改了什么东西

### 操作命令

feature branch就是在我这里就是dev-(版本号)
前端git分支开发需要优化，不同需求的代码都在同一分支上 不好管理，需要弄一个版本分支，  dev应该只是版本开始时和结束时使用，以dev为base创建如dev-5.8分支 ， 然后版本开发都在dev-5.8分支上，测试完合并到master，并且合并到dev，这样dev代码总是不受污染的，随时可以copy，只是操作步骤变多了，只是测试环境前端也需要多个环境，或者可以切换前端代码版本库，这个可能比较难

dev => dev-5.1 => master(同时dev-5.1合并到dev)

dev-5.1创建分支的同时记得打tag并推送
tag tag的好处是让版本发布上线和回滚更清晰明了

```shell
 git tag v5.1  这是对分支打tag   // 作用不大
 git tag v1.00 440376 -m "第一版"  //自定义版本标识  版本id号  -m "备注“
 git push origin --tags
```

我还是觉得版本分支还是以功能命名，简洁明了能一眼看出这个分支的主要功能，不要动词开头，名次就可以了  feat-*** (如增加交互，服务号绑定，live-interact，service-bind)

revert 回撤，提交一个commit ，撤销特定commit 的提交
如果要撤销merge，这个是个有副作用的操作 git revert commitId -m，这个就是gitLab的回滚操作（发起一个revert提交的分支合并到回滚分支），但是有一个后果，你把feat分支内容提交上了master，提交后你发现master代码有问题，然后你紧急回撤代码，然后feat代码就消失了，但是feat 代码还在，然后你就在feat 分支修复了bug，然后合到了master，发现代码没有用，因为上次revert，将提交的代码都干掉了，正确做法是拉取master代码，然后revert 上次revert ，提交就回来了。其实revert 不仅改了数据，还改变了提交历史。
还有一种方法，git rebase，
参考：<https://github.com/git/git/blob/master/Documentation/howto/revert-a-faulty-merge.txt>

revert 还可以revert 多个commit

$ git log --abbrev-commit --pretty=oneline
查看SHA-1 更清晰，这是信息少了

HEAD 等同于 HEAD～0，HEAD^^^等同于HEAD～3，
^和～都是祖先分支的，HEAD简单说当前分支上的最新提交，复制的复制，也一样，历史记录也被复制了
记HEAD容易错，还是commitId靠谱点

git reset --soft 回到那此提交，但是从操作那个版本到那次提交中间的提交都会存在暂存区
git reset --mixed，回到那此提交，但是从操作那个版本到那次提交中间的提交都会存在工作区
git reset --hard 回到那此提交，但是从操作那个版本到那次提交中间的都会消失，慎重操作，并且工作区的文件也会被空

git reset <pathspec> is the opposite of git add <pathspec> 相当于把add添加的内容重置带回工作区
git reset --soft HEAD^ 不小心将代码提交了，我需要改提交信息或者漏了东西，这样我可以将东西恢复到暂存取继续修改

git reset --hard HEAD~3  你提交不少东西，但是发版这些东西不需要，你以当前分支新建分支feat，feat将这些不需要的提交回滚，然后在提交，回到原来分支继续开发

git pull 有冲突时，但是现在没时间改，git reset --hard  HEAD  ,恢复到上次提交情况，注意如果工作区有东西也会被重置

当工作到一半时，有线上bug打断你的开发，你需要切到fix 分支，这时你可以将代码提交commit，然后切分支，改完bug之后回来
git reset --soft HEAD^ => git reset
我的方法时放进暂存取stage，这个更方便

git cherry-pick [--edit] [-n] [-m parent-number] [-s] [-x] [--ff]
    [-S[<keyid>]] <commit>…​
git cherry-pick (--continue | --skip | --abort | --quit)

cherry-pick 挑选 指定commitId到的历史记录中来,可以指定多个
如果有冲突，修改冲突，历史提交记录保持鸳鸯

cherry-pick 指定分支，将该分支上所有我没有的提交全部复制过来

cherry-pick <commit> -m 1 可以摘取合并请求

### github flow

什么是GitHub Flow？

 1. master分支中的任何内容都是可部署的
 2. 要在一些新的工作，创建一个名为描述性分支出来的master（即：new-oauth2-scopes）
 3. 本地提交到该分支，并定期将您的工作推送到服务器上的同一命名分支
 4. 当您需要反馈或帮助时，或者您认为分支可以合并时，请打开拉取请求
 5. 在其他人查看并签署了该功能后，您可以将其合并到主功能中
 6. 合并并推送到“主服务器”后，您可以并且应该立即部署

#### gitflow 缺点

我们能看到feature branch最明显的两个好处是：

各个feature之间的代码是隔离的，可以独立地开发、构建、测试；
当feature的开发周期长于release周期时，可以避免未完成的feature进入生产环境。
后面我们会看到，第一点所带来的伤害要大于其好处，第二点也可以通过其他的技术来实现。

#### merge is merge

然而feature branch这个实践本身阻碍了频繁的merge: 因为不同feature branch只能从master或develop分支pull代码，而在较长周期的开发完成后才被merge回master。也就是说相对不同的feature branch，develop上的代码永远是过时的。如果feature开发的平均时间是一个月，feature A所基于的代码可能在一个月前已经被feature B所修改掉了，这一个月来一直是基于错误的代码进行开发，而直到feature branch B被merge回develop才能获得反馈，到最后merge的成本是非常高的。

#### 持续集成

如果feature branch要在feature开发完成才被merge回develop分支，那我们如何做持续集成呢？毕竟持续集成不是自己在本地把所有测试跑一遍，持续集成是把来自不同developer不同team的代码集成在一起，确保能构建成功通过所有的测试。按照持续集成的纪律，本地代码必须每日进行集成，我想大概有这几种方案：

 1. 每个feature在一天内完成，然后集成回develop分支。这恐怕是不太可能的。况且如何每个feature如果能在一天内完成，我们为啥还专门开一个分支？
 2. 每个分支有自己独立的持续集成环境，在分支内进行持续集成。然而为每个环境准备单独的持续集成环境是需要额外的硬件资源和虚拟化能力的，假设这点没有问题，不同分支间如果不进行集成，仍然不算真正意义上的持续集成，到最后的big bang conflict总是无法避免。
 3. 每个分支有自己独立的持续集成环境，在分支内进行持续集成，同时每日将不同分支merge回develop分支进行集成。听起来很完美，不同分支间的代码也可以持续集成了。可发生了冲突、CI挂掉谁来修呢，也就是说我们还是得关心其他developer和其他团队的开发情况。不是说好了用feature branch就可以不管他们自己玩吗，那我们要feature branch还有什么用呢？
所以你会发现，在坚持持续集成实践的情况下，feature branch是一件非常矛盾的事情。持续集成在鼓励更加频繁的代码集成和交互，让冲突越早解决越好。feature branch的代码隔离策略却在尽可能推迟代码的集成。延迟集成所带来的恶果在软件开发的历史上已经出现过很多次了，每个团队自己写自己的代码是挺high，到最后不同团队进行联调集成的时候就傻眼了，经常出现写两个月代码，花一个月时间集成的情况，质量还无法保证

### git rebase

目的：
如果使用merge 大家提交记录全部出现在master分支，很不清晰
如果在提交到dev，master分支之前，将自己的提交记录整理合并，更简洁清晰，这就是 存在的意义

pick：正常选中
reword：选中，并且修改提交信息；
edit：选中，rebase时会暂停，允许你修改这个commit（参考这里）
squash：选中，会将当前commit与上一个commit合并
fixup：与squash相同，但不会保存当前commit的提交信息
exec：执行其他shell命令

一般使用 squash或者fixup

$ git rebase -i origin/master
然后修改 需要合并的注释 `pick`改为`s` 或者 `squash`,提交信息将合并到上一个 `commit`

```git
pick 07c5abd Introduce OpenPGP and teach basic usage
pick de9b1eb Fix PostChecker::Post#urls
pick 3e7ee36 Hey kids, stop all the highlighting
pick fa20af3 git interactive rebase, squash, amend

pick 07c5abd Introduce OpenPGP and teach basic usage
s de9b1eb Fix PostChecker::Post#urls
s 3e7ee36 Hey kids, stop all the highlighting
pick fa20af3 git interactive rebase, squash, amend
```

## 总结

Gitflow也不是Github所推荐的工作流

gitflow作者推荐：
我建议您采用更简单的工作流程（例如GitHub flow），而不是尝试将git-flow引入您的团队。

### 参考文献

1. <https://nvie.com/posts/a-successful-git-branching-model/>
2. <https://insights.thoughtworks.cn/gitflow-consider-harmful/>
3. <https://guides.github.com/introduction/flow/>
4. <http://www.ruanyifeng.com/blog/2015/08/git-use-process.html>
