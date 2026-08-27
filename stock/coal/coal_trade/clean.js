#!/usr/bin/env node
'use strict'
// 清洗海关煤炭进出口 CSV -> coal_trade.json（支持多商品，按 商品编码 分组）
// 用法: node clean.js
const fs = require('fs')
const path = require('path')
const iconv = require('/Users/lijiye/work/funny/node_modules/iconv-lite')

const DIR = __dirname
const COMMODITY_LABELS = {
  '27011210': '焦煤进口',
  '27011100': '无烟煤进口',
}

function parseNum(s) {
  if (s == null) return 0
  let t = String(s).trim()
  if (t === '' || t === '?' || t === '-' || t === 'null') return 0
  t = t.replace(/,/g, '').replace(/[^\d.\-]/g, '')
  const n = Number(t)
  return Number.isFinite(n) ? n : 0
}

// 极简 CSV 解析（支持带引号字段、字段内逗号）
function parseCSV(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else field += c
    } else {
      if (c === '"') inQuotes = true
      else if (c === ',') { row.push(field); field = '' }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
      else if (c === '\r') { /* skip */ }
      else field += c
    }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row) }
  return rows
}

function main() {
  const files = fs.readdirSync(DIR).filter((f) => f.toLowerCase().endsWith('.csv'))
  if (!files.length) { console.error('未找到 CSV 文件'); process.exit(1) }

  // comm[code] = { files, meta:{code,name}, totals, partners, yearsSet }
  const comm = {}

  for (const f of files) {
    const text = iconv.decode(fs.readFileSync(path.join(DIR, f)), 'gbk')
    const rows = parseCSV(text)
    // 找到表头
    let headerIdx = rows.findIndex((r) => r[0] && r[0].includes('数据年月'))
    if (headerIdx < 0) headerIdx = 0
    const header = rows[headerIdx].map((h) => h.trim())
    const idx = (name) => header.indexOf(name)
    const iYM = idx('数据年月'), iCode = idx('商品编码'), iName = idx('商品名称')
    const iPCode = idx('贸易伙伴编码'), iPName = idx('贸易伙伴名称')
    const iQty = idx('第一数量'), iRMB = idx('人民币')

    // 确定商品编码（取该文件首行数据行的商品编码）
    let code = null
    for (let r = headerIdx + 1; r < rows.length; r++) {
      if (iCode >= 0 && rows[r] && rows[r][iCode]) { code = String(rows[r][iCode]).trim(); break }
    }
    if (!code) { console.warn('跳过无法识别商品的 CSV:', f); continue }

    const c = comm[code] = comm[code] || { files: [], meta: { code, name: null }, totals: {}, partners: {}, yearsSet: new Set() }
    c.files.push(f)

    for (let r = headerIdx + 1; r < rows.length; r++) {
      const row = rows[r]
      if (!row || !row[iYM]) continue
      const ym = String(row[iYM]).trim()
      const m = ym.match(/^(\d{4})(\d{2})$/)
      if (!m) continue
      const year = Number(m[1])
      const month = Number(m[2])
      c.yearsSet.add(year)
      if (!c.meta.name && iName >= 0 && row[iName]) c.meta.name = String(row[iName]).trim()

      const qty = parseNum(row[iQty])
      const rmb = parseNum(row[iRMB])
      const pCode = iPCode >= 0 ? String(row[iPCode]).trim() : ''
      const pName = iPName >= 0 ? String(row[iPName]).trim() : ''

      c.totals[year] = c.totals[year] || {}
      c.totals[year][month] = c.totals[year][month] || { qty: 0, rmb: 0 }
      c.totals[year][month].qty += qty
      c.totals[year][month].rmb += rmb

      c.partners[year] = c.partners[year] || {}
      c.partners[year][month] = c.partners[year][month] || {}
      const p = c.partners[year][month][pCode] = c.partners[year][month][pCode] || { name: pName, qty: 0, rmb: 0 }
      p.qty += qty; p.rmb += rmb
    }
  }

  function rate(cur, prev) {
    if (cur == null || prev == null || prev === 0) return null
    return +(((cur - prev) / prev) * 100).toFixed(1)
  }

  // 按口径（全部或某国）构建 12 月序列 + 最新年份同比/环比
  function buildCountryData(getYM, years, latestYear, prevYear, monthsAvail) {
    const qtyWanTon = {}
    const rmbYiYuan = {}
    const unitPriceYuanPerTon = {}
    for (const y of years) {
      qtyWanTon[y] = []; rmbYiYuan[y] = []; unitPriceYuanPerTon[y] = []
      for (let mo = 1; mo <= 12; mo++) {
        const t = getYM(y, mo)
        qtyWanTon[y].push(t ? +(t.qty / 1e7).toFixed(2) : null)            // 千克 -> 万吨
        rmbYiYuan[y].push(t ? +(t.rmb / 1e8).toFixed(3) : null)            // 元 -> 亿元
        unitPriceYuanPerTon[y].push(t && t.qty ? +(t.rmb / t.qty * 1000).toFixed(1) : null) // 元/吨
      }
    }
    const latestYearRates = []
    for (const mo of monthsAvail) {
      const cur = getYM(latestYear, mo)
      const same = getYM(prevYear, mo)
      const prevMonth = mo === 1 ? getYM(prevYear, 12) : getYM(latestYear, mo - 1)
      if (!cur) {
        latestYearRates.push({ month: mo, qty: null, qtyYoY: null, qtyMoM: null, rmb: null, rmbYoY: null, rmbMoM: null, price: null, priceYoY: null, priceMoM: null })
        continue
      }
      const curUP = cur.rmb / cur.qty
      const sameUP = same ? same.rmb / same.qty : null
      const prevUP = prevMonth ? prevMonth.rmb / prevMonth.qty : null
      latestYearRates.push({
        month: mo,
        qty: +(cur.qty / 1e7).toFixed(2),
        qtyYoY: rate(cur.qty, same && same.qty),
        qtyMoM: rate(cur.qty, prevMonth && prevMonth.qty),
        rmb: +(cur.rmb / 1e8).toFixed(3),
        rmbYoY: rate(cur.rmb, same && same.rmb),
        rmbMoM: rate(cur.rmb, prevMonth && prevMonth.rmb),
        price: +(curUP * 1000).toFixed(1),
        priceYoY: rate(curUP, sameUP),
        priceMoM: rate(curUP, prevUP),
      })
    }
    return { series: { qtyWanTon, rmbYiYuan, unitPriceYuanPerTon }, latestYearRates }
  }

  // 组装每个商品
  const commodities = {}
  for (const code of Object.keys(comm).sort()) {
    const c = comm[code]
    const years = [...c.yearsSet].sort()
    const latestYear = years[years.length - 1]
    const prevYear = years.length >= 2 ? years[years.length - 2] : null
    const monthsAvail = Object.keys(c.totals[latestYear] || {}).map(Number).sort((a, b) => a - b)

    // 全部口径
    const allData = buildCountryData((y, m) => (c.totals[y] && c.totals[y][m]) || null, years, latestYear, prevYear, monthsAvail)

    // 国家（地区）列表：按累计数量倒序，过滤 <10万千克(100吨) 的噪声记录
    const countryTot = {}
    for (const y of years) for (const mo of monthsAvail) {
      const pm = c.partners[y] && c.partners[y][mo]
      if (!pm) continue
      for (const pc in pm) {
        countryTot[pc] = countryTot[pc] || { name: pm[pc].name, qty: 0 }
        countryTot[pc].qty += pm[pc].qty
      }
    }
    const countries = Object.keys(countryTot)
      .map((pc) => ({ code: pc, name: countryTot[pc].name, qty: countryTot[pc].qty }))
      .filter((x) => x.qty >= 100000)
      .sort((a, b) => b.qty - a.qty)

    const byCountry = {}
    for (const ct of countries) {
      byCountry[ct.code] = Object.assign({ name: ct.name }, buildCountryData((y, m) => {
        const pm = c.partners[y] && c.partners[y][m]
        return (pm && pm[ct.code]) || null
      }, years, latestYear, prevYear, monthsAvail))
    }

    // YTD 合计 + 加权均价（全部口径）
    function ytdSum(year) {
      let q = 0, r = 0
      for (const mo of monthsAvail) { const t = c.totals[year] && c.totals[year][mo]; if (t) { q += t.qty; r += t.rmb } }
      return { qty: +(q / 1e7).toFixed(2), rmb: +(r / 1e8).toFixed(3) }
    }
    const ytdLatest = ytdSum(latestYear)
    const ytdPrev = ytdSum(prevYear)
    const ytdYoY = { qtyYoY: rate(ytdLatest.qty, ytdPrev.qty), rmbYoY: rate(ytdLatest.rmb, ytdPrev.rmb) }
    function ytdPrice(year) {
      const s = ytdSum(year)
      return s.qty ? +(s.rmb / s.qty * 10000).toFixed(1) : null
    }
    const priceLatest = ytdPrice(latestYear)
    const pricePrev = ytdPrice(prevYear)
    const priceYoY = rate(priceLatest, pricePrev)

    commodities[code] = {
      label: COMMODITY_LABELS[code] || ((c.meta.name || code) + '进口'),
      meta: {
        commodityCode: code,
        commodityName: c.meta.name || code,
        source: '海关总署统计数据查询平台 (stats.customs.gov.cn)',
        unit: '千克',
        valueUnit: '人民币元',
        years,
        latestYear,
        monthsAvailableLatest: monthsAvail,
        files: c.files,
      },
      series: allData.series,
      latestYearRates: allData.latestYearRates,
      countries,
      byCountry,
      summary: { ytdLatest, ytdPrev, ytdYoY, priceLatest, pricePrev, priceYoY },
    }

    console.log('[' + code + ']', COMMODITY_LABELS[code] || c.meta.name, '| 年份:', years.join(','), '| 最新年YTD 数量', ytdLatest.qty, '万吨 金额', ytdLatest.rmb, '亿元 | 均价', priceLatest, '元/吨 | 国家数:', countries.length)
  }

  const out = {
    generatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    commodities,
  }

  const outPath = path.join(DIR, 'coal_trade.json')
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf-8')
  console.log('已生成:', outPath, '| 商品数:', Object.keys(commodities).length)
}

main()
