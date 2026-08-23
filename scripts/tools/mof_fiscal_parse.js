#!/usr/bin/env node

/**
 * 解析 stock/mof_fiscal/*.html（财政部国库司「财政收支情况」正文），
 * 汇总为 stock/mof_fiscal_data.json。
 *
 * 数据口径：财政部公布值均为「年初至今累计值（亿元）」+「累计同比%」。
 * 本脚本按【指标中文名】匹配（不同年份序号会变，故不能靠序号），
 * 并在累计值基础上派生：
 *   - monthly    单月/当期净增值 = 本期累计 − 上期累计（同年，相邻可得月）
 *   - monthlyYoy 单月同比%       = (本年单月 − 去年同月单月) / |去年同月单月| × 100
 *   - mom        环比%           = (本月单月 − 上月单月) / |上月单月| × 100
 *
 * 注意：财政部 1-2 月合并公布（首期 cumMonth=2，代表 1-2 月合计），
 * 该期 monthly 即 1-2 月两月之和，无法再拆到 1 月，图表中置于 x=2 处。
 *
 * 用法：node scripts/tools/mof_fiscal_parse.js
 */

'use strict'

const fs = require('fs')
const path = require('path')
const cheerio = require('cheerio')

const ROOT = path.join(__dirname, '../..')
const SRC_DIR = path.join(ROOT, 'stock', 'mof_fiscal')
const OUT_FILE = path.join(ROOT, 'stock', 'mof_fiscal_data.json')

/**
 * 指标定义。name/aliases 为正文锚点（按名称匹配），group 用于图表分组。
 * 匹配「锚点 + 数字 + 亿元 + (同比|比上年) + 增长/下降 + 数字 + %」。
 */
const METRICS = [
  // ── 一般公共预算 ─────────────────────────────
  { key: 'gen_income', label: '一般公共预算收入', group: '一般公共预算', aliases: ['全国一般公共预算收入'] },
  // 2023 下半年起表述为「其中，税收收入…」（无“全国”），故保留两个锚点，长的优先
  { key: 'tax_income', label: '税收收入', group: '一般公共预算', aliases: ['全国税收收入', '税收收入'] },
  { key: 'nontax_income', label: '非税收入', group: '一般公共预算', aliases: ['非税收入'] },
  { key: 'central_income', label: '中央一般公共预算收入', group: '一般公共预算', aliases: ['中央一般公共预算收入'] },
  { key: 'local_income', label: '地方一般公共预算本级收入', group: '一般公共预算', aliases: ['地方一般公共预算本级收入'] },
  { key: 'gen_expense', label: '一般公共预算支出', group: '一般公共预算', aliases: ['全国一般公共预算支出'] },

  // ── 政府性基金 ──────────────────────────────
  { key: 'fund_income', label: '政府性基金预算收入', group: '政府性基金', aliases: ['全国政府性基金预算收入'] },
  { key: 'land_income', label: '国有土地使用权出让收入', group: '政府性基金', aliases: ['国有土地使用权出让收入'] },
  { key: 'fund_expense', label: '政府性基金预算支出', group: '政府性基金', aliases: ['全国政府性基金预算支出'] },

  // ── 主要税种 ────────────────────────────────
  { key: 'vat_dom', label: '国内增值税', group: '主要税种', aliases: ['国内增值税'] },
  { key: 'consumption_tax', label: '国内消费税', group: '主要税种', aliases: ['国内消费税'] },
  { key: 'corp_income_tax', label: '企业所得税', group: '主要税种', aliases: ['企业所得税'] },
  { key: 'personal_income_tax', label: '个人所得税', group: '主要税种', aliases: ['个人所得税'] },
  { key: 'import_vat_ct', label: '进口货物增值税、消费税', group: '主要税种', aliases: ['进口货物增值税、消费税'] },
  { key: 'tariff', label: '关税', group: '主要税种', aliases: ['关税'] },
  { key: 'export_rebate', label: '出口退税', group: '主要税种', aliases: ['出口退税'] },
  { key: 'stamp_tax', label: '印花税', group: '主要税种', aliases: ['印花税'] },
  { key: 'securities_stamp_tax', label: '证券交易印花税', group: '主要税种', aliases: ['证券交易印花税'] },
  { key: 'vehicle_purchase_tax', label: '车辆购置税', group: '主要税种', aliases: ['车辆购置税'] },
  { key: 'resource_tax', label: '资源税', group: '主要税种', aliases: ['资源税'] },
  { key: 'deed_tax', label: '契税', group: '主要税种', aliases: ['契税'] },
  { key: 'property_tax', label: '房产税', group: '主要税种', aliases: ['房产税'] },
  { key: 'urban_land_tax', label: '城镇土地使用税', group: '主要税种', aliases: ['城镇土地使用税'] },
  { key: 'land_vat', label: '土地增值税', group: '主要税种', aliases: ['土地增值税'] },
  { key: 'urban_maintenance_tax', label: '城市维护建设税', group: '主要税种', aliases: ['城市维护建设税'] },
  { key: 'farmland_tax', label: '耕地占用税', group: '主要税种', aliases: ['耕地占用税'] },
  { key: 'env_tax', label: '环境保护税', group: '主要税种', aliases: ['环境保护税'] },

  // ── 主要支出科目 ────────────────────────────
  { key: 'exp_education', label: '教育支出', group: '主要支出科目', aliases: ['教育支出'] },
  { key: 'exp_science', label: '科学技术支出', group: '主要支出科目', aliases: ['科学技术支出'] },
  { key: 'exp_culture', label: '文化旅游体育与传媒支出', group: '主要支出科目', aliases: ['文化旅游体育与传媒支出'] },
  { key: 'exp_social', label: '社会保障和就业支出', group: '主要支出科目', aliases: ['社会保障和就业支出'] },
  { key: 'exp_health', label: '卫生健康支出', group: '主要支出科目', aliases: ['卫生健康支出'] },
  { key: 'exp_env', label: '节能环保支出', group: '主要支出科目', aliases: ['节能环保支出'] },
  { key: 'exp_community', label: '城乡社区支出', group: '主要支出科目', aliases: ['城乡社区支出'] },
  { key: 'exp_agriculture', label: '农林水支出', group: '主要支出科目', aliases: ['农林水支出'] },
  { key: 'exp_transport', label: '交通运输支出', group: '主要支出科目', aliases: ['交通运输支出'] },
  { key: 'exp_debt_interest', label: '债务付息支出', group: '主要支出科目', aliases: ['债务付息支出'] },
]

