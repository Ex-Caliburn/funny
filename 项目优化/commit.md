# commitlint

## 前言

统一提交格式

 -e, --edit  read last commit message from the specified file or  fallbacks to ./.git/COMMIT_EDITMSG               [string]

### 步骤

npm install husky --save-dev

npx husky install

npx husky add .husky/commit-msg 'npx --no -- commitlint --edit "$1"'
npx husky add .husky/pre-push 'npx validate-branch-name'

已经废弃的方式
// .huskyrc.json (v4)
{
  "hooks": {
    "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
  }
}

### validate-branch-name

npm install validate-branch-name --save-dev

"validate-branch-name": {
"pattern": "^(master|develop){1}$|^(feat|feature|fix|hotfix|release)-.+$",
"errorMsg": "请规范提交分支命名"
}

## 总结

修改 .commitlintrc.js 需要先提交

### 参考文献

1. <https://github.com/conventional-changelog/commitlint/#what-is-commitlint>
2. <https://commitlint.js.org/#/reference-rules>
3. <https://baijiahao.baidu.com/s?id=1709025463570516506&wfr=spider&for=pc>
