#!/usr/bin/env node

/**
 * 批量移除文件名中的扫描版标记
 * 移除格式：_[扫描版需手动验证]
 * 
 * 使用方法：
 * # 处理指定目录
 * node remove_scan_mark.js --dir ../stock/report_analysis/中国海洋石油
 * 
 * # 处理所有公司目录（递归）
 * node remove_scan_mark.js --dir ../stock/report_analysis --recursive
 * 
 * # 只显示将要重命名的文件，不实际执行（预览模式）
 * node remove_scan_mark.js --dir ../stock/report_analysis --dry-run
 */

const fs = require('fs');
const path = require('path');

// 扫描版标记模式
const SCAN_MARK_PATTERN = /_\[扫描版需手动验证\]/g;

/**
 * 移除文件名中的扫描版标记
 */
function removeScanMark(filename) {
  return filename.replace(SCAN_MARK_PATTERN, '');
}

/**
 * 递归查找需要重命名的文件
 */
function findFilesToRename(dir, recursive = false) {
  const files = [];
  
  if (!fs.existsSync(dir)) {
    console.error(`❌ 目录不存在: ${dir}`);
    return files;
  }
  
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isFile() && item.includes('_[扫描版需手动验证]')) {
      files.push({
        oldPath: fullPath,
        oldName: item,
        newName: removeScanMark(item),
        newPath: path.join(dir, removeScanMark(item))
      });
    } else if (stat.isDirectory() && recursive) {
      // 递归处理子目录
      files.push(...findFilesToRename(fullPath, true));
    }
  }
  
  return files;
}

/**
 * 主函数
 */
function main() {
  const args = process.argv.slice(2);
  
  // 解析参数
  let targetDir = null;
  let recursive = false;
  let dryRun = false;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dir' && args[i + 1]) {
      targetDir = path.resolve(__dirname, args[i + 1]);
      i++;
    } else if (args[i] === '--recursive' || args[i] === '-r') {
      recursive = true;
    } else if (args[i] === '--dry-run' || args[i] === '-n') {
      dryRun = true;
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
批量移除文件名中的扫描版标记工具

使用方法:
  node remove_scan_mark.js [选项]

选项:
  --dir <目录>     指定要处理的目录（相对或绝对路径）
  --recursive, -r  递归处理子目录
  --dry-run, -n    预览模式，只显示将要重命名的文件，不实际执行
  --help, -h       显示帮助信息

示例:
  # 处理指定目录
  node remove_scan_mark.js --dir ../stock/report_analysis/中国海洋石油

  # 递归处理所有子目录
  node remove_scan_mark.js --dir ../stock/report_analysis --recursive

  # 预览模式
  node remove_scan_mark.js --dir ../stock/report_analysis --dry-run
      `);
      process.exit(0);
    }
  }
  
  // 如果没有指定目录，使用当前工作目录
  if (!targetDir) {
    targetDir = process.cwd();
    console.log(`⚠️  未指定目录，使用当前目录: ${targetDir}`);
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('📝 批量移除文件名中的扫描版标记');
  console.log('='.repeat(70));
  console.log(`\n📁 目标目录: ${targetDir}`);
  console.log(`🔄 递归模式: ${recursive ? '是' : '否'}`);
  console.log(`👀 预览模式: ${dryRun ? '是（不会实际重命名）' : '否'}`);
  console.log('');
  
  // 查找需要重命名的文件
  const filesToRename = findFilesToRename(targetDir, recursive);
  
  if (filesToRename.length === 0) {
    console.log('✅ 没有找到需要重命名的文件');
    return;
  }
  
  console.log(`📋 找到 ${filesToRename.length} 个文件需要重命名:\n`);
  
  // 显示将要重命名的文件
  filesToRename.forEach((file, index) => {
    console.log(`  ${index + 1}. ${file.oldName}`);
    console.log(`     → ${file.newName}`);
  });
  
  console.log('');
  
  if (dryRun) {
    console.log('👀 预览模式：不会实际重命名文件');
    return;
  }
  
  // 执行重命名
  let successCount = 0;
  let failCount = 0;
  
  for (const file of filesToRename) {
    try {
      // 检查目标文件是否已存在
      if (fs.existsSync(file.newPath)) {
        console.log(`⚠️  跳过: ${file.oldName}`);
        console.log(`     原因: 目标文件已存在: ${file.newName}`);
        failCount++;
        continue;
      }
      
      // 执行重命名
      fs.renameSync(file.oldPath, file.newPath);
      console.log(`✅ 重命名: ${file.oldName} → ${file.newName}`);
      successCount++;
    } catch (error) {
      console.error(`❌ 失败: ${file.oldName}`);
      console.error(`   错误: ${error.message}`);
      failCount++;
    }
  }
  
  // 显示总结
  console.log('\n' + '='.repeat(70));
  console.log('📊 重命名总结');
  console.log('='.repeat(70));
  console.log(`✅ 成功: ${successCount} 个`);
  console.log(`❌ 失败: ${failCount} 个`);
  console.log('='.repeat(70) + '\n');
}

// 运行
main();

