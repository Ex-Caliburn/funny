import { centToYuan } from '@/utils/filters'
/**
 * 格式化金额,兼容负数
 * 12345    => 12, 345.00    -12345 => -12,345.00
 * 12345.6  => 12, 345.60
 * 12345.67 => 12, 345.67
 * 只留两位小数。 可以控制小数位数， 自动四舍五入。
 * @param {*} s // money
 * @param {*} n // 位数 默认2位
 */
export function moneyFormat(s, n = 2) {
  return (+s || 0).toFixed(n).replace(/\d+/g, m => m.replace(/(?=(?!^)(\d{3})+$)/g, ','))
}
/**
 * 以分为单位
 * 1234 => 12.34
 * 1200 => 12.00
 * 123400 => 1,234.00
 * @param {*} value
 */
export function amountFormat(value) {
  return moneyFormat(centToYuan(value))
}

/**
 * 小数格式化,保留有效小数位
 * 0 => 0.00
 * 12 => 12.00
 * 12.1 => 12.10
 * @param {*} value
 * @param {*} options decimal：保留小数位
 */
export function numberFormat(value = 0, options) {
  options = Object.assign({ decimal: 2 }, options)
  return Number(value).toFixed(options.decimal)
}

/**
 * 整数格式化，以千位分割单位
 * 如：0 => 0
 * 123 => 123
 * 1234 => 1,234
 * -123 => -123
 * -1234 => -1,234
 * 123456789 => 123,456,789
 * @param {*} value
 * @param {*} options
 */
export function integerFormat(value) {
  return moneyFormat(value, 0)
}
