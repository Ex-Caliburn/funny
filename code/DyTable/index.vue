<template>
  <BaseTable
    ref="baseTable"
    class="dy-table"
    v-bind="[$attrs, $props]"
    v-on="$listeners"
    :data="list"
  >
    <slot name="pre"></slot>
    <el-table-column
      v-for="(tableItem, tableIndex) in sortTableConfig"
      :label="(tableItem.required ? '*' : '') + tableItem.label"
      :key="tableItem.prop + '_' + tableIndex + '_' + tableItem.label"
      :fixed="tableItem.fixed"
      :align="tableItem.align ? tableItem.align : 'center'"
      :prop="tableItem.prop"
      :type="tableItem.columnType"
      :min-width="tableItem.minWidth ? tableItem.minWidth : null"
      :width="tableItem.width ? tableItem.width : null"
      :showOverflowTooltip="
        tableItem.disabled && tableItem.controlOverflowLine
          ? false
          : tableItem.showOverflowTooltip
      "
      :formatter="tableItem.formatter ? tableItem.formatter : null"
    >
      <template slot="header">
        <span :class="tableItem.headerClass">
          {{ (tableItem.required ? '*' : '') + tableItem.label }}
        </span>
        <el-tooltip v-if="tableItem.tooltip" effect="dark" placement="top-start">
          <div slot="content" v-html="tableItem.tooltip"></div>
          <i class="font-16 el-icon-question"></i>
        </el-tooltip>
      </template>

      <template
        v-if="!tableItem.columnType && !tableItem.formatter"
        v-slot="{ row, $index }"
      >
        <!-- list 外层命名要保持一致 -->
        <!-- 这里的children 处理了子有属性而父亲没有 -->
        <!-- required  顺序 全局 disabled > tableItem.disabled > disabledFun > requiredFun > required  -->
        <component
          v-if="
            !(tableItem.hiddenFun && tableItem.hiddenFun(row)) && isShow(row, tableItem)
          "
          :is="inForm ? 'el-form-item' : 'div'"
          :style="tableItem.style || {}"
          :prop="
            !$attrs['tree-props']
              ? `${listName}.${$index}.${tableItem.prop}`
              : `${listName}.${findPosition(list, row.id)}.${tableItem.prop}`
          "
          :rules="[
            {
              required:
                (tableItem.requiredFun && tableItem.requiredFun({ ...row, taskCode })) ||
                (!!tableItem.required &&
                  !(
                    tableItem.disabled ||
                    disabled ||
                    (tableItem.disabledFun && tableItem.disabledFun({ ...row, $index }))
                  )),
              message: $t('components.cmfrule.pk2j34'),
              validator: (rule, value, callback) => {
                return (
                  (tableItem.validatorFun &&
                    tableItem.validatorFun(rule, value, callback, row)) ||
                  validator(rule, value, callback)
                )
              },
            },
          ]"
        >
          <el-tooltip-column
            :key="row[tableItem.prop] + $index"
            :content="row[tableItem.prop]"
            v-if="tableItem.disabled && tableItem.controlOverflowLine"
          />
          <template v-else-if="tableItem.type === FORM_TYPE.DELETE && !disabled">
            <el-button
              :disabled="tableItem.disabled"
              class="text-danger"
              type="text"
              @click="handleDelete($index)"
            >
              {{ tableItem.buttonLabel }}
            </el-button>
          </template>
          <!-- <template v-else-if="tableItem.type === FORM_TYPE.BUTTON">
            <el-button
              :disabled="tableItem.disabled"
              class="text-primary"
              type="text"
              @handleEvent="(event) => $emit('handleEvent', event, row, $index)"
            >
              {{ tableItem.buttonLabel }}
            </el-button>
          </template> -->
          <!-- disabled 的优先级 -->
          <!-- 1. 全局 disabled -->
          <!-- 2. tableItem.disabled -->
          <!-- 3. tableItem.disabledFun -->
          <DisabledFrom
            v-else-if="
              !!disabled ||
              tableItem.disabled ||
              (tableItem.disabledFun && tableItem.disabledFun({ ...row, $index }))
            "
            :formItem="tableItem"
            :formData="row[tableItem.prop]"
            style="margin-top: 2px"
            :row="row"
            :inTable="true"
            :inForm="inForm"
          ></DisabledFrom>

          <DyInput
            v-else
            :inTable="true"
            :inForm="inForm"
            v-model="row[tableItem.prop]"
            @change="(val) => $emit('change', row, val, tableItem.prop, $index)"
            @handleEvent="(event) => $emit('handleEvent', event, row, $index)"
            :config="tableItem"
            :row="row"
          />
        </component>
      </template>
    </el-table-column>
    <slot name="suffix"></slot>
  </BaseTable>
