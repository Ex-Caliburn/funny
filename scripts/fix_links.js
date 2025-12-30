const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

// 获取所有文件及其相对于根目录的路径，用于查找移动后的文件
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    if (file === 'node_modules' || file.startsWith('.')) return;
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  });
  return fileList;
}

const allFiles = getAllFiles(rootDir);
const allFilesMap = new Map(); // fileName -> absolutePath
allFiles.forEach(f => {
  const name = path.basename(f);
  if (!allFilesMap.has(name)) {
    allFilesMap.set(name, f);
  }
});

function fixLinksInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const dir = path.dirname(filePath);
  let changed = false;

  // 匹配 Markdown 链接 [text](./path/to/file.md)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  
  content = content.replace(linkRegex, (match, text, linkPath) => {
    // 忽略网络链接、锚点链接、图片
    if (linkPath.startsWith('http') || linkPath.startsWith('#') || linkPath.match(/\.(png|jpg|jpeg|gif|svg)$/i)) {
      return match;
    }

    // 处理带查询参数或锚点的链接
    const [purePath, extra] = linkPath.split(/[?#]/);
    if (!purePath.endsWith('.md') && !purePath.endsWith('.html') && !purePath.endsWith('.js')) {
      return match;
    }

    const absoluteLinkPath = path.resolve(dir, purePath);
    
    // 如果链接已经指向存在的文件，则不修改
    if (fs.existsSync(absoluteLinkPath)) {
      return match;
    }

    // 尝试在仓库中查找同名文件
    const fileName = path.basename(purePath);
    if (allFilesMap.has(fileName)) {
      const newAbsolutePath = allFilesMap.get(fileName);
      let newRelativePath = path.relative(dir, newAbsolutePath);
      if (!newRelativePath.startsWith('.')) {
        newRelativePath = './' + newRelativePath;
      }
      
      console.log(`Fixing link in ${path.relative(rootDir, filePath)}: ${linkPath} -> ${newRelativePath}`);
      changed = true;
      return `[${text}](${newRelativePath}${extra ? (linkPath.includes('?') ? '?' : '#') + extra : ''})`;
    }

    return match;
  });

  if (changed) {
    fs.writeFileSync(filePath, content);
  }
}

function processAllMarkdown() {
  const mdFiles = allFiles.filter(f => f.endsWith('.md'));
  mdFiles.forEach(fixLinksInFile);
  console.log('✅ Markdown 链接修复完成');
}

processAllMarkdown();

