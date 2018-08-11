
// 对象序列化 post请求用
data = Object.keys(data).map(function (key) {
    return encodeURIComponent(key) + '=' + encodeURIComponent(data[key]);
}).join('&');

//数组加1
Array.prototype.add = function (number) {
    return this.map(function (item) {
        return item + number;
    })
};

// 生成验证码
function randomCode(length) {
  var chars = ['0','1','2','3','4','5','6','7','8','9'];
  var result = '';
  for (var i = 0; i < length; i++) {
    var index = Math.round(Math.random()*9);
    result += chars[index];
  }
  return result;
}

function randomNum(max, min) {
    return parseInt(Math.random() * (max - min + 1) + min, 10);
}

// 按数字从小到大
// sortAB不支持字母
// sort 支持字母
function sortNum(array) {
    return array.sort(function (a, b) {
        return a - b;
    });
}
// console.log(sortNum([123,2,310,10]));
console.log([123,'a',2,'b',310,10].sort());

/*获取url里的参数*/
// https://mzlottery.caiqr.cn/jingcai/c2c/orderDetail.html?order_id=ID211502870501172733909670
// window.location.search 是 ?order_id=ID211502870501172733909670
function getUrlParam(name) {
    var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)"); //构造一个含有目标参数的正则表达式对象
    var r = window.location.search.slice(1).match(reg);  //匹配目标参数
    if (r != null) return decodeURIComponent(r[2]);
    return null; //返回参数值
}

var url = 'https://mzlottery.caiqr.cn/jingcai/c2c/orderDetail.html?order_id=ID211502870501172733909670'
console.log(getUrlParam1(url,'order_id'));
function getUrlParam1(url,name) {
    var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)"); //构造一个含有目标参数的正则表达式对象
    var r = url.split('?')[1].match(reg);  //匹配目标参数
    if (r != null) return decodeURIComponent(r[2]);
    return null;
}

// 排列算法,要求顺序A53
function arrangeA(top,bottom) {
    var sum = 1;
    for ( var i = top ;i>0;bottom--, i--) {
        sum *= bottom
    }
    return sum;
}
// 排列算法C35
function arrangeC(top,bottom) {
    var topSum = 1;
    var bottomSum = 1;
    for ( var i = top ;i>0;bottom--, i--) {
        bottomSum *= bottom
    }
    for (var j = top; 0 < j; j--) {
        topSum *= j;
    }
    return bottomSum/topSum;
}

// 第二种，原型
Array.prototype.combine = function (iItems) {
    function func(n,m){
        if(m==0)
            return 1;
        else
            return n*func(n-1,m-1);
    }
    var bottomNumber = this.length;
    var topNumber = iItems;
    return func(bottomNumber,topNumber)/func(topNumber,topNumber);
};

// c42 4*3/ 2*1
console.log([ '03', '07', '32', '33' ].combine(2));


