# 从addEventListener理解冒泡和捕获，事件委派, preventDefault, stopPropagation

捕获 => 目标 => 冒泡
先从上之下，从document 往下直至到目标， 触发事件注册的事件或者默认行为 ，然后冒泡，到最顶部，这是最基本的模型

## addEventListener  

```javascript

target.addEventListener(type, listener, options);
target.addEventListener(type, listener, useCapture);
target.addEventListener(type, listener, useCapture, wantsUntrusted  );  // Gecko/Mozilla only
最后一个 只有 Gecko/Mozilla 支持，不讨论
```

type： 事件类型

listener：事件触发时的回调函数

options：一个指定有关 listener 属性的可选参数对象。可用的选项如下：

- capture:  Boolean，表示 listener 会在该类型的事件捕获阶段传播到该 EventTarget 时触发。
- once:  Boolean，表示 listener 在添加之后最多只调用一次。如果是 true， listener 会在其被调用之后自动移除。
- passive: Boolean，设置为true时，表示 listener 永远不会调用 preventDefault()。如果 listener 仍然调用了这个函数，客户端将会忽略它并抛出一个控制台警告。

useCapture: 在DOM树中，注册了listener的元素， useCapture的值决定是否要先于它下面的EventTarget调用该listener.

- 当useCapture(设为true) 时，沿着DOM树向上冒泡的事件，不会触发listener. 在目标阶段的事件会触发该元素（即事件目标）上的所有监听器，而不在乎这个监听器到底在注册时useCapture 参数值是true还是false。

### 测试和验证

```html
<html lang="en">
<head>
 <meta charset="UTF-8">
 <style>
  .outer, .middle, .inner1, .inner2 {
   display: block;
   width: 520px;
   padding: 15px;
   margin: 15px;
   text-decoration: none;
      box-sizing: border-box;
  }

  .outer {
   border: 1px solid red;
   color: red;
  }

  .middle {
   border: 1px solid green;
   color: green;
   width: 460px;
  }

  .inner1, .inner2 {
   border: 1px solid purple;
   color: purple;
   width: 400px;
  }
 </style>
</head>
<body>
<div class="wrap">
  wrap
  <div class="outer">
    outer
    <div class="middle">
    middle
    <div class="inner1" >
      inner1
    </div>
    <a class="inner2" href="https://developer.mozilla.org/" target="_blank">
      inner2
    </a>
    </div>
  </div>
  </div>

<script>
  let wrap = document.getElementsByClassName('wrap') [0]
  let outer = document.getElementsByClassName('outer') [0]
  let middle = document.getElementsByClassName('middle')[0]
  let inner1 = document.getElementsByClassName('inner1')[0]
  let inner2 = document.getElementsByClassName('inner2')[0]
  let capture = {
    capture: true
  }
  let noneCapture = {
    capture: false
  }
  let once = {
    once: true
  }
  let noneOnce = {
    once: false
  }
  let passive = {
    passive: true
  }
  let nonePassive = {
    passive: false
  }
<script>
 </body>
```

1. 没有添加任何参数 点击内部元素，addEventListener 事件是在冒泡时触发，从目标元素触发回调然后往上冒泡

```javascript
wrap.addEventListener('click', () => console.log('wrap'))
outer.addEventListener('click', () => console.log('outer'))
middle.addEventListener('click', () => console.log('middle'))
inner1.addEventListener('click', () => console.log('inner1'))
 //点击inner1 输出 inner1 > middle > outer > wrap 冒泡过程

wrap.addEventListener('click', () => console.log('capture wrap'),capture)
outer.addEventListener('click', () => console.log('capture outer'),capture)
middle.addEventListener('click', () => console.log('capture middle'),capture)
inner1.addEventListener('click', () => console.log('capture inner1'),capture)
 //点击inner1 输出 wrap > outer > middle > inner1   捕获过程
```

2. 使用useCapture 在目标本身无有任何影响,和添加事件的顺序有关

```javascript
inner1.addEventListener('click', () => console.log('inner1 capture'), capture)
inner1.addEventListener('click', () => console.log('inner1 '))
 //点击inner1 输出  inner1 capture > inner1
inner1.addEventListener('click', () => console.log('inner1 '))
inner1.addEventListener('click', () => console.log('inner1 capture'), capture)
 //点击inner1 输出  inner1  > inner1 capture
```

3. 触发useCapture

```javascript
middle.addEventListener('click', () => console.log('capture middle 1'),capture)
middle.addEventListener('click', () => console.log('capture middle 2'), true)
// true 等同于 { capture: true }
```

4. once 只触发一次，之后移除

```javascript

inner1.addEventListener('click', () => console.log('inner1 once'), once)

 //多次点击inner1 只会输出一次  inner1 once

```

