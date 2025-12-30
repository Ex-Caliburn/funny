# webRTC

## 前言

WebRTC(Web Real-Time Communication)
ICE (Interactive Connecctivity Establishment, 交互式连接建立) ICE 不是一种协议，而是整合了 STUN 和 TURN 两种协议的框架
STUN(Session Traversal Utilities for NAT, NAT 会话穿越应用程序)
TURN(Traversal USing Replays around NAT)

### webRTC 架构

![alt](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/901bc7a2e23147898e17b739e622da6f~tplv-k3u1fbpfcp-watermark.awebp)

整个 WebRTC 架构设计大致可以分为以下 3 部分：

1. 紫色提供给 Web 前端开发使用的 API
2. 蓝色实线部分提供各大浏览器厂商使用的 API
3. 蓝色虚线部分包含 3 部分：音频引擎、视频引擎、网络传输 (Transport)。都可以自定义实现

### WebRTC 点对点通信原理

要实现两个不同网络环境（具有麦克风、摄像头设备）的客户端（可能是不同的 Web 浏览器或者手机 App）之间的实时音视频通信的难点在哪里、需要解决哪些问题？

1. 怎么知道彼此的存在也就是如何发现对方？
2. 彼此音视频编解码能力如何沟通？
3. 音视频数据如何传输，怎么能让对方看得自己？

对于问题 1：WebRTC 虽然支持端对端通信，但是这并不意味着 WebRTC 不再需要服务器。在点对点通信的过程中，双方需要交换一些元数据比如媒体信息、网络数据等等信息。我们通常称这一过程叫做：信令(signaling)。对应的服务器即信令服务器 (signaling server)。通常也有人将之称为房间服务器，因为它不仅可以交换彼此的媒体信息和网络信息，同样也可以管理房间信息，比如通知彼此 who 加入了房间,who 离开了房间，告诉第三方房间人数是否已满是否可以加入房间。
为了避免出现冗余，并最大限度地提高与已有技术的兼容性，WebRTC 标准并没有规定信令方法和协议。在本文接下来的实践章节会利用 Koa 和 Socket.io 技术实现一个信令服务器。

对于问题 2：我们首先要知道的是，不同浏览器对于音视频的编解码能力是不同的。比如: Peer-A 端支持 H264、VP8 等多种编码格式,而 Peer-B 端支持 H264、VP9 等格式。为了保证双方都可以正确的编解码，最简单的办法即取它们所都支持格式的交集-H264。在 WebRTC 中，有一个专门的协议，称为Session Description Protocol(SDP),可以用于描述上述这类信息。因此参与音视频通讯的双方想要了解对方支持的媒体格式，必须要交换 SDP 信息。而交换 SDP 的过程，通常称之为媒体协商。

对于问题 3：其本质上就是网络协商的过程：参与音视频实时通信的双方要了解彼此的网络情况，这样才有可能找到一条相互通讯的链路。理想的网络情况是每个浏览器的电脑都有自己的私有公网 IP 地址，这样的话就可以直接进行点对点连接。但实际上出于网络安全和 IPV4 地址不够的考虑，我们的电脑与电脑之间或大或小都是在某个局域网内，需要NAT(Network Address Translation, 网络地址转换)。在 WebRTC 中我们使用 ICE 机制建立网络连接。那么何为 ICE？

ICE (Interactive Connecctivity Establishment, 交互式连接建立)，ICE 不是一种协议，而是整合了 STUN 和 TURN 两种协议的框架。其中STUN(Session Traversal Utilities for NAT, NAT 会话穿越应用程序)，它允许位于 NAT（或多重 NAT）后的客户端找出自己对应的公网 IP 地址和端口，也就是俗称的“打洞”。但是，如果 NAT 类型是对称型的话，那么就无法打洞成功。这时候 TURN 就派上用场了，TURN(Traversal USing Replays around NAT)是 STUN/RFC5389 的一个拓展协议在其基础上添加了 Replay(中继)功能，简单来说其目的就是解决对称 NAT 无法穿越的问题，在 STUN 分配公网 IP 失败后，可以通过 TURN 服务器请求公网 IP 地址作为中继地址。

在 WebRTC 中有三种类型的 ICE 候选者，它们分别是：

主机候选者

反射候选者

中继候选者

主机候选者，表示的是本地局域网内的 IP 地址及端口。它是三个候选者中优先级最高的，也就是说在 WebRTC 底层，首先会尝试本地局域网内建立连接。

反射候选者，表示的是获取 NAT 内主机的外网 IP 地址和端口。其优先级低于 主机候选者。也就是说当 WebRTC 尝试本地连接不通时，会尝试通过反射候选者获得的 IP 地址和端口进行连接。

中继候选者，表示的是中继服务器的 IP 地址与端口，即通过服务器中转媒体数据。当 WebRTC 客户端通信双方无法穿越 P2P NAT 时，为了保证双方可以正常通讯，此时只能通过服务器中转来保证服务质量了。

![alt](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/35f0234ac05940cda9929c2ee69fd2ea~tplv-k3u1fbpfcp-watermark.awebp)

从上图我们可以看出，在非本地局域网内 WebRTC 通过 STUN server 获得自己的外网 IP 和端口，然后通过信令服务器与远端的 WebRTC 交换网络信息。之后双方就可以尝试建立 P2P 连接了。当 NAT 穿越不成功时，则会通过 Relay server (TURN)中转。

