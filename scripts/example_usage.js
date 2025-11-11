/**
 * 爬虫使用示例
 * 展示如何使用自动化爬虫系统
 */

const GenericCrawler = require('./generic_crawler');

// 示例1: 爬取商品价格数据
async function exampleGoodsPrice() {
  console.log('示例1: 爬取商品价格数据');
  console.log('='.repeat(40));
  
  try {
    const crawler = new GenericCrawler('goodsPrice');
    const result = await crawler.crawlAndParse(2); // 只爬取2页进行测试
    
    console.log('\n爬取结果:');
    console.log(`- 目标: ${result.target}`);
    console.log(`- 找到链接: ${result.totalLinks} 个`);
    console.log(`- 下载文件: ${result.downloadedFiles} 个`);
    
    if (result.files.length > 0) {
      console.log('\n下载的文件:');
      result.files.forEach(file => console.log(`  - ${file}`));
    }
    
  } catch (error) {
    console.error('爬取失败:', error.message);
  }
}

// 示例2: 爬取能源数据
async function exampleEnergy() {
  console.log('\n示例2: 爬取能源数据');
  console.log('='.repeat(40));
  
  try {
    const crawler = new GenericCrawler('energy');
    const result = await crawler.crawlAndParse(1); // 只爬取1页进行测试
    
    console.log('\n爬取结果:');
    console.log(`- 目标: ${result.target}`);
    console.log(`- 找到链接: ${result.totalLinks} 个`);
    console.log(`- 下载文件: ${result.downloadedFiles} 个`);
    
  } catch (error) {
    console.error('爬取失败:', error.message);
  }
}

// 示例3: 批量爬取多种数据类型
async function exampleBatchCrawl() {
  console.log('\n示例3: 批量爬取多种数据类型');
  console.log('='.repeat(40));
  
  const targets = ['goodsPrice', 'energy', 'house'];
  const results = {};
  
  for (const target of targets) {
    try {
      console.log(`\n正在爬取: ${target}`);
      const crawler = new GenericCrawler(target);
      const result = await crawler.crawlAndParse(1);
      results[target] = result;
      
      console.log(`✅ ${target}: ${result.downloadedFiles} 个文件`);
      
      // 在每个类型之间添加延迟
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`❌ ${target}: ${error.message}`);
      results[target] = { error: error.message };
    }
  }
  
  // 显示总结
  console.log('\n批量爬取总结:');
  Object.entries(results).forEach(([target, result]) => {
    if (result.error) {
      console.log(`- ${target}: 失败 - ${result.error}`);
    } else {
      console.log(`- ${target}: 成功 - ${result.downloadedFiles} 个文件`);
    }
  });
}

// 示例4: 只下载不解析
async function exampleDownloadOnly() {
  console.log('\n示例4: 只下载Excel文件，不运行解析脚本');
  console.log('='.repeat(40));
  
  try {
    const crawler = new GenericCrawler('goodsPrice');
    
    // 获取页面链接
    const pageUrls = crawler.getPageUrls(1);
    const links = await crawler.extractRelevantLinks(pageUrls[0]);
    
    console.log(`找到 ${links.length} 个相关链接`);
    
    // 只下载第一个链接的文件
    if (links.length > 0) {
      const files = await crawler.downloadExcelFromDetailPage(links[0].url);
      console.log(`下载了 ${files.length} 个文件`);
      files.forEach(file => console.log(`  - ${file}`));
    }
    
  } catch (error) {
    console.error('下载失败:', error.message);
  }
}

// 主函数
async function main() {
  console.log('统计局数据自动爬虫系统 - 使用示例\n');
  
  // 运行示例
  await exampleGoodsPrice();
  await exampleEnergy();
  await exampleBatchCrawl();
  await exampleDownloadOnly();
  
  console.log('\n所有示例执行完成！');
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(error => {
    console.error('示例执行失败:', error.message);
    process.exit(1);
  });
}

module.exports = {
  exampleGoodsPrice,
  exampleEnergy,
  exampleBatchCrawl,
  exampleDownloadOnly
};