5. passive: true, 表示 listener 永远不会调用 preventDefault()。如果 listener 仍然调用了这个函数，客户端将会忽略它并抛出一个控制台警告

```javascript
inner1.addEventListener(
        'click',
        (e) => {
          e.preventDefault()
          console.log('inner1')
        },
        passive
      )
      // Unable to preventDefault inside passive event listener invocation.
```

6. inner2 设置了 preventDefault() 单独只设置这个， 会阻止默认事件 inner 跳转

```javascript
inner2.addEventListener(
        'click',
        (e) => {
          e.preventDefault()
          console.log('inner2')
        }
      )
```
  
7. 如果同时设置了 preventDefault() 和 passive true，会提示报错，但preventDefault()失效,可以跳转

```javascript
inner2.addEventListener(
        'click',
        (e) => {
          e.preventDefault()
          console.log('inner2')
        }
      )
```
  
鼠标滚动事件和页面滑动事件 这个事件最好设置为true，如 scroll你设置false， 你也无法阻止滚动, touchmove 可以阻止

## preventDefault

e.preventDefault() 和 returnValue = 0 作用相同
returnValue 不在任何规范内，已废弃

此事件还是继续传播，除非碰到事件侦听器调用stopPropagation() 或stopImmediatePropagation()，才停止传播

在事件流的任何阶段调用preventDefault()都会取消事件，这意味着任何通常被该实现触发并作为结果的默认行为都不会发生。

```javascript

wrap.addEventListener(
        'click',
        (e) => {
          e.preventDefault()
          console.log('wrap')
        },
      )
      inner2.addEventListener(
        'click',
        (e) => {
          console.log('inner2')
        }
      )
      // inner2  > wrap  a标签跳转都失效,冒泡inner2的祖先addEventListener的事件还是会触发
```

你可以使用 Event.cancelable 来检查该事件是否支持取消。为一个不支持cancelable的事件调用preventDefault()将没有效果。

## stopPropagation

如何阻止阻止捕获和冒泡阶段中当前事件的继续传播呢？

接上述 如果在 inner1添加  e.stopPropagation, 事件将不再冒泡，就是停止传播， 后面的 preventDefault()将不会生效，无法阻止默认事件，本身添加了 preventDefault()可以阻止默认事件，下面有一中例外.

```javascript

wrap.addEventListener(
        'click',
        (e) => {
          e.preventDefault()
          console.log('wrap')
        },
      )
      inner2.addEventListener(
        'click',
        (e) => {
          e.stopPropagation()
          //  e.preventDefault() 可以阻止a标签跳转
          console.log('inner2')
        }
      )
      // inner2   a标签跳转成功,冒泡inner2的祖先addEventListener的事件不会触发
```

如果在 middle 添加 capture: true; preventDefault()  点击inner2 也触发middle绑定的函数， inner2手动绑定的事件触发 ，但阻止inner2的默认事件，

```javascript

wrap.addEventListener(
        'click',
        (e) => {
          e.preventDefault()
          console.log('wrap')
        },
      )
      middle.addEventListener(
        'click',
        (e) => {
          e.preventDefault()
          console.log('middle')
        },
        true
      )
      inner2.addEventListener(
        'click',
        (e) => {
          e.stopPropagation()
          console.log('inner2')
        }
      )
      // middle > inner2    a标签跳转都失败,冒泡inner2的祖先addEventListener的事件不会触发
```

如果在 middle 添加 capture: true; preventDefault()，e.stopPropagation  点击inner2 触发middle绑定的函数 inner2手动绑定的事件和默认事件都不触发

```javascript

wrap.addEventListener(
        'click',
        (e) => {
          e.preventDefault()
          console.log('wrap')
        },
      )
      middle.addEventListener(
        'click',
        (e) => {
          e.preventDefault()
          e.stopPropagation()
          console.log('middle')
        },
        true
      )
      inner2.addEventListener(
        'click',
        (e) => {
          e.stopPropagation()
          console.log('inner2')
        }
      )
      // middle     a标签跳转都失败,冒泡inner2的祖先addEventListener的事件不会触发
```

## stopImmediatePropagation

事件是按顺序添加的，触发也是按顺序，stopPropagation 无法阻止同一个元素上多个事件触发
stopImmediatePropagation可以

```javascript
      wrap.addEventListener(
        'click',
        (e) => {
          console.log('wrap')
        },
      )
      middle.addEventListener(
        'click',
        (e) => {
          console.log('middle 1')
        },
      )
      middle.addEventListener(
        'click',
        (e) => {
        // e.stopPropagation()
        e.stopImmediatePropagation()
          console.log('middle 2')
        },
      )
      middle.addEventListener(
        'click',
        (e) => {
          console.log('middle 3')
        },
      )
      // stopPropagation 只会触发 1，2, 3
      // stopImmediatePropagation 只会触发 1，2, 跟添加顺序有关
```

