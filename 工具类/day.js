// Dayjs(),接受空参数和undefine的， ‘’ 和null 不行
// 时区问题，elementui时间组件使用是输入可以很多种，，如果手动切换时区，你需要把转换为北京时区，后台默认是北京时区
// 存贮都是北京时间，但是显示可以不同，切换时区，展示不一样，但是elementui时间组件 只能用本地时间展示

import dayjs from 'dayjs'
import store from '@/store'
let utc = require('dayjs/plugin/utc') // dependent on utc plugin
let timezone = require('dayjs/plugin/timezone')
dayjs.extend(utc)
dayjs.extend(timezone)
console.log(dayjs.tz.guess())
// dayjs.tz.setDefault("Asia/Shanghai")
// 注意： dayjs.tz.setDefault 不会影响现有的 dayjs 对象。
function Dayjs(str, isFormat = true) {
  // 中国 "Asia/Shanghai"
  if (store.state.app.timezone && isFormat) {
    return dayjs(str).tz(store.state.app.timezone)
  } else {
    return dayjs(str)
  }
}
Dayjs.unix = dayjs.unix
export default Dayjs
export { dayjs }
