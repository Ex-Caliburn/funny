# webRTC

## 前言

Web Real-Time Communication（Web实时通信，WebRTC）由一组标准、协议和JavaScript API组成，用于实现浏览器之间（端到端）的音频、视频及数据共享。

WebRTC使得实时通信变成一种标准功能，任何Web应用都无需借助第三方插件和专有软件，而是通过简单地JavaScript API即可完成。

在WebRTC中，有三个主要的知识点，理解了这三个知识点，也就理解了WebRTC的底层实现原理。这三个知识点分别是：

MediaStream：获取音频和视频流
RTCPeerConnection：音频和视频数据通信
RTCDataChannel：任意应用数据通信

### 当前直播技术延迟

传统的直播技术延迟非常大，从观众评论到看到主播给出反馈一般要在十秒以上。通过多媒体技术降低直播延迟、提高主播和粉丝的互动效率是我们研究低延迟直播技术的初衷。

我们对当前主流直播技术做了分析，在低延迟直播技术出现前主要有 HLS 和 RTMP/HTTP-FLV 两个协议。

HLS：延迟主要来自编码解码时产生延迟、网络延迟、CDN 分发延迟。由于它是切片协议，延迟分两大块，一个是服务端有切片缓冲延迟，另一个是在播放端防抖缓冲会有延迟。切片的大小和数量都会 HLS 影响延迟大小，一般在十秒以上。

RTMP/HTTP-FLV: 目前国内大部分厂家在用的 RTMP，它相对于 HLS 在服务端做了优化。RTMP 服务端不再进行切片，而是分别转发每一帧，CDN 分发延迟非常小。RTMP 延迟主要来自播放端防抖缓冲：为提升弱网环境下抖动时直播的流畅度，缓冲延迟一般有五到十秒。

这两类协议都是基于 TCP，国内厂商基本上已经将 RTMP over TCP 的延迟做到的极致，如果一个协议仍然基于 TCP 优化延迟，效果上很难优于目前的 RTMP 。

TCP 由于其自身的一些特性，并不适用于低延迟直播场景，主要原因如下：

- 重传慢：TCP 的 ACK 确认机制，丢包后发送侧超时重传，超时时间一般200ms，会造成接收侧帧抖动。
- 拥塞判断不准确：基于丢包的拥塞控制算法无法准确判断拥塞，丢包并不等于拥塞；也会造成发送链路 bufferbloat，链路 RTT 增大，延迟增加。
- 灵活性差：这是最主要原因，TCP 拥塞控制算法在操作系统内核层实现，优化成本较高，移动端只有利用系统已有的优化。
  
所以我们选择基于 UDP 的方案实现。

### 低延迟直播技术选型

<img src="https://pic1.zhimg.com/50/v2-ffa4a6ec01d5cb113993b58683534c79_hd.jpg?source=1940ef5c" data-caption="" data-size="normal" data-rawwidth="983" data-rawheight="494" data-default-watermark-src="https://pic2.zhimg.com/50/v2-330caf3fe1d796890cd51f11db43f54e_hd.jpg?source=1940ef5c" class="origin_image zh-lightbox-thumb" width="983" data-original="https://pic1.zhimg.com/v2-ffa4a6ec01d5cb113993b58683534c79_r.jpg?source=1940ef5c"/>

上图是我们基于 UDP 的两种方案对比，第一种是可靠UDP方向，比如 Quic ，另一种是 RTC 方案，比如 WebRTC 。
我们从五个维度对两种方案做了对比：

- 传输方式：Quic 是可靠传输；而 RTC 是半可靠传输，特定情境下可对音视频有损传输，可有效降低延迟。
- 复杂度：Quic 的复杂度非常低，相当于将 TCP 接口换位 Quic 接口即可，RTC方案的复杂很高，涉及一整套的协议设计和QOS保障机制。
- 音视频友好性：Quic 不关心传输内容，对音视频数据透明传输。RTC 对音视频更友好，可针对音视频做定制化优化。
- 方案完备性：从方案完备性方面来讲，Quic 是针对传输层优化，而 WebRTC 可提供端对端优化方案。理
- 论延迟：经我们实验室测试以及线上数据分析，WebRTC 方案的延迟可以达到 1 秒以内。
  
- 综上，Quic 方案的最大优点是复杂度低，不过这个方案要想达到更低的延迟，也需要引入更多的复杂度。从方案的先进性上看，我们选择 WebRTC 技术作为我们的低延迟方案。同时，我们也相信，RTC 技术和直播技术的融合，是未来音视频传输技术的一个趋势。

### 阿里云 RTS

<img src="https://pic1.zhimg.com/50/v2-a5904511647f40343e182b1605c664b9_hd.jpg?source=1940ef5c" data-caption="" data-size="normal" data-rawwidth="979" data-rawheight="490" data-default-watermark-src="https://pic1.zhimg.com/50/v2-118115d69183d09057c5c501c44d0f3c_hd.jpg?source=1940ef5c" class="origin_image zh-lightbox-thumb" width="979" data-original="https://pic2.zhimg.com/v2-a5904511647f40343e182b1605c664b9_r.jpg?source=1940ef5c"/>

