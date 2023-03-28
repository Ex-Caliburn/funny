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
  c = c || (p.constructor === Array ? [] : {})
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
    return Object.prototype.toString.call(value) == '[object Number]' && !isNaN(obj)
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
  revokeObjectURL
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

// https://developer.mozilla.org/zh-CN/docs/Web/API/Document/cookie
//   * docCookies.setItem(name, value[, end[, path[, domain[, secure]]]])
//   * docCookies.getItem(name)
//   * docCookies.removeItem(name[, path], domain)
//   * docCookies.hasItem(name)
//   * docCookies.keys()
var docCookies = {
  getItem: function (sKey) {
    return (
      decodeURIComponent(
        document.cookie.replace(
          new RegExp(
            '(?:(?:^|.*;)\\s*' +
              encodeURIComponent(sKey).replace(/[-.+*]/g, '\\$&') +
              '\\s*\\=\\s*([^;]*).*$)|^.*$'
          ),
          '$1'
        )
      ) || null
    )
  },
  setItem: function (sKey, sValue, vEnd, sPath, sDomain, bSecure) {
    if (!sKey || /^(?:expires|max\-age|path|domain|secure)$/i.test(sKey)) {
      return false
    }
    var sExpires = ''
    if (vEnd) {
      switch (vEnd.constructor) {
        case Number:
          sExpires =
            vEnd === Infinity
              ? '; expires=Fri, 31 Dec 9999 23:59:59 GMT'
              : '; max-age=' + vEnd
          break
        case String:
          sExpires = '; expires=' + vEnd
          break
        case Date:
          sExpires = '; expires=' + vEnd.toUTCString()
          break
      }
    }
    document.cookie =
      encodeURIComponent(sKey) +
      '=' +
      encodeURIComponent(sValue) +
      sExpires +
      (sDomain ? '; domain=' + sDomain : '') +
      (sPath ? '; path=' + sPath : '') +
      (bSecure ? '; secure' : '')
    return true
  },
  removeItem: function (sKey, sPath, sDomain) {
    if (!sKey || !this.hasItem(sKey)) {
      return false
    }
    document.cookie =
      encodeURIComponent(sKey) +
      '=; expires=Thu, 01 Jan 1970 00:00:00 GMT' +
      (sDomain ? '; domain=' + sDomain : '') +
      (sPath ? '; path=' + sPath : '')
    return true
  },
  hasItem: function (sKey) {
    return new RegExp(
      '(?:^|;\\s*)' + encodeURIComponent(sKey).replace(/[-.+*]/g, '\\$&') + '\\s*\\='
    ).test(document.cookie)
  },
  keys: /* optional method: you can safely remove it! */ function () {
    var aKeys = document.cookie
      .replace(/((?:^|\s*;)[^\=]+)(?=;|$)|^\s*|\s*(?:\=[^;]*)?(?:\1|$)/g, '')
      .split(/\s*(?:\=[^;]*)?;\s*/)
    for (var nIdx = 0; nIdx < aKeys.length; nIdx++) {
      aKeys[nIdx] = decodeURIComponent(aKeys[nIdx])
    }
    return aKeys
  }
}

var timeoutDuration = (function () {
  var longerTimeoutBrowsers = ['Edge', 'Trident', 'Firefox']
  for (var i = 0; i < longerTimeoutBrowsers.length; i += 1) {
    if (isBrowser && navigator.userAgent.indexOf(longerTimeoutBrowsers[i]) >= 0) {
      return 1
    }
  }
  return 0
})()

function microtaskDebounce(fn) {
  var called = false
  return function () {
    if (called) {
      return
    }
    called = true
    window.Promise.resolve().then(function () {
      called = false
      fn()
    })
  }
}

function taskDebounce(fn) {
  var scheduled = false
  return function () {
    if (!scheduled) {
      scheduled = true
      setTimeout(function () {
        scheduled = false
        fn()
      }, timeoutDuration)
    }
  }
}

