#!/usr/bin/env node

/**
 * 上海航运交易所集装箱运价指数爬取脚本
 *
 * 支持指数：
 *   - CCFI 中国出口集装箱运价指数
 *   - SCFI 上海出口集装箱运价指数
 *   - SEAFI 东南亚集装箱运价指数
 *   - CBCFI 中国沿海煤炭运价指数（日频）
 *
 * 功能：
 *   - 爬取各航线运价及综合指数
 *   - 增量更新 stock/shipping/ 下的 JSON 文件，按日期去重
 *   - 每条记录包含日期和各航线价格
 *
 * 使用方法：
 *   node scripts/crawler/shipping/shipping_crawler.js           # 爬取全部指数
 *   node scripts/crawler/shipping/shipping_crawler.js ccfi      # 只爬 CCFI
 *   node scripts/crawler/shipping/shipping_crawler.js scfi      # 只爬 SCFI
 *   node scripts/crawler/shipping/shipping_crawler.js seafi     # 只爬 SEAFI
 *   node scripts/crawler/shipping/shipping_crawler.js cbcfi     # 只爬 CBCFI
 */

const fs = require('fs')
const path = require('path')
const axios = require('axios')
const cheerio = require('cheerio')
const config = require('../framework/crawler_config')

class ShippingCrawler {
  constructor() {
    this.sseConfig = config.sseShipping

    // stock/shipping 数据目录
    this.dataDir = path.join(__dirname, '../../../stock', this.sseConfig.dataDir)
    this.ensureDirectories()
  }

