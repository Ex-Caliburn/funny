/**
 * 批量下载多个公司的财报
 * 支持：年度报告、半年度报告、季度报告、生产经营数据公告
 * 使用配置文件或命令行参数
 *
 * 使用方法：
 * # 使用默认配置（下载所有类型报告）
 * node batch_download_reports.js
 *
 * # 使用配置文件
 * node batch_download_reports.js --config config.json
 *
 * 配置文件示例 (config.json):
 * {
 *   "companies": [
 *     { "code": "600348", "name": "华阳股份" },
 *     { "code": "600546", "name": "山煤国际" }
 *   ],
 *   "years": [2023, 2024],
 *   "outputBase": "../stock/report_analysis",
 *   "reportTypes": ["annual", "production"],  // 支持数组，同时下载年报和运营报告
 *   "keywords": ["生产经营数据公告"]  // 用于生产经营数据公告的关键词
 * }
 *
 * reportTypes 支持的值：
 * - "all": 年报 + 半年报 + 季报
 * - "annual": 年度报告
 * - "semi": 半年度报告
 * - "quarterly": 季度报告(Q1+Q3)
 * - "q1": 第一季度报告
 * - "q3": 第三季度报告
 * - "production": 生产经营数据公告
 *
 * 可以同时指定多个类型，如：["annual", "production"] 表示同时下载年报和运营报告
 */

const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

// 默认配置：可以修改这里来批量下载
const DEFAULT_CONFIG = {
  companies: [
    {
      code: '002895',
      name: '川恒股份',
    },
  ],
  // years: [ 2021，2022, 2023, 2024, 2025 ],
  years: [2025],
  outputBase: '../stock/report_analysis',
  // 报告类型：支持字符串或数组
  // 字符串：'all' | 'annual' | 'semi' | 'quarterly' | 'q1' | 'q3' | 'production'
  // 数组：可以同时指定多个类型，如 ['annual', 'production'] 表示同时下载年报和运营报告
  // 'all' 表示下载所有类型（年报+半年报+季报）
  reportTypes: ['annual', 'production', 'quarterly', 'semi', 'q1', 'q3'], // 默认同时下载年报和运营报告
  // 自定义关键词（仅用于生产经营数据公告类型）
  keywords: ['生产经营数据公告'],
}

/**
 * 执行单个公司的所有报告类型下载任务
 * 使用 --types 参数一次性下载所有类型
 */
function downloadCompanyReports(company, years, outputBase, reportTypes, keywords = []) {
  return new Promise((resolve, reject) => {
    // 将 reportTypes 标准化为数组
    const typesArray = Array.isArray(reportTypes) ? reportTypes : [reportTypes]

    const args = [
      path.join(__dirname, './download_all_reports.js'), // 使用全功能版本
      '--code',
      company.code,
      '--name',
      company.name,
      '--years',
      years.join(','),
      '--types',
      typesArray.join(','), // 使用 --types 参数，一次性下载所有类型
    ]

    if (outputBase) {
      // 修复路径：从 scripts/stock-reports 到项目根目录
      // outputBase 如果是相对路径（如 '../stock/report_analysis'），需要从项目根目录开始计算
      let outputDir
      if (path.isAbsolute(outputBase)) {
        // 绝对路径直接使用
        outputDir = path.join(outputBase, company.name)
      } else if (outputBase.startsWith('../')) {
        // 相对路径（如 '../stock/report_analysis'），从项目根目录开始
        const relativePath = outputBase.replace(/^\.\.\//, '')
        outputDir = path.join(__dirname, '..', '..', relativePath, company.name)
      } else {
        // 其他相对路径，从当前目录开始
        outputDir = path.join(__dirname, outputBase, company.name)
      }
      args.push('--output', outputDir)
    }

    // 如果包含生产经营数据公告类型，且提供了关键词，则传递关键词参数
    if (typesArray.includes('production') && keywords.length > 0) {
      args.push('--keywords', keywords.join(','))
    }

    console.log(`\n${'='.repeat(70)}`)
    console.log(`🚀 开始下载: ${company.name} (${company.code})`)
    console.log(`${'='.repeat(70)}\n`)

    const child = spawn('node', args, {
      stdio: 'inherit',
      shell: true,
    })

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`\n✅ ${company.name} 下载完成\n`)
        resolve({ company, success: true })
      } else {
        console.error(`\n❌ ${company.name} 下载失败 (退出码: ${code})\n`)
        resolve({ company, success: false, code })
      }
    })

    child.on('error', (err) => {
      console.error(`\n❌ ${company.name} 执行出错: ${err.message}\n`)
      reject({ company, error: err.message })
    })
  })
}

