<template>
  <div class="pdf-preview">
    <div class="flex flex_v-center flex_h-end bg-dark pt-8 pb-8 pr-16">
      <el-input-number
        v-model="pdf.page"
        :min="1"
        :max="pdf.numPages"
        style="width: 120px"
      ></el-input-number>
      <span class="mr-16 ml-4" style="color: #fff"> / {{ pdf.numPages }}</span>

      <!-- <el-input v-model.number="pdf.page" min="1" type="number" class="mr-16" style="width:60px">
          /{{ pdf.numPages }}</el-input
        > -->
      <el-button @click="pdf.rotate += 90">
        <i class="el-icon-refresh-left"></i>
      </el-button>
      <el-button @click="pdf.rotate -= 90">
        <i class="el-icon-refresh-right"></i>
      </el-button>
      <el-button @click="$refs.pdf.print()">print</el-button>
      <!-- <el-button @click="download">download</el-button> -->
      <el-button @click="$emit('input', '')">
        <i class="el-icon-close"></i>
      </el-button>
      <div
        v-if="pdf.loadedRatio > 0 && pdf.loadedRatio < 1"
        style="background-color: green; color: white; text-align: center"
        :style="{ width: pdf.loadedRatio * 100 + '%' }"
      >
        {{ Math.floor(pdf.loadedRatio * 100) }}%
      </div>
    </div>

    <pdf
      ref="pdf"
      class="pdf"
      :src="value"
      :page="pdf.page"
      :rotate="pdf.rotate"
      @progress="pdf.loadedRatio = $event"
      @num-pages="pdf.numPages = $event"
      @link-clicked="pdf.page = $event"
    ></pdf>
  </div>
</template>


<script>
import pdf from 'vue-pdf'

export default {
  name: 'pdf-preview',
  components: { pdf },
  props: {
    value: {
      type: String,
    },
  },
  data() {
    return {
      pdf: {
        loadedRatio: 0,
        page: 1,
        numPages: 0,
        rotate: 0,
      },
    }
  },
  mounted() {},
  methods: {},
}
</script>

<style lang='scss' scoped>
.pdf-preview {
  background-color: #fff;
  position: fixed;
  z-index: 1051;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  .pdf {
    width: 80%;
    margin: 0 auto;
  }
}
</style>