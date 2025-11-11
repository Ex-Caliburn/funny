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
  node crawler_main.js [targetType] [maxPages]

支持的目标类型:
${this.supportedTargets.map((target, index) => {
  const targetConfig = config.statsGov.targets[target];
  return `  ${index + 1}. ${target}: ${targetConfig.name}`;
}).join('\n')}

参数说明:
  targetType  目标数据类型 (默认: goodsPrice)
  maxPages    最大爬取页数 (默认: 3)

示例:
  node crawler_main.js goodsPrice 5    # 爬取商品价格数据，最多5页
  node crawler_main.js energy 3        # 爬取能源数据，最多3页
  node crawler_main.js all             # 爬取所有类型数据

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
   * 验证页数参数
   */
  validateMaxPages(maxPages) {
    const pages = parseInt(maxPages);
    if (isNaN(pages) || pages < 1 || pages > 20) {
      console.error(`错误: 页数参数无效 "${maxPages}"`);
      console.log('页数必须是1-20之间的数字');
      return false;
    }
    return pages;
  }

  /**
   * 爬取单个目标类型
   */
  async crawlSingle(targetType, maxPages) {
    try {
      console.log(`\n开始爬取: ${targetType} (最多${maxPages}页)`);
      console.log('='.repeat(50));
      
      const crawler = new GenericCrawler(targetType);
      const result = await crawler.crawlAndParse(maxPages);
      
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
   */
  async crawlAll(maxPages) {
    console.log(`\n开始爬取所有类型数据 (最多${maxPages}页)`);
    console.log('='.repeat(50));
    
    const results = {};
    const errors = {};
    
    for (const targetType of this.supportedTargets) {
      try {
        console.log(`\n正在处理: ${targetType}`);
        const result = await this.crawlSingle(targetType, maxPages);
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
    const maxPagesStr = args[1] || '3';
    
    // 处理特殊情况
    if (targetType === 'all') {
      const maxPages = this.validateMaxPages(maxPagesStr);
      if (!maxPages) {
        process.exit(1);
      }
      
      await this.crawlAll(maxPages);
      return;
    }
    
    // 验证参数
    if (!this.validateTarget(targetType)) {
      process.exit(1);
    }
    
    const maxPages = this.validateMaxPages(maxPagesStr);
    if (!maxPages) {
      process.exit(1);
    }
    
    // 开始爬取
    try {
      await this.crawlSingle(targetType, maxPages);
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