如果有多个相同类型事件的事件监听函数绑定到同一个元素，当该类型的事件触发时，它们会按照被添加的顺序执行。如果其中某个监听函数执行了 event.stopImmediatePropagation() 方法，则当前元素剩下的监听函数将不会被执行

## addEventListener 优点

addEventListener() 是 W3C DOM 规范中提供的注册事件监听器的方法。它的优点包括：

它允许给一个事件注册多个监听器。 特别是在使用AJAX库，JavaScript模块，或其他需要第三方库/插件的代码。
它提供了一种更精细的手段控制 listener 的触发阶段。（即可以选择捕获或者冒泡）。
它对任何 DOM 元素都是有效的，而不仅仅只对 HTML 元素有效。

报错不会阻止事件的传播，有专门事件监听处理

## 移除 addEventListener

addEventListener 之后最好移除 removeEventListener
但是，真正影响内存的并不是没有保持函数引用，而是没有保持 静态 函数引用。在下面的两个示例中，每一个循环都重新定义了一个函数，并且保持了函数引用，但是并不是动态的函数引用。第三个示例中，在每次循环中都重新将赋值了一个匿名函数的引用。第四个示例，函数定义始终没有改变，但是依然是非静态的，因为每次都重新定义了函数（除非被编译器变量[[提升]]）。尽管表现上看起来很好理解（[[重复添加相同的事件监听]]），但是每次循环都是将事件处理函数指向了一个唯一的新创建的函数的引用。同时，因为函数定义本身没有改变，每次触发事件监听器时调用的还是同一个方法（特别是在经过优化的代码中）。

在这两个示例中，每次循环都会重复定义函数并保持函数引用，所以上面的移除语句也可以移除对应的监听器，但是只能移除最后一个。

```javascript

// 在同一个dom上绑定多个事件
// Case 3
for(var i=0, j=0 ; i<els.length ; i++){
  els[j].addEventListener("click", processEvent = function(e){/*do something*/}, false);
}

// Case 4
for(var i=0, j=0 ; i<els.length ; i++){
  function processEvent(e){/*do something*/};
  els[j].addEventListener("click", processEvent, false);
}
```

## 使用 passive 改善的滚屏性能

根据规范，passive 选项的默认值始终为false。但是，这引入了处理某些触摸事件（以及其他）的事件监听器在尝试处理滚动时阻止浏览器的主线程的可能性，从而导致滚动处理期间性能可能大大降低。

为防止出现此问题，某些浏览器（特别是Chrome和Firefox）已将touchstart和touchmove事件的passive选项的默认值更改为true文档级节点 Window，Document和Document.body。这可以防止调用事件监听器，因此在用户滚动时无法阻止页面呈现。

```javascript
var elem = document.getElementById('elem');
elem.addEventListener('touchmove', function listener() { /*do something*/ }, { passive: true });
```

添加passive参数后，touchmove事件不会阻塞页面的滚动（同样适用于鼠标的滚轮事件）

注意：那些不支持参数options的浏览器，会把第三个参数默认为useCapture，即设置useCapture为true

您可以通过将passive的值显式设置为false来覆盖此行为，如下所示：

```javascript

/*Feature detection*/
/*特诊检测*/
var passiveIfSupported = false;

try {
  window.addEventListener("test", null, Object.defineProperty({}, "passive", { get: function() { passiveIfSupported = { passive: true }; } }));
} catch(err) {}

window.addEventListener('scroll', function(event) {
  /*do something*/
  // can't use event.preventDefault();
  // 不能使用event.preventDefault.
}, passiveIfSupported );
```

在不支持addEventListener()的options参数的旧浏览器上，尝试使用它会阻止使用useCapture参数而不正确使用特征检测。

您无需担心基本scroll 事件的passive值。由于无法取消，因此事件监听器无法阻止页面呈现。

### 总结

事件委派：利用事件冒泡的机制，事件最终都会冒泡到祖先元素，只需要给祖先绑定事件就可以监听所有子元素的事件

1. 不用一个个去给dom绑定事件，提升性能，而且后续插入的dom也不要去绑定事件，当一个甩手掌柜
2. 简洁代码
  
### 参考文献

1. <https://developer.mozilla.org/zh-CN/docs/Web/API/EventTarget/addEventListener>
2. <https://developer.mozilla.org/zh-CN/docs/Web/API/Event/preventDefault>
3. <https://developer.mozilla.org/zh-CN/docs/Web/API/Event/stopPropagation>
4. <https://developer.mozilla.org/zh-CN/docs/Web/API/Event/stopImmediatePropagation>
5. <https://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-flow-capture>