/**
 * 延迟函数
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 从配置文件加载
 */
function loadConfigFile(configPath) {
  try {
    const content = fs.readFileSync(configPath, 'utf-8')
    return JSON.parse(content)
  } catch (err) {
    console.error(`❌ 读取配置文件失败: ${err.message}`)
    return null
  }
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2)
  let config = DEFAULT_CONFIG

  // 检查是否指定了配置文件
  if (args[0] === '--config' && args[1]) {
    const configPath = path.resolve(args[1])
    const loadedConfig = loadConfigFile(configPath)
    if (loadedConfig) {
      config = loadedConfig
    } else {
      console.log('⚠️  使用默认配置')
    }
  }

  // 兼容旧配置：如果使用 reportType（单数），转换为 reportTypes（复数）
  if (config.reportType && !config.reportTypes) {
    config.reportTypes = config.reportType
  }

  // 确保配置有默认值
  if (!config.reportTypes) {
    config.reportTypes = 'all'
  }
  if (!config.keywords) {
    config.keywords = []
  }

  // 将 reportTypes 标准化为数组
  const reportTypesArray = Array.isArray(config.reportTypes)
    ? config.reportTypes
    : [config.reportTypes]

  // 报告类型描述
  const typeDescriptions = {
    all: '年报 + 半年报 + 季报',
    annual: '年度报告',
    semi: '半年度报告',
    quarterly: '季度报告(Q1+Q3)',
    q1: '第一季度报告',
    q3: '第三季度报告',
    production: '生产经营数据公告',
  }

  // 生成报告类型描述
  const reportTypesDesc = reportTypesArray
    .map((type) => typeDescriptions[type] || type)
    .join(' + ')

  console.log('\n' + '='.repeat(70))
  console.log('📦 批量下载财报工具')
  console.log('='.repeat(70))
  console.log(`\n📋 下载配置:`)
  console.log(`   公司数量: ${config.companies.length} 家`)
  console.log(`   年份: ${config.years.join(', ')}`)
  console.log(`   报告类型: ${reportTypesDesc}`)
  if (reportTypesArray.includes('production') && config.keywords.length > 0) {
    console.log(`   关键词: ${config.keywords.join(', ')}`)
  }
  console.log(`   公司列表:`)
  config.companies.forEach((company, index) => {
    console.log(`     ${index + 1}. ${company.name} (${company.code})`)
  })
  console.log('')

  const results = []

  // 串行下载每个公司的财报
  for (let i = 0; i < config.companies.length; i++) {
    const company = config.companies[i]

    try {
      const result = await downloadCompanyReports(
        company,
        config.years,
        config.outputBase,
        config.reportTypes,
        config.keywords
      )
      results.push(result)
    } catch (error) {
      results.push({ company, success: false, error })
    }

    // 在下载间隔休息一下
    if (i < config.companies.length - 1) {
      console.log(`⏳ 等待 3 秒后继续下载下一家公司...\n`)
      await delay(3000)
    }
  }

  // 输出总结
  console.log('\n' + '='.repeat(70))
  console.log('📊 批量下载总结')
  console.log('='.repeat(70))

  const successful = results.filter((r) => r.success)
  const failed = results.filter((r) => !r.success)

  console.log(`\n✅ 成功: ${successful.length} 家公司`)
  successful.forEach((r) => {
    console.log(`   ✓ ${r.company.name}`)
  })

  if (failed.length > 0) {
    console.log(`\n❌ 失败: ${failed.length} 家公司`)
    failed.forEach((r) => {
      console.log(`   ✗ ${r.company.name}`)
    })
  }

  console.log('\n' + '='.repeat(70) + '\n')
}

// 运行
main().catch((err) => {
  console.error(`\n❌ 批量下载出错: ${err.message}\n`)
  process.exit(1)
})