/** 把 HTML 正文转成「压缩掉所有空白」的连续字符串，便于跨换行匹配 */
function htmlToCompactText(html) {
  const $ = cheerio.load(html)
  $('script, style').remove()
  let text = $('body').length ? $('body').text() : $.root().text()
  // 去掉附件下载/相关文章之后的页脚噪声
  const cut = text.indexOf('附件下载')
  if (cut > 0) text = text.slice(0, cut)
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/[\s\u3000]+/g, '') // 删除全部空白（含全角空格）
}

/** 数字字符串 → number（去千分位逗号） */
function parseNum(s) {
  if (s == null) return null
  const n = parseFloat(String(s).replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

/**
 * 从压缩文本里抽取某指标的「累计值 + 累计同比%」
 * @param {string} text
 * @param {string[]} aliases
 * @returns {{ cum: number, cumYoy: number|null }|null}
 */
function extractMetric(text, aliases) {
  for (const name of aliases) {
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // 锚点 + 数字亿元 + (可选很短的插入) + 同比/比上年 + 增长/下降/持平 + (数字)% 或 数字倍
    const re = new RegExp(
      esc +
        '([\\d,]+(?:\\.\\d+)?)亿元[，,]?(?:扣除[^。%]*?后[，,]?)?(?:同比|比上年|比去年同期)?(增长|下降|持平)?([\\d.]+)?(倍|%)?'
    )
    const m = text.match(re)
    if (!m) continue
    const cum = parseNum(m[1])
    if (cum == null) continue

    let cumYoy = null
    const dir = m[2]
    const val = parseNum(m[3])
    const unit = m[4]
    if (dir === '持平') {
      cumYoy = 0
    } else if (val != null && dir) {
      let v = val
      if (unit === '倍') v = val * 100 // “增长1.3倍” = +130%
      cumYoy = dir === '下降' ? -v : v
    }
    return { cum, cumYoy }
  }
  return null
}

/** 从文件名/内容注释解析统计期 */
function parsePeriodFromFile(filename, html) {
  // 文件名前缀：2026-07_xxx.html
  const m = filename.match(/^(\d{4})-(\d{2})_/)
  let year = m ? Number(m[1]) : null
  let cumMonth = m ? Number(m[2]) : null

  // 发布日期：注释里的 source url，或正文「发布日期：YYYY年MM月DD日」
  let publishDate = null
  const pd = html.match(/发布日期：(\d{4})年(\d{1,2})月(\d{1,2})日/)
  if (pd) publishDate = `${pd[1]}-${pd[2].padStart(2, '0')}-${pd[3].padStart(2, '0')}`
  const srcM = html.match(/<!--\s*source:\s*(\S+)\s*-->/)
  const sourceUrl = srcM ? srcM[1] : null
  if (!publishDate && sourceUrl) {
    const u = sourceUrl.match(/\/t(\d{4})(\d{2})(\d{2})_/)
    if (u) publishDate = `${u[1]}-${u[2]}-${u[3]}`
  }

  if (year == null || cumMonth == null) return null
  const periodLabel = cumMonth === 12 ? `${year}年全年` : `${year}年1-${cumMonth}月`
  return {
    year,
    cumMonth,
    periodKey: `${year}-${String(cumMonth).padStart(2, '0')}`,
    periodLabel,
    publishDate,
    sourceUrl,
  }
}

function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error(`源目录不存在: ${SRC_DIR}`)
    process.exit(1)
  }
  const files = fs
    .readdirSync(SRC_DIR)
    .filter((f) => /\.html?$/i.test(f))
    .sort()

  /** @type {Record<string, Record<number, Record<number, any>>>} */
  const data = {}
  for (const mt of METRICS) data[mt.key] = {}

  const periods = []
  let parsedCount = 0

  for (const f of files) {
    const html = fs.readFileSync(path.join(SRC_DIR, f), 'utf8')
    const period = parsePeriodFromFile(f, html)
    if (!period) {
      console.warn(`跳过（无法解析统计期）: ${f}`)
      continue
    }
    const text = htmlToCompactText(html)
    let hit = 0
    for (const mt of METRICS) {
      const r = extractMetric(text, mt.aliases)
      if (!r) continue
      hit++
      if (!data[mt.key][period.year]) data[mt.key][period.year] = {}
      data[mt.key][period.year][period.cumMonth] = {
        cum: r.cum,
        cumYoy: r.cumYoy,
        monthly: null,
        monthlyYoy: null,
        mom: null,
      }
    }
    periods.push({ ...period, metricHit: hit })
    parsedCount++
    console.log(`✓ ${f} → ${period.periodLabel}（命中 ${hit}/${METRICS.length} 指标）`)
  }

  // ── 派生：单月值 / 单月同比 / 环比 ────────────────────────────
  for (const mt of METRICS) {
    const byYear = data[mt.key]
    // 先算各年 monthly（相邻累计差分）
    for (const year of Object.keys(byYear)) {
      const months = Object.keys(byYear[year])
        .map(Number)
        .sort((a, b) => a - b)
      let prevMonth = null
      for (const m of months) {
        const cur = byYear[year][m]
        if (prevMonth == null) {
          // 该年首个可得月：monthly = 累计（1..m 合计）
          cur.monthly = cur.cum
        } else {
          const prev = byYear[year][prevMonth]
          cur.monthly =
            cur.cum != null && prev.cum != null
              ? round2(cur.cum - prev.cum)
              : null
        }
        prevMonth = m
      }
    }
    // 再算 mom（同年相邻月单月环比）与 monthlyYoy（跨年同月单月同比）
    for (const year of Object.keys(byYear)) {
      const y = Number(year)
      const months = Object.keys(byYear[year])
        .map(Number)
        .sort((a, b) => a - b)
      let prevMonth = null
      for (const m of months) {
        const cur = byYear[year][m]
        // 环比
        if (prevMonth != null) {
          const prev = byYear[year][prevMonth]
          if (cur.monthly != null && prev.monthly != null && prev.monthly !== 0) {
            cur.mom = round2(((cur.monthly - prev.monthly) / Math.abs(prev.monthly)) * 100)
          }
        }
        // 单月同比（去年同 cumMonth）
        const last = byYear[y - 1] && byYear[y - 1][m]
        if (last && cur.monthly != null && last.monthly != null && last.monthly !== 0) {
          cur.monthlyYoy = round2(((cur.monthly - last.monthly) / Math.abs(last.monthly)) * 100)
        }
        prevMonth = m
      }
    }
  }

  periods.sort((a, b) => (a.periodKey < b.periodKey ? -1 : 1))

  const out = {
    updatedAt: new Date().toISOString(),
    source: 'https://gks.mof.gov.cn/tongjishuju/',
    unit: '亿元',
    note: '财政部公布值为年初至今累计值；monthly=相邻累计差分（首期为1-2月合计置于x=2），monthlyYoy=单月同比%，mom=单月环比%，cumYoy=累计同比%（取自原文）。',
    metricsMeta: METRICS.map(({ key, label, group }) => ({ key, label, group })),
    periods,
    data,
  }
  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2), 'utf8')
  console.log(`\n已写出 ${OUT_FILE}`)
  console.log(`共解析 ${parsedCount} 期，${periods.length} 条统计期记录`)
}

function round2(n) {
  return Math.round(n * 100) / 100
}

main()
