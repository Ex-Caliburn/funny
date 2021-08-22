// 检查两个值是否相等 不对map，set进行处理
// 1 用原生比较
// 检查是否是对象类型
// 不是，直接用 String() 进行比较
// 是，判断是否是数组，对象，对属性进行递归，时间对象时间戳比较

/**
 * Check if two values are loosely equal - that is,
 * if they are plain objects, do they have the same shape?
 */
function looseEqual(a, b) {
  if (a === b) {
    return true
  }
  var isObjectA = isObject(a)
  var isObjectB = isObject(b)
  if (isObjectA && isObjectB) {
    try {
      var isArrayA = Array.isArray(a)
      var isArrayB = Array.isArray(b)
      if (isArrayA && isArrayB) {
        return (
          a.length === b.length &&
          a.every(function (e, i) {
            return looseEqual(e, b[i])
          })
        )
      } else if (a instanceof Date && b instanceof Date) {
        return a.getTime() === b.getTime()
      } else if (!isArrayA && !isArrayB) {
        var keysA = Object.keys(a)
        var keysB = Object.keys(b)
        return (
          keysA.length === keysB.length &&
          keysA.every(function (key) {
            return looseEqual(a[key], b[key])
          })
        )
      } else {
        /* istanbul ignore next */
        return false
      }
    } catch (e) {
      /* istanbul ignore next */
      return false
    }
  } else if (!isObjectA && !isObjectB) {
    return String(a) === String(b)
  } else {
    return false
  }
}

// 驼峰化 一个字符串
/**
 * Create a cached version of a pure function.
 */
function cached(fn) {
  var cache = Object.create(null)
  return function cachedFn(str) {
    var hit = cache[str]
    return hit || (cache[str] = fn(str))
  }
}

/**
 * Camelize a hyphen-delimited string.
 */
var camelizeRE = /-(\w)/g
var camelize = cached(function (str) {
  return str.replace(camelizeRE, function (_, c) {
    return c ? c.toUpperCase() : ''
  })
})
// 对象序列化 post请求用
data = Object.keys(data)
  .map(function (key) {
    return encodeURIComponent(key) + '=' + encodeURIComponent(data[key])
  })
  .join('&')

//数组加1
Array.prototype.add = function (number) {
  return this.map(function (item) {
    return item + number
  })
}

// 生成验证码
function randomCode(length) {
  var chars = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
  var result = ''
  for (var i = 0; i < length; i++) {
    var index = Math.round(Math.random() * 9)
    result += chars[index]
  }
  return result
}

function randomNum(max, min) {
  return parseInt(Math.random() * (max - min + 1) + min, 10)
}

// 按数字从小到大
// sortAB不支持字母
// sort 支持字母
function sortNum(array) {
  return array.sort(function (a, b) {
    return a - b
  })
}
// console.log(sortNum([123,2,310,10]));
console.log([123, 'a', 2, 'b', 310, 10].sort())

/*获取url里的参数*/
// https://mzlottery.caiqr.cn/jingcai/c2c/orderDetail.html?order_id=ID211502870501172733909670
// window.location.search 是 ?order_id=ID211502870501172733909670
function getUrlParam(name) {
  var reg = new RegExp('(^|&)' + name + '=([^&]*)(&|$)') //构造一个含有目标参数的正则表达式对象
  var r = window.location.search.slice(1).match(reg) //匹配目标参数
  if (r != null) return decodeURIComponent(r[2])
  return null //返回参数值
}

var url =
  'https://mzlottery.caiqr.cn/jingcai/c2c/orderDetail.html?order_id=ID211502870501172733909670'
console.log(getUrlParam1(url, 'order_id'))
function getUrlParam1(url, name) {
  var reg = new RegExp('(^|&)' + name + '=([^&]*)(&|$)') //构造一个含有目标参数的正则表达式对象
  var r = url.split('?')[1].match(reg) //匹配目标参数
  if (r != null) return decodeURIComponent(r[2])
  return null
}

// 排列算法,要求顺序A53
function arrangeA(top, bottom) {
  var sum = 1
  for (var i = top; i > 0; bottom--, i--) {
    sum *= bottom
  }
  return sum
}
// 排列算法C35
function arrangeC(top, bottom) {
  var topSum = 1
  var bottomSum = 1
  for (var i = top; i > 0; bottom--, i--) {
    bottomSum *= bottom
  }
  for (var j = top; 0 < j; j--) {
    topSum *= j
  }
  return bottomSum / topSum
}

