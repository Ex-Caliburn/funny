# performace

## 前言

Performance 接口可以获取到当前页面中与性能相关的信息。它是 High Resolution Time API 的一部分，同时也融合了 Performance Timeline API、Navigation Timing API、 User Timing API 和 Resource Timing API。

该类型的对象可以通过调用只读属性 Window.performance 来获得。

注意：除了以下指出的情况外，该接口及其成员在 Web Worker 中可用。此外，还需注意，performance 的创建和衡量都是同一环境下的。即，如果你在主线程（或者其他 worker）中创建了一个 performance，那么它在另外的 worker 线程中是不可用的；反之亦然。

### 属性

Performance.navigation 只读
PerformanceNavigation 对象提供了在指定的时间段里发生的操作相关信息，包括页面是加载还是刷新、发生了多少次重定向等等。Not available in workers.

Performance.timing 只读
PerformanceTiming 对象包含延迟相关的性能信息, 。Not available in workers.

performance.memory
其是 Chrome 添加的一个非标准扩展，这个属性提供了一个可以获取到基本内存使用情况的对象。不应该使用这个非标准的 API。

Performance.timeOrigin 只读
返回性能测量开始时的时间的高精度时间戳。

onresourcetimingbufferfull方法，它是一个在resourcetimingbufferfull事件触发时会被调用的event handler。
Internet Explorer Opera Safari (WebKit) 不支持
这个事件当浏览器的资源时间性能缓冲区已满时会触发。可以通过监听这一事件触发来预估页面crash，统计页面crash概率，以便后期的性能优化，如下示例所示：

```
function buffer_full(event) {
  console.log("WARNING: Resource Timing Buffer is FULL!");
  performance.setResourceTimingBufferSize(200);
}
function init() {
  // Set a callback if the resource buffer becomes filled
  performance.onresourcetimingbufferfull = buffer_full;
}
<body onload="init()">
```

### 方法

Performance.clearMarks()
将给定的 mark 从浏览器的性能输入缓冲区中移除。

Performance.clearMeasures()
将给定的 measure 从浏览器的性能输入缓冲区中移除。

Performance.mark()
根据给出 name 值，在浏览器的性能输入缓冲区中创建一个相关的timestamp

Performance.measure()
在浏览器的指定 start mark 和 end mark 间的性能输入缓冲区中创建一个指定的 timestamp

Performance.now()
返回一个表示从性能测量时刻开始经过的毫秒数 DOMHighResTimeStamp

#### Performance.mark()

```javascript

// 创建一些标记。
performance.mark("squirrel");
performance.mark("squirrel");
performance.mark("monkey");
performance.mark("monkey");
performance.mark("dog");
performance.mark("dog");

// 获取所有的 PerformanceMark 条目。
const allEntries = performance.getEntriesByType("mark");
console.log(allEntries.length);
// 6

// 获取所有的 "monkey" PerformanceMark 条目。
const monkeyEntries = performance.getEntriesByName("monkey");
console.log(monkeyEntries.length);
// 2

// 删除所有标记。
performance.clearMarks();
```

#### Performance.measure()

```javascript
 performance.mark('mySetTimeout-start')

      // 等待一些时间。
      setTimeout(function () {
        // 标志时间的结束。
        performance.mark('mySetTimeout-end')

        // 测量两个不同的标志。
        performance.measure('mySetTimeout', 'mySetTimeout-start', 'mySetTimeout-end')

        // 获取所有的测量输出。
        // 在这个例子中只有一个。
        var measures = performance.getEntriesByName('mySetTimeout')
        var measure = measures[0]
        console.log('setTimeout milliseconds:', measure.duration)

        // 清除存储的标志位
        performance.clearMarks()
        performance.clearMeasures()
      }, 1000)
```

#### Performance.now()

这个时间戳实际上并不是高精度的。为了降低像Spectre这样的安全威胁，各类浏览器对该类型的值做了不同程度上的四舍五入处理。（Firefox从Firefox 59开始四舍五入到2毫秒精度）一些浏览器还可能对这个值作稍微的随机化处理。这个值的精度在未来的版本中可能会再次改善；浏览器开发者还在调查这些时间测定攻击和如何更好的缓解这些攻击。

Note: 此特性在 Web Worker 中可用。
返回值表示为从time origin之后到当前调用时经过的时间

