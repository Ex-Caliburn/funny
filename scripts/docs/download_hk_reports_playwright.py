#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
港股业绩报下载工具 - Playwright版本
使用Playwright自动化浏览器下载港交所业绩报告

安装依赖:
    pip install playwright
    playwright install chromium

使用方法:
    python download_hk_reports_playwright.py --code 00700 --name 腾讯控股 --years 2023 --type annual
"""

import argparse
import asyncio
import os
import sys
from pathlib import Path
from playwright.async_api import async_playwright
import aiohttp
import aiofiles

# 报告类型配置
REPORT_TYPES = {
    'annual': {
        'keywords': ['年报', 'Annual Report', 'Annual'],
        'category': '40100'  # Financial Statements/ESG Information -> Annual Report
    },
    'interim': {
        'keywords': ['中期', 'Interim', 'Half-Year'],
        'category': '40200'  # Interim/Half-Year Report
    },
    'quarterly': {
        'keywords': ['季度', 'Quarterly', 'Q1', 'Q2', 'Q3'],
        'category': '40300'  # Quarterly Report
    }
}

async def download_file(session, url, filepath):
    """下载文件"""
    try:
        async with session.get(url) as response:
            if response.status == 200:
                async with aiofiles.open(filepath, 'wb') as f:
                    async for chunk in response.iter_chunked(8192):
                        await f.write(chunk)
                return True
    except Exception as e:
        print(f"      ❌ 下载失败: {e}")
        return False

async def search_and_download(stock_code, stock_name, year, report_type, output_dir):
    """搜索并下载报告"""
    type_config = REPORT_TYPES.get(report_type)
    if not type_config:
        print(f"❌ 未知的报告类型: {report_type}")
        return
    
    # 创建输出目录
    output_path = Path(output_dir) / stock_name
    output_path.mkdir(parents=True, exist_ok=True)
    
    async with async_playwright() as p:
        # 启动浏览器
        browser = await p.chromium.launch(headless=False)  # headless=False 可以看到浏览器操作
        context = await browser.new_context(
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        )
        page = await context.new_page()
        
        try:
            # 访问搜索页面
            print(f"🔍 访问港交所搜索页面...")
            await page.goto('https://www.hkexnews.hk/search/titlesearch.xhtml?lang=zh', 
                          wait_until='networkidle', timeout=30000)
            
            # 等待页面加载
            await page.wait_for_timeout(2000)
            
            # 填写股票代码
            print(f"📝 填写股票代码: {stock_code}")
            stock_input = page.locator('#searchStockCode')
            await stock_input.click()
            await stock_input.fill(stock_code)
            
            # 填写日期范围
            from_date = f"{year}/01/01"
            to_date = f"{year + 1}/12/31"
            print(f"📅 设置日期范围: {from_date} 至 {to_date}")
            
            from_input = page.locator('#searchDate-From')
            await from_input.click()
            await from_input.fill(from_date)
            
            to_input = page.locator('#searchDate-To')
            await to_input.click()
            await to_input.fill(to_date)
            
            # 等待一下
            await page.wait_for_timeout(1000)
            
            # 点击搜索按钮
            print(f"🔍 点击搜索按钮...")
            search_btn = page.locator('.filter__btn-applyFilters-js')
            await search_btn.click()
            
            # 等待搜索结果
            print(f"⏳ 等待搜索结果加载...")
            try:
                await page.wait_for_selector('table tbody tr, #titleSearchResultPanel table tbody tr', 
                                           timeout=20000)
            except:
                print(f"⚠️  等待超时，继续尝试...")
            
            # 再等待一下确保内容加载
            await page.wait_for_timeout(3000)
            
            # 提取搜索结果
            print(f"📊 提取搜索结果...")
            # 使用更简单的方法提取
                rows = await page.query_selector_all('table tbody tr')
                results = []
                
                for row in rows:
                    cells = await row.query_selector_all('td')
                    if len(cells) < 4:
                        continue
                    
                    date_text = await cells[0].inner_text()
                    title_cell = cells[3]
                    title_link = await title_cell.query_selector('a')
                    
                    if not title_link:
                        continue
                    
                    title = await title_link.inner_text()
                    href = await title_link.get_attribute('href')
                    
                    # 检查年份
                    import re
                    date_match = re.search(r'(\d{4})', date_text)
                    if not date_match:
                        continue
                    
                    report_year = int(date_match.group(1))
                    if report_year < year or report_year > year + 1:
                        continue
                    
                    # 检查关键词
                    title_lower = title.lower()
                    has_keyword = any(kw.lower() in title_lower or kw in title 
                                    for kw in type_config['keywords'])
                    
                    if not has_keyword:
                        continue
                    
                    # 排除不需要的
                    exclude_words = ['摘要', 'Summary', '更正', 'Amendment', '补充', 'Supplement']
                    if any(word in title for word in exclude_words):
                        continue
                    
                    # 构建完整URL
                    if not href.startswith('http'):
                        href = 'https://www.hkexnews.hk' + href
                    
                    results.append({
                        'date': date_text.strip(),
                        'title': title.strip(),
                        'url': href
                    })
            
            print(f"✅ 找到 {len(results)} 个结果")
            
            # 下载文件
            async with aiohttp.ClientSession() as session:
                for i, result in enumerate(results, 1):
                    print(f"\n[{i}/{len(results)}] {result['title']}")
                    print(f"   日期: {result['date']}")
                    print(f"   URL: {result['url']}")
                    
                    # 生成文件名
                    safe_title = "".join(c for c in result['title'] if c.isalnum() or c in (' ', '-', '_')).strip()
                    filename = f"{stock_name}_{year}_{safe_title[:50]}.pdf"
                    filepath = output_path / filename
                    
                    if filepath.exists():
                        print(f"   ⏭️  文件已存在，跳过")
                        continue
                    
                    print(f"   ⬇️  下载中...")
                    success = await download_file(session, result['url'], filepath)
                    
                    if success:
                        size = filepath.stat().st_size / 1024
                        print(f"   ✅ 下载完成 ({size:.1f} KB)")
                    else:
                        print(f"   ❌ 下载失败")
            
        except Exception as e:
            print(f"❌ 错误: {e}")
            import traceback
            traceback.print_exc()
        finally:
            await browser.close()

def main():
    parser = argparse.ArgumentParser(description='港股业绩报下载工具 - Playwright版本')
    parser.add_argument('--code', required=True, help='股票代码（5位数字，如：00700）')
    parser.add_argument('--name', required=True, help='公司名称（如：腾讯控股）')
    parser.add_argument('--years', help='年份（逗号分隔，如：2021,2022,2023）')
    parser.add_argument('--start', type=int, help='起始年份')
    parser.add_argument('--end', type=int, help='结束年份')
    parser.add_argument('--type', required=True, 
                       choices=['annual', 'interim', 'quarterly'],
                       help='报告类型：annual(年报), interim(中期), quarterly(季度)')
    parser.add_argument('--output', default='./stock/hk_reports', 
                       help='输出目录（默认：./stock/hk_reports）')
    
    args = parser.parse_args()
    
    # 解析年份
    if args.years:
        years = [int(y.strip()) for y in args.years.split(',')]
    elif args.start and args.end:
        years = list(range(args.start, args.end + 1))
    else:
        print("❌ 请提供年份（--years 或 --start/--end）")
        sys.exit(1)
    
    print(f"\n{'='*60}")
    print(f"📥 港股业绩报下载工具 - Playwright版本")
    print(f"{'='*60}\n")
    print(f"公司: {args.name} ({args.code})")
    print(f"年份: {', '.join(map(str, years))}")
    print(f"类型: {args.type}")
    print(f"输出: {args.output}\n")
    
    # 运行下载
    for year in years:
        print(f"\n{'='*60}")
        print(f"📊 {args.name} {year} 年")
        print(f"{'='*60}\n")
        asyncio.run(search_and_download(
            args.code, args.name, year, args.type, args.output
        ))

if __name__ == '__main__':
    main()

