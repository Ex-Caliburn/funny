<template>
  <el-dialog
    :show-close="false"
    visible
    lock-scroll
    fullscreen
    ref="pdfDialog"
    @close="$emit('close')"
  >
    <div slot="title">
      <div class="flex flex_v-center flex_h-between bg-dark pt-8 pb-8 pr-16">
        <div></div>
        <div class="flex_v-center">
          <i
            @click="previousPage"
            :class="[
              'el-icon-arrow-left',
              'mr-8',
              {
                disabled: this.currentPage === 1,
              },
            ]"
            style="color: #fff; font-size: 30px"
          ></i>

          <el-input-number
            v-model="currentPage"
            :min="1"
            :max="totalPage"
            @change="currentPageChange"
            :controls="false"
            style="width: 65px"
          ></el-input-number>
          <span class="mr-8 ml-4" style="color: #fff"> / {{ totalPage }}</span>

          <i
            @click="nextPage"
            :class="[
              'el-icon-arrow-right',
              'mr-16',
              {
                disabled: this.currentPage === totalPage,
              },
            ]"
            style="color: #fff; font-size: 30px"
          ></i>

          <i
            @click="handleScale(-0.25)"
            class="el-icon-zoom-out mr-16"
            style="color: #fff; font-size: 30px"
          ></i>

          <i
            @click="handleScale(0.25)"
            class="el-icon-zoom-in mr-16"
            style="color: #fff; font-size: 30px"
          ></i>

          <i
            @click="
              rotate = 0
              scale = 1
              handleRotate()
            "
            class="el-icon-c-scale-to-original mr-16"
            style="color: #fff; font-size: 30px"
          ></i>

          <i
            @click="
              rotate += 90
              handleRotate()
            "
            class="el-icon-refresh-left mr-16"
            style="color: #fff; font-size: 30px"
          ></i>

          <i
            @click="
              rotate -= 90
              handleRotate()
            "
            class="el-icon-refresh-right mr-16"
            style="color: #fff; font-size: 30px"
          ></i>
          <slot name="operation"> </slot>
        </div>
        <i
          @click="$emit('close', '')"
          class="el-icon-close cursor-pointer"
          style="color: #fff; font-size: 30px"
        ></i>

        <!-- <el-button @click="$refs.pdf.print()">print</el-button> -->
        <!-- <el-button @click="download">download</el-button> -->
        <!-- <el-button @click="$emit('input', '')">
        <i class="el-icon-close"></i>
      </el-button> -->
      </div>
    </div>

    <!-- <canvas
      class="pdf-page"
      v-for="page in totalPage"
      :key="page"
      :id="'pdfCanvas' + page"
    ></canvas> -->
    <canvas id="pdfCanvas"></canvas>
  </el-dialog>
</template>

