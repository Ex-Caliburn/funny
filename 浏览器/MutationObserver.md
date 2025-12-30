# MutationObserver

## 前言

MutationObserver接口提供了监视对DOM树所做更改的能力。它被设计为旧的Mutation Events功能的替代品，该功能是DOM3 Events规范的一部分。

### 构造函数 MutationObserver()

创建并返回一个新的 MutationObserver 它会在指定的DOM发生变化时被调用。

### 方法

disconnect()
阻止 MutationObserver 实例继续接收的通知，直到再次调用其observe()方法，该观察者对象包含的回调函数都不会再被调用。

#### observe()

配置MutationObserver在DOM更改匹配给定选项时，通过其回调函数开始接收通

当调用 observe() 方法时，childList，attributes 或者 characterData 三个属性之中，至少有一个必须为 true，否则会抛出 TypeError 异常。

attributeFilter 可选
要监视的特定属性名称的数组。如果未包含此属性，则对所有属性的更改都会触发变动通知。无默认值。

attributeOldValue  可选
当监视节点的属性改动时，将此属性设为 true 将记录任何有改动的属性的上一个值。有关观察属性更改和值记录的详细信息，详见Monitoring attribute values in MutationObserver。无默认值。

attributes  可选
设为 true 以观察受监视元素的属性值变更。默认值为 false。

characterData  可选
设为 true 以监视指定目标节点或子节点树中节点所包含的字符数据的变化。无默认值。

characterDataOldValue  可选
设为 true 以在文本在受监视节点上发生更改时记录节点文本的先前值。详情及例子，请查看 Monitoring text content changes in MutationObserver。无默认值。

childList 可选
设为 true 以监视目标节点（如果 subtree 为 true，则包含子孙节点）添加或删除新的子节点。默认值为 false。

subtree  可选
设为 true 以将监视范围扩展至目标节点整个节点树中的所有节点。MutationObserverInit 的其他值也会作用于此子树下的所有节点，而不仅仅只作用于目标节点。默认值为 false。

### demo

```js
// 选择需要观察变动的节点
const targetNode = document.getElementById('some-id');

// 观察器的配置（需要观察什么变动）
const config = { attributes: true, childList: true, subtree: true };

// 当观察到变动时执行的回调函数
const callback = function(mutationsList, observer) {
    // Use traditional 'for loops' for IE 11
    for(let mutation of mutationsList) {
        if (mutation.type === 'childList') {
            console.log('A child node has been added or removed.');
        }
        else if (mutation.type === 'attributes') {
            console.log('The ' + mutation.attributeName + ' attribute was modified.');
        }
    }
};

// 创建一个观察器实例并传入回调函数
const observer = new MutationObserver(callback);

// 以上述配置开始观察目标节点
observer.observe(targetNode, config);

// 之后，可停止观察
observer.disconnect();
```

vue使用做 任务队列执行的兼容,promise 的后退方案

```js
    function flushCallbacks () {
        // ...执行
        console.log('flushCallbacks')
    }

    var counter = 1;
    var observer = new MutationObserver(flushCallbacks);
    var textNode = document.createTextNode(String(counter));
    observer.observe(textNode, {
      characterData: true
    });
    textNode.data = String(2);
```

## 总结

MutationObserver  `微任务`的一种

### 参考文献

1. <https://developer.mozilla.org/zh-CN/docs/Web/API/MutationObserverInit>
