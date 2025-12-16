#!/usr/bin/env node

/**
 * 爬虫主入口文件
 * 支持多种统计局数据类型的自动抓取
 * 
 * 使用方法:
 * node crawler_main.js [targetType] [maxPages]
 * 
 * 支持的目标类型:
 * - goodsPrice: 流通领域重要生产资料市场价格变动情况
 * - energy: 能源生产情况  
 * - house: 全国房地产市场基本情况
 * - retail: 社会消费品零售总额
 * - invest: 全国固定资产投资
 * - profits: 全国规模以上工业企业利润
 * - industryProfits: 分行业工业企业利润
 * 
 * 示例:
 * node crawler_main.js goodsPrice 5
 * node crawler_main.js energy 3
 */

const GenericCrawler = require('./generic_crawler');
const config = require('./crawler_config');

class CrawlerMain {
  constructor() {
    this.supportedTargets = Object.keys(config.statsGov.targets);
  }

  /**
   * 显示帮助信息
   */
  showHelp() {
    console.log(`
统计局数据自动爬虫系统

使用方法:
  node crawler_main.js [targetType] [pageRange]

支持的目标类型:
${this.supportedTargets.map((target, index) => {
  const targetConfig = config.statsGov.targets[target];
  return `  ${index + 1}. ${target}: ${targetConfig.name}`;
}).join('\n')}

参数说明:
  targetType  目标数据类型 (默认: goodsPrice)
  pageRange   分页范围，支持以下格式:
              - 单个数字: 5          (爬取第1-5页)
              - 区间范围: 2-5        (爬取第2-5页)
              - 带前缀:   --page-range 2-5

示例:
  node crawler_main.js goodsPrice 5              # 爬取第1-5页
  node crawler_main.js goodsPrice 2-5            # 爬取第2-5页
  node crawler_main.js energy --page-range 3-8   # 爬取第3-8页
  node crawler_main.js all 3                     # 爬取所有类型数据的前3页

注意事项:
  - 爬取过程会有延迟，避免对服务器造成压力
  - 下载的文件会保存在 stock/ 目录下对应的子目录中
  - 爬取完成后会自动运行解析脚本生成清理后的数据
    `);
  }

  /**
   * 验证目标类型
   */
  validateTarget(targetType) {
    if (!this.supportedTargets.includes(targetType)) {
      console.error(`错误: 不支持的目标类型 "${targetType}"`);
      console.log(`支持的类型: ${this.supportedTargets.join(', ')}`);
      return false;
    }
    return true;
  }