<script>
import * as PDFJS from 'pdfjs-dist'
PDFJS.GlobalWorkerOptions.workerSrc = `/static/pdf.worker.js`
// import pdfjsWorker from "pdfjs-dist/build/pdf.worker";
// PDFJS.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default {
  name: 'pdfPreview',
  props: {
    // PDF 文件的实际链接
    url: {
      type: [ArrayBuffer, Uint8Array],
    },
    watermark: {
      type: String,
    },
  },

  data() {
    return {
      visible: false,
      currentPage: 1,
      pageNumPending: 0,
      totalPage: 1,
      width: 0,
      rotate: 0,
      scale: 1,
      height: 0,
      pdfDoc: null,
      // 是否位于队列中
      rendering: false,
    }
  },
  computed: {
    // 是否首页
    firstPage() {
      return this.currentPage <= 1
    },
    // 是否尾页
    lastPage() {
      return this.currentPage >= this.totalPage
    },
  },
  mounted() {
    if (this.url) {
      this._initPdf()
    }
  },
  methods: {
    handleScale(scale) {
      this.scale += scale
      if (this.scale <= 0.25) {
        this.scale = 0.25
      }
      if (this.scale >= 2) {
        this.scale = 2
      }
      this._renderPage(this.currentPage)
    },
    handleRotate() {
      this._renderPage(this.currentPage)
    },
    _initPdf() {
      // console.log(this.url)
      PDFJS.getDocument(this.url).promise.then((pdf) => {
        // 文档对象
        this.pdfDoc = pdf
        // 总页数
        this.totalPage = pdf.numPages

        this.currentPage = 1
        // 渲染页面
        this.$nextTick(() => {
          this._renderPage(1)
        })
      })
    },
    _getRatio(ctx) {
      let dpr = window.devicePixelRatio || 1
      let bsr =
        ctx.webkitBackingStorePixelRatio ||
        ctx.mozBackingStorePixelRatio ||
        ctx.msBackingStorePixelRatio ||
        ctx.oBackingStorePixelRatio ||
        ctx.backingStorePixelRatio ||
        1

      return dpr / bsr
    },
    _renderPage(number) {
      // 队列开始
      this.rendering = true
      this.pdfDoc.getPage(number).then((page) => {
        // let canvas = document.querySelector(`#pdfCanvas${number}`)
        let canvas = document.querySelector(`#pdfCanvas`)
        let ctx = canvas.getContext('2d')
        // 获取页面比率
        let ratio = this._getRatio(ctx)

        // 根据页面宽度和视口宽度的比率就是内容区的放大比率
        let dialogWidth =
          this.$refs['pdfDialog'].$el.querySelector('.el-dialog').clientWidth - 40
        let pageWidth = page.view[2] * ratio
        let scale = Math.min(dialogWidth, 1280 * this.scale) / pageWidth
        // console.log(
        //   'page.view, dialogWidth, pageWidth',
        //   page.view,
        //   dialogWidth,
        //   pageWidth,
        // )
        let viewport = page.getViewport({ scale, rotation: this.rotate })

        // 记录内容区宽高，后期添加水印时需要
        // console.log(
        //   'viewport.width, viewport.height ,ratio, scale',
        //   viewport.width,
        //   viewport.height,
        //   ratio,
        //   scale,
        // )
        this.width = viewport.width * ratio
        this.height = viewport.height * ratio

        canvas.width = this.width
        canvas.height = this.height

        // 缩放比率
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0)

        page
          .render({
            canvasContext: ctx,
            viewport,
          })
          .promise.then(() => {
            this.rendering = false
            this._renderWatermark()
            // if (!this.pageNumPending) return
            // this._renderPage(this.pageNumPending)
            // this.pageNumPending = 0
            // this.rendering = false
          })
      })
    },
    _renderQueue() {
      if (this.rendering) {
        return
      }

      this._renderPage(this.currentPage)
    },
    currentPageChange(page) {
      this.currentPage = page
      this._renderQueue(this.currentPage)
    },
    // 跳转到首页
    firstPageHandler() {
      if (this.firstPage) {
        return
      }

      this.currentPage = 1
      this._renderQueue(this.currentPage)
    },
    // 跳转到尾页
    lastPageHandler() {
      if (this.lastPage) {
        return
      }

      this.currentPage = this.totalPage
      this._renderQueue(this.currentPage)
    },
    // 上一页
    previousPage() {
      if (this.firstPage) {
        return
      }

      this.currentPage--
      this._renderQueue(this.currentPage)
    },
    // 下一页
    nextPage() {
      if (this.lastPage) {
        return
      }

      this.currentPage++
      this._renderQueue(this.currentPage)
    },
    queueRender(num) {
      //渲染等待；如果正在进行另一个页面渲染，请等待渲染完成。 否则，立即执行渲染
      !this.rendering ? this._renderPage(num) : (this.pageNumPending = num)
    },
    _initWatermark() {
      let canvas = document.createElement('canvas')
      const width = 300
      const height = 240
      Object.assign(canvas, { width, height })
      const strArr = this.watermark.split('/n')

      let ctx = canvas.getContext('2d')
      ctx.rotate((-20 * Math.PI) / 120)
      ctx.font = '15px Vedana'
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      strArr.forEach((item, i) => {
        ctx.fillText(item, width / 20, height / 2 + 20 * i)
      })

      return canvas
    },
    _renderWatermark() {
      let canvas = document.querySelector('#pdfCanvas')
      let ctx = canvas.getContext('2d')

      // 平铺水印
      let pattern = ctx.createPattern(this._initWatermark(), 'repeat')
      ctx.rect(0, 0, this.width, this.height)
      ctx.fillStyle = pattern
      ctx.fill()
    },
  },
  watch: {
    url(val) {
      if (!val) {
        return
      }
      // console.log(val)

      this._initPdf()
    },
  },
}
</script>

<style lang='scss' scoped>
/deep/ .el-dialog {
  border-radius: 0;
  .el-dialog__header {
    padding: 0;
    position: sticky;
    top: 0;
    z-index: 1;
  }
  .el-dialog__body {
    display: flex;
    justify-content: center;
    align-items: center;
  }
}
</style>