# MediaDevices.getUserMedia()

## 前言

```js
navigator.mediaDevices.getUserMedia(constraints)
.then(function(stream) {
  /* use the stream */
})
.catch(function(err) {
  /* handle the error */
});
```

getUserMedia() is a powerful feature which can only be used in secure contexts; in insecure contexts, navigator.mediaDevices is undefined, preventing access to getUserMedia(). A secure context is, in short, a page loaded using HTTPS or the file:/// URL scheme, or a page loaded from localhost.

In addition, user permission is always required to access the user's audio and video inputs. Only a window's top-level document context for a valid origin can even request permission to use getUserMedia(), unless the top-level context expressly grants permission for a given <iframe> to do so using Feature Policy. Otherwise, the user will never even be asked for permission to use the input devices.

getUserMedia 因为太过强大，以至于只能在安全的环境下使用， 在不安全的环境，浏览器， mediaDevices 是undefined，阻止访问 getUserMedia，

- HTTPS
- file:///  (file:///Users/lijiye/work/funny/css/box-sizing.html)
- localhost
- iframe 顶级document 给予 iframe 权限

```js
<iframe src="https://mycode.example.net/etc" allow="camera;microphone">
</iframe>
```

### mac Safari的问题

参考 `https://xiangyuecn.gitee.io/recorder/assets/ztest_apple_developer_forums_getusermedia.html`

safari 录第一遍好好地，第二遍就没有声音了，不知道是Safari对 record 做了权限限制，需要每次录音必须调用 navigator.mediaDevices.getUserMedia(constraints) 方法才能录音

### 一些注意点

1. mac 打开多个浏览器软件，Safari只有一个能正常录音，其他虽然很获取权限，但是没有声音，同一个浏览器多个标签页录音是没有问题
2. 手机录音接电话的异常处理
3. 微信录音兼容

## 总结

英文文档更完整

### 参考文献

1. <https://developer.mozilla.org/zh-CN/docs/Web/API/MediaDevices/getUserMedia>
2. <https://xiangyuecn.gitee.io/recorder/assets/ztest_apple_developer_forums_getusermedia.html>
