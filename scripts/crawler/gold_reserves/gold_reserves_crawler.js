#!/usr/bin/env node

/**
 * 世界黄金协会(WGC) gold.org — 各国央行黄金储备 爬取脚本
 * ============================================================
 * 数据源页面 : https://china.gold.org/goldhub/data/gold-reserves-by-country
 * 后端数据API : https://fsapi-china.gold.org/api/cbd/v11/charts/getPage
 * 字段说明   : gold_reserves_tns = 黄金储备(吨)；gold_reserves = 黄金储备(百万美元)
 *
 * 流程完全模仿 scripts/crawler/gold/gold_crawler.js：
 *   1. fetchWithRetry   带重试的 HTTP 请求
 *   2. fetchFilters      获取全部国家 iso3 代码与名称（相当于"列表页"）
 *   3. fetchAll          调用 getPage 拉取各国季度黄金储备时序（相当于"找到下载链接并下载"）
 *   4. saveRaw           保存原始 JSON
 *   5. generateXlsx      把时序整理成真正可下载的 .xlsx 文件（即"下载的 xls"）
 *   6. parseData         调用 gold_reserves_parse 计算同比/环比，生成图表用 JSON
 *
 * 使用方法：
 *   node scripts/crawler/gold_reserves/gold_reserves_crawler.js            # 下载并整理
 *   node scripts/crawler/gold_reserves/gold_reserves_crawler.js --parse-only
 *     （按用户要求：默认抓取 2025 至今；为计算"同比"多取 2024 作为基期，图表中标注口径）
 */

const fs = require('fs')
const path = require('path')
const axios = require('axios')
const xlsx = require('xlsx')

// 自包含配置（模仿 gold_crawler.js 中 crawler_config 的结构，但独立存放避免改动共享大配置）
const CONFIG = {
  // WGC goldhub 中央银行存款数据 API（中国区镜像，与 china.gold.org 同源）
  apiBase: 'https://fsapi-china.gold.org',
  getPage: '/api/cbd/v11/charts/getPage',
  getFilters: '/api/cbd/v11/charts/getFilters',

  // 频率：WGC 该数据集仅提供 季频(QTD_FULL) 与 年频(LAST_YEAR_END)，无月度
  // → 因此"环比"真实含义为 季环比(QoQ)，报告内会严格标注口径
  periodicity: 'QTD_FULL',

  // 抓取区间：2000 起至今（结束日期被接口自动截断到最新已发布季度，当前为 2026-03-31）
  // 因 WGC 仅提供季频，"环比"=季环比(QoQ)，"同比"=去年同季
  focusStart: '2025-01-01', // 图表默认聚焦区间（2025 至今）
  yoyBaseStart: '2000-01-01', // 抓取与同比基期起点：2000 起
  endDate: '2026-08-01',

  metricTonnes: 'gold_reserves_tns', // 吨
  metricUsd: 'gold_reserves', // 百万美元

  maxRetries: 3,
  timeout: 30000,
  delayBetweenRequests: 800,

  // 图表默认展示的主要持有国数量（按最新持有量取前 N）
  topN: 15,

  // 数据存储目录（相对于 stock/）
  downloadDir: 'gold_reserves',
}

class GoldReservesCrawler {
  constructor() {
    this.downloadDir = path.join(__dirname, '../../../stock', CONFIG.downloadDir)
    this.ensureDirectories()
    this.rawFile = path.join(this.downloadDir, 'raw_gold_reserves.json')
    this.xlsxFile = null // 在 generateXlsx 中赋值
  }

