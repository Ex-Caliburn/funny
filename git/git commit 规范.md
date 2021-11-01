## git commit 规范

### 格式

```
它的 message 格式如下:
<type>(<scope>): <subject>
// 空一行
<body>
// 空一行
<footer>
分别对应 Commit message 的三个部分：Header，Body 和 Footer。
```

### header

Header 部分只有一行，包括三个字段：type（必需）、scope（可选）和subject（必需）。

```
type: 用于说明 commit 的类型。一般有以下几种:
feat: 新增feature
fix: 修复bug
docs: 仅仅修改了文档，如readme.md
style: 仅仅是对格式进行修改，如逗号、缩进、空格等。不改变代码逻辑。
refactor: 代码重构，没有新增功能或修复bug
perf: 优化相关，如提升性能、用户体验等。
test: 测试用例，包括单元测试、集成测试。
chore: 改变构建流程、或者增加依赖库、工具等。
revert: 版本回滚
scope: 用于说明 commit 影响的范围，比如: views, component, utils, test... 
```

subject: commit 目的的简短描述

### body

```
对本次 commit 修改内容的具体描述, 可以分为多行。如下图:
# body: 72-character wrapped. This should answer:
# * Why was this change necessary?
# * How does it address the problem?
# * Are there any side effects?
# initial commit
```

### footer

```
一些备注, 通常是 BREAKING CHANGE(当前代码与上一个版本不兼容) 或修复的 bug(关闭 Issue) 的链接。
简单介绍完上面的规范，我们下面来说一下commit.template，也就是 git 提交信息模板。
```

### 设置

如果你的团队对提交信息有格式要求，可以在系统上创建一个文件，并配置 git 把它作为默认的模板，这样可以更加容易地使提交信息遵循格式。
通过以下命令来配置提交信息模板:

```bash
git config commit.template   [模板文件名]    //这个命令只能设置当前分支的提交模板
git config  — —global commit.template   [模板文件名]    //这个命令能设置全局的提交模板，注意global前面是两杠
```

新建 .gitmessage.txt(模板文件) 内容可以如下:

```vim
# header: <type>(<scope>): <subject>
# - type: feat, fix, docs, style, refactor, test, chore
# - scope: can be empty
# - subject: start with verb (such as 'change'), 50-character line
#
# body: 72-character wrapped. This should answer:
# * Why was this change necessary?
# * How does it address the problem?
# * Are there any side effects?
#
# footer:
# - Include a link to the issue.
# - BREAKING CHANGE
#
```

看完上面这些，你会不会像我一样感觉配置下来挺麻烦的，配置一个适合自己和团队使用的近乎完美的 commit 规范看来也不是一件容易的事情。不过社区也为我们提供了一些辅助工具来帮助进行提交，下面来简单介绍一下这些工具。

### 安装

commitizen 根据不同的adapter配置 commit message。例如，要使用 Angular 的 commit message 格式，可以安装cz-conventional-changelog。

```
# 需要同时安装commitizen和cz-conventional-changelog，后者是adapter
$ npm install -g commitizen cz-conventional-changelog
# 配置安装的adapter
$ echo '{ "path": "cz-conventional-changelog" }' > ~/.czrc
# 使用
$ git cz

```

本地项目安装:

```
# 安装commitizen
$ npm install --save-dev commitizen
# 接下来安装适配器
# for npm >= 5.2
$ npx commitizen init cz-conventional-changelog --save-dev --save-exact
# for npm < 5.2
$ ./node_modules/.bin/commitizen init cz-conventional-changelog --save-dev --save-exact

// package.json script字段中添加commit命令
"scripts": {
   "commit": "git-cz"
}
// use
$ npm run commit
```

### 参考文献

1. <https://mp.weixin.qq.com/s/8oWsj_ipp73crD_vg58LeQ>
