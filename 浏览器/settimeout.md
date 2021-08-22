# setTimeout

## 前言

IPC（Inter-Process Communication，进程间通信）。进程间通信是指两个进程的数据之间产生交互

所以说要执行一段异步任务，需要先将任务添加到消息队列中。不过通过定时器设置回调函数有点特别，它们需要在指定的时间间隔内被调用，但消息队列中的任务是按照顺序执行的，所以为了保证回调函数能在指定时间内执行，你不能将定时器的回调函数直接添加到消息队列中。那么该怎么设计才能让定时器设置的回调事件在规定时间内被执行呢？你也可以思考下，如果让你在消息循环系统的基础之上加上定时器的功能，你会如何设计？

### 具体实现

源码中延迟执行队列的定义如下所示：

```js
DelayedIncomingQueue delayed_incoming_queue;
```

当通过 JavaScript 调用 setTimeout 设置回调函数的时候，渲染进程将会创建一个回调任务，包含了回调函数 showName、当前发起时间、延迟执行时间，其模拟代码如下所示：

```js
struct DelayTask{
  int64 id；
  CallBackFunction cbf;
  int start_time;
  int delay_time;
};
DelayTask timerTask;
timerTask.cbf = showName;
timerTask.start_time = getCurrentTime(); //获取当前时间
timerTask.delay_time = 200;//设置延迟执行时间
```

创建好回调任务之后，再将该任务添加到延迟执行队列中，代码如下所示：

```js
delayed_incoming_queue.push(timerTask)；
```

现在通过定时器发起的任务就被保存到延迟队列中了，那接下来我们再来看看消息循环系统是怎么触发延迟队列的。

```js
void ProcessTimerTask(){
  //从delayed_incoming_queue中取出已经到期的定时器任务
  //依次执行这些任务
}

TaskQueue task_queue；
void ProcessTask();
bool keep_running = true;
void MainTherad(){
  for(;;){
    //执行消息队列中的任务
    Task task = task_queue.takeTask();
    ProcessTask(task);

    //执行延迟队列中的任务
    ProcessDelayTask()

    if(!keep_running) //如果设置了退出标志，那么直接退出线程循环
        break; 
  }
}
```

从上面代码可以看出来，我们添加了一个 ProcessDelayTask 函数，该函数是专门用来处理延迟执行任务的。这里我们要重点关注它的执行时机，在上段代码中，处理完消息队列中的一个任务之后，就开始执行 ProcessDelayTask 函数。ProcessDelayTask 函数会根据发起时间和延迟时间计算出到期的任务，然后依次执行这些到期的任务。等到期的任务执行完成之后，再继续下一个循环过程。通过这样的方式，一个完整的定时器就实现了。

设置一个定时器，JavaScript 引擎会返回一个定时器的 ID。那通常情况下，当一个定时器的任务还没有被执行的时候，也是可以取消的，具体方法是调用 clearTimeout 函数，并传入需要取消的定时器的 ID。如下面代码所示：

```js
clearTimeout(timer_id)
```

其实浏览器内部实现取消定时器的操作也是非常简单的，就是直接从 delayed_incoming_queue 延迟队列中，通过 ID 查找到对应的任务，然后再将其从队列中删除掉就可以了。

### 注意事项

#### 如果 setTimeout 存在嵌套调用，那么系统会设置最短时间间隔为 4 毫秒

function cb() { setTimeout(cb, 0); }setTimeout(cb, 0);

