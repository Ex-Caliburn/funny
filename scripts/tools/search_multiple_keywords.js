const { PDFParse } = require('pdf-parse');
const fs = require('fs');
const path = require('path');

/**
 * 在PDF文件中搜索多个关键词，并显示详细结果
 */

async function searchKeywordsInPDF(filePath, keywords) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const parser = new PDFParse({ data: dataBuffer });
    const textData = await parser.getText();
    const text = textData.text;
    
    const results = {};
    
    for (const keyword of keywords) {
      // 使用正则表达式进行精确匹配
      let pattern;
      if (keyword === '末煤') {
        // "末煤"需要精确匹配，不能是"选末煤"或"洗末煤"的一部分
        // 匹配"末煤"但前面不是"选"或"洗"
        pattern = /(?<!选)(?<!洗)末煤/g;
        // 如果浏览器不支持lookbehind，使用简单匹配然后过滤
        if (!pattern.test) {
          // 使用简单匹配，然后手动过滤
          const simpleMatches = text.match(/末煤/g);
          if (simpleMatches) {
            // 检查每个匹配位置，确保前面不是"选"或"洗"
            const filteredMatches = [];
            let searchIndex = 0;
            while (true) {
              const index = text.indexOf('末煤', searchIndex);
              if (index === -1) break;
              const beforeChar = index > 0 ? text[index - 1] : '';
              if (beforeChar !== '选' && beforeChar !== '洗') {
                filteredMatches.push(index);
              }
              searchIndex = index + 1;
            }
            results[keyword] = {
              found: filteredMatches.length > 0,
              count: filteredMatches.length,
              position: filteredMatches[0],
              context: filteredMatches.length > 0 ? text.substring(Math.max(0, filteredMatches[0] - 150), Math.min(text.length, filteredMatches[0] + 150)).replace(/\n/g, ' ').trim() : ''
            };
            continue;
          } else {
            results[keyword] = { found: false, count: 0 };
            continue;
          }
        }
      } else {
        pattern = new RegExp(keyword, 'g');
      }
      
      let matches, count, index;
      
      if (keyword === '末煤') {
        // 手动处理"末煤"，避免匹配到"选末煤"或"洗末煤"
        const allMatches = [];
        let searchIndex = 0;
        while (true) {
          const pos = text.indexOf('末煤', searchIndex);
          if (pos === -1) break;
          const beforeChar = pos > 0 ? text[pos - 1] : '';
          if (beforeChar !== '选' && beforeChar !== '洗') {
            allMatches.push(pos);
          }
          searchIndex = pos + 1;
        }
        count = allMatches.length;
        index = allMatches.length > 0 ? allMatches[0] : -1;
      } else {
        matches = text.match(pattern);
        count = matches ? matches.length : 0;
        index = text.search(pattern);
      }
      
      if (count > 0 && index !== -1) {
        // 找到第一个匹配的位置和上下文
        const start = Math.max(0, index - 150);
        const end = Math.min(text.length, index + 150);
        const context = text.substring(start, end).replace(/\n/g, ' ').trim();
        
        results[keyword] = {
          found: true,
          count: count,
          context: context,
          position: index
        };
      } else {
        results[keyword] = { found: false, count: 0 };
      }
    }
    
    return results;
  } catch (error) {
    return { error: error.message };
  }
}

async function main() {
  const reportDir = path.join(__dirname, '../../stock/report_analysis/华阳股份');
  
  if (!fs.existsSync(reportDir)) {
    console.error(`目录不存在: ${reportDir}`);
    return;
  }
  
  const keywords = ['选末煤', '洗末煤', '末煤'];
  
  const files = fs.readdirSync(reportDir)
    .filter(f => f.toLowerCase().endsWith('.pdf'))
    .sort();
  
  console.log('='.repeat(80));
  console.log('搜索关键词:', keywords.join(', '));
  console.log('='.repeat(80));
  console.log();
  
  const summary = {
    '选末煤': [],
    '洗末煤': [],
    '末煤': []
  };
  
  for (const file of files) {
    const filePath = path.join(reportDir, file);
    const results = await searchKeywordsInPDF(filePath, keywords);
    
    if (results.error) {
      console.log(`❌ ${file}: 错误 - ${results.error}`);
      continue;
    }
    
    const foundKeywords = [];
    for (const keyword of keywords) {
      if (results[keyword] && results[keyword].found) {
        foundKeywords.push(keyword);
        summary[keyword].push({
          file: file,
          count: results[keyword].count,
          context: results[keyword].context
        });
      }
    }
    
    if (foundKeywords.length > 0) {
      console.log(`✅ ${file}`);
      for (const keyword of foundKeywords) {
        const result = results[keyword];
        console.log(`   ${keyword}: 出现 ${result.count} 次`);
        console.log(`   上下文: ${result.context.substring(0, 200)}...`);
      }
      console.log();
    }
  }
  
  // 汇总统计
  console.log('\n' + '='.repeat(80));
  console.log('汇总统计:');
  console.log('='.repeat(80));
  
  for (const keyword of keywords) {
    console.log(`\n【${keyword}】`);
    if (summary[keyword].length === 0) {
      console.log('  未找到');
    } else {
      console.log(`  出现在 ${summary[keyword].length} 个文件中:`);
      summary[keyword].forEach(item => {
        console.log(`    - ${item.file} (出现 ${item.count} 次)`);
      });
    }
  }
  
  // 交叉对比
  console.log('\n' + '='.repeat(80));
  console.log('交叉对比:');
  console.log('='.repeat(80));
  
  const allFiles = new Set();
  keywords.forEach(k => summary[k].forEach(item => allFiles.add(item.file)));
  
  for (const file of Array.from(allFiles).sort()) {
    const hasKeywords = keywords.filter(k => 
      summary[k].some(item => item.file === file)
    );
    if (hasKeywords.length > 1) {
      console.log(`\n${file}:`);
      hasKeywords.forEach(k => {
        const item = summary[k].find(i => i.file === file);
        console.log(`  - ${k}: ${item.count} 次`);
      });
    }
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { searchKeywordsInPDF };