// 去掉url参数search 指定参数，并可修改url
function deleteKeyUrlSearch(key, url) {
  if (!key) return
  let urlObj = new URL(url || window.location.href)
  urlObj.searchParams.delete(key)
  if (!url) {
    let temp = {}
    urlObj.searchParams.forEach((value, key) => {
      temp[key] = value
    })
    history.replaceState(temp, '', window.location.pathname)
  } else {
    return urlObj.toString()
  }
}

export function supportTouch() {
  return (
    'ontouchstart' in window ||
    (window.DocumentTouch && document instanceof window.DocumentTouch) ||
    navigator.maxTouchPoints > 0 ||
    window.navigator.msMaxTouchPoints > 0
  )
}

export function getMonthDay(date) {
  if (!date) return
  return date.replace(/\d{4}\-(\d{2})\-(\d{2}) (\d{2}:\d{2}:\d{2})/, ($1, $2, $3) => {
    return `${$2}.${$3}`
  })
}

/**
 *
 * @param {*} html html文本
 * @param {*} limit 限制长度
 *  return 纯文本
 */
export function getTextByHtml(html = '', limit) {
  if (typeof html !== 'string' || !html.length) return ''
  // 过滤标签 只取纯文本
  const regEx_html = /<[^>]+>/g
  const text = html.replace(regEx_html, '').replace(/&nbsp;/g, ' ')
  if (!limit) return text
  return text.length > limit ? text.slice(0, limit) + '...' : text
}

// 中文正则表达式
const CNRE = /[^\\x00-\\xff]/gi
/**
 *
 * @param {*} str 原字符串
 * @param {*} maxBitLength 截取字节长度
 * return 截取后的字符
 */
export function cutBits(str, maxBitLength) {
  let len = 0
  let i
  // 贪心
  if (str.length * 2 <= maxBitLength) {
    return str
  }
  for (i = 0; i < str.length; i++) {
    if (str[i].match(CNRE) != null) {
      // 全角
      len += 2
    } else {
      len += 1
    }
    if (len > maxBitLength) {
      break
    }
  }
  return str.slice(0, i)
}
// 获取字符串字节长度
export function getBitsLength(str) {
  if (!str) {
    return 0
  }
  let len = 0
  for (let i = 0; i < str.length; i++) {
    if (str[i].match(CNRE) != null) {
      // 全角
      len += 2
    } else {
      len += 1
    }
  }
  return len
}

/**
 * 拷贝源对象部分属性
 * @param {*} object
 * @param {*} propertyNames 格式为 'id,title,items'
 */
export function copyPartProperty(obj, propertyNames) {
  if (!isObject(obj)) return clone(obj)
  const resObj = {}
  propertyNames.split(',').forEach((property) => {
    if (hasOwn(obj, property)) {
      resObj[property] = clone(obj[property])
    }
  })
  return resObj
}

/**
 * 更新源对象部分属性
 * @param {*} object
 * @param {*} propertyNames 格式为 'id,title,items'
 */
export function updatePartProperty(originObj, obj, propertyNames) {
  if (!isObject(obj)) return clone(originObj)
  propertyNames.split(',').forEach((property) => {
    if (hasOwn(obj, property)) {
      originObj[property] = clone(obj[property])
    }
  })
  return originObj
}
/**
 * 从目标对象 更新源对象所有属性
 * @param {*} originObject
 * @param {*} targetObject
 * @param {*} isDelete 多余属性移除
 */
export function replaceAllObjectProperty(originObject, targetObject, isDelete = true) {
  if (!isObject(originObject)) return clone(originObject)
  for (let property in targetObject) {
    if (hasOwn(targetObject, property)) {
      originObject[property] = clone(targetObject[property])
    }
  }
  if (isDelete) {
    for (let property in originObject) {
      if (hasOwn(originObject, property) && !hasOwn(targetObject, property)) {
        delete originObject[property]
      }
    }
  }
}

/**
 * 转为驼峰格式
 */
const camelizeRE = /-(\w)/g
export const camelize = (str) => {
  return str.replace(camelizeRE, (_, c) => (c ? c.toUpperCase() : ''))
}
/**
 * 用连字符连接
 */
