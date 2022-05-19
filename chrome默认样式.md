# 默认样式

## 前言

### required

Chrome独有的input标签中的required
在chrome浏览器中：

```css
<input type="text" value="" required>
```

input标签中如有required属性，如果内容为空，事件会被锁定到这个控件上。

### 表单会默认填充样式

```css
input:-webkit-autofill,
textarea:-webkit-autofill,
select:-webkit-autofill {
    /*覆盖背景颜色*/
    -webkit-box-shadow: 0 0 0px 1000px #e4e8f4 inset;
   /*字体颜色重置*/
    -webkit-text-fill-color: #c62222;
}
input[type=text]:focus, input[type=password]:focus, textarea:focus {
  -webkit-box-shadow: 0 0 0 1000px white inset;
}
```

## 总结

### 参考文献
1. https://lhajh.github.io/css/chrome/2018/04/17/The-chrome-browser-form-automatically-fills-in-the-default-style-autofill.html