RTS 是由阿里云和淘宝直播共建的低延迟直播系统，此系统分两大块：

- 上行接入：可接入三种输入方式，第一种是 H5 终端，使用标准 WebRTC 推流到RTS系统中；第二种是 OBS 等传统 RTMP 推流软件，使用 RTMP 协议推流到 RTS 系统中；第三种是低延迟推流端，可以使用我们基于 RTP/RTCP 扩展的私有协议推流到RTS系统中。
- 下行分发：它提供两种低延迟分发，第一种是标准WebRTC 分发，另一种是我们在 WebRTC 基础上的私有协议扩展，淘宝直播目前使用最多的就是基于私有协议的分发。

### 低延迟直播技术

<img src="https://pic4.zhimg.com/50/v2-00265acd609e7a9217cdd569b1f4e73e_hd.jpg?source=1940ef5c" data-caption="" data-size="normal" data-rawwidth="984" data-rawheight="507" data-default-watermark-src="https://pic4.zhimg.com/50/v2-19312e37691168b8ae8e06f819453109_hd.jpg?source=1940ef5c" class="origin_image zh-lightbox-thumb" width="984" data-original="https://pic4.zhimg.com/v2-00265acd609e7a9217cdd569b1f4e73e_r.jpg?source=1940ef5c"/>

下面我将重点从流程协议，终端方案介绍低延迟直播技术，主要回答几个问题：
标准 WebRTC 终端如何接入
Native 终端接入如何获得更好体验如何基于
WebRTC 设计低延迟直播端方案播放器如何修改支持低延迟直播

### 标准 WebRTC 接入流程

<img src="https://pic2.zhimg.com/50/v2-a3dad29934853f3917b489177dab4956_hd.jpg?source=1940ef5c" data-caption="" data-size="normal" data-rawwidth="988" data-rawheight="533" data-default-watermark-src="https://pic2.zhimg.com/50/v2-5bbf2d540f5470433ede6224a0a3e5ad_hd.jpg?source=1940ef5c" class="origin_image zh-lightbox-thumb" width="988" data-original="https://pic4.zhimg.com/v2-a3dad29934853f3917b489177dab4956_r.jpg?source=1940ef5c"/>

播放流程描述：

- 播放端端发送接入请求：通过 HTTP 发送 AccessRequest ，携带播放 URL 和 offer SDP；
- RTS 收到播放的接入请求后，记录 offerSDP 和 URL ，然后创建 answerSDP，生成一次会话 token 并设置到 SDP 的 ufrag 字段，通过 http 响应发送给客户端。
- 客户端设置 answerSDP，发送 Binding Request 请求，请求中 USERNAME 字段携带 answerSDP 中的 ufrag（即 RTS 下发的 token ）。
- RTS 收到 Binding Request，根据 USERNAME 中的 token，找到之前 HTTP 请求相关信息，记录用户 IP 和端口。 借助 Binding Request 的 USERNAME 传递 token 是由于 RTS 是单端口方案，需要根据 UDP 请求中的 token 信息确定是哪个用户的请求。传统的 WebRTC 是根据端口区分用户，RTS 为每个用户设置端口会带来巨大的运维成本。

标准 WebRTC 接入过程会有各种限制：

- 它不支持直播中常用音频 AAC 编码和 44.1k 采样率。
- 其它不支持视频 B 帧、H265等编码特性，多 slice 编码在弱网下也会花屏。
- WebRTC 建联过程耗时过长，会影响秒开体验。基于以上的这些问题，我们设计了更为高效、兼容性更好的私有协议接入

### 两种接入方式对比

<img src="https://pic2.zhimg.com/50/v2-c7fafc001368c03fd4277fde74175515_hd.jpg?source=1940ef5c" data-caption="" data-size="normal" data-rawwidth="972" data-rawheight="533" data-default-watermark-src="https://pic2.zhimg.com/50/v2-25b0a8a49142fe10a1a31cebf69b545e_hd.jpg?source=1940ef5c" class="origin_image zh-lightbox-thumb" width="972" data-original="https://pic1.zhimg.com/v2-c7fafc001368c03fd4277fde74175515_r.jpg?source=1940ef5c"/>
标准 WebRTC 接入的优点：
标准 WebRTC 接入除了 HTTP 建联请求外，全部符合 WebRTC 规范。
标准终端方便接入。
可快速实现原型。

标准 WebRTC 接入的缺点：
建联过程耗时长，使用HTTP情况下达到5RTT，选用HTTPS会更长。媒体必须加密传输。
音视频有相关限制，使用时需要在服务端转码。

私有协议接入优点：
基于标准扩展信令和媒体协议，与标准协议差异很小。
建联速度快，秒开体验非常好。
支持直播技术栈，增加了媒体兼容性，减少了服务端转码成本。

