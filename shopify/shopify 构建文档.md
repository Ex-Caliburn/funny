# 构建文档

## 安装

node v14.21+
优先使用 yarn
npm 总是会安装失败

### 运行

shopify-cli

登陆 可切换不同的环境

`shopify login --store ljy-test2.myshopify.com`

`shopify theme serve`

默认 development 环境，需修改 config 中 development 对应环境 theme_id

`theme watch`

注意：修改后直接同步代码到相应 theme_id 代码

`theme open` // 打开预览地址

缺点：无法本地预览

### 生成 dist 文件，打包压缩

`npm run build`

**生成 dist 文件夹,但是会忽略掉 locales 和 config 文件夹的下的内容,沿用线上**

### shopify-cli

会生成临时开发模板，模板存在时间有限，shopify 后台不可见，`theme get --list` 可见

默认端口 <http://127.0.0.1:9292>

`shopify theme serve --port=8080`

可以修改默认端口，修改后 checkout 页面就无法调试了

#### 其他命令

`shopify theme push --development`

在线上和测试环境生成 development 环境，这样`shopify theme serve` 运行速度更快

修改`settings_data.json`文件可以在本地预览生效，也会自动更新 development 环境的代码 不需要 `shopify theme push --development`

### theme-kit

设置路径 --dir

`theme watch --dir=dist`

也可以推送到测试环境再预览 -e

`theme watch -e=dev`

#### 快速发布

默认是 development

发布到多个环境 使用 --env 或者 -e 命令
`theme deploy --env=dev --env=production`

`theme download snippets/alternates.liquid -e=gl`

发布中的模板 --live

`theme download snippets/alternates.liquid -e=gl --live`

`theme deploy snippets/alternates.liquid -e=gl`

如果主题正在使用中 --allow-live

`theme deploy templates/customers/login.liquid -e=dev --allow-live`

-a 发布到所有配置文件里的环境

`theme deploy templates/customers/login.liquid -a --allow-live`

-n 不删除线上文件 --nodelete

`theme deploy templates/customers/login.liquid -e=dev --allow-live -n`

### 快速批量发版到预览环境

`--config` `-c` 制定 `config.yml` 的路径

`theme --help` 可以查看自己`config.yml`路径

```shell
theme deploy --dir=dist -a -n -c=config.preview.yml
```

```shell
theme deploy --dir=dist -a -n -c=config.ljy.yml
```

### 推送

设置目录 dir
`theme deploy --allow-live -e=qa --dir="dist" -n`

`theme deploy --dir="dist" -n -e=peru`

`theme deploy --dir="dist" -n --allow-live -e=dev -e=qa -e=gl -e=it -e=czech -e=fr -e=uk -e=ukr -e=es -e=de -e=rs -e=rus -e=pk -e=au -e=idn -e=mys -e=ph -e=co -e=peru -e=py -e=ca`

### 拉取推送配置文件

拉取目录
`theme download config locales --live -e=rus`

### 查看站点所有主题

`theme get --list -e=ph`

### 测试环境 tips

1. 查看 theme id，进入修改语言页面查看 url 比代码更快，或者直接审查元素
2. 复制比新建快，复制:命名规则 1.1，大版本+1
3. 命名加上`--nodelete` `-n` 不删除线上代码

### 危险操作

一定要仔细，因为是覆盖操作

1. theme-kit 轻易不要使用 `--allow-live`
2. shopify-cli 轻易不要使用 `--allow-live` `--live` `--publish`
3. 直接推送 locales 和 config/settings_data.json 到线上

### 发布管理

发布方式

- 直接上传 zip 文件，通过 git 仓库管理版本；工人繁琐
- 通过 github 链接文件；github 不安全
- shopify-cli push
- theme-kit deploy
- 模版>编辑>发布

theme-kit 和 shopify-cli 只能全覆盖，不能代码颗粒级别的 diff

#### 最佳实践

大版本改动，不直接推送线上分支，随时保留两个主要线上主题，交替发版；
小版本改动可以推送线上分支，通过 git 打 tag 快速回滚；

