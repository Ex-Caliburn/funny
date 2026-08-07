#!/usr/bin/env node

/**
 * 顺序执行多个爬虫/脚本，单个失败不中断后续任务
 *
 * 用法：
 *   node scripts/crawler/framework/run_steps.js all2
 *   node scripts/crawler/framework/run_steps.js coal
 */

'use strict'

const { spawn } = require('child_process')
const path = require('path')

const PROJECT_ROOT = path.join(__dirname, '../../..')

/** @type {Record<string, Array<{ label: string, command: string, args: string[] }>>} */
const PRESETS = {
  all2: [
    { label: '统计局数据', command: 'node', args: ['scripts/crawler/framework/crawler_main.js', 'all', '2'] },
    { label: '黄金', command: 'npm', args: ['run', 'crawl:gold'] },
    { label: '秦皇岛动力煤', command: 'node', args: ['scripts/crawler/coal/qhd_coal_crawler.js'] },
    { label: '山西煤炭', command: 'node', args: ['scripts/crawler/coal/shanxi_coal_crawler.js'] },
    { label: '航运指数', command: 'node', args: ['scripts/crawler/shipping/shipping_crawler.js'] },
    { label: '澳门博彩', command: 'npm', args: ['run', 'crawl:macau-gaming'] },
    { label: '铝价', command: 'npm', args: ['run', 'crawl:aluminum'] },
    { label: '中国出口', command: 'npm', args: ['run', 'crawl:china-export:all'] },
    { label: '海关出口', command: 'npm', args: ['run', 'crawl:customs-export'] },
    { label: 'SMM金属', command: 'npm', args: ['run', 'crawl:smm'] },
    { label: '磷化工', command: 'npm', args: ['run', 'crawl:phosphorus-chemical'] },
  ],
  coal: [
    { label: '秦皇岛动力煤', command: 'node', args: ['scripts/crawler/coal/qhd_coal_crawler.js'] },
    { label: '山西煤炭', command: 'node', args: ['scripts/crawler/coal/shanxi_coal_crawler.js'] },
  ],
}

/**
 * @param {{ label: string, command: string, args: string[] }} step
 * @returns {Promise<boolean>}
 */
function runStep(step) {
  return new Promise((resolve) => {
    console.log(`\n${'='.repeat(40)}`)
    console.log(`  开始: ${step.label}`)
    console.log(`${'='.repeat(40)}\n`)

    const child = spawn(step.command, step.args, {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
    })

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`\n✅ ${step.label} 完成`)
        resolve(true)
        return
      }
      console.error(`\n❌ ${step.label} 失败 (退出码 ${code})，继续执行后续任务`)
      resolve(false)
    })

    child.on('error', (err) => {
      console.error(`\n❌ ${step.label} 启动失败: ${err.message}，继续执行后续任务`)
      resolve(false)
    })
  })
}

/**
 * @param {Array<{ label: string, command: string, args: string[] }>} steps
 */
async function runSteps(steps) {
  const failures = []

  for (const step of steps) {
    const ok = await runStep(step)
    if (!ok) failures.push(step.label)
  }

  console.log(`\n${'='.repeat(40)}`)
  console.log('  执行总结')
  console.log(`${'='.repeat(40)}`)
  console.log(`成功: ${steps.length - failures.length}/${steps.length}`)

  if (failures.length > 0) {
    console.log('失败:')
    failures.forEach((name) => console.log(`  - ${name}`))
    process.exit(1)
  }

  console.log('全部成功')
}

if (require.main === module) {
  const preset = process.argv[2] || 'all2'
  const steps = PRESETS[preset]

  if (!steps) {
    console.error(`未知 preset: ${preset}，可选: ${Object.keys(PRESETS).join(', ')}`)
    process.exit(1)
  }

  runSteps(steps).catch((err) => {
    console.error('执行出错:', err.message)
    process.exit(1)
  })
}

module.exports = { runSteps, PRESETS }