值得一提的是，在 WebRTC 中网络信息通常用candidate来描述，而上述图中的 STUN server 和 Replay server 也都可以是同一个 server。在文末的实践章节即是采用了集成了 STUN(打洞)和 TURN(中继)功能的开源项目 coturn。

综上对三个问题的解释我们可以用下图来说明 WebRTC 点对点通信的基本原理：

![alt](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/d0028c7d842141c686f7062bbaf7cbe6~tplv-k3u1fbpfcp-watermark.awebp)

简而言之就是通过 WebRTC 提供的 API 获取各端的媒体信息 SDP 以及 网络信息 candidate ，并通过信令服务器交换，进而建立了两端的连接通道完成实时视频语音通话。

### WebRTC 几个重要的 API

#### 音视频采集 API

MediaDevices.getUserMedia()

```js
const constraints = {
        video: true,
        audio: true
    
};
//   非安全模式（非https/localhost）下 navigator.mediaDevices 会返回 undefined
try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        document.querySelector('video').srcObject = stream;
    }   catch (error) {
        console.error(error);
    }

```

#### 获取音视频设备输入输出列表

MediaDevices.enumerateDevices()

```js
try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        this.videoinputs = devices.filter(device => device.kind === 'videoinput');
        this.audiooutputs = devices.filter(device => device.kind === 'audiooutput');
        this.audioinputs = devices.filter(device => device.kind === 'audioinput');
      } catch (error) {
        console.error(error);
      }
```

#### RTCPeerConnection

RTCPeerConnection 作为创建点对点连接的 API,是我们实现音视频实时通信的关键。（参考MDN 文档）

在本文的实践章节中主要运用到 RTCPeerConnection 的以下方法：

媒体协商方法

createOffer
createAnswer
setLocalDesccription
setRemoteDesccription

重要事件

onicecandidate
onaddstream

![alt](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/b2fd9992749d493c96b8e0b4d0cff044~tplv-k3u1fbpfcp-watermark.awebp)

从上图不难发现，整个媒体协商过程可以简化为三个步骤对应上述四个媒体协商方法：

1. 呼叫端 Amy 创建 Offer(createOffer)并将 offer 消息（内容是呼叫端 Amy 的 SDP 信息）通过信令服务器传送给接收端 Bob,同时调用 setLocalDesccription 将含有本地 SDP 信息的 Offer 保存起来
2. 接收端 Bob 收到对端的 Offer 信息后调用 setRemoteDesccription 方法将含有对端 SDP 信息的 Offer 保存起来，并创建 Answer(createAnswer)并将 Answer 消息（内容是接收端 Bob 的 SDP 信息）通过信令服务器传送给呼叫端 Amy
3. 呼叫端 Amy 收到对端的 Answer 信息后调用 setRemoteDesccription 方法将含有对端 SDP 信息的 Answer 保存起来

经过上述三个步骤，则完成了 P2P 通信过程中的媒体协商部分，实际上在呼叫端以及接收端调用 setLocalDesccription 同时也开始了收集各端自己的网络信息(candidate)，然后各端通过监听事件 onicecandidate 收集到各自的 candidate 并通过信令服务器传送给对端，进而打通 P2P 通信的网络通道，并通过监听 onaddstream 事件拿到对方的视频流进而完成了整个视频通话过程。

![alt](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/89242eaf31074c1c88ad0ac91b093d2e~tplv-k3u1fbpfcp-watermark.awebp)

![alt](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/eedb825fedd747e7b60a87097ebf58ca~tplv-k3u1fbpfcp-watermark.awebp)

## 总结

WebRTC，它的优点

1. WebRTC是一个开源项目, WebRTC是HTML5规范，可用于直接在浏览器和设备之间添加实时媒体通信。
2. WebRTC不仅限于浏览器，因为它也可用于移动应用程序。源代码是可移植的，并且已经在许多移动应用中使用。SDK可用于移动和嵌入式环境，因此你可以使用WebRTC在任何地方运行。
3. WebRTC不仅用于语音或视频通话，它功能强大且用途广泛。你可以使用它来建立群呼服务，向其中添加记录或仅将其用于数据传递
4. 强大的打洞能力。WebRTC技术包含了使用STUN、ICE、TURN、RTP-over-TCP的关键NAT和防火墙穿透技术，并支持代理。

缺点

1. WebRTC缺乏服务器方案的设计和部署。
2. 设备端适配，如回声、录音失败等问题层出不穷。这一点在安卓设备上尤为突出。由于安卓设备厂商众多，每个厂商都会在标准的安卓框架上进行定制化，导致很多可用性问题（访问麦克风失败）和质量问题（如回声、啸叫）

### 参考文献

1. <https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/901bc7a2e23147898e17b739e622da6f~tplv-k3u1fbpfcp-watermark.awebp>
2. <https://developer.mozilla.org/zh-CN/docs/Web/API/RTCPeerConnection>
3. <https://mp.weixin.qq.com/s?__biz=MzIwNzA1OTA2OQ==&mid=2657207480&idx=2&sn=a34fce2d9d18d5e697a0ca79288d05e1&chksm=8c8d45aabbfaccbc38835368cd438e2907c2219eed6439dcf58f85b9f27d9173b0cac23b4a6c&scene=21#wechat_redirect>
