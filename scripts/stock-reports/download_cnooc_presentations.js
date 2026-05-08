/**
 * 下载中海油业绩推介材料 PDF
 * 数据源：https://www.cnoocltd.com/tzzgx/yjhtjcl/yj/
 * 下载到：stock/report_analysis/中国海洋石油/
 * 已存在的文件自动跳过
 *
 * 使用方法：
 * node scripts/stock-reports/download_cnooc_presentations.js
 */

const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')
const { URL } = require('url')

const BASE_URL = 'https://www.cnoocltd.com/tzzgx/yjhtjcl/yj/'
const OUTPUT_DIR = path.join(__dirname, '../../stock/report_analysis/中国海洋石油')

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9',
}

/**
 * 发起 HTTP/HTTPS GET 请求，返回响应体字符串
 */
function get(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const lib = parsed.protocol === 'https:' ? https : http
    const req = lib.get(url, { headers: { ...HEADERS, ...headers } }, (res) => {
      // 跟随重定向
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = new URL(res.headers.location, url).href
        return resolve(get(redirectUrl, headers))
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`))
      }
      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
      res.on('error', reject)
    })
    req.on('error', reject)
  })
}

/**
 * 下载二进制文件到指定路径
 */
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const lib = parsed.protocol === 'https:' ? https : http
    const req = lib.get(url, { headers: HEADERS }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = new URL(res.headers.location, url).href
        return resolve(downloadFile(redirectUrl, destPath))
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`))
      }
      const tmpPath = destPath + '.tmp'
      const file = fs.createWriteStream(tmpPath)
      res.pipe(file)
      file.on('finish', () => {
        file.close(() => {
          fs.renameSync(tmpPath, destPath)
          resolve()
        })
      })
      file.on('error', (err) => {
        fs.unlink(tmpPath, () => {})
        reject(err)
      })
    })
    req.on('error', reject)
  })
}

/**
 * 从 HTML 中提取推介材料 PDF 链接
 * 页面中的结构：<dt><a href="...pdf" target="_blank">标题</a></dt>
 */
function extractLinks(html) {
  const items = []
  // 匹配 <dt><a href="xxx.pdf" ...>标题</a></dt>
  const re = /<dt>\s*<a\s+href="([^"]+\.pdf)"[^>]*>([^<]+)<\/a>\s*<\/dt>/gi
  let m
  while ((m = re.exec(html)) !== null) {
    const href = m[1].trim()
    const title = m[2].trim()
    const absoluteUrl = href.startsWith('http') ? href : new URL(href, BASE_URL).href
    // 文件名：标题去除特殊字符 + .pdf
    const fileName = `中海油_${title.replace(/[\/\\:*?"<>|]/g, '_')}.pdf`
    items.push({ title, url: absoluteUrl, fileName })
  }
  return items
}

/**
 * 延迟
 */
function delay(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function main() {
  // 确保输出目录存在
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  console.log('正在获取推介材料列表...')
  let html
  try {
    html = await get(BASE_URL)
  } catch (err) {
    console.error(`❌ 获取页面失败: ${err.message}`)
    process.exit(1)
  }

  const items = extractLinks(html)
  if (items.length === 0) {
    console.log('⚠️  未找到任何 PDF 链接，请检查页面结构是否变化')
    process.exit(0)
  }

  console.log(`\n共找到 ${items.length} 个推介材料：`)
  items.forEach((item, i) => console.log(`  ${i + 1}. ${item.title}`))
  console.log()

  let downloaded = 0
  let skipped = 0

  for (const item of items) {
    const destPath = path.join(OUTPUT_DIR, item.fileName)
    if (fs.existsSync(destPath)) {
      console.log(`⏭️  跳过（已存在）: ${item.fileName}`)
      skipped++
      continue
    }
    process.stdout.write(`⬇️  下载中: ${item.title} ... `)
    try {
      await downloadFile(item.url, destPath)
      console.log('✅')
      downloaded++
      await delay(500)
    } catch (err) {
      console.log(`❌ 失败: ${err.message}`)
    }
  }

  console.log(`\n完成！下载 ${downloaded} 个，跳过 ${skipped} 个。`)
  console.log(`文件保存至: ${OUTPUT_DIR}`)
}

main().catch((err) => {
  console.error(`\n❌ 执行出错: ${err.message}`)
  process.exit(1)
})