eg: 例如线上有两个分支： EC_ljy1.0 和 EC_ljy1.1, EC_ljy1.1 是正在发布的分支，把要发布的代码推送到 EC_ljy1.0，把 EC_ljy1.1 的 config/settings_data.json 和 locales/en.default.json(根据国家来)复制到 EC_ljy1.0 然后再执行 `模版>编辑>发布` 发布 ，万一出现问题，可快速回滚，上线期间要通知运营业务方不要修改模板

### 分支管理 githubflow

遵循敏捷开发流程

- `master` 线上分支
- `feat-` 版本分支
- `feat-<名字>` 自己的版本分支
- `bugfix-` 紧急 bug 修复分之

tag

- 大版本需求上线打 tag; eg: ljy_1.1
- 需求上线打 tag; eg: feat-<XXX>

<https://insights.thoughtworks.cn/real-agile-workflow-github-flow/>

[参考国内流程](https://wiki.corp.ljytech.com/pages/viewpage.action?pageId=99691848)

### liquid 文件后缀细节

{{template.name}}
eg： product.alternate.json > product

{{template.suffix }}

eg： product.alternate.json > alternate

{{page.handle }}

可能以下的值

- blogs
- articles
- collections
- pages
- products

{{page.template_suffix }}

eg： product.alternate.json > alternate

### 验收和测试

1. shopify 主题> 预览 > 底部 >分享预览 ；有时间限制
2. 无限制预览 <https://ca.online.com/?_ab=0&_fd=0&_sc=1&preview_theme_id=123938930827>

### Shopify 脚本和 Script Editor

- 订单商品脚本
- 发货脚本
- 付款脚本

1. Ruby 编程语言
2. 缺点不能自动化

### storelocator 海外门店

<https://storelocator.offlinesass.com/> 废弃
<https://storelocator.online.com/>

马来

<https://www.iswitchnow.com/>

theme deploy snippets/error.liquid assets/ljy-pages-verify-ljy-index.js sections/page-verify-ljy-part2.liquid -n -e=idn -c=config.preview.yml

### SEO

项目中各种类似下面的格式

```js
<script type="application/ld+json">
{
  "@context": "http://schema.org/",
   ...
</script>
```

<https://www.cnblogs.com/lijiaocn/p/10965585.html>

### 支付成功的标志

`https://online.co.uk/27079639137/orders/**`
`https://online.co.uk/27079639137/checkouts/**/thank_you`

`https://online.fr/25171591250/orders/**`
`https://online.fr/27079639137/checkouts/**/thank_you`

`https://uk.ljyvaping.com/66299396326/orders/**`
`https://uk.ljyvaping.com/66299396326/checkouts/**/thank_you`

### 集合页面

list-collections 使用模板
<https://ljytest3.myshopify.com/collections>

collections 使用模板
<https://ljytest3.myshopify.com/collections/all#ljy-essential>
<https://ljytest3.myshopify.com/collections/ljy-essential>

### 获取查询字符串

{%- assign page_url = content_for_header | split:'"pageurl":"' | last | split:'"' | first | split: request.host | last | replace:'\/','/' | replace:'%20',' ' | replace:'\u0026','&'  -%}
{% assign param = blank %}

{%- for i in (1..1) -%}

{%- unless page_url contains "?" -%}{% break %}{%- endunless -%}
{%- assign query_string = page_url | split:'?' | last -%}
{%- assign qry_parts= query_string | split:'&' -%}

{%- for part in qry_parts -%}
{%- assign key_and_value = part | split:'=' -%}
{%- if key_and_value.size > 1 -%}
{% if key_and_value[0] == 'param' %}
{% assign param = key_and_value[1] %}
{% endif %}
{%- endif -%}
{%- endfor -%}
{%- endfor -%}

### sensors

stretched-link 点击又发送数据，但是不会被热力图收集

### 参考文献

1. <https://shopify.dev/themes/tools/cli/core-commands>
2. <https://shopify.dev/themes/tools/theme-kit/command-reference#new>
3. <https://shopify.dev/api/liquid/objects/template#template-name>
4. <https://help.shopify.com/zh-CN/manual/checkout-settings/script-editor?shpxid=df0e521d-008B-42E4-C682-1C529673F5E6>
