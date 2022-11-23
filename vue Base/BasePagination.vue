<template>
  <el-pagination
    v-show="!(hideOnEmpty && total === 0)"
    v-bind="[$attrs, $props]"
    v-on="$listeners"
    @size-change="handleSizeChange"
    @current-change="handleCurrentChange"
  >
    <template v-for="(slot, name) in $slots" v-slot:[name]>
      <slot :name="name"></slot>
    </template>
  </el-pagination>
</template>

<script>
export default {
  name: 'BasePagination',
  props: {
    // 当数据为空时隐藏，根据total判断
    hideOnEmpty: {
      type: Boolean,
      default: true
    },
    currentPage: {
      type: Number,
      default: 1
    },
    pageSize: {
      type: Number,
      default: 10
    },
    total: {
      type: Number
    },
    pageSizes: {
      type: Array,
      default() {
        return [10, 20, 50, 100]
      }
    },
    layout: {
      type: String,
      default: '->, total, sizes, prev, pager, next, jumper, slot'
    }
  },
  methods: {
    handleSizeChange() {
      this.$emit('update:current-page', 1)
      this.$emit('change')
    },
    handleCurrentChange() {
      this.$emit('change')
    }
  }
}
</script>
