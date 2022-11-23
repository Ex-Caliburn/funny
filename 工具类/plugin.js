// import Dayjs from 'dayjs'
import Dayjs from '@/utils/day.js'

import debounce from 'lodash.debounce'
import { mapGetters } from 'vuex'

import * as filters from './utils/filters'
import * as directives from './utils/directives'

import { compareCurrentVersion, tableColumnDefaultText } from '@/utils/tools'
import { GRADE_TYPE, EVAL_VOICE_KINDS } from '@/utils/const'

import BaseTable from '@/components/Base/BaseTable'
import BasePagination from '@/components/Base/BasePagination'
import BaseInput from '@/components/Base/BaseInput'
import BaseSearch from '@/components/Base/Search'

const components = [BaseTable, BasePagination, BaseInput, BaseSearch]

/**
 * 全局插件
 * 参考：https://cn.vuejs.org/v2/guide/plugins.html#%E5%BC%80%E5%8F%91%E6%8F%92%E4%BB%B6
 * @param {*} Vue vue构造器
 * @param {*} options 可选的选项对象
 */
const install = function(Vue) {
  // 1. 添加全局方法或 property
  // Vue.myGlobalMethod = function () {
  //   // 逻辑...
  // }

  // 注册全局组件
  components.forEach(component => {
    Vue.component(component.name, component)
  })

  // 2. 添加全局资源
  Object.keys(filters).forEach(k => Vue.filter(k, filters[k])) // 将过滤器全部注册成全局过滤器, 不需要再页面引入
  Object.keys(directives).forEach(k => Vue.directive(k, directives[k]))

  // 3. 注入组件选项
  Vue.mixin({
    data() {
      return {
        EVAL_VOICE_KINDS
      }
    },
    computed: {
      ...mapGetters([
        'isNewEval',
        'evalEngine',
        'user',
        'validDayNum',
        'isCollapse',
        'screenWidth',
        'isLark',
        'isDingTalk'
      ]) // 可以在全局通过this.user获取到用户信息
    },
    methods: {
      compareCurrentVersion,
      tableColumnDefaultText,
      includeID(id) {
        return JSON.parse(sessionStorage.getItem('CourseList') || '[]').includes(id)
      },
      routePush({ name, query, params }) {
        this.$router.push({ name, query, params })
      },
      newTargetRoutePush({ name, query, params }, href = '') {
        let routeData = {}
        if (!href) {
          routeData = this.$router.resolve({ name, query, params })
        } else {
          routeData.href = href
        }
        window.open(routeData.href, '_blank')
      },
      upgradeSystemTips() {
        this.$confirm(
          `${
            GRADE_TYPE[this.user.GroupGrade - 1 || 0].name
          }不支持此功能，如需使用，请联系客服(微信号jdk_shan)升级系统。`,
          '请升级系统',
          {
            center: true,
            type: 'warning',
            showCancelButton: false,
            confirmButtonText: '我知道了',
            cancelButtonText: '取消',
            customClass: 'el-message-custom'
          }
        ).catch(() => {})
      },
      _debounce: debounce(function(fn) {
        fn()
      }, 500),
      Debounce: debounce(
        function(fn) {
          fn()
        },
        1500,
        { leading: true, trailing: false }
      )
    }
  })

  // 4. 添加实例方法
  Vue.prototype.Dayjs = Dayjs
}

export default {
  install
}