const hyphenateRE = /\B([A-Z])/g
export const hyphenate = (str) => {
  return str.replace(hyphenateRE, '-$1').toLowerCase()
}
/**
 * 下划线转为驼峰式
 */
const underlineRE = /_(\w)/g
export const underline = (str) => {
  return str.replace(underlineRE, (_, c) => (c ? c.toUpperCase() : ''))
}
/**
 * 首字母大写
 */
export const capitalize = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// 获取字节长度 空格算一个字符
export function getByteLen(val) {
  let len = 0
  for (let i = 0; i < val.length; i++) {
    if (val[i].match(/[^\\x00-\\xff\s]/gi) != null) {
      // 全角
      len += 2
    } else {
      len += 1
    }
  }
  return len
}
/**
 * @param {type} String
 * @return:  str 指定长度的字符串
 */
export function getByteLenStr(str = '', byte) {
  let len = 0
  let i
  for (i = 0; i < str.length; i++) {
    if (str[i].match(/[^\\x00-\\xff\s]/gi) != null) {
      // 全角
      len += 2
    } else {
      len += 1
    }
    if (len > byte) {
      break
    }
  }
  return i
}

// 将对象序列化 往一个 url 添加查询字符串,
export function appendQuery(url, params = {}) {
  let query = Object.keys(params)
    .map((key) => {
      return encodeURIComponent(key) + '=' + encodeURIComponent(params[key])
    })
    .join('&')
  return url + (url.indexOf('?') === -1 ? '?' : '&') + query
}

/**
 * 获取区分中英文的长度,中文为两个字符,英文为一个字符
 */
export function getWordRealLength(str) {
  let len = 0
  for (let i = 0; i < str.length; i++) {
    if (str[i].match(/[^\\x00-\\xff\s]/gi) != null) {
      // 全角
      len += 2
    } else {
      len += 1
    }
  }
  return len
}

export function pad(number) {
  if (number < 10) {
    return `0${number}`
  }
  return number
}

// 将数据放入localStorage
export function setItem(key, value) {
  if (value) {
    localStorage.setItem(key, JSON.stringify(value))
  } else {
    localStorage.setItem(key, '')
  }
}

// 从localStorage获取数据
export function getItem(key) {
  try {
    let tamp = localStorage.getItem(key)
    if (tamp) {
      return JSON.parse(tamp)
    } else {
      return ''
    }
  } catch (err) {
    console.log(err)
    return ''
  }
}
// 从localStorage删除数据
export function removeItem(reg) {
  if (typeof reg === 'string') {
    localStorage.removeItem(reg)
  } else if (reg instanceof Array) {
    reg.map((item) => {
      removeItem(item)
    })
  } else if (reg instanceof RegExp) {
    for (let key in localStorage) {
      let arr = key.match(reg)
      if (arr && arr.length > 0) {
        localStorage.removeItem(key)
      }
    }
  }
}

// 将对象序列化 往一个 url 添加查询字符串,
export function appendQuery(url, params = {}) {
  let query = Object.keys(params)
    .map((key) => {
      return encodeURIComponent(key) + '=' + encodeURIComponent(params[key])
    })
    .join('&')
  return url + (url.indexOf('?') === -1 ? '?' : '&') + query
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
  return new Blob([uInt8Array], {
    type: contentType
  })
}
/**
 * 下载pdf
 * @param {} url
 */
export function downloadPDF(url, fileName) {
  fetch(url)
    .then((res) => {
      return res.blob()
    })
    .then((blob) => {
      let link = document.createElement('a')
      let evt = document.createEvent('HTMLEvents')
      evt.initEvent('click', true, true) // initEvent 不加后两个参数在FF下会报错  事件类型，是否冒泡，是否阻止浏览器的默认行为
      link.download = fileName
      link.href = URL.createObjectURL(blob)
      link.click()
    })
    .catch((err) => {
      console.log(err, '下载失败')
    })
}
/**
 * 获取下载链接
 * @param {} url
 */