// 第二种，原型
Array.prototype.combine = function (iItems) {
  function func(n, m) {
    if (m == 0) return 1
    else return n * func(n - 1, m - 1)
  }
  var bottomNumber = this.length
  var topNumber = iItems
  return func(bottomNumber, topNumber) / func(topNumber, topNumber)
}

// c42 4*3/ 2*1
console.log(['03', '07', '32', '33'].combine(2))

function getDate() {
  var dayArr = ['星期天', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  var dataObj = new Date(Date.now())
  var year = dataObj.getFullYear()
  var month = dataObj.getMonth() + 1
  var day = dataObj.getDate()
  var weekday = dayArr[dataObj.getDay()]

  if (month < 10) {
    month = '0' + month
  }
  if (day < 10) {
    day = '0' + day
  }
  return year + '-' + month + '-' + day + ' ' + weekday
}

/*
 *  深复制
 * */
function deepCopy(p, c) {
  var c = c || {}
  for (var i in p) {
    if (typeof p[i] === 'object') {
      c[i] = p[i].constructor === Array ? [] : {}
      deepCopy(p[i], c[i])
    } else {
      c[i] = p[i]
    }
  }
  return c
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
var Cookies = function () {}
Cookies.prototype = {
  secondDomain: location.hostname.split('.').slice(1).join('.'),
  /*
   * 不传path，默认当前路径.不传domain为当前域名，传"auto"使用当前网站二级域名
   * */
  set: function (name, value, expiresTime, domain, path) {
    if (!name || !value) {
      return
    }
    var cookieName = name
    var cookieValue = value
    if (domain == 'auto') {
      //取得当前二级域名
      domain = this.secondDomain
    } else {
      domain = ''
    }
    console.log(path)
    if (!expiresTime) {
      var myDate = new Date()
      console.log(myDate)
      //默认有效期一个月
      myDate.setMonth(myDate.getMonth() + 1)
      console.log(myDate)
    }
    document.cookie =
      cookieName +
      '=' +
      cookieValue +
      ';expires=' +
      (expiresTime || myDate) +
      ';domain=' +
      domain +
      ';path=' +
      path
  },
  get: function (name) {
    var reg = new RegExp('(^| )' + name + '=([^;]*)(;|$)')
    var arr = document.cookie.match(reg)
    if (arr) {
      return arr[2]
    } else {
      return null
    }
  },
  delete: function (name, domain) {
    if (domain == 'auto') {
      //取得当前二级域名
      domain = this.secondDomain
    } else {
      domain = ''
    }
    var expires = new Date()
    expires.setTime(expires.getTime() - 1)
    console.log(expires.toGMTString())

    var oldValue = getCookie(name)
    if (oldValue != null) {
      document.cookie =
        name + '=' + oldValue + ';expires=' + expires.toGMTString() + ';domain=' + domain
    }
  }
}

var cookies = new Cookies()

// cookies.set('isReload',3,null,null,'/1');

// 工具 效验函数
var util = (function () {
  function isNumber(value) {
    return Object.prototype.toString.call(value) == '[object Number]'
  }
  function isString(value) {
    return Object.prototype.toString.call(value) == '[object String]'
  }

  function isObject(value) {
    return Object.prototype.toString.call(value) == '[object Object]'
  }
  function isFunction(value) {
    return Object.prototype.toString.call(value) == '[object Function]'
  }

  function isArray(value) {
    return Object.prototype.toString.call(value) == '[object Array]'
  }
  function isNull(value) {
    return Object.prototype.toString.call(value) == '[object Null]'
  }
  function isUndefined(value) {
    return Object.prototype.toString.call(value) == '[object Undefined]'
  }

  function isBoolean(value) {
    return Object.prototype.toString.call(value) == '[object Boolean]'
  }

  function isRegExp(value) {
    return Object.prototype.toString.call(value) == '[object RegExp]'
  }
  function isMap(value) {
    return Object.prototype.toString.call(value) == '[object Map]'
  }
  function isSet(value) {
    return Object.prototype.toString.call(value) == '[object Set]'
  }
  function isSymbol(value) {
    return Object.prototype.toString.call(value) == '[object Symbol]'
  }
  function isBigInt(value) {
    return Object.prototype.toString.call(value) == '[object BigInt]'
  }
  function isDate(value) {
    return Object.prototype.toString.call(value) == '[object Date]'
  }
  

  return {
    isSet,
    isMap,
    isSymbol,
    isBigInt,
    isDate,
    isArray: isArray,
    isRegExp: isRegExp,
    isBoolean: isBoolean,
    isUndefined: isUndefined,
    isNull: isNull,
    isFunction: isFunction,
    isObject: isObject,
    isString: isString,
    isNumber: isNumber
  }
})()

//判断NaN
// Object.prototype.toString.call(NaN) == "number";
function myIsNaN(value) {
  if (typeof value == 'number') {
    if (isNaN(value)) {
      return true
    }
  }
}

// 伪数组转换伪真数组
function arrayTransform(arr) {
  return [].slice.call(arr)
}

// 限制中英文混合用户名长度
function nameFilter(val) {
  // 获取字符串长度（汉字算两个字符，字母数字算一个）
  let len = 0
  let numLen = 0
  const limit = 10
  for (let i = 0; i < val.length; i++) {
    let a = val.charAt(i)
    if (a.match(/[^\x00-\xff]/gi) !== null) {
      len += 1
    } else {
      numLen += 1
    }
    if (len * 2 + numLen > limit) {
      return val.slice(0, len + numLen)
    }
  }
  return val
}

/* 获取跨域图片base64 */
function imgToBase64(url, callback, ext = 'png') {
  let canvas = document.createElement('canvas') //创建canvas DOM元素
  let ctx = canvas.getContext('2d')
  let img = new Image()
  img.crossOrigin = 'Anonymous' // 支持跨域
  img.src = url
  img.onload = () => {
    canvas.height = img.height //指定画板的高度,自定义
    canvas.width = img.width //指定画板的宽度，自定义
    ctx.drawImage(img, 0, 0) //参数可自定义
    let dataURL = canvas.toDataURL('image/' + ext) // 传递的自定义的参数
    callback.call(this, dataURL) //回掉函数获取Base64编码
    canvas = null
  }
}

/* 将obj2对象中与obj1共同的东西拷贝覆盖到obj1 */
export function objectAssignment(obj1, obj2) {
  Object.keys(obj1).forEach((item) => {
    obj1[item] = obj2[item]
  })
}

// 字母转汉字 num从零开始
export function EnToChinese(num) {
  return String.fromCharCode(65 + num)
}

/**
 * 计算两个日期之间间隔的天数
 * 错误返回0
 * 包含开始日期和结束日期的情况需要+1修正
 */
export function daysBetweenTwoDates(start, end) {
  if (start && end) {
    const startTime = new Date(start).getTime()
    const endTime = new Date(end).getTime()

    if (endTime >= startTime) {
      return Math.floor((endTime - startTime) / (24 * 3600 * 1000))
    } else if (startTime > endTime) {
      return Math.floor((startTime - endTime) / (24 * 3600 * 1000))
    }
    return 0
  }
  return 0
}

/*  base64转blob */
export function base64ToBlob(code) {
  let parts = code.split(';base64,')
  let contentType = parts[0].split(':')[1]
  let raw = window.atob(parts[1])
  let rawLength = raw.length
  let uInt8Array = new Uint8Array(rawLength)
  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i)
  }
  return new Blob([uInt8Array], { type: contentType })
}

