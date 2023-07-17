<template>
  <div class="pdf-wrapper">
    <pdfPreview
      v-if="pdfSrc"
      :url="pdfSrc"
      :watermark="watermark"
      @close="
        pdfSrc = ''
        $emit('input', '')
      "
    >
      <span slot="operation">
        <slot name="operation"> </slot>
        <i
          @click="_download"
          class="el-icon-download cursor-pointer"
          style="color: #fff; font-size: 25px"
        ></i>
      </span>
    </pdfPreview>
  </div>
</template>

<script>
const OSS = require('ali-oss')

import { acquireTmpToken } from '@/api/oss'
import pdfPreview from '@/components/pdfPreview'
import { downloadFileStream } from '@/api/oss'
import { Loading } from 'element-ui'
import { mapGetters } from 'vuex'

export default {
  name: 'pdf-wrapper',
  components: { pdfPreview },
  props: {
    value: String,
    beforeDownload: Function,
  },
  data() {
    return {
      pdfSrc: '',
      OSSInstance: null,
      loading: false,
      dataObj: {
        region: '',
        accessKeyId: '',
        endPoint: '',
        bucket: '',
        accessKeySecret: '',
        host: '',
        callback: '',
        stsToken: '',
        dir: '',
      },
    }
  },
  computed: {
    ...mapGetters(['OSSAccessInfo']),
    watermark() {
      return this.userName + '/n Delphi knowledge base'
    },
  },
  created() {
    this.getOssConfig()
  },
  mounted() {
    this.loadPdf()
  },
  methods: {
    _download() {
      if (!this.beforeDownload || (this.beforeDownload && this.beforeDownload())) {
        window.location.href = this.value
      }
    },
    getOssConfig() {
      if (this.OSSAccessInfo) {
        this.dataObj = this.OSSAccessInfo
        this.initOSS()
        return
      }
      this.loading = true
      acquireTmpToken()
        .then((res) => {
          this.loading = false
          console.log(res.data)
          this.dataObj = res.data
          this.$store.commit('setOSSAccessInfo', res.data)
          this.initOSS()
        })
        .catch((err) => {
          this.loading = false
          this.$message.error(`${err},Please refresh page`)
          console.error(err)
        })
    },
    async initOSS() {
      let _this = this
      this.OSSInstance = new OSS({
        region: this.dataObj.regionId,
        accessKeyId: this.dataObj.accessKeyId,
        accessKeySecret: this.dataObj.accessKeySecret,
        bucket: this.dataObj.bucket,
        endPoint: this.dataObj.endPoint,
        // cname: true, // use custom domain
        // internal: true,
        // [internal] {Boolean} access OSS with aliyun internal network or not, default is false. If your servers are running on aliyun too, you can set true to save lot of money.
        stsToken: this.dataObj.stsToken,
        refreshSTSToken: async () => {
          try {
            console.log('refreshSTSToken')
            _this.loading = true
            const res = await acquireTmpToken()
            _this.loading = false
            _this.$store.commit('setOSSAccessInfo', setOSSAccessInfo)
            return {
              accessKeyId: res.data.accessKeyId,
              accessKeySecret: res.data.accessKeySecret,
              stsToken: res.data.stsToken,
            }
          } catch (error) {
            console.log(error)
            _this
              .$alert(`The program encountered a problem, please try again`, '', {
                confirmButtonText: 'Confirm',
                type: 'success',
                center: 'center',
              })
              .then((err) => {
                _this.$store.commit('setOSSAccessInfo', null)
                _this.getOssConfig()
                console.log(err)
              })
          }
        },
        refreshSTSTokenInterval: 3600000,
        timeout: 60000,
        // used by auto retry send request count when request error is net error or timeout. NOTE: Not support put with stream, putStream, append with stream because the stream can only be consumed once
        retryMax: 3,
      })
      this.loadPdf()
    },
    loadPdf() {
      //迁移兼容 todo 完成后删除
      if (this.value.indexOf('amazonaws.com') > -1) {
        downloadFileStream({
          fileKey: this.value,
        })
          .then((res) => {
            this.pdfSrc = res.data
            loadingInstance.close()
            // console.log(
            //   window.URL.createObjectURL(
            //     new Blob([blob], { type: 'application/pdf;chartset=UTF-8' }),
            //   ),
            // )
          })
          .catch((err) => {
            loadingInstance.close()
            console.log(err, '下载失败')
          })
        return
      }
      if (this.loading) {
        this.$message.warning('oss config loading~, try later')
        return false
      }
      if (!this.OSSInstance) {
        this.$message.warning('oss config loading~, try later')
        this.getOssConfig()
        return false
      }
      let loadingInstance = Loading.service({
        text: 'loading pdf...',
        spinner: 'el-icon-loading',
      })
      // 编码方式不同 http://relx-ec.oss-ap-southeast-1.aliyuncs.com/shopify-server/NEW%20RELXers%20Tips_20211112_GaJeehcQfr8adEb.pdf?response-cache-control=no-cache
      // 二次 urlencoded 导致 http://relx-ec.oss-ap-southeast-1.aliyuncs.com/shopify-server/NEW%2520RELXers%2520Tips_20211112_GaJeehcQfr8adEb.pdf?response-cache-control=no-cache
      this.OSSInstance.get(decodeURIComponent(new URL(this.value).pathname))
        .then((res) => {
          this.pdfSrc = res.content
          loadingInstance.close()
          console.log(res)
        })
        .catch((err) => {
          loadingInstance.close()
          console.log(err, '下载失败')
        })
    },
  },
  watch: {
    value(val) {
      if (val) {
        this.loadPdf()
      }
    },
  },
}
</script>

<style lang='scss' scoped>
.pdf-wrapper {
}
</style>