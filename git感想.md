<!--
 * @Author: Alex lijiyebest@gmail.com
 * @Date: 2020-04-01 22:40:32
 * @LastEditTime: 2020-04-03 10:51:49
 * @LastEditors: Alex lijiyebest@gmail.com
 * @Description: 当前文件做什么的
 -->
分支管理，gitflow

基本分支有develop(dev) ，master

临时分支有 
feature branch
fix branch
release branch(在我这里可能用不着)

这些分支提交完，他的使命就完成了，留着是可以查看历史版本的迭代，修改了什么东西

feature branch就是在我这里就是dev-(版本号)
前端git分支开发需要优化，不同需求的代码都在同一分支上 不好管理，需要弄一个版本分支，  dev应该只是版本开始时和结束时使用，以dev为base创建如dev-5.8分支 ， 然后版本开发都在dev-5.8分支上，测试完合并到master，并且合并到dev，这样dev代码总是不受污染的，随时可以copy，只是操作步骤变多了，只是测试环境前端也需要多个环境，或者可以切换前端代码版本库，这个可能比较难

dev => dev-5.1 => master(同时dev-5.1合并到dev)

dev-5.1创建分支的同时记得打tag并推送
tag tag的好处是让版本发布上线和回滚更清晰明了
```
 git tag v5.1  这是对分支打tag   // 作用不大
 git tag v1.00 440376 -m "第一版"  //自定义版本标识  版本id号  -m "备注“
 git push origin --tags
```


我还是觉得版本分支还是以功能命名，简洁明了能一眼看出这个分支的主要功能，不要动词开头，名次就可以了  feat-*** (如增加交互，服务号绑定，live-interact，service-bind)

revert 回撤，提交一个commit ，撤销特定commit 的提交
如果要撤销merge，这个是个有副作用的操作 git revert commitId -m，这个就是gitLab的回滚操作（发起一个revert提交的分支合并到回滚分支），但是有一个后果，你把feat分支内容提交上了master，提交后你发现master代码有问题，然后你紧急回撤代码，然后feat代码就消失了，但是feat 代码还在，然后你就在feat 分支修复了bug，然后合到了master，发现代码没有用，因为上次revert，将提交的代码都干掉了，正确做法是拉取master代码，然后revert 上次revert ，提交就回来了。其实revert 不仅改了数据，还改变了提交历史。
还有一种方法，git rebase，
参考：https://github.com/git/git/blob/master/Documentation/howto/revert-a-faulty-merge.txt

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