/* 将图片下载到本地 */
export function downloadImg(content, fileName) {
  let aLink = document.createElement('a')
  let blob = base64ToBlob(content) // new Blob([content]);
  let evt = document.createEvent('HTMLEvents')
  evt.initEvent('click', true, true) // initEvent 不加后两个参数在FF下会报错  事件类型，是否冒泡，是否阻止浏览器的默认行为
  aLink.download = fileName
  aLink.href = URL.createObjectURL(blob)
  aLink.click()
}

/* 用于每天读取弹窗 */
export function readDailyPopupConfig(key) {
  if (!key) {
    console.error('key值非法')
    return
  }
  let popupTime = localStorage.getItem(key)
  if (!popupTime || Date.now() - popupTime > ONE_DAY) {
    localStorage.setItem(key, Date.now())
    return true
  }
  return false
}

/* 判断移动终端浏览器版本信息 */
export function judeBrowseType() {
  const u = navigator.userAgent
  let result = {
    ios: !!u.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/), // ios终端
    trident: u.indexOf('Trident') > -1, // IE内核
    edge: u.indexOf('Edge') > -1, // Edge内核
    mac: u.match(/Mac OS X/) && u.indexOf('Chrome') === -1 && u.indexOf('Firefox') === -1, // 苹果mac safari
    webKit: u.indexOf('Chrome') > -1 && u.indexOf('Edge') === -1, // webKit谷歌内核
    gecko: u.indexOf('Firefox') > -1, // 火狐内核
    mobile: !!u.match(/AppleWebKit.*Mobile.*/), //是否为移动终端
    android: u.indexOf('Android') > -1 || u.indexOf('Linux') > -1, //android终端或者uc浏览器
    iPad: u.indexOf('iPad') > -1, //是否iPad
    wx: /MicroMessenger/i.test(u), // 微信内核 和 PC微信内核
    WindowsWX: /WindowsWechat/i.test(u), // 单独PC微信内核
    mobileWx: /MicroMessenger/i.test(u) && !/WindowsWechat/i.test(u) // 单独PC微信内核
  }
  if (
    !(
      result.mobile ||
      result.WindowsWX ||
      result.wx ||
      result.android ||
      result.ios ||
      result.iPad
    )
  ) {
    result.pc = true
  }
  return result
}

