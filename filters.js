/**
 * @Author lijiye(764291507@qq.com)
 * @Date 2019/8/12 14:32
 * @Description: 全局过滤器统一管理
 */
import precision from 'number-precision'
import Dayjs from 'dayjs'
/*
 * UTC2Date('YYYY-MM-DD HH:mm:ss')
 * */
export function UTC2Date(str = '', fmt = 'YYYY/MM/DD') {
  if (!str) {
    return ''
  }
  if (typeof str === 'string') {
    str = str.replace(/-/g, '/')
  }

  return Dayjs(str).format(fmt)
}

export function UTC2Time(str = '') {
  if (!str) {
    return ''
  }
  if (typeof str === 'string') {
    str = str.replace(/-/g, '/')
  }
  return Dayjs(str).format('YYYY-MM-DD HH:mm')
}

export function UTC2Month(str = '', fmt = 'MM/DD') {
  if (!str) {
    return ''
  }
  if (typeof str === 'string') {
    str = str.replace(/-/g, '/').replace(' +0800 CST', '')
  }
  return Dayjs(str).format(fmt)
}

function pad(number) {
  if (number < 10) {
    return `0${number}`
  }
  return number
}

/**
 * 中间省略号 按字节算
 * @param str 原串
 * @param start 开始截取长度
 * @param end 结尾截取长度
 * @returns {string}
 */
export function ellipsis(str = '', start = 6, end = 6, res = '') {
  if (!str) {
    return res
  }
  let len1 = 0
  let len2 = 0
  let len3 = 0
  let reg = /[^\\x00-\\xff]/gi
  let leftIndex = 0
  let rightIndex = 0
  let a
  for (let i = 0; i < str.length; i++) {
    a = str.charAt(i)
    len1 += a.match(reg) ? 2 : 1
    if (len1 > start + end) {
      for (let j = 0; j <= start; j++) {
        a = str.charAt(j)
        len2 += a.match(reg) ? 2 : 1
        if (len2 > start) {
          leftIndex = j
          break
        }
      }
      for (let k = str.length; k >= str.length - end; k--) {
        a = str.charAt(k)
        len3 += a.match(reg) ? 2 : 1
        if (len3 > end) {
          rightIndex = str.length - k
          break
        }
      }
      return (str =
        str.substr(0, leftIndex) +
        '...' +
        (rightIndex === 0 ? '' : str.substr(-rightIndex)))
    }
  }
  return str
}

// 参考资料 https://help.aliyun.com/document_detail/44688.html?spm=a2c4g.11186623.6.1382.b09b218cyU5jz9
// 将原图src处理成缩略图src
function resizePicture(pictureSrc, height, width) {
  if (!pictureSrc) {
    return ''
  }
  if (/(^data:)|(\/images\/)|(^blob:)/g.test(pictureSrc)) {
    return pictureSrc
  }
  const originSrc = pictureSrc.split('?')[0]
  return `${originSrc}?x-oss-process=image/resize,m_fill,h_${height},w_${width}`
}

// 将原图src处理成缩略图src 定宽固定高度自适应
function resizeFixedWidthPicture(pictureSrc, width) {
  if (!pictureSrc) {
    return ''
  }
  if (/(^data:)|(\/images\/)|(^blob:)/g.test(pictureSrc)) {
    return pictureSrc
  }
  const originSrc = pictureSrc.split('?')[0]
  // 对于缩略图：对缩略后的图片大小有限制，目标缩略图宽与高的乘积不能超过 4096x4096，且单边长度不能超过 4096。
  return `${originSrc}?x-oss-process=image/resize,w_${width >= 4096 ? 4096 : width}`
}

// 将原图src处理成缩略图src 按长边短边：将图最长边限制在 x 像素，短边按比例处理。
function resizeLongSidePicture(pictureSrc, height, width) {
  if (!pictureSrc) {
    return ''
  }
  if (/(^data:)|(\/images\/)|(^blob:)/g.test(pictureSrc)) {
    return pictureSrc
  }
  const originSrc = pictureSrc.split('?')[0]
  return `${originSrc}?x-oss-process=image/resize,m_lfit,h_${height},w_${width}`
}