私有协议接入缺点：
虽基于标准扩展，但仍然带来了部分私有化实现。
使用私有协议后，复杂度有所提升。淘宝直播落地方案中，为了能够获得更好的体验，Native 端我们使用私有协议接入，目前已在线上大规模运行。

### 流程协议设计原则

<img src="https://pic1.zhimg.com/50/v2-f8f2e8efbae20ac09ab1ce051333f3a8_hd.jpg?source=1940ef5c" data-caption="" data-size="normal" data-rawwidth="958" data-rawheight="377" data-default-watermark-src="https://pic3.zhimg.com/50/v2-db4f5ee661b8fdf8ce55c083ee4632ce_hd.jpg?source=1940ef5c" class="origin_image zh-lightbox-thumb" width="958" data-original="https://pic4.zhimg.com/v2-f8f2e8efbae20ac09ab1ce051333f3a8_r.jpg?source=1940ef5c"/>

流程协议设计原则有三个：

- 尽量使用标准，包括 WebRTC 相关规范。这个原则意味着我们和标准 WebRTC 互通，会非常方便。
- 当标准和体验发生冲突时，优先保障体验。
- 当需要扩展时，基于标准协议扩展，并且使用标准扩展方式。

我们并没有将 RTP/RTCP 协议全部推翻，使用完全的私有协议，有两个原因：首先是工作量问题，重新设计的工作量会比使用标准协议多很多。其次， RTP/RTCP 协议设计非常精简，久经考验，自己设计不一定能考虑到所有问题。所以我们选择基于标准扩展而非重新设计。

### 基于webrtc全模块的接入方案

基于webrtc全模块的接入方案，使用webrtc的所有模块，通过对部分模块的修改，实现低延迟直播功能。这个方案的优缺点并存：优点：经过多年发展，它非常成熟，很稳定，同时提供了完整的解决方案，包括 NACK、jitterbuffer、NetEQ 等可直接用于低延迟直播。缺点：它的缺点也很很明显。如上图中是WebRTC整体架构，它是一个从采集、渲染、编解码到网络传输的完备的端对端方案，对现有推流端和播放端侵入性极大，复杂度极高。RTC技术栈和直播技术栈存在差异，他不支持B帧、265等特性。在QOS策略方面，WebRTC的原生应用场景是通话，它的基本策略是延迟优于画质，这个策略在直播中不一定成立。包大小：所有webrtc模块全部加入到APP中，包大小至少增加3M。

### 播放器针对低延迟直播的修改

我们目前终端的整体接入方案如上图，也是基于 WebRTC，但是我们只使用了 WebRTC 几个核心传输相关模块，包括 RTP/RTCP、FEC、NACK、Jitterbuffer、音视频同步、拥塞控制等。我们在这些基础模块上进行了封装，将他们封装成 FFmpeg 插件注入到 FFmpeg 中。之后播放器可直接调用 FFmpeg 相关方法打开 URL 即可接入我们的私有低延迟直播协议。这样可极大减少播放器和推流端的修改，降低对低延迟直播技术对原有系统的侵入。同时，使用基础模块也极大减少了包大小的占用。

作者：阿里巴巴淘系技术
链接：<https://www.zhihu.com/question/25497090/answer/1314802509>
来源：知乎
著作权归作者所有。商业转载请联系作者获得授权，非商业转载请注明出处。

作者：阿里巴巴淘系技术
链接：<https://www.zhihu.com/question/25497090/answer/1314802509>
来源：知乎
著作权归作者所有。商业转载请联系作者获得授权，非商业转载请注明出处。

#### 业务价值

低延迟直播技术目前已在淘宝直播中大规模应用，它的上线降低了淘宝直播的延迟，提升了用户的互动体验，这是最直接的价值。所有的技术优化都是为了创造业务价值，所有体验的提升应该对业务提升有帮助。我们经过线上验证发现，低延迟直播对电商直播的成交有明显的促进作用，其中 UV 转化率提升4%，GMV 提升5%。同时，低延迟直播技术也可支持更多业务形态，例如拍卖直播，客服直播等。

### 展望

1. 标准webRTC支持直播
2. 5G对低延迟技术的影响
3. 低延迟直播协议统一化，标准化

现在的 WebRTC 开源软件还不能很好支持直播，希望未来的标准 WebRTC 能很好直播，这样我们可以很方便的在浏览器上做低延迟直播。5G 到来后，网络环境会越来越好，低延迟直播技术会成为直播行业未来的一个技术方向。现在各厂商的低延迟直播协议大都存在私有协议，对用户来说，从一个厂商切换到另一个厂商时成本会很高。低延迟直播协议的统一、标准化对直播行业非常重要。一个基本判断是，随着低延迟直播技术的方案和普及，低延迟直播协议在未来一定会走向统一化和标准化。也希望我们国家的技术厂商能够在推动低延迟直播标准化的过程中发出自己的声音，贡献自己的力量。

### 参考文献

1. <https://segmentfault.com/a/1190000011403597>
2. <https://www.zhihu.com/question/25497090>