![alt](https://static001.geekbang.org/resource/image/cb/cd/cbb3b2b1ac8eb4752a585df5445412cd.png)

上图中的竖线就是定时器的函数回调过程，从图中可以看出，前面五次调用的时间间隔比较小，嵌套调用超过五次以上，后面每次的调用最小时间间隔是 4 毫秒。之所以出现这样的情况，是因为在 Chrome 中，定时器被嵌套调用 5 次以上，系统会判断该函数方法被阻塞了，如果定时器的调用时间间隔小于 4 毫秒，那么浏览器会将每次调用的时间间隔设置为 4 毫秒。下面是Chromium 实现 [Chromium 实现 4 毫秒延迟](https://source.chromium.org/chromium/chromium/src/+/master:third_party/blink/renderer/core/frame/dom_timer.cc;l=49)的代码，你可以看下：

```C
static const int kMaxTimerNestingLevel = 5;

// Chromium uses a minimum timer interval of 4ms. We'd like to go
// lower; however, there are poorly coded websites out there which do
// create CPU-spinning loops.  Using 4ms prevents the CPU from
// spinning too busily and provides a balance between CPU spinning and
// the smallest possible interval timer.
static constexpr base::TimeDelta kMinimumInterval = base::TimeDelta::FromMilliseconds(4);

base::TimeDelta interval_milliseconds =
      std::max(base::TimeDelta::FromMilliseconds(1), interval);

  if (interval_milliseconds < kMinimumInterval &&
      nesting_level_>= kMaxTimerNestingLevel)
    interval_milliseconds = kMinimumInterval;

  if (single_shot)
    StartOneShot(interval_milliseconds, FROM_HERE);
  else
    StartRepeating(interval_milliseconds, FROM_HERE);
```

所以，一些实时性较高的需求就不太适合使用 setTimeout 了，比如你用 setTimeout 来实现 JavaScript 动画就不是一个很好的主意。

#### 未激活的页面，setTimeout 执行最小间隔是 1000 毫秒

未激活的页面，setTimeout 执行最小间隔是 1000 毫秒除了前面的 4 毫秒延迟，还有一个很容易被忽略的地方，那就是未被激活的页面中定时器最小值大于 1000 毫秒，也就是说，如果标签不是当前的激活标签，那么定时器最小的时间间隔是 1000 毫秒，目的是为了优化后台页面的加载损耗以及降低耗电量。这一点你在使用定时器的时候要注意。

用Performance可以看，你切换标签，会自动停止Performance检测

#### 延时执行时间有最大值

除了要了解定时器的回调函数时间比实际设定值要延后之外，还有一点需要注意下，那就是 Chrome、Safari、Firefox 都是以 32 个 bit 来存储延时值的，32bit 最大只能存放的数字是 2147483647 毫秒，这就意味着，如果 setTimeout 设置的延迟值大于 2147483647 毫秒（大约 24.8 天）时就会溢出，那么相当于延时值被设置为 0 了，这导致定时器会被立即执行。你可以运行下面这段代码：

function showName(){ console.log("极客时间")}var timerID = setTimeout(showName,2147483648);//会被理解调用执行

运行后可以看到，这段代码是立即被执行的。但如果将延时值修改为小于 2147483647 毫秒的某个值，那么执行时就没有问题了。

## 总结

1. 如果当前任务执行时间过久 会影响定时器任务的执行
2. 如果 setTimeout 存在嵌套调用，那么系统会设置最短时间间隔为 4 毫秒
   1. 我根据实践发现，现在的间隔已经最小可以到4微秒了，1毫秒 = 1000 微秒，所以现在这个 4毫秒已经不对了
3. 未激活的页面，setTimeout 执行最小间隔是 1000 毫秒
4. 延时执行时间有最大值
5. 使用 setTimeout 设置的回调函数中的 this 不符合直觉

requestAnimationFrame 提供一个原生的API去执行动画的效果，它会在一帧（一般是16ms）间隔内根据选择浏览器情况去执行相关动作。
但是他还是会被js 长任务，但是还是比定时器好点

自我推测
类比 XMLHttpRequest， 还是不一样， onreadystatechange 有好几个状态，回调会在状态改变的时候触发，通过网络进程IPC通信到祝线程，并放在异步回调队列中去

现在我的事件轮询已经动摇了，在之前，我是一次事件轮训，先执行微任务队列，然后执行宏任务队列，微任务中执行微任务会插入在当前的微任务队列

李兵老师的理解，每个宏任务都带有一个微任务队列，等宏任务中的主要功能都直接完成之后，这时候，渲染引擎并不着急去执行下一个宏任务，而是执行当前宏任务中的微任务

### 问

延时队列和消息队列有什么区别？
 延时队列中的任务包含JS通过定时器设置的回调函数、还有一些浏览器内部的延时回调函数。 它们属于宏任务！另外正常的消息队列中的任务也属于宏任务！放入消息队列就是指放入了宏任务队列（包括了延时队列或者正常的消息队列）

定时器回调推入到消息队列，他是怎么知道定时器时间到了呢？
没有定时器线程，实现是靠队列实现的

将会创建一个回调任务，包含了回调函数 showName、当前发起时间、延迟执行时间，添加到个延迟队列，ProcessDelayTask 函数会根据发起时间和延迟时间计算出到期的任务，然后依次执行这些到期的任务，等到期的任务执行完成之后，再继续下一个循环过程，当消息队列为空就开始执行 ProcessDelayTask，如果有任务到期了就塞入到 消息队列中

错误观点❌：我觉得是有定时器线程，现将异步回调任务拆分，回调任务和时间，时间交给定时器线程去执行定时任务，然后等到定时器线程通知这个定时任务可以执行，然后将定时任务对应的回调任务塞入消息队列中

渲染进程里的主线程while循环空转，为啥不会造成系统卡死？我们自己code里空while死循环会造成卡死?

本质上也是一个for死循环，只不过多了一个event_.Wait() 让线程挂起，其他线程提交任务时，通过event_.Signal() 再唤醒刚刚挂起的线程去执行相应的任务

```C++
 for (;;) {
#if defined(OS_APPLE)
    mac::ScopedNSAutoreleasePool autorelease_pool;
#endif

    Delegate::NextWorkInfo next_work_info = delegate->DoWork();
    bool has_more_immediate_work = next_work_info.is_immediate();
    if (!keep_running_)
      break;

    if (has_more_immediate_work)
      continue;

    has_more_immediate_work = delegate->DoIdleWork();
    if (!keep_running_)
      break;

    if (has_more_immediate_work)
      continue;

    if (next_work_info.delayed_run_time.is_max()) {
    // 等待
      event_.Wait();
    } else {
      event_.TimedWait(next_work_info.remaining_delay());
    }
    // Since event_ is auto-reset, we don't need to do anything special here
    // other than service each delegate method.
  }
}
void MessagePumpDefault::Quit() {
  keep_running_ = false;
}

void MessagePumpDefault::ScheduleWork() {
  // Since this can be called on any thread, we need to ensure that our Run
  // loop wakes up.
  // 唤起
  event_.Signal();
}
```

### 参考文献

1. <https://time.geekbang.org/column/article/134456>
2. [Chromium 实现 4 毫秒延迟](https://source.chromium.org/chromium/chromium/src/+/master:third_party/blink/renderer/core/frame/dom_timer.cc;l=49)
3. <https://source.chromium.org/chromium/chromium/src/+/master:base/task/sequence_manager/task_queue_impl.h>
4. <https://source.chromium.org/chromium/chromium/src/+/master:base/message_loop/message_pump_default.cc>
