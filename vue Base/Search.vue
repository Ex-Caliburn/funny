<template>
  <el-input
    ref="elInput"
    clearable
    v-bind="[$props, $attrs]"
    v-on="$listeners"
    @keyup.enter.native="searchMethod(value)"
    @clear="searchMethod('')"
  >
    <el-button
      slot="append"
      icon="el-icon-search"
      @click="searchMethod(value)"
    ></el-button>
  </el-input>
</template>
<script>
export default {
  name: 'BaseSearch',
  props: {
    value: {
      type: [String, Number]
    },
    searchMethod: {
      type: Function,
      default() {
        return function() {}
      }
    }
  },
  methods: {
    focus() {
      this.$refs.elInput.focus()
    },
    blur() {
      this.$refs.elInput.blur()
    }
  }
}
</script>