export function downloadUrl(url) {
  let nUrl = url
  if (!/http/.test(url)) {
    nUrl = ENV_URL.voiceResources + url
  }
  nUrl = nUrl.replace(/\.silk$/g, /\.mp3/)
  return nUrl
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

export function UTC2TimeStamp(str) {
  if (!str) {
    return ''
  }
  return Dayjs(str).valueOf()
}
/**
 * 后台接口只接收UTC时间格式，因此需要将时间加上今天的日期转成UTC时间格式
 * "10:00" to "2018-10-15T10:00:00+08:00"
 */
export function time2UTC(time) {
  if (time) {
    const tod = Dayjs().format('YYYY-MM-DD')
    return `${tod}T${time}:00+08:00`
  }
  return Dayjs().format()
}

// new Date() => 2019-05-05T18:17:48+08:00
export function Date2UTC(date, hasHms = true) {
  let result = date
  if (typeof date !== 'object') {
    if (typeof date === 'string') {
      if (date.length === 10) {
        return `${date}T00:00:00+08:00`
      }
      if (date.indexOf('+08:00') > -1) {
        return date
      }
    }
    if (date) {
      result = Dayjs(date)
    } else {
      result = Dayjs()
    }
  } else if (!date.$d) {
    result = Dayjs(date)
  }
  let UTC8 = [
    [result.year(), pad(result.month() + 1), pad(result.date())].join('-'),
    'T',
    hasHms
      ? [pad(result.hour()), pad(result.minute()), pad(result.second())].join(':')
      : '00:00:00',
    '+08:00'
  ]
  return UTC8.join('')
}

/**
 * 获取key
 * 当没参数时，使用时间戳作为Key
 * @param {*} params
 */
export function getDiffKey(...params) {
  let str = ''
  params.map((item) => {
    str += '-' + item
  })
  str = str.substr(1)
  return str || Date.now()
}
// 生产任意长度的随机KEY
export function GetRandomKey(len = 8) {
  const chars = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789']
  let KEY = ''
  for (let i = 0; i < len; i += 1) {
    KEY += chars[Math.floor(Math.random() * chars.length)]
  }
  // eg:"erDutSqX"
  return KEY
}

// 通过文件后缀得到文件类型
export function GetFileTypeByFileSuffix(file) {
  let fileType = 0
  const suffix = file.name.split('.').pop().toLowerCase()
  const fileConfig = {
    [RESOURCE_TYPE.PICTURE]: ['jpg', 'gif', 'png', 'jpeg'],
    [RESOURCE_TYPE.VOICE]: ['mp3', 'aac', 'amr', 'dsd'],
    [RESOURCE_TYPE.VIDEO]: ['mp4', 'm3u8', 'flv', 'avi', 'wmv', 'mkv', 'mov', '3gp'],
    [RESOURCE_TYPE.DOC]: ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'pdf']
  }
  Object.keys(fileConfig).forEach((element) => {
    if (fileConfig[element].includes(suffix)) {
      fileType = Number(element)
    }
  })
  return fileType
}

/* 判断移动终端浏览器版本信息 */
export function judeBrowseType() {
  const u = navigator.userAgent
  return {
    trident: u.indexOf('Trident') > -1, // IE内核
    lark: u.indexOf('Lark') > -1, // Lark 飞书客户端
    dingTalk: u.indexOf('DingTalk') > -1, // DingTalk 客户端
    edge: u.indexOf('Edge') > -1, // Edge内核
    mac: u.match(/Mac OS X/) && u.indexOf('Chrome') === -1 && u.indexOf('Firefox') === -1, // 苹果mac safari
    webKit: u.indexOf('Chrome') > -1 && u.indexOf('Edge') === -1, // webKit谷歌内核
    gecko: u.indexOf('Firefox') > -1, // 火狐内核
    wx: /MicroMessenger/i.test(u) // 微信内核
  }
}

/**
 * // 时间比较大小
 * @param {*} t1
 * @param {*} t2
 */
export function compare(t1, t2) {
  if (!t1 || !t2) {
    return false
  }
  const $t2 = new Date(t2).getTime()
  const $t1 = new Date(t1).getTime()
  return $t1 - $t2 === 0 ? 0 : $t1 - $t2 > 0 ? 1 : -1
}

