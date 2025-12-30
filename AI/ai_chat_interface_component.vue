<template>
  <div>
    <ai-input class="search" @focus="openDialog" style="width: 340px"></ai-input>
    <el-dialog
      width="40%"
      :visible.sync="dialogVisible"
      :close-on-click-modal="false"
      :modal-append-to-body="false"
      :before-close="handleClose"
    >
      <div slot="title">
        <ai-input
          class="ai-search"
          ref="searchInput"
          v-model="searchValue"
          @keyup.enter.native="onSearch"
          @onSearch="onSearch"
          style="width: 80%"
        ></ai-input>
      </div>
      <div
        class="content-warp"
        ref="scrollContainer"
        v-loading="loading"
        element-loading-spinner="el-icon-loading"
        element-loading-text="ai生成中..."
      >
        <div class="content" v-if="aiRes">
          <vue-markdown
            v-if="aiRes"
            :source="aiRes.response"
            class="markdown-body"
          ></vue-markdown>
          <div class="source-wrap" v-if="sendFinish && bizData.length">
            <div class="title">引用来源:</div>
            <div
              class="source-item flex flex_v-center"
              v-for="item in bizData"
              :key="item.key"
              @click="handleSource"
            >
              <el-tag>
                {{ bizLabelMap[item.biz_category].name }}
              </el-tag>
              <el-link
                type="primary"
                class="sys-name ml-16"
                @click="handleSource(item)"
                >{{ item.sys_name }}</el-link
              >
            </div>
          </div>
        </div>
        <div class="empty" v-else>
          <img :src="aiSearchBg" alt="" />
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { aiSearchApi } from '@/sseApi/aiSearch'
import { BIZ_LABEL_MAP, BIZ_ID } from '@/sseApi/const'
import VueMarkdown from 'vue-markdown'
import aiSearchBg from '@/assets/images/ai-search-bg.png'
import AiInput from './AiInput'

export default {
  name: 'ai-search',
  components: { VueMarkdown, AiInput },
  data() {
    return {
      aiSearchBg,
      time: null,
      loading: false,
      dialogVisible: false,
      searchValue: '',
      aiResCache: '',
      aiRes: null,
      bizData: [],
      sseConnection: null,
      bizLabelMap: BIZ_LABEL_MAP,
      sendFinish: false,
    }
  },
  methods: {
    openDialog() {
      this.dialogVisible = true
      this.$nextTick((_) => {
        this.$refs.searchInput.focus()
      })
    },
    handleClose() {
      this.dialogVisible = false
      this.loading = false
      this.restData()
    },
    // ai接口请求重置相关处理
    restData() {
      this.aiResCache = ''
      this.aiRes = null
      this.bizData = []
      this.sendFinish = false
      this.time && clearInterval(this.time)
      if (this.sseConnection && this.sseConnection.abort) {
        this.sseConnection.abort()
      }
    },
    scrollToBottom() {
      this.$nextTick(() => {
        this.$refs.scrollContainer.scrollTop = this.$refs.scrollContainer.scrollHeight
      })
    },
    onSearch() {
      if (!this.searchValue) {
        this.$message.error('请输入搜索的内容')
        return
      }
      this.restData()
      this.loading = true
      this.sseConnection = aiSearchApi(
        { chat_message: this.searchValue, biz_id: BIZ_ID },
        {
          doneCb: () => {
            this.sendFinish = true
          },
          msgCb: (msg, isStart) => {
            // 暂存，慢慢显示
            this.aiResCache = this.aiResCache + msg
            const interval = 20
            if (isStart) {
              this.loading = false
              // 有就更新
              let index = 0
              this.time && clearInterval(this.time)
              this.time = setInterval(() => {
                // ai输入效果处理并跟随滚动到底部
                if (this.aiResCache[index]) {
                  index++
                  this.aiRes = {
                    response: this.aiResCache.slice(0, index + 1),
                  }
                  this.scrollToBottom()
                } else if (this.sendFinish) {
                  clearInterval(this.time)
                }
              }, interval)
            }
          },
          bizCb: (data) => {
            this.aiRes = null
            this.aiResCache = ''
            // 数组对象去重
            this.bizData = Object.values(
              data.reduce((accumulator, item) => {
                // 对象去重处理
                const { biz_id, biz_category, sys_name } = item
                const key = `${biz_id}_${biz_category}_${sys_name}`
                if (!accumulator[key]) {
                  accumulator[key] = { ...item, key }
                }
                return accumulator
              }, {}),
            )
          },
          errorCb: () => {
            this.loading = false
            this.$message.error('网络中断，请重试')
          },
        },
      )
    },
    handleSource(item) {
      window.open(item.file_source_url, '_blank')
    },
  },
}
</script>

<style lang="scss" scoped>
.markdown-body {
  line-height: 2;
}

>>> .el-dialog {
  .el-dialog__header {
    position: relative;
    padding: 16px;
    & > div {
      display: flex;
      justify-content: center;
    }
    .el-dialog__headerbtn {
      top: 50%;
      transform: translate(0, -50%);
    }
  }

  .el-dialog__body {
    padding: 0;
  }
}

.ai-search {
  width: 80%;
  >>> .ai-input {
    height: 40px !important;
  }
}

.content-warp {
  height: 500px;
  overflow-y: auto;
  .content {
    padding: 0px 30px 30px 30px;

    .source-wrap {
      .title {
        color: #c5c5c5;
      }

      .source-item {
        margin-bottom: 10px;

        .sys-name {
          line-height: 24px;
        }
      }
    }
  }
  .empty {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    color: #a7a7a7;
    img {
      width: 40%;
      margin-top: -60px;
    }
  }
}
</style>
