# http3

## 前言

![alt](https://mmbiz.qpic.cn/mmbiz_jpg/q2ntl21QGgWSwGJHImsyYyQYJiaOPqofAdU0n7YSggJgx6ouWvnB2hunezbka7QzZMPNQ3Zs3KvX99VAvyia2nxQ/640?wx_fmt=jpeg&tp=webp&wxfrom=5&wx_lazy=1&wx_co=1)

甩掉TCP、TLS 的包袱，构建高效网络
QUIC（Quick UDP Internet Connection）
UDP User Datagram Protocol

### TCP 的队头阻塞

虽然 HTTP/2 解决了应用层面的队头阻塞问题，不过和 HTTP/1.1 一样，HTTP/2 依然是基于 TCP 协议的，而 TCP 最初就是为了单连接而设计的。你可以把 TCP 连接看成是两台计算机之前的一个虚拟管道，计算机的一端将要传输的数据按照顺序放入管道，最终数据会以相同的顺序出现在管道的另外一头。

接下来我们就来分析下 HTTP/1.1 协议栈中 TCP 是如何传输数据的。为直观理解，你可以参考下图：

![正常情况下的 TCP 传输数据过程](https://static001.geekbang.org/resource/image/c2/f0/c231ab4b825df8b6f730f484fce596f0.png)

通过上图你会发现，从一端发送给另外一端的数据会被拆分为一个个按照顺序排列的数据包，这些数据包通过网络传输到了接收端，接收端再按照顺序将这些数据包组合成原始数据，这样就完成了数据传输。

不过，如果在数据传输的过程中，有一个数据因为网络故障或者其他原因而丢包了，那么整个 TCP 的连接就会处于暂停状态，需要等待丢失的数据包被重新传输过来。你可以把 TCP 连接看成是一个按照顺序传输数据的管道，管道中的任意一个数据丢失了，那之后的数据都需要等待该数据的重新传输。为了直观理解，你可以参考下图：

![TCP 丢包状态](https://static001.geekbang.org/resource/image/33/96/33d2b4c14a7a2f19ef6677696b67de96.png)

我们就把在 TCP 传输过程中，由于单个数据包的丢失而造成的阻塞称为 TCP 上的队头阻塞。

那队头阻塞是怎么影响 HTTP/2 传输的呢？首先我们来看正常情况下 HTTP/2 是怎么传输多路请求的，为了直观理解，你可以参考下图：

![HTTP/2 多路复用](https://static001.geekbang.org/resource/image/48/d1/4837434655a6d87f1bf5e3d899a698d1.png)

通过该图，我们知道在 HTTP/2 中，多个请求是跑在一个 TCP 管道中的，如果其中任意一路数据流中出现了丢包的情况，那么就会阻塞该 TCP 连接中的所有请求。这不同于 HTTP/1.1，使用 HTTP/1.1 时，浏览器为每个域名开启了 6 个 TCP 连接，如果其中的 1 个 TCP 连接发生了队头阻塞，那么其他的 5 个连接依然可以继续传输数据。

所以随着丢包率的增加，HTTP/2 的传输效率也会越来越差。有测试数据表明，当系统达到了 2% 的丢包率时，HTTP/1.1 的传输效率反而比 HTTP/2 表现得更好。

### TCP 建立连接的延时

除了 TCP 队头阻塞之外，TCP 的握手过程也是影响传输效率的一个重要因素。

为了搞清楚 TCP 协议建立连接的延迟问题，我们还是先来回顾下网络延迟的概念，这会有助于你对后面内容的理解。网络延迟又称为 RTT（Round Trip Time）。我们把从浏览器发送一个数据包到服务器，再从服务器返回数据包到浏览器的整个往返时间称为 RTT（如下图）。RTT 是反映网络性能的一个重要指标。

![alt](https://static001.geekbang.org/resource/image/e9/4f/e98927e19b20349815fb8f499067cb4f.png)

那建立 TCP 连接时，需要花费多少个 RTT 呢？下面我们来计算下。我们知道 HTTP/1 和 HTTP/2 都是使用 TCP 协议来传输的，而如果使用 HTTPS 的话，还需要使用 TLS 协议进行安全传输，而使用 TLS 也需要一个握手过程，这样就需要有两个握手延迟过程。

1.在建立 TCP 连接的时候，需要和服务器进行三次握手来确认连接成功，也就是说需要在消耗完 1.5 个 RTT 之后才能进行数据传输。

2.进行 TLS 连接，TLS 有两个版本——TLS1.2 和 TLS1.3，每个版本建立连接所花的时间不同，大致是需要 1～2 个 RTT，关于 HTTPS 我们到后面到安全模块再做详细介绍。

总之，在传输数据之前，我们需要花掉 3～4 个 RTT。如果浏览器和服务器的物理距离较近，那么 1 个 RTT 的时间可能在 10 毫秒以内，也就是说总共要消耗掉 30～40 毫秒。这个时间也许用户还可以接受，但如果服务器相隔较远，那么 1 个 RTT 就可能需要 100 毫秒以上了，这种情况下整个握手过程需要 300～400 毫秒，这时用户就能明显地感受到“慢”了。

### TCP 协议僵化

现在我们知道了 TCP 协议存在队头阻塞和建立连接延迟等缺点，那我们是不是可以通过改进 TCP 协议来解决这些问题呢？

答案是：非常困难。之所以这样，主要有两个原因。

第一个是中间设备的僵化。要搞清楚什么是中间设备僵化，我们先要弄明白什么是中间设备。我们知道互联网是由多个网络互联的网状结构，为了能够保障互联网的正常工作，我们需要在互联网的各处搭建各种设备，这些设备就被称为中间设备。

这些中间设备有很多种类型，并且每种设备都有自己的目的，这些设备包括了路由器、防火墙、NAT、交换机等。它们通常依赖一些很少升级的软件，这些软件使用了大量的 TCP 特性，这些功能被设置之后就很少更新了。

所以，如果我们在客户端升级了 TCP 协议，但是当新协议的数据包经过这些中间设备时，它们可能不理解包的内容，于是这些数据就会被丢弃掉。这就是中间设备僵化，它是阻碍 TCP 更新的一大障碍。

除了中间设备僵化外，操作系统也是导致 TCP 协议僵化的另外一个原因。因为 TCP 协议都是通过操作系统内核来实现的，应用程序只能使用不能修改。通常操作系统的更新都滞后于软件的更新，因此要想自由地更新内核中的 TCP 协议也是非常困难的。

### QUIC

协议HTTP/2 存在一些比较严重的与 TCP 协议相关的缺陷，但由于 TCP 协议僵化，我们几乎不可能通过修改 TCP 协议自身来解决这些问题，那么解决问题的思路是绕过 TCP 协议，发明一个 TCP 和 UDP 之外的新的传输协议。但是这也面临着和修改 TCP 一样的挑战，因为中间设备的僵化，这些设备只认 TCP 和 UDP，如果采用了新的协议，新协议在这些设备同样不被很好地支持。

因此，HTTP/3 选择了一个折衷的方法——UDP 协议，基于 UDP 实现了类似于 TCP 的多路数据流、传输可靠性等功能，我们把这套功能称为 QUIC 协议。关于 HTTP/2 和 HTTP/3 协议栈的比较，你可以参考下图：

![alt](https://static001.geekbang.org/resource/image/0b/c6/0bae470bb49747b9a59f9f4bb496a9c6.png)

通过上图我们可以看出，HTTP/3 中的 QUIC 协议集合了以下几点功能。

- 实现了类似 TCP 的流量控制、传输可靠性的功能。虽然 UDP 不提供可靠性的传输，但 QUIC 在 UDP 的基础之上增加了一层来保证数据可靠性传输。它提供了数据包重传、拥塞控制以及其他一些 TCP 中存在的特性。
- 集成了 TLS 加密功能。目前 QUIC 使用的是 TLS1.3，相较于早期版本 TLS1.3 有更多的优点，其中最重要的一点是减少了握手所花费的 RTT 个数。

- 实现了 HTTP/2 中的多路复用功能。和 TCP 不同，QUIC 实现了在同一物理连接上可以有多个独立的逻辑数据流（如下图）。实现了数据流的单独传输，就解决了 TCP 中队头阻塞的问题。
  ![alt](https://static001.geekbang.org/resource/image/05/9a/05cc5720989aec75730ee4cb7e7c149a.png)
- QUIC 协议的多路复用实现了快速握手功能。由于 QUIC 是基于 UDP 的，所以 QUIC 可以实现使用 0-RTT 或者 1-RTT 来建立连接，这意味着 QUIC 可以用最快的速度来发送和接收数据，这样可以大大提升首次打开页面的速度。

### HTTP/3 的挑战

通过上面的分析，我们相信在技术层面，HTTP/3 是个完美的协议。不过要将 HTTP/3 应用到实际环境中依然面临着诸多严峻的挑战，这些挑战主要来自于以下三个方面。

第一，从目前的情况来看，服务器和浏览器端都没有对 HTTP/3 提供比较完整的支持。Chrome 虽然在数年前就开始支持 Google 版本的 QUIC，但是这个版本的 QUIC 和官方的 QUIC 存在着非常大的差异。

第二，部署 HTTP/3 也存在着非常大的问题。因为系统内核对 UDP 的优化远远没有达到 TCP 的优化程度，这也是阻碍 QUIC 的一个重要原因。

第三，中间设备僵化的问题。这些设备对 UDP 的优化程度远远低于 TCP，据统计使用 QUIC 协议时，大约有 3%～7% 的丢包率。

## 总结

 HTTP/2 中所存在的一些问题，主要包括了 TCP 的队头阻塞、建立 TCP 连接的延时、TCP 协议僵化等问题。

 这些问题都是 TCP 的内部问题，因此要解决这些问题就要优化 TCP 或者“另起炉灶”创造新的协议。

 由于优化 TCP 协议存在着诸多挑战，所以官方选择了创建新的 QUIC 协议。HTTP/3 正是基于 QUIC 协议的，你可以把 QUIC 看成是集成了“TCP+HTTP/2 的多路复用 +TLS 等功能”的一套协议。这是集众家所长的一个协议，从协议最底层对 Web 的文件传输做了比较彻底的优化，所以等生态相对成熟时，可以用来打造比现在的 HTTP/2 还更加高效的网络。

 虽说这套协议解决了 HTTP/2 中因 TCP 而带来的问题，不过由于是改动了底层协议，所以推广起来还会面临着巨大的挑战。

 关于 HTTP/3 的未来，我有下面两点判断：

- 从标准制定到实践再到协议优化还需要走很长一段路；
- 因为动了底层协议，所以 HTTP/3 的增长会比较缓慢，这和 HTTP/2 有着本质的区别。

### 连接迁移

TCP 连接基于四元组（源 IP、源端口、目的 IP、目的端口），切换网络时至少会有一个因素发生变化，导致连接发生变化。当连接发生变化时，如果还使用原来的 TCP 连接，则会导致连接失败，就得等原来的连接超时后重新建立连接，所以我们有时候发现切换到一个新网络时，即使新网络状况良好，但内容还是需要加载很久。如果实现得好，当检测到网络变化时立刻建立新的 TCP 连接，即使这样，建立新的连接还是需要几百毫秒的时间。

QUIC 的连接不受四元组的影响，当这四个元素发生变化时，原连接依然维持。那这是怎么做到的呢？道理很简单，QUIC 连接不以四元组作为标识，而是使用一个 64 位的随机数，这个随机数被称为 Connection ID，即使 IP 或者端口发生变化，只要 Connection ID 没有变化，那么连接依然可以维持。

![连接迁移](https://mmbiz.qpic.cn/mmbiz_jpg/q2ntl21QGgWSwGJHImsyYyQYJiaOPqofAb6z3I0ZqG9nLEeGe9MFWVowIL4XTSXiajqqxHOdHtRRyIZMnVd3JJyw/640?wx_fmt=jpeg&tp=webp&wxfrom=5&wx_lazy=1&wx_co=1)

### 多路复用

![alt](https://mmbiz.qpic.cn/mmbiz_jpg/q2ntl21QGgWSwGJHImsyYyQYJiaOPqofAG5rw3TnM6e4hpeM0WnibcKfzwuwZZIEkryuPBqTt9b3RMBFNMEZeScw/640?wx_fmt=jpeg&tp=webp&wxfrom=5&wx_lazy=1&wx_co=1)

HTTP/2 虽然可以解决“请求”这个粒度的阻塞，但 HTTP/2 的基础 TCP 协议本身却也存在着队头阻塞的问题。HTTP/2 的每个请求都会被拆分成多个 Frame，不同请求的 Frame 组合成 Stream，Stream 是 TCP 上的逻辑传输单元，这样 HTTP/2 就达到了一条连接同时发送多条请求的目标，这就是多路复用的原理。我们看一个例子，在一条 TCP 连接上同时发送 4 个 Stream，其中 Stream1 已正确送达，Stream2 中的第 3 个 Frame 丢失，TCP 处理数据时有严格的前后顺序，先发送的 Frame 要先被处理，这样就会要求发送方重新发送第 3 个 Frame，Stream3 和 Stream4 虽然已到达但却不能被处理，那么这时整条连接都被阻塞。

![alt](https://mmbiz.qpic.cn/mmbiz_jpg/q2ntl21QGgWSwGJHImsyYyQYJiaOPqofAichGZqLq1NmIRNrnyNV9uRBz9kZCJIP3b3VahFJGBeR9XFttoY23rsQ/640?wx_fmt=jpeg&tp=webp&wxfrom=5&wx_lazy=1&wx_co=1)

不仅如此，由于 HTTP/2 必须使用 HTTPS，而 HTTPS 使用的 TLS 协议也存在队头阻塞问题。TLS 基于 Record 组织数据，将一堆数据放在一起（即一个 Record）加密，加密完后又拆分成多个 TCP 包传输。一般每个 Record 16K，包含 12 个 TCP 包，这样如果 12 个 TCP 包中有任何一个包丢失，那么整个 Record 都无法解密。

![https://link](https://mmbiz.qpic.cn/mmbiz_jpg/q2ntl21QGgWSwGJHImsyYyQYJiaOPqofAXf0TJZFgEJuExEjjUlE1GhLqIgkhib28HHN2wtFtNgeuzYzHQfUoYLA/640?wx_fmt=jpeg&tp=webp&wxfrom=5&wx_lazy=1&wx_co=1)

队头阻塞会导致 HTTP/2 在更容易丢包的弱网络环境下比 HTTP/1.1 更慢！

那 QUIC 是如何解决队头阻塞问题的呢？主要有两点。

QUIC 的传输单元是 Packet，加密单元也是 Packet，整个加密、传输、解密都基于 Packet，这样就能避免 TLS 的队头阻塞问题；

QUIC 基于 UDP，UDP 的数据包在接收端没有处理顺序，即使中间丢失一个包，也不会阻塞整条连接，其他的资源会被正常处理。

![alt](https://mmbiz.qpic.cn/mmbiz_jpg/q2ntl21QGgWSwGJHImsyYyQYJiaOPqofA9d78A31icNouV6fiaeNL1L7TI7wibKCAD4yN1ApyouKTfMLmibjRlhO1sQ/640?wx_fmt=jpeg&tp=webp&wxfrom=5&wx_lazy=1&wx_co=1)

#### 拥塞控制

拥塞控制的目的是避免过多的数据一下子涌入网络，导致网络超出最大负荷。QUIC 的拥塞控制与 TCP 类似，并在此基础上做了改进。所以我们先简单介绍下 TCP 的拥塞控制。

TCP 拥塞控制由 4 个核心算法组成：慢启动、拥塞避免、快速重传和快速恢复，理解了这 4 个算法，对 TCP 的拥塞控制也就有了大概了解。

- 慢启动：发送方向接收方发送 1 个单位的数据，收到对方确认后会发送 2 个单位的数据，然后依次是 4 个、8 个……呈指数级增长，这个过程就是在不断试探网络的拥塞程度，超出阈值则会导致网络拥塞；

- 拥塞避免：指数增长不可能是无限的，到达某个限制（慢启动阈值）之后，指数增长变为线性增长；

- 快速重传：发送方每一次发送时都会设置一个超时计时器，超时后即认为丢失，需要重发；

- 快速恢复：在上面快速重传的基础上，发送方重新发送数据时，也会启动一个超时定时器，如果收到确认消息则进入拥塞避免阶段，如果仍然超时，则回到慢启动阶段。

QUIC 重新实现了 TCP 协议的 Cubic 算法进行拥塞控制，并在此基础上做了不少改进。下面介绍一些 QUIC 改进的拥塞控制的特性。

#### 热插拔

TCP 中如果要修改拥塞控制策略，需要在系统层面进行操作。QUIC 修改拥塞控制策略只需要在应用层操作，并且 QUIC 会根据不同的网络环境、用户来动态选择拥塞控制算法。

1.6.2 前向纠错FEC

QUIC 使用前向纠错(FEC，Forward Error Correction)技术增加协议的容错性。一段数据被切分为 10 个包后，依次对每个包进行异或运算，运算结果会作为 FEC 包与数据包一起被传输，如果不幸在传输过程中有一个数据包丢失，那么就可以根据剩余 9 个包以及 FEC 包推算出丢失的那个包的数据，这样就大大增加了协议的容错性。

这是符合现阶段网络技术的一种方案，`现阶段带宽已经不是网络传输的瓶颈，往返时间才是`，所以新的网络传输协议可以适当增加数据冗余，减少重传操作。

### 单调递增的 Packet Number

TCP 为了保证可靠性，使用 Sequence Number 和 ACK 来确认消息是否有序到达，但这样的设计存在缺陷。

超时发生后客户端发起重传，后来接收到了 ACK 确认消息，但因为原始请求和重传请求接收到的 ACK 消息一样，所以客户端就郁闷了，不知道这个 ACK 对应的是原始请求还是重传请求。如果客户端认为是原始请求的 ACK，但实际上是左图的情形，则计算的采样 RTT 偏大；如果客户端认为是重传请求的 ACK，但实际上是右图的情形，又会导致采样 RTT 偏小。图中有几个术语，RTO 是指超时重传时间（Retransmission TimeOut），跟我们熟悉的 RTT（Round Trip Time，往返时间）很长得很像。采样 RTT 会影响 RTO 计算，超时时间的准确把握很重要，长了短了都不合适。

![alt](https://mmbiz.qpic.cn/mmbiz_jpg/q2ntl21QGgWSwGJHImsyYyQYJiaOPqofAp5iaHWVt8P0nYia7iaW0Mfap5nzAKKGpJOkrns8NibLhO7TOdJ1GBtueOg/640?wx_fmt=jpeg&tp=webp&wxfrom=5&wx_lazy=1&wx_co=1)

QUIC 解决了上面的歧义问题。与 Sequence Number 不同的是，Packet Number 严格单调递增，如果 Packet N 丢失了，那么重传时 Packet 的标识不会是 N，而是比 N 大的数字，比如 N + M，这样发送方接收到确认消息时就能方便地知道 ACK 对应的是原始请求还是重传请求。

![alt](https://mmbiz.qpic.cn/mmbiz_jpg/q2ntl21QGgWSwGJHImsyYyQYJiaOPqofAiceiaFg4ayxPM3h5GA0arQiawB0YTsVIGicBtVSlnicoqXwh3AAZze3yoEw/640?wx_fmt=jpeg&tp=webp&wxfrom=5&wx_lazy=1&wx_co=1)

### ACK Delay

TCP 计算 RTT 时没有考虑接收方接收到数据到发送确认消息之间的延迟，如下图所示，这段延迟即 ACK Delay。QUIC 考虑了这段延迟，使得 RTT 的计算更加准确。
![alt](https://mmbiz.qpic.cn/mmbiz_jpg/q2ntl21QGgWSwGJHImsyYyQYJiaOPqofA5QVIyoqyPZvJnhqVsLF9rEicaVFBG7PNBic1JB3pd075uIkmCtUArdkA/640?wx_fmt=jpeg&tp=webp&wxfrom=5&wx_lazy=1&wx_co=1)

更多的 ACK 块

一般来说，接收方收到发送方的消息后都应该发送一个 ACK 回复，表示收到了数据。但每收到一个数据就返回一个 ACK 回复太麻烦，所以一般不会立即回复，而是接收到多个数据后再回复，TCP SACK 最多提供 3 个 ACK block。但有些场景下，比如下载，只需要服务器返回数据就好，但按照 TCP 的设计，每收到 3 个数据包就要“礼貌性”地返回一个 ACK。而 QUIC 最多可以捎带 256 个 ACK block。在丢包率比较严重的网络下，更多的 ACK block 可以减少重传量，提升网络效率。

![alt](https://mmbiz.qpic.cn/mmbiz_jpg/q2ntl21QGgWSwGJHImsyYyQYJiaOPqofAv3tKfwZh6mMIOhE7zaKOeSMHaAZ6RZU8gibXBHiaAPibmDfDJbvlI1Z7g/640?wx_fmt=jpeg&tp=webp&wxfrom=5&wx_lazy=1&wx_co=1)

### 流量控制

TCP 会对每个 TCP 连接进行流量控制，流量控制的意思是让发送方不要发送太快，要让接收方来得及接收，不然会导致数据溢出而丢失，TCP 的流量控制主要通过滑动窗口来实现的。可以看出，拥塞控制主要是控制发送方的发送策略，但没有考虑到接收方的接收能力，流量控制是对这部分能力的补齐。

QUIC 只需要建立一条连接，在这条连接上同时传输多条 Stream，好比有一条道路，两头分别有一个仓库，道路中有很多车辆运送物资。QUIC 的流量控制有两个级别：连接级别（Connection Level）和 Stream 级别（Stream Level），好比既要控制这条路的总流量，不要一下子很多车辆涌进来，货物来不及处理，也不能一个车辆一下子运送很多货物，这样货物也来不及处理。

那 QUIC 是怎么实现流量控制的呢？我们先看单条 Stream 的流量控制。Stream 还没传输数据时，接收窗口（flow control receive window）就是最大接收窗口（flow control receive window），随着接收方接收到数据后，接收窗口不断缩小。在接收到的数据中，有的数据已被处理，而有的数据还没来得及被处理。如下图所示，蓝色块表示已处理数据，黄色块表示未处理数据，这部分数据的到来，使得 Stream 的接收窗口缩小。
![alt](https://mmbiz.qpic.cn/mmbiz_jpg/q2ntl21QGgWSwGJHImsyYyQYJiaOPqofAV17HW1SyGD3ZxYPj9KZ8Qo2697Y0SzhDZtLCowiaBgW2GkAIHWI1dTw/640?wx_fmt=jpeg&tp=webp&wxfrom=5&wx_lazy=1&wx_co=1)

随着数据不断被处理，接收方就有能力处理更多数据。当满足 (flow control receive offset - consumed bytes) < (max receive window / 2) 时，接收方会发送 WINDOW_UPDATE frame 告诉发送方你可以再多发送些数据过来。这时 flow control receive offset 就会偏移，接收窗口增大，发送方可以发送更多数据到接收方。

![alt](https://mmbiz.qpic.cn/mmbiz_jpg/q2ntl21QGgWSwGJHImsyYyQYJiaOPqofAA1OiaSWXficX1Q9WY1meH2sVbHCpII8vIVbRL5D1onwecn7iahXFse3tQ/640?wx_fmt=jpeg&tp=webp&wxfrom=5&wx_lazy=1&wx_co=1)

Stream 级别对防止接收端接收过多数据作用有限，更需要借助 Connection 级别的流量控制。理解了 Stream 流量那么也很好理解 Connection 流控。Stream 中，接收窗口(flow control receive window) = 最大接收窗口(max receive window) - 已接收数据(highest received byte offset) ，而对 Connection 来说：接收窗口 = Stream1接收窗口 + Stream2接收窗口 + ... + StreamN接收窗口 。

![alt](https://mmbiz.qpic.cn/mmbiz_jpg/q2ntl21QGgWSwGJHImsyYyQYJiaOPqofAA1OiaSWXficX1Q9WY1meH2sVbHCpII8vIVbRL5D1onwecn7iahXFse3tQ/640?wx_fmt=jpeg&tp=webp&wxfrom=5&wx_lazy=1&wx_co=1)

### 问题

实现了 HTTP/2 中的多路复用功能。和 TCP 不同，QUIC 实现了在同一物理连接上可以有多个独立的逻辑数据流（如下图）。实现了数据流的单独传输，就解决了 TCP 中队头阻塞的问题。",个人感觉不管怎么传输，还待保证数据包不会丢失，丢了还是要重新传输，重新传就会有队头阻塞问题，所以，文中说“数据流的单独传输，就解决了 TCP 中队头阻塞的问题”，感到疑惑，单独传就不阻塞了吗，丢了一堆包也不管了。

会阻塞，但是只会阻塞丢包的那条链路，因为可以连接多个数据流链路，所以一个阻塞了，其他的不会阻塞。而http2.0中TCP只有一条链路，只要这些数据包中一个阻塞了，后面的其他包就得等待。所以说是解决了TCP队头阻塞的问题。因为不管是什么协议都不能保证不丢包，只不过是不要影响其他的数据流包就可以了

### 参考文献

1. <https://mp.weixin.qq.com/s/iF0wbV5o7HVjGG_Cb-RcOg>
