/*
 * Author: ZhuMingYang(332595512@qq.com)
 * Date: 2018-09-26 11:47:20
 * Desc: 全局判断函数、表单验验证规则
 */

/******************************判断函数**************************************/

export function isUsername(str) {
  const validMap = ['admin', 'editor']
  return validMap.indexOf(str.trim()) >= 0
}

/* 合法uri判断*/
export function isURL(textval) {
  const urlregex = /^(https?|ftp):\/\/([a-zA-Z0-9.-]+(:[a-zA-Z0-9.&%$-]+)*@)*((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]?)(\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])){3}|([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+\.(com|edu|gov|int|mil|net|org|biz|arpa|info|name|pro|aero|coop|museum|[a-zA-Z]{2}))(:[0-9]+)*(\/($|[a-zA-Z0-9.,?'\\+&%$#=~_-]+))*$/
  return urlregex.test(textval)
}

/* 小写字母判断*/
export function isLowerCase(str) {
  const reg = /^[a-z]+$/
  return reg.test(str)
}

/* 大写字母判断*/
export function isUpperCase(str) {
  const reg = /^[A-Z]+$/
  return reg.test(str)
}

/* 大小写字母判断*/
export function isAlphabets(str) {
  const reg = /^[A-Za-z]+$/
  return reg.test(str)
}

/*数字判断*/
export function isNumber(num) {
  const reg = /^\d+$/
  return reg.test(num)
}

/******************************表单验证规则**************************************/

/*邮箱验证*/
export function validateEmail(rule, value, callback) {
  if (!value) {
    return callback(new Error('邮箱不能为空！'))
  }
  if (/\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*/.test(value)) {
    return callback()
  }
  return callback(new Error('请填写正确的邮箱！'))
}

/*手机号码验证*/
export function validatePhone(rule, val, callback) {
  if (!val) {
    return callback(new Error('请填写电话号码！'))
  }
  if (/^1(3|4|5|7|8|9)\d{9}$/.test(val)) {
    return callback()
  }
  return callback(new Error('请填写正确的手机号码！'))
}

// 验证六位数字密码
export function validateSixNumbers(rule, val, callback) {
  if (!val) {
    return callback(new Error('请填写密码！'))
  }
  const result = /^\d+$/.test(val)
  if (val.length < 6 || val.length > 6 || !result) {
    return callback(new Error('请填写6位数字密码！'))
  }
  return callback()
}
