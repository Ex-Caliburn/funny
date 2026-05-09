#!/usr/bin/env node

/**
 * 国家外汇管理局黄金储备数据爬取脚本
 *
 * 功能：
 *   - 访问国家外汇管理局外汇储备页面
 *   - 找到最新年份的"官方储备资产"链接
 *   - 下载该年份的 xlsx 文件到 stock/gold/ 目录，以年份命名
 *
 * 使用方法：
 *   node scripts/crawler/gold/gold_crawler.js           # 下载最新年份
 *   node scripts/crawler/gold/gold_crawler.js 2025      # 下载指定年份
 *   node scripts/crawler/gold/gold_crawler.js --all     # 下载所有年份
 */

const fs = require('fs')
const path = require('path')
const axios = require('axios')
const cheerio = require('cheerio')
const config = require('../framework/crawler_config')

class GoldCrawler {
  constructor() {
    this.safeConfig = config.safeGov
    this.targetConfig = this.safeConfig.targets.officialReserveAssets

    // stock/gold 目录
    this.downloadDir = path.join(
      __dirname,
      '../../../stock',
      this.targetConfig.downloadDir
    )
    this.ensureDirectories()
  }

  ensureDirectories() {
    if (!fs.existsSync(this.downloadDir)) {
      fs.mkdirSync(this.downloadDir, { recursive: true })
    }
  }