// 将秒数转化成00:00的格式
function mmss(time) {
  if (!time) {
    return '00:00'
  }
  let seconds = Math.round(time)
  return `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`
}

function getVideoPoster(url, width = 160, height = 200) {
  // console.log(url)
  if (!url || url.indexOf('blob:') > -1) {
    return ''
  }
  // 当前仅支持对视频编码格式为H264的视频文件进行视频截帧。
  // 截图模式，不指定则为默认模式，根据时间精确截图，如果指定为fast则截取该时间点之前的最近的一个关键帧
  return `${url}?x-oss-process=video/snapshot,t_2000,f_jpg,w_${width},h_${height},m_fast`
}

function getMediaPath(url, type = 'img', needDefault = false) {
  // console.log(url, needDefault)
  if (/(^data:)|(\/images\/)|(^blob:)/g.test(url)) {
    return url
  }
  if (url) {
    if (url.indexOf('http') === -1 && url.indexOf('@') === -1) {
      if (type === 'record') {
        url = ENV_URL.live + '/' + url
      } else {
        url = ENV_URL.host + `/${type}/` + url.replace(`${type}/`, '')
      }
    }
    return url
  } else if (!url && type === 'img' && needDefault) {
    return defaultImg
  } else {
    return url || ''
  }
}

/**
 * 根据日期计算星期几
 * 传入date对象或者'2018-11-05'格式字符串
 * 不传返回默认为当天
 */
export function dateToWeek(date = new Date()) {
  let day
  if (!(date instanceof Date)) {
    day = new Date(date).getDay()
  } else {
    day = date.getDay()
  }
  const weekday = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  return weekday[day]
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

/* s 转换为 hms */
export function transformSecondToRead(val) {
  let h = parseInt(val / 3600)
  let m = parseInt((val - h * 3600) / 60)
  let s = val - h * 3600 - m * 60
  let res = ''
  if (h > 0) {
    res += `${h}时`
  }
  if (m > 0) {
    res += `${m}分`
  }
  res += `${s}秒`
  return res
}


/**
 * 后端传入的金额是分为单位 需要转换为元 直接换算会有精度丢失问题
 * eg: 19.9 / 100 => 0.19899999999999998
 * eg: 19.9 * 100 => 1998.9999999999998
 * eg: 2.3 + 2.4 => 4.699999999999999
 * eg: 1.0 - 0.9 => 0.09999999999999998
 * 1.335.toFixed(2) // 1.33
 * @param money
 * @returns {number}
 */
export function centToYuan(money) {
  if (!money) return 0
  return precision.divide(money, 100)
}

export function YuanToCent(money) {
  if (!money) return 0
  return precision.times(money, 100)
}

/* 乘法可传入多个参数 */
export function times(...args) {
  return precision.times(...args)
}

export function round(money, ratio = 2) {
  if (!money) return 0
  return precision.round(money, ratio)
}

/**
 * 格式化金额
 * 12345 格式化为12, 345.00
 * 12345.6 格式化为12, 345.60
 * 12345.67 格式化为 12, 345.67
 * 只留两位小数。 可以控制小数位数， 自动四舍五入。
 * @param {*} s // money
 * @param {*} n // 位数 默认2位
 */
export function moneyFormat(s, n = 2) {
  return (+s || 0).toFixed(n).replace(/^\d+/g, m => m.replace(/(?=(?!^)(\d{3})+$)/g, ','))
}

/* 转换为 百分比 */
export function percent(val) {
  if (val) {
    let newValue = precision.round(precision.times(val, 100), 2) + ''
    if (!newValue.split('.')[1]) {
      newValue += '.00'
    } else if (newValue.split('.')[1].length === 1) {
      newValue += '0'
    }
    return newValue + '%'
  }
  return '00.00%'
}