  /**
   * 解析分页参数
   * 支持格式: 
   *   - 单个数字: "5" -> {start: 1, end: 5}
   *   - 区间范围: "2-5" -> {start: 2, end: 5}
   * @returns {Object|false} {start, end} 或 false（如果无效）
   */
  parsePageRange(pageRangeStr) {
    const pagination = config.statsGov.pagination;
    
    // 检查是否是区间格式 "2-5"
    const rangeMatch = pageRangeStr.match(pagination.pageRangePattern);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1]);
      const end = parseInt(rangeMatch[2]);
      
      if (start < 1) {
        console.error(`错误: 起始页码必须大于等于1`);
        return false;
      }
      if (end < start) {
        console.error(`错误: 结束页码(${end})不能小于起始页码(${start})`);
        return false;
      }
      if (end > pagination.maxAllowedPages) {
        console.error(`错误: 结束页码不能超过 ${pagination.maxAllowedPages}`);
        return false;
      }
      
      return { start, end };
    }
    
    // 如果不是区间格式，尝试解析为单个数字（表示从第1页到该页）
    const pages = parseInt(pageRangeStr);
    if (isNaN(pages) || pages < 1 || pages > pagination.maxAllowedPages) {
      console.error(`错误: 页数参数无效 "${pageRangeStr}"`);
      console.log(`页数必须是1-${pagination.maxAllowedPages}之间的数字，或使用区间格式如 "2-5"`);
      return false;
    }
    
    return { start: 1, end: pages };
  }
  
  /**
   * 验证页数参数（保持向后兼容）
   * @deprecated 使用 parsePageRange 代替
   */
  validateMaxPages(maxPages) {
    return this.parsePageRange(maxPages);
  }

  /**
   * 爬取单个目标类型
   * @param {string} targetType - 目标类型
   * @param {number} startPage - 起始页码
   * @param {number} endPage - 结束页码
   */
  async crawlSingle(targetType, startPage, endPage) {
    try {
      const pageInfo = startPage === 1 ? `前${endPage}页` : `第${startPage}-${endPage}页`;
      console.log(`\n开始爬取: ${targetType} (${pageInfo})`);
      console.log('='.repeat(50));
      
      const crawler = new GenericCrawler(targetType);
      const result = await crawler.crawlAndParse(startPage, endPage);
      
      console.log('\n爬取结果:');
      console.log(`- 目标类型: ${result.target}`);
      console.log(`- 找到链接: ${result.totalLinks} 个`);
      console.log(`- 下载文件: ${result.downloadedFiles} 个`);
      
      if (result.files.length > 0) {
        console.log('\n下载的文件:');
        result.files.forEach(file => {
          console.log(`  - ${file}`);
        });
      }
      
      return result;
    } catch (error) {
      console.error(`爬取 ${targetType} 失败:`, error.message);
      throw error;
    }
  }

  /**
   * 爬取所有支持的目标类型
   * @param {number} startPage - 起始页码
   * @param {number} endPage - 结束页码
   */
  async crawlAll(startPage, endPage) {
    const pageInfo = startPage === 1 ? `前${endPage}页` : `第${startPage}-${endPage}页`;
    console.log(`\n开始爬取所有类型数据 (${pageInfo})`);
    console.log('='.repeat(50));
    
    const results = {};
    const errors = {};
    
    for (const targetType of this.supportedTargets) {
      try {
        console.log(`\n正在处理: ${targetType}`);
        const result = await this.crawlSingle(targetType, startPage, endPage);
        results[targetType] = result;
        
        // 在每个类型之间添加延迟
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`爬取 ${targetType} 失败:`, error.message);
        errors[targetType] = error.message;
      }
    }
    
    // 显示总结
    console.log('\n' + '='.repeat(50));
    console.log('爬取完成总结:');
    console.log(`- 成功: ${Object.keys(results).length} 个类型`);
    console.log(`- 失败: ${Object.keys(errors).length} 个类型`);
    
    if (Object.keys(results).length > 0) {
      console.log('\n成功爬取的类型:');
      Object.entries(results).forEach(([type, result]) => {
        console.log(`  - ${type}: ${result.downloadedFiles} 个文件`);
      });
    }
    
    if (Object.keys(errors).length > 0) {
      console.log('\n失败的类型:');
      Object.entries(errors).forEach(([type, error]) => {
        console.log(`  - ${type}: ${error}`);
      });
    }
    
    return { results, errors };
  }

  /**
   * 主执行函数
   */
  async run() {
    const args = process.argv.slice(2);
    
    // 显示帮助
    if (args.includes('--help') || args.includes('-h')) {
      this.showHelp();
      return;
    }
    
    // 解析参数
    const targetType = args[0] || 'goodsPrice';
    
    // 解析分页参数
    let pageRangeStr;
    if (args.includes('--page-range')) {
      // 处理 --page-range 2-5 格式
      const rangeIndex = args.indexOf('--page-range');
      pageRangeStr = args[rangeIndex + 1] || '3';
    } else {
      // 处理简化格式: node crawler_main.js goodsPrice 5 或 2-5
      pageRangeStr = args[1] || '3';
    }
    
    // 解析页码范围
    const pageRange = this.parsePageRange(pageRangeStr);
    if (!pageRange) {
      process.exit(1);
    }
    
    const { start, end } = pageRange;
    
    // 处理特殊情况：爬取所有类型
    if (targetType === 'all') {
      await this.crawlAll(start, end);
      return;
    }
    
    // 验证目标类型
    if (!this.validateTarget(targetType)) {
      process.exit(1);
    }
    
    // 开始爬取
    try {
      await this.crawlSingle(targetType, start, end);
      console.log('\n✅ 爬取任务完成!');
    } catch (error) {
      console.error('\n❌ 爬取任务失败:', error.message);
      process.exit(1);
    }
  }
}

// 如果直接运行此文件
if (require.main === module) {
  const main = new CrawlerMain();
  main.run().catch(error => {
    console.error('程序执行出错:', error.message);
    process.exit(1);
  });
}

module.exports = CrawlerMain;
