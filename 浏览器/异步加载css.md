# 异步加载css

## 前言

### The simple answer (full browser support)

```html
<link rel="stylesheet" href="style.css" media="print" onload="this.media='all'">
```

### The documented answer (with optional preloading and script-disabled fallback)

```html
 <!-- Optional, if we want the stylesheet to get preloaded. Note that this line causes stylesheet to get downloaded, but not applied to the page. Use strategically — while preloading will push this resource up the priority list, it may cause more important resources to be pushed down the priority list. This may not be the desired effect for non-critical CSS, depending on other resources your app needs. -->
 <link rel="preload" href="style.css" as="style">

 <!-- Media type (print) doesn't match the current environment, so browser decides it's not that important and loads the stylesheet asynchronously (without delaying page rendering). On load, we change media type so that the stylesheet gets applied to screens. -->
 <link rel="stylesheet" href="style.css" media="print" onload="this.media='all'">

 <!-- Fallback that only gets inserted when JavaScript is disabled, in which case we can't load CSS asynchronously. -->
 // js 被禁止 onload 事件不会被执行，只有link标签会被加载 script 也不会执行下砸
 <noscript><link rel="stylesheet" href="style.css"></noscript>
```

### Preloading and async combined 预加载和异步组合

If you need preloaded and async CSS, this solution simply combines two lines from the documented answer above, making it slightly cleaner. But this won't work in Firefox until they support the preload keyword. And again, as detailed in the documented answer above, preloading may not actually be beneficial.

```html
<link href="style.css" rel="preload" as="style" onload="this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="style.css"></noscript>
```

### Additional considerations

Note that, in general, if you're going to load CSS asynchronously, it's generally recommended that you inline critical CSS, since CSS is a render-blocking resource for a reason.

Credit to filament group for their many async CSS solutions.

## 总结

### 参考文献

1. <https://stackoverflow.com/questions/32759272/how-to-load-css-asynchronously>
2. https://www.filamentgroup.com/lab/load-css-simpler/