/* 判断页面切出屏幕，或者切换tab，以及息屏 */
export function getHiddenProp() {
  var prefixes = ['webkit', 'moz', 'ms', 'o']
  // 如果hidden 属性是原生支持的，我们就直接返回
  if ('hidden' in document) {
    return 'hidden'
  }

  // 其他的情况就循环现有的浏览器前缀，拼接我们所需要的属性
  for (var i = 0; i < prefixes.length; i++) {
    // 如果当前的拼接的前缀在 document对象中存在 返回即可
    if (prefixes[i] + 'Hidden' in document) {
      return prefixes[i] + 'Hidden'
    }
  }

  // 其他的情况 直接返回null
  return null
}

/*
    倒计时 思路不一定是最好的，暂时

 * countDownObj {
 time: 0,
 timer: null,
 leftTime: 0,
 noHour: 0, 没有小时
 format: ''
 }
 haveSecond 是否有秒
 * */
export function countDown(countDownObj, haveSecond = true) {
  if (!countDownObj.time) {
    return
  }
  let leftTime = Math.round(
    (+new Date(countDownObj.time.replace(/-/g, '/')) - +new Date()) / 1000
  )
  countDownObj.timer = setInterval(() => {
    if (leftTime <= 0) {
      clearInterval(countDownObj.timer)
      countDownObj.leftTime = 0
      return
    }
    leftTime--
    let day = Math.floor(leftTime / (60 * 60 * 24))
    let hours = Math.floor((leftTime - day * (60 * 60 * 24)) / (60 * 60))
    let minute = Math.floor((leftTime - day * (60 * 60 * 24) - hours * 60 * 60) / 60)
    let second = Math.floor(
      leftTime - day * (60 * 60 * 24) - hours * 60 * 60 - minute * 60
    )
    let temp = ''
    // console.log(day, hours, minute, second)
    if (day > 0) {
      temp += `<span class="jdk-color-link">${day}</span>天`
    }
    if (hours < 9) {
      hours = '0' + hours
    }
    if (minute < 9) {
      minute = '0' + minute
    }
    if (second < 9) {
      second = '0' + second
    }
    if (!countDownObj.noHour) {
      temp += `<span class="jdk-color-link">${hours}</span>时`
    }
    temp += `<span class="jdk-color-link">${minute}</span>分`
    if (haveSecond && !day) {
      temp += `<span class="jdk-color-link">${second}</span>秒`
    }
    // console.log(temp)
    countDownObj.format = temp
    countDownObj.leftTime = leftTime
  }, 1000)
}

/* 下载跨域图片 */
export function downloadCrossOriginImg(url, fileName = '下载图片', ext = '') {
  imgToBase64(
    url,
    (file) => {
      downloadImg(file, fileName)
    },
    ext
  )
}