牢记如下几点:

- 在以Window上下文创建各个worker中，performance.now()的值要比在创建这些worker的window中的小。它原来等于main上下文的t0，但是现在不是了。
- 在共享worker或服务worker中，在worker中的值可能要比main上下文中高，因为window对象可能在这些worker之后创建。

```javascript
let t0 = window.performance.now();
doSomething();
let t1 = window.performance.now();
```

console.log("doSomething函数执行了" + (t1 - t0) + "毫秒.")
和JavaScript中其他可用的时间类函数（比如Date.now）不同的是，window.performance.now()返回的时间戳没有被限制在一毫秒的精确度内，而它使用了一个浮点数来达到微秒级别的精确度。

另外一个不同点是，window.performance.now()是以一个恒定的速率慢慢增加的，它不会受到系统时间的影响（可能被其他软件调整）。另外，performance.timing.navigationStart + performance.now() 约等于 Date.now()。

### entryType

The entryType  返回一个代表performance metric 类型的DOMString , 例如被performance.mark("begin") 所创建的entry 的entryType 就是 "mark". 此属性只读.

| 值 | 子类 | Type of name property | Description of name property |
| :-----| ----: | ----: | :----: |
|frame, navigation| navigation PerformanceFrameTiming, PerformanceNavigationTiming  |URL |文档地址 |
| resource| PerformanceResourceTiming |URL | 请求资源已解析url，请求重定向值不会改变 |
| mark| PerformanceMark | DOMString | 使用 performance.mark() 创建  mark 时 |
| measure| PerformanceMeasure | DOMString | 使用 performance.measure() 创建  measure 时|
| paint| PerformancePaintTiming | DOMString | 'first-paint' or 'first-contentful-paint' |

### PerformanceObserver

PerformanceObserver，是浏览器内部对Performance实现的观察者模式，即： 当有性能数据产生时，主动通知你。

这解决了我们之前的问题：

重复轮训
轮巡时不断判断，这个数据是新产生的，还是以前的
可能其他数据的消费者也需要操作数据

监测页面FP，FCP

```javascript
// 定义一个观察者
const observer = new PerformanceObserver(list => {
    list.getEntries().forEach((entry) => {
        console.log('entry对象', entry);
    });
});
// 观察的类型
observer.observe({
    entryTypes: ['paint']
});
```

关于 entryTypes, 可以取如下值：

frame：event-loop 时的每一帧
navigation：导航
resource：资源
mark: 打点，得到一个时间戳
measure：在两个点之间测量
paint：绘制
longtask(好像只有 chrome支持)：任何在浏览器中执行超过 50 ms 的任务，都是 long task

### 示例

avigation entry 对象里能拿到相关的数据有

这里完整地描述了一个 页面 呈现的完整流程。 拿到每个时间点可以进行分析每个区间的时间耗费。

```javascript
let t = entry
console.log('DNS查询耗时 ：' + (t.domainLookupEnd - t.domainLookupStart).toFixed(0))
console.log('TCP链接耗时 ：' + (t.connectEnd - t.connectStart).toFixed(0))
console.log('request请求耗时 ：' + (t.responseEnd - t.responseStart).toFixed(0))
console.log('解析dom树耗时 ：' + (t.domComplete - t.domInteractive).toFixed(0))
console.log('白屏时间 ：' + (t.responseStart - t.navigationStart).toFixed(0))
console.log('domready时间 ：' + (t.domContentLoadedEventEnd - t.navigationStart).toFixed(0))
console.log('onload时间 ：' + (t.loadEventEnd - t.navigationStart).toFixed(0))
```

## 总结

vue用到了performance，计算时间，比 Date.now()和 console.Time('start')/console.endTime('start') 时间更精准，到微秒级别

### 参考文献

1. <https://juejin.im/post/5df3575751882512302db3d5#heading-5>
2. <https://wiki.developer.mozilla.org/zh-CN/docs/Web/API/Performance>
3. <https://www.w3.org/TR/user-timing-2/#user-timing>
4. <https://developer.mozilla.org/zh-CN/docs/Web/API/Long_Tasks_API>
5. <https://developer.mozilla.org/zh-CN/docs/Web/API/Performance/onresourcetimingbufferfull>
