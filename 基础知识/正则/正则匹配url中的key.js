// `${a}=(\\w+?)` 需要两到 \\
function getUrlParam(url, key) {
  let reg = new RegExp(`${key}=(\\w+?)`)
  let res = url.match(reg)
  return res ? res[1] : ''
}

getUrlParam(
  'https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Function/bind?a=b',
  'a'
)

// query 对象
function getUrlParamObj(url) {
  let reg = new RegExp(`[?&]((\\w+?)=(\\w+?))`, 'g')
  let arr = url.matchAll(reg)
  let res = {}
  for (const item of arr) {
    console.log(item)
    res[item[2]] = item[3]
  }
  return res
}


console.log(getUrlParamObj(
  'https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Function/bind?a=b&f=g&g='
))