  ensureDirectories() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true })
    }
  }

  /**
   * 延迟函数
   * @param {number} ms
   */
  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * 带重试的 HTTP GET 请求
   * @param {string} url
   */
  async fetchWithRetry(url) {
    const maxRetries = this.sseConfig.maxRetries
    for (let i = 0; i < maxRetries; i++) {
      try {
        console.log(`正在请求: ${url} (尝试 ${i + 1}/${maxRetries})`)
        const response = await axios.get(url, {
          timeout: this.sseConfig.timeout,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            Connection: 'keep-alive',
            Referer: this.sseConfig.baseUrl,
          },
        })
        await this.sleep(this.sseConfig.delayBetweenRequests)
        return response
      } catch (error) {
        console.error(`请求失败 (尝试 ${i + 1}/${maxRetries}): ${error.message}`)
        if (i === maxRetries - 1) throw error
        await this.sleep(2000 * (i + 1))
      }
    }
  }

  /**
   * 清理航线名称：去掉括号内英文、空格后的英文后缀
   * @param {string} rawName
   * @returns {string}
   */
  cleanRouteName(rawName) {
    let name = rawName.replace(/\s*\([^)]*\)\s*/g, '').trim()
    const i = name.search(/\s+[A-Z]/)
    return i > 0 ? name.slice(0, i).trim() : name
  }

  /**
   * 解析运价指数页面表格
   *
   * 页面表格结构（CCFI 示例）：
   *   表头行: 航线 | 上期 YYYY-MM-DD | 本期 YYYY-MM-DD | 与上期比涨跌(%)
   *   数据行: 综合指数 | 上期值 | 本期值 | 涨跌幅
   *   数据行: 各航线  | 上期值 | 本期值 | 涨跌幅（部分航线本期值为空）
   *
   * 解析结果为两条记录：上期 和 本期（若本期有数据）
   *
   * @param {string} html
   * @param {object} targetConfig - sseConfig.targets 中的某一项
   * @returns {Array<{date: string, routes: object}>}
   */
  parseIndexPage(html, targetConfig) {
    const $ = cheerio.load(html)
    const table = $('table.lb1')

    if (table.length === 0) {
      console.warn('未找到运价指数表格 (.lb1)，尝试查找任意表格...')
    }

    const rows = []
    const targetTable = table.length > 0 ? table : $('table').first()

    targetTable.find('tr').each((_, tr) => {
      const cells = []
      $(tr)
        .find('td, th')
        .each((__, td) => {
          cells.push($(td).text().trim())
        })
      if (cells.length > 0) rows.push(cells)
    })

    if (rows.length < 2) {
      console.warn('表格行数不足，无法解析数据')
      return []
    }

    // 解析表头，提取上期/本期日期
    const header = rows[0]
    // 表头示例: ['航线', '上期 2026-04-30', '本期 2026-05-08', '与上期比涨跌 (%)']
    // SEAFI 有额外的"单位"列: ['航线', '单位', '上期 ...', '本期 ...', '与上期比涨跌']
    const datePattern = /(\d{4}-\d{2}-\d{2})/

    let prevDateCol = -1
    let currDateCol = -1
    let prevDate = null
    let currDate = null

    header.forEach((cell, idx) => {
      const match = cell.match(datePattern)
      if (match) {
        if (prevDateCol === -1) {
          prevDateCol = idx
          prevDate = match[1]
        } else {
          currDateCol = idx
          currDate = match[1]
        }
      }
    })

    if (!prevDate) {
      console.warn('未能从表头解析到日期，原始表头:', header)
      return []
    }

    console.log(`  解析到上期日期: ${prevDate}，列索引: ${prevDateCol}`)
    if (currDate) {
      console.log(`  解析到本期日期: ${currDate}，列索引: ${currDateCol}`)
    }

    // 收集上期和本期数据
    const prevRoutes = {}
    const currRoutes = {}

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      if (row.length < 2) continue

      // 航线名称（第一列），去除英文后缀
      const routeName = this.cleanRouteName(row[0])
      if (!routeName) continue

      const prevVal = prevDateCol >= 0 ? parseFloat(row[prevDateCol]) : NaN
      const currVal = currDateCol >= 0 ? parseFloat(row[currDateCol]) : NaN

      if (!isNaN(prevVal)) prevRoutes[routeName] = prevVal
      if (!isNaN(currVal)) currRoutes[routeName] = currVal
    }

    const results = []

    if (Object.keys(prevRoutes).length > 0) {
      results.push({ date: prevDate, routes: prevRoutes })
    }

    if (Object.keys(currRoutes).length > 0 && currDate) {
      results.push({ date: currDate, routes: currRoutes })
    }

    return results
  }

  /**
   * 读取已有的 JSON 数据文件
   * @param {string} filePath
   * @returns {Array}
   */
  loadExistingData(filePath) {
    if (!fs.existsSync(filePath)) return []
    try {
      const raw = fs.readFileSync(filePath, 'utf-8')
      return JSON.parse(raw)
    } catch (error) {
      console.warn(`读取已有数据失败: ${error.message}，将重新创建`)
      return []
    }
  }

  /**
   * 合并新抓取的记录到已有数据中（按日期去重，新数据优先）
   * @param {Array} existing - 已有数据数组
   * @param {Array} incoming - 新抓取的数据 [{date, routes}]
   * @returns {Array} 合并后按日期升序排列的数组
   */
  mergeData(existing, incoming) {
    // 以日期为 key 建立 map
    const map = {}
    for (const record of existing) {
      map[record.date] = record
    }
    for (const record of incoming) {
      if (map[record.date]) {
        // 合并路由数据：新数据覆盖旧字段，保留旧数据中有但新数据没有的字段
        map[record.date] = {
          date: record.date,
          ...map[record.date],
          ...record.routes,
        }
        // 删除嵌套的 routes 字段（兼容旧格式）
        delete map[record.date].routes
      } else {
        map[record.date] = { date: record.date, ...record.routes }
      }
    }

    // 按日期升序排列
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date))
  }

  /**
   * 爬取单个指数并更新 JSON 文件
   * @param {string} indexKey - 'ccfi' 或 'seafi'
   * @returns {object|null}
   */
  async crawlIndex(indexKey) {
    const targetConfig = this.sseConfig.targets[indexKey]
    if (!targetConfig) {
      console.error(`未知的指数类型: ${indexKey}`)
      return null
    }

    console.log(`\n${'='.repeat(50)}`)
    console.log(`爬取指数: ${targetConfig.name} (${indexKey.toUpperCase()})`)
    console.log(`URL: ${targetConfig.url}`)

    let html
    try {
      const response = await this.fetchWithRetry(targetConfig.url)
      html = response.data
    } catch (error) {
      console.error(`获取页面失败: ${error.message}`)
      return null
    }

    const parsed = this.parseIndexPage(html, targetConfig)

    if (parsed.length === 0) {
      console.warn('未解析到任何数据')
      return null
    }

    parsed.forEach((p) => {
      console.log(`  日期: ${p.date}，航线数: ${Object.keys(p.routes).length}`)
      Object.entries(p.routes).forEach(([route, val]) => {
        console.log(`    ${route}: ${val}`)
      })
    })

    // 读取已有数据并合并
    const filePath = path.join(this.dataDir, targetConfig.dataFile)
    const existing = this.loadExistingData(filePath)
    const merged = this.mergeData(existing, parsed)

    // 写入文件
    fs.writeFileSync(filePath, JSON.stringify(merged, null, 2), 'utf-8')
    console.log(`\n数据已保存至: ${filePath}（共 ${merged.length} 条记录）`)

    return { indexKey, filePath, records: merged.length, latest: parsed }
  }

  /**
   * 主流程
   * @param {string[]} indexKeys - 要爬取的指数列表，为空则爬取全部
   */
  async run(indexKeys = []) {
    console.log('========================================')
    console.log('  上海航运交易所运价指数爬虫')
    console.log('========================================')

    const allKeys = Object.keys(this.sseConfig.targets)
    const targets = indexKeys.length > 0
      ? indexKeys.filter((k) => allKeys.includes(k))
      : allKeys

    if (targets.length === 0) {
      console.error(`无效的指数类型，可用: ${allKeys.join(', ')}`)
      return []
    }

    const results = []
    for (const key of targets) {
      const result = await this.crawlIndex(key)
      if (result) results.push(result)
    }

    console.log('\n========================================')
    console.log(`爬取完成，共处理 ${results.length} 个指数:`)
    results.forEach((r) => {
      console.log(`  - ${r.indexKey.toUpperCase()}: ${r.filePath} (${r.records} 条记录)`)
    })
    console.log('========================================')

    return results
  }
}

// 命令行直接运行
if (require.main === module) {
  const args = process.argv.slice(2).map((a) => a.toLowerCase())
  const validKeys = Object.keys(config.sseShipping.targets)
  const targets = args.filter((a) => validKeys.includes(a))

  const crawler = new ShippingCrawler()
  crawler
    .run(targets)
    .then((results) => {
      process.exit(results.length > 0 ? 0 : 1)
    })
    .catch((error) => {
      console.error('爬取失败:', error.message)
      process.exit(1)
    })
}

module.exports = ShippingCrawler
