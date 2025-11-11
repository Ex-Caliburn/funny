/**
 * 爬虫测试脚本
 * 用于测试爬虫功能是否正常工作
 */

const GenericCrawler = require('./generic_crawler');

async function testCrawler() {
  console.log('开始测试爬虫功能...\n');
  
  try {
    // 测试商品价格爬虫
    console.log('测试商品价格爬虫...');
    const goodsCrawler = new GenericCrawler('goodsPrice');
    
    // 只爬取1页进行测试
    const result = await goodsCrawler.crawlAndParse(1);
    
    console.log('\n测试结果:');
    console.log(`- 找到链接: ${result.totalLinks} 个`);
    console.log(`- 下载文件: ${result.downloadedFiles} 个`);
    
    if (result.files.length > 0) {
      console.log('\n下载的文件:');
      result.files.forEach(file => {
        console.log(`  - ${file}`);
      });
    }
    
    console.log('\n✅ 爬虫测试完成!');
    
  } catch (error) {
    console.error('\n❌ 爬虫测试失败:', error.message);
    
    // 提供一些故障排除建议
    console.log('\n故障排除建议:');
    console.log('1. 检查网络连接是否正常');
    console.log('2. 确认统计局网站是否可以访问');
    console.log('3. 检查依赖是否已正确安装 (npm install)');
    console.log('4. 尝试减少爬取页数或增加延迟时间');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  testCrawler();
}

module.exports = testCrawler;
