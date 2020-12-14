# PWA

## 前言

PWA(Progressive web apps, 渐进式Web应用)，它有什么优点呢？

可以生成桌面小图标，不需要打开浏览器，方便用户访问
通过网络缓存提升页面访问速度，达到渐进式的页面甚至离线访问，提升用户体验
实现类似app的推送功能，生成系统通知推送给用户
上面的这些优点足以让它吸引大量的开发者来探索和应用，毕竟对于web应用来说，用户体验才是检验web应用的好坏的至高标准，而PWA的这些优点恰恰是开发者在开发时一直追求的

### service worker

service worker是实现PWA的核心，service worker是一个独立的浏览器线程，不会对当前程序的执行线程造成阻塞，通过service worker可以实现页面离线访问、用户消息推送等功能

## 总结

### 参考文献

1. <https://github.com/vuejs/vue-docs-zh-cn/blob/master/vue-cli-plugin-pwa/README.md>