// 字母转汉字 num从零开始
export function EnToChinese(num) {
  return String.fromCharCode(65 + num)
}

// 数字转汉字
export function NumToChinese(num) {
  const chnNumChar = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']
  const chnUnitChar = ['', '十', '百', '千']
  let strIns = ''
  let chnStr = ''
  let unitPos = 0
  let zero = true
  while (num > 0) {
    const v = num % 10
    if (v === 0) {
      if (!zero) {
        zero = true
        chnStr = chnNumChar[v] + chnStr
      }
    } else {
      zero = false
      strIns = chnNumChar[v]
      strIns += chnUnitChar[unitPos]
      chnStr = strIns + chnStr
    }
    unitPos++
    num = Math.floor(num / 10)
  }
  if (chnStr[0] === '一' && chnStr[1] === '十') {
    chnStr = chnStr.substr(1)
  }
  return chnStr
}

/**
 * @param v1
 * @param v2 不传默认为当前版本号 最低支持4.7, 4.7的用户以下就没有了
 * @returns {number}
 * compareCurrentVersion('1.11.0', '1.9.9')  => 1   // 1.11.0 > 1.9.9
 * compareCurrentVersion('1.11.0', '1.11.0') => 0   // 1.11.0 === 1.11.0
 * compareCurrentVersion('1.11.0', '1.99.0') => -1  // 1.11.0 < 1.99.0
 */
export function compareCurrentVersion(v1, v2 = store.state.app.user.AppVersion) {
  if (!v2) {
    return -2
  }
  let len = Math.max(v1.length, v2.length)
  v1 = v1.split('.')
  v2 = v2.split('.')
  for (let i = 0; i < len - 1; i++) {
    // 判断数字部分
    v1[i] = v1[i] || 0
    v2[i] = v2[i] || 0
    let num1 = parseInt(v1[i])
    let num2 = parseInt(v2[i])
    if (num1 > num2) {
      return 1
    } else if (num1 < num2) {
      return -1
    } else {
      // 判断尾部有字母的情况
      let str1 = v1[i].toString().toLowerCase()
      let str2 = v2[i].toString().toLowerCase()
      if (str1 > str2) {
        return 1
      } else if (str1 < str2) {
        return -1
      }
    }
  }
  return 0
}

/*
 * 全角转半角
 */
export function ToCDB(str) {
  let tmp = ''
  for (let i = 0; i < str.length; i++) {
    if (str.charCodeAt(i) > 65248 && str.charCodeAt(i) < 65375) {
      tmp += String.fromCharCode(str.charCodeAt(i) - 65248)
    } else {
      tmp += String.fromCharCode(str.charCodeAt(i))
    }
  }
  return tmp
}

/* 用于 el-table中 头像用户信息渲染 */
export function renderUserInfo(row, h, fn, showRemark) {
  return h(
    'span',
    {
      props: {
        type: 'text',
        title: row.user_name
      },
      // 有回调代表可点击，显示手形鼠标
      class: 'flexh flex-vcenter' + (fn ? ' cursor-pointer' : ''),
      on: {
        click: fn || ''
      }
      // class: 'flexh flex-vcenter'
    },
    [
      h('img', {
        attrs: {
          alt: '头像',
          src: getMediaPath(
            row.face_url || row.user_avatar || row.user_face_url,
            'avatar'
          )
        },
        class: 'jdk-avatar flex0 MR10'
      }),
      row.user_name,
      showRemark
        ? h(
            'span',
            {
              class: 'jdk-third-text'
            },
            `(${row.remark})`
          )
        : ''
    ]
  )
}

// 清理指定时间范围的缓存
export function clearLocalCache(clearTime = 3) {
  for (let item in localStorage) {
    let threshold = Date.now() - 1000 * 60 * 60 * 24 * clearTime
    if (item.timestamp && item.timestamp < threshold) {
      localStorage.removeItem(item)
    }
  }
}

