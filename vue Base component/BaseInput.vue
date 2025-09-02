<template>
  <div
    :class="[
      'notranslate',
      type === 'textarea' ? 'el-textarea' : 'el-input',
      size ? 'el-input--' + size : '',
      type + '-box',
      {
        'is-disabled': disabled
      }
    ]"
  >
    <input
      v-if="type !== 'textarea'"
      ref="input"
      class="el-input__inner"
      v-bind="$attrs"
      :type="type"
      :maxlength="maxLength"
      :disabled="disabled"
      :value="currentValue"
      @compositionstart="flag = false"
      @compositionend="compositionend"
      @input="handleInput"
      @focus="handleFocus"
      @blur="handleBlur"
      @change="handleChange"
    />
    <textarea
      v-else
      ref="textarea"
      class="el-textarea__inner jdk-scrollbar"
      :value="currentValue"
      :maxlength="maxLength"
      :rows="rows"
      v-bind="$attrs"
      :style="textareaStyle"
      :disabled="disabled"
      @compositionstart="flag = false"
      @compositionend="compositionend"
      @paste="handlePaste"
      @input="handleInput"
      @focus="handleFocus"
      @blur="handleBlur"
      @change="handleChange"
    ></textarea>
    <div :class="'remnant jdk-disabled ' + size">{{ remnant }}/{{ maxLength }}</div>
  </div>
</template>

<script>
import { cutBits, getBitsLength } from '@/utils/shared'
import emitter from '@/mixins/emitter'

export default {
  name: 'BaseInput',
  inheritAttrs: false,
  mixins: [emitter],
  props: {
    type: {
      type: String,
      default: 'text'
    },
    /* 是否按字节计算 */
    isCalcBits: {
      type: Boolean,
      default: true
    },
    value: [String, Number],
    maxLength: {
      type: Number,
      default: 40
    },
    size: {
      type: String,
      default: 'medium'
    },
    disabled: {
      type: Boolean,
      default: false
    },
    resize: {
      type: Boolean,
      default: true
    },
    rows: {
      type: Number,
      default: 5
    },
    validateEvent: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      flag: true,
      attrs: {
        autosize: {
          minRows: 5
        },
        resize: 'none'
      }
    }
  },
  watch: {
    value(val) {
      // this.$nextTick(this.resizeTextarea)
      if (this.validateEvent) {
        this.dispatch('ElFormItem', 'el.form.change', [val])
      }
    }
  },
  computed: {
    currentValue() {
      return this.value
    },
    textareaStyle() {
      return { resize: this.resize }
    },
    remnant() {
      if (this.isCalcBits) {
        return getBitsLength(this.value)
      } else {
        return this.value.length
      }
    }
  },
  mounted() {},
  methods: {
    getInput() {
      return this.$refs.input || this.$refs.textarea
    },
    focus() {
      this.getInput().focus()
    },
    blur() {
      this.getInput().blur()
    },
    handleFocus(event) {
      this.focused = true
      this.$emit('focus', event)
    },
    handleBlur(event) {
      this.focused = false
      this.$emit('blur', event)
      if (this.validateEvent) {
        this.dispatch('ElFormItem', 'el.form.blur', [this.value])
      }
    },
    handleChange(event) {
      this.$emit('change', event.target.value)
    },
    compositionend(e) {
      this.flag = true
      this.handleInput(e)
    },
    handleInput(e) {
      if (!this.flag) {
        return
      }
      // 实现 v-model
      let v = e.target.value
      if (this.isCalcBits) {
        const cutStr = cutBits(v, this.maxLength)
        e.target.value = cutStr
        this.$emit('input', cutStr)
      } else {
        this.$emit('input', v)
      }
    },
    handlePaste(e) {
      this.$emit('paste', e)
    }
  }
}
</script>

<style lang="scss" scoped>
.el-input__inner {
  padding-right: 55px;
}
.mini,
.small {
  font-size: 12px;
}
.medium {
  font-size: 14px;
}

.text-box {
  position: relative;
  .remnant {
    @include vc();
    right: 5px;
    color: #aeb6c4 !important;
  }
}
.textarea-box {
  position: relative;
  & /deep/ textarea {
    padding: 10px;
  }
  .remnant {
    position: absolute;
    right: 5px;
    bottom: 5px;
    line-height: normal;
    color: #aeb6c4 !important;
  }
}
</style>
