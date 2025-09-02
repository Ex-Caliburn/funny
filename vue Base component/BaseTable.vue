<template>
  <el-table
    class="notranslate"
    ref="__baseTable"
    v-bind="[$props, $attrs]"
    :max-height="maxHeight ? maxHeight : screenWidth"
    v-on="$listeners"
  >
    <template v-for="(slot, name) in $slots" v-slot:[name]>
      <slot :name="name"></slot>
    </template>
  </el-table>
</template>
<script>
export default {
  name: 'BaseTable',
  props: {
    border: {
      type: Boolean,
      default: true
    },
    headerCellClassName: {
      type: String,
      default: 'table-header-cell'
    },
    cellClassName: {
      type: String,
      default: 'table-cell-class'
    },
    emptyText: {
      type: String,
      default: '暂无数据'
    },
    maxHeight: {
      type: [String, Number]
    }
  },
  methods: {
    clearSelection() {
      this.$refs.__baseTable.clearSelection()
    },
    toggleRowSelection(row, selected) {
      this.$refs.__baseTable.toggleRowSelection(row, selected)
    },
    toggleAllSelection() {
      this.$refs.__baseTable.toggleAllSelection()
    }
  }
}
</script>
