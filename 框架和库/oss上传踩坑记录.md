# oss 上传

## 前言

按顺序来，不要一口吃成一个胖子

### 安全

浏览器环境是不安全的
为了安全优先使用sts，获取临时token，然后上传

### 不支持分片

使用ali-oss

普通的demo 不支持分片

### cors

- 将来源设置成*，确认该配置项无误。如果设置成*后可以成功上传，说明是之前的来源配置错误，请根据规则认真检查。
- 依次选择允许 Methods的全部选项，即GET、PUT、DELETE、POST、HEAD，确认该配置项目无误。
- 将允许 Headers配置成*，确认该配置无误。如果设置后可以正常调用，说明之前的允许 Headers配置错误，请根据规则认真检查。
- 将暴露 Headers设置为ETag和x-oss-request-id，确认该项配置无误。如果设置后可以正常调用，说明之前的暴露 Headers配置错误，请根据规则认真检查。

<https://www.alibabacloud.com/help/zh/object-storage-service/latest/cors-error-diagnosis>

https://www.alibabacloud.com/help/zh/oss/the-no-access-control-allow-origin-error-message-is-still-reported-when-you-call-oss-after-setting-cross-domain-rules

### 断点续传

 可以将checkpoint保存到浏览器的localstorage，下次再调用的时候传入checkpoint参数，就可以实现断点续传功能。

### TypeError: Cannot read properties of undefined (reading 'x-oss-request-id')

名字不支持中文，必须encodeURIComponent
'Content-Disposition': encodeURIComponent(req.file.name),

### Object命名规则

使用UTF-8编码。
长度必须在1~1023字符之间。
不能以正斜线（/）或者反斜线（\）字符开头。

### 大小限制

简单上传的Object的大小不能超过5 GB。超过5 GB的Object上传请使用分片上传。

### localhost

localhost上传文件，返回的文件地址是http，https是https，但是https可以访问

### 自动下架

        'Content-Disposition': `attachment;filename=${encodeURIComponent(req.file.name)}`

## 总结

### 参考文献