  /**
   * 延迟函数
   */
  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * 带重试的 HTTP 请求
   * @param {string} url
   * @param {object} options - axios 附加选项
   */
  async fetchWithRetry(url, options = {}) {
    const maxRetries = this.safeConfig.maxRetries
    for (let i = 0; i < maxRetries; i++) {
      try {
        console.log(`正在请求: ${url} (尝试 ${i + 1}/${maxRetries})`)
        const response = await axios({
          url,
          method: 'GET',
          timeout: this.safeConfig.timeout,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            Connection: 'keep-alive',
            Referer: 'https://www.safe.gov.cn/',
          },
          ...options,
        })
        await this.sleep(this.safeConfig.delayBetweenRequests)
        return response
      } catch (error) {
        console.error(`请求失败 (尝试 ${i + 1}/${maxRetries}): ${error.message}`)
        if (i === maxRetries - 1) throw error
        await this.sleep(2000 * (i + 1))
      }
    }
  }

  /**
   * 解析相对 URL 为绝对 URL
   */
  resolveUrl(href, baseUrl) {
    try {
      if (href.startsWith('http')) return href
      const base = new URL(baseUrl)
      if (href.startsWith('/')) {
        return `${base.protocol}//${base.host}${href}`
      }
      const basePath = base.pathname.substring(0, base.pathname.lastIndexOf('/'))
      return `${base.protocol}//${base.host}${basePath}/${href}`
    } catch {
      return href
    }
  }

  /**
   * 获取外汇储备列表页上所有"官方储备资产（YYYY年）"条目
   * @returns {Array<{year: number, url: string, text: string}>}
   */
  async fetchReserveList() {
    console.log(`\n正在获取外汇储备列表页: ${this.safeConfig.reserveIndexUrl}`)
    const response = await this.fetchWithRetry(this.safeConfig.reserveIndexUrl)
    const $ = cheerio.load(response.data)

    const pattern = this.targetConfig.linkPattern
    const items = []

    $('a').each((_, el) => {
      const text = $(el).text().trim()
      const href = $(el).attr('href')
      const match = text.match(pattern)
      if (match && href) {
        items.push({
          year: parseInt(match[1], 10),
          text,
          url: this.resolveUrl(href, this.safeConfig.reserveIndexUrl),
        })
      }
    })

    // 按年份降序排列，最新年份在前
    items.sort((a, b) => b.year - a.year)
    console.log(
      `找到 ${items.length} 个官方储备资产条目: ${items.map((i) => i.year).join(', ')}`
    )
    return items
  }

  /**
   * 从详情页找到并返回所有 xlsx/xls 下载链接
   * @param {string} detailUrl
   * @returns {Array<{url: string, text: string}>}
   */
  async findXlsxLinks(detailUrl) {
    console.log(`\n正在访问详情页: ${detailUrl}`)
    const response = await this.fetchWithRetry(detailUrl)
    const $ = cheerio.load(response.data)

    const links = []

    $('a').each((_, el) => {
      const href = $(el).attr('href') || ''
      const text = $(el).text().trim()

      const isXlsx =
        href.toLowerCase().endsWith('.xlsx') ||
        href.toLowerCase().endsWith('.xls') ||
        text.includes('下载') ||
        text.includes('xlsx') ||
        text.includes('Excel') ||
        text.includes('附件')

      if (isXlsx && href) {
        links.push({
          url: this.resolveUrl(href, detailUrl),
          text,
        })
      }
    })

    // 若页面内没有显式链接，尝试推断附件地址（SAFE 网站常见格式）
    if (links.length === 0) {
      console.log('页面内未找到显式下载链接，尝试推断附件地址...')
      const inferred = await this.inferAttachmentUrl(detailUrl, $)
      if (inferred) links.push(inferred)
    }

    return links
  }

  /**
   * 推断 SAFE 附件下载地址
   * SAFE 网站附件通常以页面 URL 同级路径的形式存在，
   * 或通过页面中的 JavaScript 变量声明引用
   * @param {string} detailUrl
   * @param {CheerioAPI} $
   */
  async inferAttachmentUrl(detailUrl, $) {
    // 尝试在页面脚本中找 .xlsx / .xls 路径
    const scriptText = $('script')
      .map((_, el) => $(el).html())
      .get()
      .join('\n')
    const fileMatch = scriptText.match(/['"]([^'"]*\.xlsx?)['"]/i)
    if (fileMatch) {
      const fileUrl = this.resolveUrl(fileMatch[1], detailUrl)
      console.log(`从脚本中推断到附件地址: ${fileUrl}`)
      return { url: fileUrl, text: '附件' }
    }

    // 尝试从 iframe src 中寻找
    const iframeSrc = $('iframe').attr('src')
    if (iframeSrc && (iframeSrc.includes('.xls') || iframeSrc.includes('.xlsx'))) {
      const fileUrl = this.resolveUrl(iframeSrc, detailUrl)
      console.log(`从 iframe 推断到附件地址: ${fileUrl}`)
      return { url: fileUrl, text: '附件' }
    }

    return null
  }

  /**
   * 下载文件到 stock/gold/YYYY.xlsx
   * @param {string} fileUrl   - 下载地址
   * @param {number} year      - 年份（用于命名文件）
   * @returns {string|null}    - 保存路径，失败时返回 null
   */
  async downloadFile(fileUrl, year) {
    // 保留原始扩展名
    const ext = fileUrl.toLowerCase().endsWith('.xlsx') ? '.xlsx' : '.xls'
    const filename = `${year}${ext}`
    const filePath = path.join(this.downloadDir, filename)

    // 已存在则跳过
    if (config.fileProcessing.skipExistingFiles && fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath)
      console.log(`文件已存在，跳过: ${filename} (${(stats.size / 1024).toFixed(1)} KB)`)
      return filePath
    }

    console.log(`\n正在下载: ${fileUrl}`)
    try {
      const response = await this.fetchWithRetry(fileUrl, { responseType: 'stream' })

      // 根据响应头再次确认扩展名
      const contentType = response.headers['content-type'] || ''
      const finalExt =
        contentType.includes('xlsx') || fileUrl.toLowerCase().endsWith('.xlsx')
          ? '.xlsx'
          : '.xls'
      const finalPath = path.join(this.downloadDir, `${year}${finalExt}`)

      const writer = fs.createWriteStream(finalPath)
      response.data.pipe(writer)

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          const size = fs.statSync(finalPath).size
          console.log(
            `下载完成: ${path.basename(finalPath)} (${(size / 1024).toFixed(1)} KB)`
          )
          resolve(finalPath)
        })
        writer.on('error', reject)
      })
    } catch (error) {
      console.error(`下载失败 ${fileUrl}: ${error.message}`)
      return null
    }
  }

  /**
   * 爬取单个年份的官方储备资产 xlsx
   * @param {{year: number, url: string}} item
   * @returns {string|null} 下载后的文件路径
   */
  async crawlYear(item) {
    console.log(`\n${'='.repeat(50)}`)
    console.log(`处理年份: ${item.year}  详情页: ${item.url}`)

    const xlsxLinks = await this.findXlsxLinks(item.url)

    if (xlsxLinks.length === 0) {
      console.warn(`⚠️  未在 ${item.url} 中找到 xlsx 下载链接`)
      return null
    }

    // 取第一个 xlsx 链接下载（通常只有一个）
    const link = xlsxLinks[0]
    console.log(`找到下载链接: ${link.url}  (文本: "${link.text}")`)

    return await this.downloadFile(link.url, item.year)
  }

  /**
   * 主流程
   * @param {object} options
   * @param {number|null} options.year   - 指定年份，null 表示最新
   * @param {boolean}     options.all    - 是否下载所有年份
   */
  async run(options = {}) {
    const { year = null, all = false } = options

    console.log('========================================')
    console.log('  国家外汇管理局官方储备资产 xlsx 爬虫')
    console.log('========================================')

    // 1. 获取列表页条目
    const items = await this.fetchReserveList()

    if (items.length === 0) {
      console.error('未找到任何官方储备资产条目，请检查页面结构是否变化')
      return []
    }

    // 2. 确定需要下载的条目
    let targets
    if (all) {
      targets = items
      console.log(`\n将下载所有 ${targets.length} 个年份`)
    } else if (year) {
      targets = items.filter((i) => i.year === year)
      if (targets.length === 0) {
        console.error(
          `未找到 ${year} 年的数据，可用年份: ${items.map((i) => i.year).join(', ')}`
        )
        return []
      }
    } else {
      // 默认取最新年份（列表已降序，第一个即最新）
      targets = [items[0]]
      console.log(`\n将下载最新年份: ${targets[0].year}`)
    }

    // 3. 逐个下载
    const downloaded = []
    for (const item of targets) {
      const filePath = await this.crawlYear(item)
      if (filePath) downloaded.push(filePath)
    }

    // 4. 汇总结果
    console.log('\n========================================')
    console.log(`下载完成，共 ${downloaded.length} 个文件:`)
    downloaded.forEach((f) => console.log(`  - ${f}`))
    console.log('========================================')

    return downloaded
  }
}

// 命令行直接运行
if (require.main === module) {
  const args = process.argv.slice(2)

  const options = {}
  if (args.includes('--all')) {
    options.all = true
  } else if (args[0] && /^\d{4}$/.test(args[0])) {
    options.year = parseInt(args[0], 10)
  }

  const crawler = new GoldCrawler()
  crawler
    .run(options)
    .then((files) => {
      if (files.length === 0) {
        console.warn('没有文件被下载')
        process.exit(1)
      }
      process.exit(0)
    })
    .catch((error) => {
      console.error('爬取失败:', error.message)
      process.exit(1)
    })
}

module.exports = GoldCrawler
