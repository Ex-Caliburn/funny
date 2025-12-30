const fs = require('fs');
const path = require('path');

/**
 * 自动统计项目文件并更新 README.md
 */

const rootDir = path.resolve(__dirname, '..');
const readmePath = path.join(rootDir, 'README.md');

// 需要统计的目录及其描述
const statsConfig = [
  { label: '算法题解', dir: '算法/leetcode', pattern: /\.js$/ },
  { label: 'Webpack 示例', dir: '工程化/webpack', isDirCount: true },
  { label: '设计模式', dir: '设计模式', pattern: /\.(js|md)$/ },
  { label: '学习文档', dir: '.', pattern: /\.md$/, recursive: true },
  { label: '代码示例', dir: '.', pattern: /\.(js|html|vue|ts)$/, recursive: true },
];

function countFiles(dir, pattern, recursive = false) {
  let count = 0;
  const fullPath = path.join(rootDir, dir);
  if (!fs.existsSync(fullPath)) return 0;

  const files = fs.readdirSync(fullPath);
  for (const file of files) {
    if (file === 'node_modules' || file.startsWith('.')) continue;
    const filePath = path.join(fullPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (recursive) {
        count += countFiles(path.join(dir, file), pattern, recursive);
      }
    } else if (pattern.test(file)) {
      count++;
    }
  }
  return count;
}

function countSubDirs(dir) {
  const fullPath = path.join(rootDir, dir);
  if (!fs.existsSync(fullPath)) return 0;
  return fs.readdirSync(fullPath).filter(file =>
    fs.statSync(path.join(fullPath, file)).isDirectory()
  ).length;
}

function updateReadme() {
  let readmeContent = fs.readFileSync(readmePath, 'utf8');

  const statsLines = statsConfig.map(conf => {
    let count = conf.isDirCount
      ? countSubDirs(conf.dir)
      : countFiles(conf.dir, conf.pattern, conf.recursive);

    return `- **${conf.label}**: ${count}+ ${conf.isDirCount ? '个配置示例' : (conf.label.includes('文档') ? '篇文档' : '个示例文件')}`;
  });

  // 更新统计部分
  const statsStart = '## 📊 项目统计';
  const statsEnd = '---';
  const regex = new RegExp(`${statsStart}[\\s\\S]*?${statsEnd}`);

  const newStatsSection = `${statsStart}\n\n${statsLines.join('\n')}\n\n- **最后自动更新**: ${new Date().toLocaleDateString('zh-CN')}\n\n${statsEnd}`;

  readmeContent = readmeContent.replace(regex, newStatsSection);
  fs.writeFileSync(readmePath, readmeContent);
  console.log('✅ README.md 统计信息已更新');
}

updateReadme();

