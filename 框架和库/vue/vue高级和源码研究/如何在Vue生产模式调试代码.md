# 如何在Vue生产模式调试代码

## 前言

### document.querySelector

首先找到 想要调试的组件对应的Dom, 一般是这个样子

```html
<div data-v-45f694dc class="create">
  <div data-v-45f694dc></div>
  <div data-v-45f694dc></div>
</div>
```

在浏览器控制台输入

document.querySelector('[data-v-45f694dc]').__vue__
注意： data-v-45f694dc 对应 Dom里面的data-v-45f694dc， 你找到的肯定和这样不一样。

有了这个组件对象，然后就可以各种Hack了。

### 使用$0命令

一旦我们选择了元素，就可以在控制台中输入$0,$0表示最后选择的元素。$1是之前选择的元素,依此类推.它记得最后五个元素$0 – $4.

要查看Vue实例的详细信息，可以使用 $0.__vue__。

## 总结

### 参考文献
