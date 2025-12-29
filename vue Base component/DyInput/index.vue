<template>
  <div
    :class="[
      'dy-input',
      {
        'in-table': inTable,
        'flex flex_v-center flex_h-center': inTable && !config.multiple,
      },
    ]"
  >
    <template v-if="config.type == FORM_TYPE.TEXT">
      {{ config.prefix }}{{ value }}
      <span v-if="config.suffix" class="ml-8">{{ config.suffix }}</span>
      <i
        v-if="value && config.canCopy"
        class="el-icon-document-copy cursor-pointer ml-4 text-primary"
        type="button"
        v-clipboard:copy="value"
        v-clipboard:success="onCopy"
      >
      </i>
    </template>

    <template v-else-if="disabled && config.propDesc">
      <BaseInput
        disabled
        v-model="row[config.propDesc]"
        :canCopy="config.canCopy"
      ></BaseInput>
    </template>
    <template v-else-if="config.type == FORM_TYPE.UPLOAD">
      <div v-if="!config.multiple && value">
        <MultiResource
          :showDelete="!disabled"
          :showName="true"
          :isEllipsis="inTable || config.isEllipsis"
          isHorizontal
          width="20px"
          :url="value"
          @onDelete="handleMultiResourceDelete()"
        />
      </div>
      <template v-if="Array.isArray(value) && value.length">
        <div>
          <template v-for="(item, itemI) in value">
            <MultiResource
              :key="itemI"
              :class="[
                'resource-item flex flex_v-center mb-4',
                { 'flex_h-center': inTable },
              ]"
              :isEllipsis="inTable"
              :showName="true"
              :isHorizontal="true"
              :showDelete="!disabled"
              width="16px"
              :url="config.isObject ? item[config.fileUrl] : item"
              :urlList="
                config.isObject ? value.map((pic) => pic[config.fileUrl]) : [item]
              "
              @onDelete="handleMultiResourceListDelete(itemI)"
            />
          </template>
        </div>
      </template>
      <ossUpload
        ref="uploadComponent"
        v-bind="[$attrs, $props]"
        v-on="$listeners"
        :showMsg="false"
        :accept="config.accept"
        :multiple="config.multiple"
        :maxSize="config.maxSize"
        @uploadSuccess="uploadSuccess"
        :class="{
          'upload-inform': inForm,
          'upload-multiple': config.multiple,
          disabled: disabled,
        }"
      >
        <div
          v-if="inTable && config.buttonLabel"
          class="text-primary cursor-pointer flex flex_v-center ml-8"
          slot="uploadArea"
        >
          <template>{{ config.buttonLabel }} <i class="el-icon-edit" /></template>
        </div>
        <div v-else slot="uploadArea">
          <i v-if="!config.multiple && !value" class="el-icon-plus uploader-icon"></i>
          <el-button
            v-else-if="Array.isArray(value) && config.buttonLabel"
            class="text-left mt-4"
            type="plain"
            size="mini"
            >{{ config.buttonLabel }}
          </el-button>
        </div>
      </ossUpload>
    </template>
    <template v-else-if="config.type == FORM_TYPE.RESOURCE_VIEW">
      <div :class="config.multiple ? 'flex flex-column' : ''">
        <div
          v-if="!inBasicInfo && !disabled && (config.clickEvent || config.buttonLabel)"
          :class="[
            'cursor-pointer',
            'break-all',
            config.class ? config.class : 'text-primary',
          ]"
          @click="disabled ? null : $emit('handleEvent', config.clickEvent)"
        >
          <span>{{ config.buttonLabel }}</span>
        </div>

        <BaseResourceCard
          v-if="!config.multiple"
          class="ml-4"
          :resourceUrl="row[config.urlProp]"
          :resourceName="row[config.nameProp]"
          :showDelete="config.showDelete && !disabled"
          @delete="handleDelete"
        />

        <div class="flex flex-column" v-if="config.multiple">
          <BaseResourceCard
            v-for="(item, itemI) in value"
            :key="itemI"
            :resourceUrl="item[config.urlProp]"
            :resourceName="item[config.nameProp]"
            :showDelete="config.showDelete && !disabled"
            @delete="handleListDelete(itemI)"
          />
        </div>
      </div>
    </template>
    <template
      v-else-if="
        (inTable && config.type == FORM_TYPE.INPUT && config.clickEvent) ||
        config.type == FORM_TYPE.BUTTON
      "
    >
      <div class="flex flex_v-center">
        <div
          :class="[
            'cursor-pointer',
            'break-all',
            config.class ? config.class : 'text-primary',
          ]"
          @click="disabled ? null : $emit('handleEvent', config.clickEvent)"
        >
          <el-tooltip
            v-if="value && !inTable"
            class="item"
            effect="dark"
            :content="value"
            placement="top-start"
          >
            <el-button class="w-100 ellipsis-1 text-left" type="text">{{
              value
            }}</el-button>
          </el-tooltip>
          <span v-else-if="value || config.buttonLabel"
            >{{ value || config.buttonLabel }} <i class="el-icon-edit"
          /></span>
        </div>
        <i
          v-if="value && config.canCopy"
          class="el-icon-document-copy cursor-pointer text-primary ml-4 text-primary"
          type="button"
          v-clipboard:copy="value"
          v-clipboard:success="onCopy"
        />
      </div>
    </template>
    <template v-else-if="config.type == FORM_TYPE.INPUT">
      <div class="flex flex_v-center w-100">
        <BaseInput
          v-bind="[$attrs, $props]"
          v-on="$listeners"
          :disabled="disabled || !!config.clickEvent"
          :placeholder="config.placeholder"
          :maxlength="config.maxLength"
          style="width: 100%"
          class="flex_item-grow"
          clearable
          :canCopy="config.canCopy"
        >
          <svg-icon
            :class="`icon-${config.prefixIcon}`"
            v-if="config.prefixIcon"
            slot="prefix"
            :iconClass="config.prefixIcon"
          ></svg-icon>
        </BaseInput>
        <span v-if="config.suffix" class="ml-8">{{ config.suffix }}</span>
      </div>
    </template>
    <template v-else-if="config.type === FORM_TYPE.REMOTE_SELECT">
      <RemoteSelect
        v-bind="[$attrs, $props]"
        v-on="$listeners"
        :disabled="disabled"
        :remote="config.remote"
        :multiple="config.multiple"
        :collapse-tags="!disabled && config.multiple"
        :getOptions="config.getOptions"
        :options="(config.extra && config.extra.options) || []"
        :onlyKey="config.onlyKey"
        :placeholder="config.placeholder"
        style="width: 100%"
        :row="row"
        class="flex_item-grow"
      />
    </template>
    <template v-else-if="config.type == FORM_TYPE.SELECT">
      <BaseSelect
        v-bind="[$attrs, $props]"
        v-on="$listeners"
        :disabled="disabled"
        :multiple="config.multiple"
        :collapse-tags="!disabled && config.multiple"
        :value-key="config.onlyKey"
        filterable
        :clearable="!config.unClearable"
        reserve-keyword
        :placeholder="config.placeholder"
        style="width: 100%"
        class="flex_item-grow"
        :options="
          inForm && config.extraDict
            ? (row.warpDict && row.warpDict.type[config.dictType]) || config.extra.options
            : (config.filterOptions && config.filterOptions(config.extra.options, row)) ||
              config.extra.options
        "
        :onlyKey="config.onlyKey"
        :dataType="config.dataType"
        :isEn="config.isEn"
      >
      </BaseSelect>
      <!-- dataType默认数字类型有点问题 -->
    </template>
    <template v-else-if="config.type == FORM_TYPE.RADIO">
      <BaseRadioGroup
        v-bind="[$attrs, $props]"
        v-on="$listeners"
        :disabled="disabled"
        :options="
          inForm && config.extraDict
            ? row.warpDict.type[config.dictType]
            : config.extra.options
        "
        :isEn="config.isEn"
      />
    </template>
    <template v-else-if="config.type == FORM_TYPE.SWITCH">
      <el-switch
        v-bind="[$attrs, $props]"
        v-on="$listeners"
        :disabled="disabled"
        :active-value="1"
        :inactive-value="0"
      >
      </el-switch>
    </template>
    <template v-else-if="config.type == FORM_TYPE.NUMBER">
      <div class="flex flex_v-center w-100">
        <el-input-number
          v-bind="[$attrs, $props]"
          :min="config.min || 0"
          :max="config.max"
          :disabled="disabled"
          :precision="config.precision"
          v-on="$listeners"
          controls-position="right"
          :placeholder="config.placeholder"
          style="width: 100%"
          class="flex_item-grow"
        >
        </el-input-number>
        <span v-if="config.suffix" class="ml-8">{{ config.suffix }}</span>
      </div>
    </template>
    <template v-else-if="config.type == FORM_TYPE.CUSTOM_NUMBER">
      <div class="flex flex_v-center w-100">
        <template v-if="config.propList">
          <template v-for="(propName, index) in config.propList">
            <template v-if="index !== 0">
              {{ config.joinStr }}
            </template>
            <NumberInput
              :key="propName"
              v-model="row[propName]"
              :disabled="disabled"
              :min="config.min || 0"
              :max="config.max"
              :precision="config.precision"
              :placeholder="config.placeholder && config.placeholder[index]"
              style="width: 100%"
              class="flex_item-grow"
            />
          </template>
        </template>
        <NumberInput
          v-else
          v-bind="[$attrs, $props]"
          v-on="$listeners"
          :disabled="disabled"
          :min="config.min || 0"
          :max="config.max"
          :precision="config.precision"
          :placeholder="config.placeholder"
          style="width: 100%"
          class="flex_item-grow"
        />
        <span v-if="config.suffix" class="ml-8">{{ config.suffix }}</span>
      </div>
    </template>
    <template v-else-if="config.type == FORM_TYPE.DATE">
      <el-date-picker
        v-bind="[$attrs, $props]"
        v-on="$listeners"
        :disabled="disabled"
        :picker-options="pickerOptions"
        type="date"
        style="width: 100%"
        class="flex_item-grow"
        :value-format="config.format || 'yyyy-MM-dd HH:mm:ss'"
        default-time="'00:00:00'"
        :placeholder="config.placeholder || $t('approval.approvaldetail.8h7441')"
        clearable
      >
      </el-date-picker>
    </template>
    <template v-else-if="config.type == FORM_TYPE.DATE_RANGE">
      <el-date-picker
        v-bind="[$attrs, $props]"
        v-on="$listeners"
        :disabled="disabled"
        style="width: 100%"
        class="flex_item-grow"
        :value-format="config.format || 'yyyy-MM-dd HH:mm:ss'"
        :picker-options="pickerOptions"
        :start-placeholder="$t('dyinput.index.nfjm6t')"
        :end-placeholder="$t('dyinput.index.wh8cs6')"
        type="daterange"
        :default-time="['00:00:00', '23:59:59']"
        clearable
      >
        <!-- :default-value="[new Date(), new Date('2099/1/1')]" -->
      </el-date-picker>
    </template>
    <template v-else-if="config.type == FORM_TYPE.DATE_TIME">
      <el-date-picker
        v-bind="[$attrs, $props]"
        v-on="$listeners"
        :disabled="disabled"
        style="width: 100%"
        class="flex_item-grow"
        :picker-options="pickerOptions"
        :value-format="config.format || 'yyyy-MM-dd HH:mm:ss'"
        :start-placeholder="$t('dyinput.index.nfjm6t')"
        :end-placeholder="$t('dyinput.index.wh8cs6')"
        type="datetime"
        clearable
      >
      </el-date-picker>
    </template>
    <template v-else-if="config.type == FORM_TYPE.DATE_MONTH">
      <el-date-picker
        v-bind="[$attrs, $props]"
        v-on="$listeners"
        :disabled="disabled"
        style="width: 100%"
        class="flex_item-grow"
        :picker-options="pickerOptions"
        :value-format="config.format || 'yyyy-MM'"
        :start-placeholder="$t('dyinput.index.nfjm6t')"
        :end-placeholder="$t('dyinput.index.wh8cs6')"
        type="month"
        clearable
      >
      </el-date-picker>
    </template>
    <template v-else-if="config.type == FORM_TYPE.TEXTAREA">
      <BaseInput
        v-bind="[$attrs, $props]"
        v-on="$listeners"
        :disabled="disabled"
        type="textarea"
        :maxlength="config.maxLength"
        :rows="inTable ? config.rows || 2 : config.rows || 2"
        :placeholder="config.placeholder"
        clearable
        class="flex_item-grow"
        :showWordLimit="!inTable"
        :canCopy="config.canCopy"
        style="width: 100%"
      >
      </BaseInput>
    </template>
    <template v-else-if="config.type == FORM_TYPE.CASCADER">
      <el-cascader
        v-bind="[$attrs, $props]"
        v-on="$listeners"
        :disabled="disabled"
        :show-all-levels="config.showAllLevels || false"
        :props="{ ...(config.props || {}), multiple: config.multiple }"
        :options="config.extra.options"
        :placeholder="config.placeholder || $t('approval.approvaldetail.8204d2')"
        filterable
        clearable
        class="flex_item-grow"
        style="width: 100%"
      ></el-cascader>
    </template>
  </div>