/* 获取跨域图片base64 */
export function imgToBase64(url, callback, ext = 'png') {
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
// 将base64转换为文件
export function dataURLtoFile(dataUrl, fileName) {
  var arr = dataUrl.split(','),
    mime = arr[0].match(/:(.*?);/)[1],
    bstr = atob(arr[1]),
    n = bstr.length,
    u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new File([u8arr], fileName, { type: mime })
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

/**
 * 生成excel文件，返回临时文件地址
 * @param {Array} dataList excel的每行数据
 * @param {Array} columns 表头字段定义
 */
export async function generateExcelFile(dataList, columns) {
  const workbook = new Excel.Workbook()
  const worksheet = workbook.addWorksheet('My Sheet')

  worksheet.columns = columns
  worksheet.addRows(dataList)
  return workbook.xlsx.writeBuffer().then((buffer) => {
    // buffer --> blob
    const blob = new Blob([buffer], {
      type: 'application/vnd.ms-excel'
    })
    return URL.createObjectURL(blob)
  })
}

// 下载本地临时文件
export function downloadTempFile(filePath, name) {
  if (!filePath) {
    return false
  }

  const link = document.createElement('a')
  link.download = name
  link.target = '_blank'
  // blob --> url
  link.href = filePath
  link.click()
  return true
}

// 下载文件
export function downloadBlob(blob, fileName) {
  // 创建新的URL并指向File对象或者Blob对象的地址
  const blobURL = window.URL.createObjectURL(blob)
  // 创建a标签，用于跳转至下载链接
  const tempLink = document.createElement('a')
  tempLink.style.display = 'none'
  tempLink.href = blobURL
  tempLink.setAttribute('download', decodeURIComponent(fileName))
  // 兼容：某些浏览器不支持HTML5的download属性
  if (typeof tempLink.download === 'undefined') {
    tempLink.setAttribute('target', '_blank')
  }
  // 挂载a标签
  document.body.appendChild(tempLink)
  tempLink.click()
  document.body.removeChild(tempLink)
  // 释放blob URL地址
  window.URL.revokeObjectURL(blobURL)
}

/**
 * @param dataList 数据
 * @param columns 表头
 * @param name 导出文件名
 */
export async function exportExcel(dataList, columns, name) {
  return generateExcelFile(dataList, columns).then((filePath) => {
    return downloadTempFile(filePath, name)
  })
}

/**
 * 模拟链接点击,用于下载
 */
export function mockLinkClick(url, name) {
  let link = document.createElement('a')
  link.download = name
  link.target = '_blank'
  link.href = url
  link.click()
}

// 将秒数转化时分秒
// 示例：61秒 -> [1, 1]
export function readableTime(seconds) {
  const padding = (number) => {
    if (number < 10) {
      return `0${number}`
    }
    return String(number)
  }
  if (!seconds) {
    return '0秒'
  }
  let s = seconds
  let m = 0
  let h = 0
  let sText = s ? `${padding(s)}秒` : ''
  if (s >= 60) {
    m = Math.floor(seconds / 60)
    s = s % 60
    sText = `${padding(s)}秒`
  }
  let mText = m ? `${padding(m)}分` : ''
  if (m >= 60) {
    h = Math.floor(m / 60)
    m = m % 60
    mText = `${padding(m)}分`
  }
  let hText = `${h}时`
  return hText + mText + sText
}

// 替换标点中文到英文
export function replacePunctuationCN2EN(str) {
  return str.replace(/(‘)+|(’)+|(“)+|(”)+/g, ($1) => {
    console.log($1)
    if (['‘', '’'].includes($1)) {
      return "'"
    } else if (['“', '”'].includes($1)) {
      return '"'
    }
    return ''
  })
}

// 生成html并下载
export function makeAndDownloadHTML(str) {
  const blob = new Blob([str], {
    type: 'text/html',
  })
  const a = document.createElement(`a`)
  a.setAttribute(`download`, `download.html`)
  a.setAttribute(`target`, `_blank`)
  const blobURL = URL.createObjectURL(blob)
  a.href = blobURL
  a.click()
  window.URL.revokeObjectURL(blobURL)
}