  ensureDirectories() {
    if (!fs.existsSync(this.downloadDir)) {
      fs.mkdirSync(this.downloadDir, { recursive: true })
    }
  }

  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  async fetchWithRetry(url, options = {}) {
    for (let i = 0; i < CONFIG.maxRetries; i++) {
      try {
        console.log(`  请求: ${url} (尝试 ${i + 1}/${CONFIG.maxRetries})`)
        const response = await axios({
          url,
          method: 'GET',
          timeout: CONFIG.timeout,
          // 沙箱默认 HTTP 代理会把 HTTPS 降级为明文（Cloudflare 报 400），
          // gold.org 接口直连可用，故关闭代理
          proxy: false,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'application/json,text/plain,*/*',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            Referer: 'https://china.gold.org/goldhub/data/gold-reserves-by-country',
          },
          ...options,
        })
        await this.sleep(CONFIG.delayBetweenRequests)
        return response
      } catch (error) {
        console.error(`  请求失败(尝试 ${i + 1}/${CONFIG.maxRetries}): ${error.message}`)
        if (i === CONFIG.maxRetries - 1) throw error
        await this.sleep(2000 * (i + 1))
      }
    }
  }

  /**
   * 获取全部国家 iso3 与名称（相当于"列表页"）
   * @returns {{iso3:string, name:string}[]}
   */
  async fetchFilters() {
    console.log('\n[1/4] 获取国家列表 (getFilters)')
    const url = `${CONFIG.apiBase}${CONFIG.getFilters}`
    const res = await this.fetchWithRetry(url)
    const countries = res.data?.chartData?.countries || {}
    const list = Object.values(countries)
      .map((c) => ({ iso3: c.iso3, name: c.countryNameDefault || c.countryWGC }))
      .filter((c) => c.iso3)
    console.log(`  共 ${list.length} 个国家/地区`)
    return list
  }

  /**
   * 调用 getPage 拉取各国季度黄金储备时序（相当于"下载 xls 数据"）
   * @param {{iso3:string,name:string}[]} countryList
   * @returns {object} getPage 原始响应
   */
  async fetchAll(countryList) {
    console.log('\n[2/4] 拉取各国季度黄金储备 (getPage)')
    const iso3 = countryList.map((c) => c.iso3).join(',')
    const qs =
      `page=date_range&countries=${encodeURIComponent(iso3)}` +
      `&periodicity=${CONFIG.periodicity}` +
      `&startDate=${CONFIG.yoyBaseStart}&endDate=${CONFIG.endDate}`
    const url = `${CONFIG.apiBase}${CONFIG.getPage}?${qs}`
    const res = await this.fetchWithRetry(url)
    return res.data
  }

  /**
   * 保存原始 JSON
   */
  saveRaw(raw) {
    fs.writeFileSync(this.rawFile, JSON.stringify(raw, null, 2), 'utf-8')
    console.log(`\n[3/4] 原始 JSON 已保存: ${this.rawFile}`)
  }

  /**
   * 从 getPage 响应解析出 {dates, countries:[{iso3,name,series:[{date,t,usd}]}]}
   */
  parseResponse(raw, countryList) {
    const lc = raw?.chartData?.linechart?.[CONFIG.periodicity]
    if (!lc) throw new Error('响应中未找到 linechart 数据，请检查 periodicity / 接口结构')
    const tns = lc[CONFIG.metricTonnes]?.data || []
    const usd = lc[CONFIG.metricUsd]?.data || []

    // 统一日期轴（去重、升序）
    const dateSet = new Set()
    tns.forEach((c) => c.data.forEach((p) => dateSet.add(p[0])))
    usd.forEach((c) => c.data.forEach((p) => dateSet.add(p[0])))
    const dates = [...dateSet].sort((a, b) => a - b)

    const usdMap = {}
    usd.forEach((c) => {
      usdMap[c.name] = {}
      c.data.forEach((p) => {
        if (p[1] != null) usdMap[c.name][p[0]] = p[1]
      })
    })

    const nameToIso3 = {}
    countryList.forEach((c) => (nameToIso3[c.name] = c.iso3))

    const countries = tns.map((c) => {
      const series = c.data
        .filter((p) => p[1] != null)
        .map((p) => ({
          date: this.tsToDate(p[0]),
          t: p[1],
          usd: usdMap[c.name]?.[p[0]] ?? null,
        }))
        .sort((a, b) => (a.date < b.date ? -1 : 1))
      return {
        iso3: nameToIso3[c.name] || c.name,
        name: c.name,
        series,
      }
    })

    return { dates: dates.map((d) => this.tsToDate(d)), countries }
  }

  tsToDate(ts) {
    // 时间戳为 UTC 0 点（季末），用 UTC 解析避免时区偏移
    const d = new Date(ts)
    return d.toISOString().slice(0, 10)
  }

  quarterLabel(dateStr) {
    const [y, m] = dateStr.split('-').map(Number)
    const q = Math.ceil(m / 3)
    return `${y}Q${q}`
  }

  /**
   * 生成真正可下载的 .xlsx：
   *   - Sheet1 黄金储备(吨)：行=国家，列=季度
   *   - Sheet2 黄金储备(百万美元)
   *   - Sheet3 说明
   * @returns {string} 保存路径
   */
  generateXlsx(parsed) {
    console.log('\n[4/4] 生成 XLSX（下载的 xls）')
    const { dates, countries } = parsed
    const qLabels = dates.map((d) => this.quarterLabel(d))

    // 仅保留有数据的国家，按最新持有量降序
    const withData = countries
      .filter((c) => c.series.length > 0)
      .sort((a, b) => (b.series.at(-1)?.t || 0) - (a.series.at(-1)?.t || 0))
    console.log(`  有数据的国家: ${withData.length} 个，季度: ${qLabels.join(', ')}`)

    const buildSheet = (metricKey) => {
      const header = ['国家', 'ISO3', '最新季度', ...qLabels]
      const rows = [header]
      withData.forEach((c) => {
        const map = {}
        c.series.forEach((s) => (map[s.date] = s[metricKey]))
        const latest = c.series.at(-1)
        const row = [c.name, c.iso3, latest ? this.quarterLabel(latest.date) : '']
        dates.forEach((d) => row.push(map[d] ?? null))
        rows.push(row)
      })
      return xlsx.utils.aoa_to_sheet(rows)
    }

    const wsT = buildSheet('t')
    const wsUsd = buildSheet('usd')
    wsT['!cols'] = [{ wch: 22 }, { wch: 6 }, { wch: 9 }, ...qLabels.map(() => ({ wch: 11 }))]
    wsUsd['!cols'] = [{ wch: 22 }, { wch: 6 }, { wch: 9 }, ...qLabels.map(() => ({ wch: 11 }))]

    const note = [
      ['世界黄金协会(WGC) gold.org — 各国央行黄金储备'],
      ['数据来源页面', 'https://china.gold.org/goldhub/data/gold-reserves-by-country'],
      ['频率', '季频(QTD_FULL)。WGC 该数据集无月度，故"环比"=季环比(QoQ)'],
      ['抓取区间', `${CONFIG.yoyBaseStart} ~ ${CONFIG.endDate}（接口截断到最新季度）`],
      ['分析重点', `2025 至今为默认聚焦；2000 起全量为同比(YoY)基期`],
      ['单位', '吨 / 百万美元'],
      ['生成时间', new Date().toISOString()],
    ]
    const wsNote = xlsx.utils.aoa_to_sheet(note)

    const wb = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(wb, wsT, '黄金储备(吨)')
    xlsx.utils.book_append_sheet(wb, wsUsd, '黄金储备(百万美元)')
    xlsx.utils.book_append_sheet(wb, wsNote, '说明')

    // 文件名按最新季度命名，如 gold_reserves_2026Q1.xlsx
    const lastQ = qLabels.at(-1)
    const filename = `gold_reserves_${lastQ}.xlsx`
    const filePath = path.join(this.downloadDir, filename)
    xlsx.writeFile(wb, filePath)
    this.xlsxFile = filePath
    const size = (fs.statSync(filePath).size / 1024).toFixed(1)
    console.log(`  XLSX 已保存: ${filePath} (${size} KB)`)
    return filePath
  }

  async run(options = {}) {
    const { parseOnly = false } = options
    console.log('==================================================')
    console.log('  WGC gold.org 各国央行黄金储备 爬虫')
    console.log('==================================================')

    let parsed
    if (parseOnly) {
      console.log('\n[parse-only] 直接读取已有原始 JSON')
      if (!fs.existsSync(this.rawFile)) {
        console.error(`未找到 ${this.rawFile}，请先运行完整爬虫`)
        process.exit(1)
      }
      const raw = JSON.parse(fs.readFileSync(this.rawFile, 'utf-8'))
      const countryList = raw.__countryList || (await this.fetchFilters())
      parsed = this.parseResponse(raw, countryList)
      if (!raw.__countryList) {
        raw.__countryList = countryList
        fs.writeFileSync(this.rawFile, JSON.stringify(raw, null, 2), 'utf-8')
      }
    } else {
      const countryList = await this.fetchFilters()
      const raw = await this.fetchAll(countryList)
      raw.__countryList = countryList // 缓存国家列表，便于 parse-only
      this.saveRaw(raw)
      parsed = this.parseResponse(raw, countryList)
      this.generateXlsx(parsed)
    }

    // 计算同比/环比并生成图表用 JSON
    console.log('\n  整理同比/环比 → gold_reserves_data.json')
    const { parseAll } = require('./gold_reserves_parse')
    const out = parseAll({ parsed, config: CONFIG })
    return { xlsxFile: this.xlsxFile, dataFile: out.outputFile }
  }
}

if (require.main === module) {
  const args = process.argv.slice(2)
  const parseOnly = args.includes('--parse-only')
  const crawler = new GoldReservesCrawler()
  crawler
    .run({ parseOnly })
    .then(({ xlsxFile, dataFile }) => {
      console.log('\n==================================================')
      console.log(`完成。XLSX: ${xlsxFile}\n      JSON: ${dataFile}`)
      console.log('==================================================')
      process.exit(0)
    })
    .catch((err) => {
      console.error('执行失败:', err.message)
      process.exit(1)
    })
}

module.exports = GoldReservesCrawler
