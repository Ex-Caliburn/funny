# git add -A 和 git add . 的区别

## 前言

git add -A和 git add .   git add -u在功能上看似很相近，但还是存在一点差别

git add . ：他会监控工作区的状态树，使用它会把工作时的所有变化提交到暂存区，包括文件内容修改(modified)以及新文件(new)，但不包括被删除的文件。

git add -u ：他仅监控已经被add的文件（即tracked file），他会将被修改的文件提交到暂存区。add -u 不会提交新文件（untracked file）。（git add --update的缩写）

git add -A ：是上面两个功能的合集（git add --all的缩写）

### merge

如果你merge 但是把文件都删除，但是你以为你退出了merge状态，其实不，你还在merge状态，你通过 git status 可以查看，如果不想合并了，通过下面命令退出

git merge --abort

### git reflog

如果git reset --hard ，只有这个能救你

查看commit 记录然后

git reset --hard c48a245

## 总结

### 参考文献

1. <https://zhuanlan.zhihu.com/p/42929114>