</template>

<script>
import { FORM_TYPE } from '@/utils/const'
import RemoteSelect from '@/components/RemoteSelect/index'
import DisabledFrom from '@/components/BasicInfo/DisabledFrom'
import DyInput from '@/components/DyInput/index'
import ElTooltipColumn from '@/components/ElTooltipColumn'
import i18n from '@/locales/index.js'

export default {
  name: 'DyTable',
  props: {
    disabled: Boolean,
    inForm: Boolean, // 是否外部已经包一层el-form
    isSort: { type: Boolean, default: true }, // 是否排序
    listName: {
      // 如果使用数组，name 必须内外一致
      type: String,
      default: 'list',
    },
    tableConfig: Array,
    list: Array,
  },
  components: {
    RemoteSelect,
    DisabledFrom,
    DyInput,
    ElTooltipColumn,
  },
  data() {
    return {
      FORM_TYPE,
    }
  },
  computed: {
    baseTableRef() {
      return this.$refs.baseTable
    },
    sortTableConfig() {
      // 先排列固定在左侧，然后从大到小排列，没有sort值，默认-1000，按循序排列
      let sortTableConfig = this.tableConfig.filter((item) => !item.hide)
      return this.isSort
        ? sortTableConfig.sort(
            (a, b) => (isNaN(b.sort) ? -1000 : b.sort) - (isNaN(a.sort) ? -1000 : a.sort),
          )
        : sortTableConfig
    },
  },

  methods: {
    handleDelete($index) {
      this.$modal.confirm(this.$t('ecn.index.ll1h0m')).then(() => {
        this.$message.success(this.$t('components.affectedarea.187pt6'))
        this.list.splice($index, 1)
      })
    },
    //  父子相同列的隐藏逻辑
    isShow(row, tableItem) {
      if (!this.$attrs['tree-props']) {
        return true
      } else {
        return (
          // 子项必须没有children，有children则是父项
          tableItem.isChild ||
          (!tableItem.isChild && row[this.$attrs['tree-props'].children])
          // (!row[this.$attrs['tree-props'].children] && tableItem.isChild) ||
          // row[this.$attrs['tree-props'].children]
          // !tableItem.isChild
        )
      }
    },
    findPosition(tree, targetId, path = '') {
      for (let i = 0; i < tree.length; i++) {
        const node = tree[i]
        if (node.id === targetId) {
          return path + i
        }
        let childrenName = this.$attrs['tree-props'].children
        if (node[childrenName] && node[childrenName].length > 0) {
          const childPath = `${path}${i}.${childrenName}.`
          const result = this.findPosition(node[childrenName], targetId, childPath)
          if (result !== null) {
            return result
          }
        }
      }
      return null
    },
    validator: (rule, value, callback) => {
      // console.log('field---required---value', rule.field, rule.required, value)
      if (!rule.required) {
        return callback()
      }
      if (Array.isArray(value) && !value.length) {
        return callback(new Error(i18n.t('components.cmfrule.pk2j34')))
      } else if (['', null, undefined].includes(value)) {
        return callback(new Error(i18n.t('components.cmfrule.pk2j34')))
      }
      return callback()
    },
  },
}
</script>

<style lang="scss">
.dy-table {
  .el-table__cell {
    .el-form-item {
      margin-bottom: 0 !important;
    }
    .el-form-item__error {
      position: relative !important;
    }
  }
}
</style>
