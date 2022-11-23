<!-- 
/**
 *  通过内容覆盖原始页面的方式打卡一个可关闭窗口
 * props: visible.sync 控制页面显示, lazy，开启lazy加载
 */
-->
<template>
  <div
    v-if="!lazy || loaded || visible"
    v-show="visible"
    class="full-page"
    :style="{ backgroundColor }"
  >
    <slot></slot>
  </div>
</template>
<script>
import { addClass, removeClass } from '@/utils/dom'
export default {
  name: 'BaseFullPage',
  props: {
    visible: Boolean,
    lazy: {
      type: Boolean,
      default: true
    },
    backgroundColor: {
      type: String,
      default: '#EFF1F7'
    }
  },
  data() {
    return {
      loaded: false
    }
  },
  watch: {
    visible: {
      immediate: true,
      handler(v) {
        if (v) {
          this.loaded = true
          addClass(document.body, 'overflow-hidden')
        } else {
          removeClass(document.body, 'overflow-hidden')
        }
      }
    }
  },
  mounted() {
    if (this.visible) {
      this.loaded = true
      addClass(document.body, 'overflow-hidden')
    } else {
      removeClass(document.body, 'overflow-hidden')
    }
  },
  destroyed() {
    removeClass(document.body, 'overflow-hidden')
  }
}
</script>
<style lang="scss" scoped>
.full-page {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  overflow: auto;
  margin: 0;
  z-index: 1111;
  background: rgba(239, 241, 247, 1);
}
</style>
<style lang="scss">
.overflow-hidden {
  overflow: hidden;
}
</style>
