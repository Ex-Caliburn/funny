# 港股业绩报下载工具 - Puppeteer安装指南

## 📦 安装Puppeteer

### 方法1：使用npm安装（推荐）

```bash
cd /Users/lijiye/work/funny
npm install puppeteer
```

### 方法2：如果安装失败

如果npm安装较慢或失败，可以使用国内镜像：

```bash
npm install puppeteer --registry=https://registry.npmmirror.com
```

或者使用cnpm：

```bash
npm install -g cnpm --registry=https://registry.npmmirror.com
cnpm install puppeteer
```

## ⚠️ 注意事项

1. **首次安装**：Puppeteer首次安装时会自动下载Chromium浏览器（约170MB），请确保网络畅通
2. **安装时间**：根据网络速度，可能需要5-15分钟
3. **磁盘空间**：确保有足够的磁盘空间（至少200MB）

## ✅ 验证安装

安装完成后，运行以下命令验证：

```bash
node -e "require('puppeteer'); console.log('✓ Puppeteer已安装');"
```

## 🚀 使用

安装Puppeteer后，脚本会自动使用它来访问港交所网站：

```bash
# 下载腾讯控股2023年年报
node scripts/download_hk_reports.js --code 00700 --name 腾讯控股 --years 2023 --type annual
```

## 🔍 检查Puppeteer状态

运行脚本时，如果看到以下提示：

- ✅ `已启用Puppeteer支持（支持JavaScript动态加载）` - Puppeteer已安装并启用
- ⚠️ `Puppeteer未安装，将使用HTTP请求方式` - 需要安装Puppeteer

## 📝 故障排除

### 问题1：安装超时

**解决方案**：
- 使用国内镜像源
- 检查网络连接
- 增加npm超时时间：`npm install puppeteer --timeout=60000`

### 问题2：Chromium下载失败

**解决方案**：
- 手动设置环境变量：`export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false`
- 使用代理或VPN
- 手动下载Chromium并配置路径

### 问题3：权限错误

**解决方案**：
- macOS/Linux: 确保有执行权限
- 如果遇到sandbox问题，脚本已自动添加 `--no-sandbox` 参数

## 💡 提示

- 如果不安装Puppeteer，脚本仍可使用，但可能无法获取动态加载的内容
- Puppeteer会占用更多内存，但能获取更完整的数据
- 建议在网络稳定时使用Puppeteer模式

