<template>
  <div class="demo">
    <BaseSearch
          v-model.trim="keyword"
          placeholder="请输入优惠券名称"
          :searchMethod="filterChange"
        ></BaseSearch>

    <BasePagination v-bind.sync="page" @change="fetchFn"></BasePagination>

    <BaseTable
      :data="list"
      v-loading="loading"
      element-loading-text="拼命加载中"
      element-loading-spinner="el-icon-loading"
      @select="select"
      @select-all="selectAll"
    >
      <el-table-column
        :selectable="(row) => !allowTypes || allowTypes.includes(row.question_kind)"
        v-if="isMultiSelect"
        fixed="left"
        type="selection"
        min-width="60"
      >
      </el-table-column>
      <el-table-column
        fixed="left"
        label="题目编号"
        prop="source_id"
        min-width="80"
      ></el-table-column>
      <el-table-column label="标签" prop="tags" v-slot="{ row }" width="300">
        <el-tag type="primary" v-for="tag in row.tags" :key="tag.id" class="MR8 MB8">
          {{ tag.name }}
        </el-tag>
      </el-table-column>
      <el-table-column
        label="题干"
        prop="pc_content"
        v-slot="{ row }"
        show-overflow-tooltip
        min-width="350"
      >
        {{ getQuestionStem(row.pc_content) }}
      </el-table-column>
      <el-table-column label="题目类型" prop="kind" v-slot="{ row }">
        {{ getQuestionType(row.pc_content) }}
      </el-table-column>
      <el-table-column label="创建人" prop="user_name" min-width="100"></el-table-column>
      <el-table-column
        label="最近更新时间"
        prop="updated_at"
        v-slot="{ row }"
        width="150"
      >
        {{ row.updated_at | UTC2Time }}
      </el-table-column>
      <el-table-column
        v-if="!isMultiSelect"
        fixed="right"
        label="操作"
        v-slot="{ row }"
        width="80"
      >
        <el-button type="text" @click="$emit('select', row)">选用</el-button>
      </el-table-column>
    </BaseTable>
  </div>
</template>

<script>
export default {
  name: 'demo',
  components: {},
  data() {
    return {
      loading: false,
      tableData: [],
      page: {
        total: 0,
        currentPage: 1,
        pageSize: 10
      }
    }
  },
  mounted() {},
  methods: {
    filterChange() {
      this._debounce(() => {
        this.page.currentPage = 1
        this.fetchFn()
      })
    },
    fetchFn() {
      this.loading = true
      const { currentPage, pageSize } = this.page
      getDiscountCouponList({
        offset: (currentPage - 1) * pageSize,
        limit: pageSize,
        search_name: this.keyword,
        status: this.status
      })
        .then(
          (res) => {
            this.tableData = res.coupon_list
            this.page.total = res.count
            this.updateStorePage({
              couponList: Object.assign(
                {},
                {
                  total: res.count, // 必须传递total,如果使用默认为0,会导致currentPage重置为1
                  currentPage,
                  pageSize,
                  status: this.status,
                  keyword: this.keyword
                }
              )
            })
          },
          (err) => {
            this.$message.error('加载数据失败：' + err)
          }
        )
        .finally(() => {
          this.loading = false
        })
    }
  }
}
</script>

<style lang='scss' scoped>
.demo {
}
</style>