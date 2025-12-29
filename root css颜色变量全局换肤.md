# root

## 前言

颜色变量全局换肤的实践原理啊
参照bootstrap

### 用法

```css
:root {
  --first-color: #16f;
  --second-color: #ff7;
}

#firstParagraph {
  background-color: var(--first-color);
  color: var(--second-color);
}

#secondParagraph {
  background-color: var(--second-color);
  color: var(--first-color);
}

#container {
  --first-color: #290;
}

#thirdParagraph {
  background-color: var(--first-color);
  color: var(--second-color);
}
```

## 总结

### 参考文献

1. <https://developer.mozilla.org/en-US/docs/Web/CSS/>--*