</template>

<script>
import { FORM_TYPE } from '@/utils/const'
import ossUpload from '@/components/Upload/ossUpload'
import RemoteSelect from '@/components/RemoteSelect/index'
import MultiResource from '@/components/Base/MultiResource'

import { filterResourceType } from '@/utils/filters'

export default {
  name: 'DyInput',
  props: ['config', 'value', 'inTable', 'row', 'inForm', 'disabled', 'inBasicInfo'],
  components: { ossUpload, RemoteSelect, MultiResource },
  data() {
    return {
      FORM_TYPE,
      pickerOptions: {
        disabledDate(time) {
          return time.getTime() > new Date('2100')
        },
      },
    }
  },

  methods: {
    onCopy() {
      this.$message.success(this.$i18n.t('src.plugin.68a1ln'))
    },
    uploadSuccess(url, file) {
      if (!this.config.multiple || !Array.isArray(this.value)) return

      const newValue = this.config.isObject
        ? {
            [this.config.fileUrl]: url,
            fileSize: file.size,
            fileType: filterResourceType(url),
            fileName: file.name,
          }
        : url

      this.value.push(newValue)
      this.$emit('handleEvent', this.config.uploadSuccessEvent)
    },
    // 单个资源删除
    handleMultiResourceDelete() {
      this.$refs.uploadComponent && this.$refs.uploadComponent.$refs.upload.clearFiles()
      this.$emit('input', '')
      this.$emit('handleEvent', this.config.deleteEvent)
    },
    handleMultiResourceListDelete(index) {
      this.$refs.uploadComponent && this.$refs.uploadComponent.$refs.upload.clearFiles()
      this.value.splice(index, 1)
      this.$emit('handleEvent', this.config.deleteEvent, this.row, index)
    },
    // 单个资源删除
    handleDelete(index) {
      console.log('handleDelete')
      this.$refs.uploadComponent && this.$refs.uploadComponent.$refs.upload.clearFiles()
      this.$emit('handleEvent', this.config.deleteEvent)
    },
    // 多个资源删除
    handleListDelete(index) {
      console.log('handleListDelete')
      this.$refs.uploadComponent.$refs.upload.clearFiles()
      this.value.splice(index, 1)
      this.$emit('handleEvent', this.config.deleteEvent)
    },
  },
}
</script>

<style lang="scss" scoped>
.dy-input {
  &.in-table {
    >>> {
      .el-upload {
        border: none !important;
      }

      .uploader {
        line-height: 1;
        font-size: 14px;
      }
    }
  }

  .upload-multiple {
    >>> .el-upload {
      border: none !important;
      // overflow: auto !important;
      border-radius: 0 !important;
    }
  }

  .close-resource {
    position: absolute;
    top: 0;
    right: 5px;
    background: red;
    border-radius: 50%;
    color: #fff;
  }
}

.resource-name {
  text-align: center;
  line-height: 1.1;
  width: 80px;
}
</style>