function getDate() {
    var dayArr = ['星期天', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    var dataObj = new Date(Date.now());
    var year = dataObj.getFullYear();
    var month = dataObj.getMonth()+1;
    var day = dataObj.getDate();
    var weekday = dayArr[dataObj.getDay()];

    if (month < 10) {
        month = '0' + month;
    }
    if (day < 10) {
        day = '0' + day;
    }
    return year + "-" + month + "-" + day + " " + weekday;
}

/*
*  深复制
* */
function deepCopy(p, c) {
    var c = c || {};
    for (var i in p) {
        if (typeof p[i] === 'object') {
            c[i] = (p[i].constructor === Array) ? [] : {};
            deepCopy(p[i], c[i]);
        } else {
            c[i] = p[i];
        }
    }
    return c;
}


/**
 *    应用场景，就是面对不同二级域名下，信息的传递，如果是相同域名下，localstroge，session是你更好的选择
 存贮的 www.caiqr.com  cookie 域名一致能访问cookie
 如果存储的用的二级域名，拥有相同二级域名都能访问，即 fx.caiqr.com 能访问 www.caiqr.com
 二级域名操作 将改变cookie的当前状态，影响所有
 不同path下可以存储 相同的key-value，取值的时候从当前路径取，往上取到/根目录
 读取只能读取的到key-value，日期，域名，path读不到，
 删除原理只是让时间过期，所以需要路径一致，不同路径不会删除 ，谷歌cookie过期8个小时自动删除，
 */
var Cookies = function(){};
Cookies.prototype = {
    secondDomain:location.hostname.split('.').slice(1).join('.'),
    /*
     * 不传path，默认当前路径.不传domain为当前域名，传"auto"使用当前网站二级域名
     * */
    set:function(name,value,expiresTime,domain,path) {
        if(!name || !value){
            return;
        }
        var cookieName = name;
        var cookieValue = value;
        if(domain == "auto"){
            //取得当前二级域名
            domain = this.secondDomain;
        }else{
            domain = '';
        }
        console.log(path);
        if(!expiresTime){
            var myDate = new Date();
            console.log(myDate);
            //默认有效期一个月
            myDate.setMonth(myDate.getMonth() + 1);
            console.log(myDate);
        }
        document.cookie = cookieName + "=" + cookieValue + ";expires=" + (expiresTime || myDate) + ";domain=" + domain + ";path=" + path ;
    },
    get:function(name){
        var reg=new RegExp("(^| )"+name+"=([^;]*)(;|$)");
        var arr = document.cookie.match(reg)
        if(arr){
            return (arr[2]);
        }
        else{
            return null;
        }
    },
    delete: function  (name,domain){
        if(domain == "auto"){
            //取得当前二级域名
            domain = this.secondDomain;
        }else{
            domain = '';
        }
        var expires = new Date();
        expires.setTime(expires.getTime() - 1);
        console.log(expires.toGMTString());

        var oldValue=getCookie(name);
        if(oldValue!=null){
            document.cookie= name + "="+oldValue+";expires="+expires.toGMTString()+ ";domain=" + domain;
        }
    }
}

var cookies = new Cookies();

// cookies.set('isReload',3,null,null,'/1');

// 工具 效验函数
var util = (function(){
    // number
    function isNumber(value) {
        return Object.prototype.toString.call(value)  == "[object Number]";
    }
    // string ...
    function isString(value) {
        return Object.prototype.toString.call(value)  == "[object String]";
    }

    function isObject(value) {
        return Object.prototype.toString.call(value)  == "[object Object]";
    }
    function isFunction(value) {
        return Object.prototype.toString.call(value)  == "[object Function]";
    }

    function isArray(value) {
        return Object.prototype.toString.call(value)  == "[object Array]";
    }
    function isNull(value) {
        return Object.prototype.toString.call(value)  == "[object Null]";
    }
    function isUndefined(value) {
        return Object.prototype.toString.call(value)  == "[object Undefined]";
    }

    function isBoolean(value) {
        return Object.prototype.toString.call(value)  == "[object Boolean]";
    }

    function isRegExp(value) {
        return Object.prototype.toString.call(value)  == "[object RegExp]";
    }

    return {
        isArray : isArray,
        isRegExp :isRegExp,
        isBoolean : isBoolean,
        isUndefined : isUndefined,
        isNull : isNull,
        isFunction :isFunction,
        isObject : isObject,
        isString : isString,
        isNumber :isNumber,
    }
})();

//判断NaN
// Object.prototype.toString.call(NaN) == "number";
function myIsNaN(value) {
    if(typeof value == "number"){
        if(isNaN(value)){
            return true;
        }
    }
}

// 伪数组转换伪真数组
function arrayTransform(arr) {
    return [].slice.call(arr)
}

// 限制中英文混合用户名长度
function nameFilter (val) {
  // 获取字符串长度（汉字算两个字符，字母数字算一个）
  let len = 0
  let numLen = 0
  const limit = 10
  for (let i = 0; i < val.length; i++) {
    let a = val.charAt(i)
    if (a.match(/[^\x00-\xff]/ig) !== null) {
      len += 1
    } else {
      numLen += 1
    }
    if ((len * 2 + numLen) > limit) {
      return val.slice(0, (len + numLen))
    }
  }
  return val
}
