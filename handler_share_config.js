//配置JSconfig
function hander_js_config(data) {
    var title = '彩球狂送8888万壕礼，100%中奖，就等你！';
    var desc = '彩球春节刮刮乐活动火热来袭，8888万奖品已备齐，就等你来领！';
    var imgUrl = 'https://ojhwh2s98.qnssl.com/guaguale-shareIcon.png';
    wx.config(data);
    wx.ready(function() {
        // config信息验证后会执行ready方法，所有接口调用都必须在config接口获得结果之后，config是一个客户端的异步操作，所以如果需要在页面加载时就调用相关接口，则须把相关接口放在ready函数中调用来确保正确执行。对于用户触发时才调用的接口，则可以直接调用，不需要放在ready函数中。
        wx.checkJsApi({
            jsApiList : ['onMenuShareTimeline','onMenuShareAppMessage','showOptionMenu'], // 需要检测的JS接口列表，所有JS接口列表见附录2,
            success : function(res) {
                // 以键值对的形式返回，可用的api值true，不可用为false
                // 如：{"checkResult":{"chooseImage":true},"errMsg":"checkJsApi:ok"}
            }
        });
        //分享到朋友圈
        wx.onMenuShareTimeline({
            title : title, // 分享标题
            link : window.location.href, // 分享链接
            imgUrl : imgUrl, // 分享图标
            success : function(res) {

                // 用户确认分享后执行的回调函数
            },
            cancel : function(res) {

                // 用户取消分享后执行的回调函数
            }
        });
        //分享给好友
        wx.onMenuShareAppMessage({
            title: title, // 分享标题
            desc: desc, // 分享描述
            link: window.location.href, // 分享链接
            imgUrl: imgUrl, // 分享图标
            type: '', // 分享类型,music、video或link，不填默认为link
            dataUrl: '', // 如果type是music或video，则要提供数据链接，默认为空
            success: function () {
                // 用户确认分享后执行的回调函数
            },
            cancel: function () {
                // 用户取消分享后执行的回调函数
            }
        });
        //分享给QQ
        wx.onMenuShareQQ({
            title: title, // 分享标题
            desc: desc, // 分享描述
            link: window.location.href, // 分享链接
            imgUrl: imgUrl, // 分享图标
            success: function () {
                // 用户确认分享后执行的回调函数
            },
            cancel: function () {
                // 用户取消分享后执行的回调函数
            }
        });
        //分享到微博
        wx.onMenuShareWeibo({
            title: title, // 分享标题
            desc: desc, // 分享描述
            link: window.location.href, // 分享链接
            imgUrl: imgUrl, // 分享图标
            success: function () {
                // 用户确认分享后执行的回调函数
            },
            cancel: function () {
                // 用户取消分享后执行的回调函数
            }
        });
        //分享到qq空间
        wx.onMenuShareQZone({
            title: title, // 分享标题
            desc: desc, // 分享描述
            link: window.location.href, // 分享链接
            imgUrl: imgUrl, // 分享图标
            success: function () {
                // 用户确认分享后执行的回调函数
            },
            cancel: function () {
                // 用户取消分享后执行的回调函数
            }
        });
    });
    wx.error(function(res) {
        alert(JSON.stringify(res));
        //config信息验证失败会执行error函数，如签名过期导致验证失败，具体错误信息可以打开config的debug模式查看，也可以在返回的res参数中查看，对于SPA可以在这里更新签名。
    });
}

//传递参数请求wechat_api数据，请求成功后的回调函数fn处理得到的数据
function hander_data_from_wechat_api(fn,share_content,share_fn) {
    //发送请求获取wx_js_config
    $.ajax({
        url : 'https://m.caiqr.com/wxjs/',
        type : 'POST',
        data : {'url':window.location.href},
        datatype : 'json',
        success : function(data) {
            fn(data,share_content,share_fn);
        }
    });
}
