# GA

## 前言

GA 需要翻墙才能发送，所以是不准的

### vue

```js
let TAG_ID
if (process.env.NODE_ENV === 'production') {
  TAG_ID = 'G-JEWQ59Y9DH'
} else {
  TAG_ID = 'G-MYC2XNS1GM'
}

var script = document.createElement('script')
script.src = `https://www.googletagmanager.com/gtag/js?id=${TAG_ID}`
document.body.appendChild(script)
window.dataLayer = window.dataLayer || []
function gtag() {
  dataLayer.push(arguments)
}
gtag('js', new Date())

gtag('config', TAG_ID)

window.gtag = gtag

router.afterEach((to, from) => {
  console.log('afterEach', to, from)
  if (window.gtag) {
    window.gtag('set', {
      page_title: to.name,
      user_id: store.getters.userName,
    })
    window.gtag('event', 'page_view', {
      page_location: to.fullPath,
      page_referrer: from.fullPath,
    })
  }
})
```

## 总结

### 参考文献
