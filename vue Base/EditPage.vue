<template>
  <BaseFullPage
    style="overflow: hidden;"
    :visible="visible"
    @update:visible="$emit('update:visible', $event)"
  >
    <div class="edit-page">
      <div class="edit-page__header">
        <slot name="header"></slot>
        <div class="space-between" v-if="!$slots.header">
          <div class="go-back cursor-pointer" @click="$emit('back', false)">
            <i class="iconfont icon-fanhui"></i> <span>返回</span>
          </div>
          <div v-if="!hideSaveButton">
            <el-button @click="$emit('save')" type="primary">保存</el-button>
          </div>
        </div>
      </div>
      <div class="edit-page__body jdk-scrollbar">
        <div class="course-content">
          <div
            class="course-title"
            :style="{
              minWidth: width
            }"
          >
            <span v-show="title && !$slots.title">{{ title }} </span>
            <slot name="title"></slot>
          </div>
          <div
            class="edit-content"
            :style="{
              'min-height': minHeight,
              minWidth: width
            }"
          >
            <slot></slot>
          </div>
        </div>
      </div>
    </div>
  </BaseFullPage>
</template>
<script>
import BaseFullPage from '@/components/Base/BaseFullPage'
export default {
  name: 'BaseEditPage',
  components: {
    BaseFullPage
  },
  props: {
    visible: Boolean,
    hideSaveButton: Boolean,
    title: String,
    minHeight: String,
    width: {
      type: String,
      default: '750px'
    }
  }
}
</script>
<style lang="scss" scoped>
.edit-page {
  height: 100%;
  position: relative;
  border-top: 1px solid transparent;
  &__header {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 999;
    height: 56px;
    background: rgba(255, 255, 255, 1);
    box-shadow: 0px 2px 8px 0px rgba(0, 0, 0, 0.04);
    padding: 0 24px;
    .space-between {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 100%;
    }
  }
  &__body {
    max-height: calc(100% - 110px);
    overflow: auto;
    margin-top: 80px;
    box-sizing: border-box;
  }
  .course-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    // margin-left: calc(50% - 375px);
  }
  .course-title {
    width: 100%;
    max-width: 1200px;
    font-size: 14px;
    font-weight: 400;
    color: rgba(174, 182, 196, 1);
    line-height: 20px;
  }
  .edit-content {
    max-width: 1200px;
    margin-top: 24px;
  }
}
</style>
