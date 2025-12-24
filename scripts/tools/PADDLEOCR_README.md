# PaddleOCR 表格识别服务完整指南

## 📋 简介

PaddleOCR 是百度开源的 OCR 工具，对中文识别效果非常好，特别适合识别包含中文表格的图片。

## 🚀 快速开始

### 1. 安装 Python 依赖

#### 方案 1: 使用 Homebrew 安装 Python（推荐，macOS）

这是 macOS 上最推荐的方式：

```bash
# 1. 安装 Homebrew（如果还没有）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. 使用 Homebrew 安装 Python
brew install python3

# 3. 安装 PaddleOCR
pip3 install paddlepaddle paddleocr

# 或者使用完整路径
/opt/homebrew/bin/pip3 install paddlepaddle paddleocr
```

#### 方案 2: 使用 Conda/Miniconda（推荐用于数据科学项目）

Conda 可以更好地管理 Python 环境和依赖：

```bash
# 1. 下载并安装 Miniconda
# 访问 https://docs.conda.io/en/latest/miniconda.html
# 或使用 Homebrew
brew install miniconda

# 2. 创建新的 conda 环境
conda create -n paddleocr python=3.9
conda activate paddleocr

# 3. 安装 PaddleOCR
pip install paddlepaddle paddleocr
```

#### 方案 3: 使用 pyenv 管理 Python 版本

```bash
# 1. 安装 pyenv
brew install pyenv

# 2. 安装 Python 3.9 或 3.10
pyenv install 3.10.12

# 3. 设置本地 Python 版本
pyenv local 3.10.12

# 4. 安装 PaddleOCR
pip install paddlepaddle paddleocr
```

#### 方案 4: 标准安装（如果 Python 环境正常）

```bash
# 安装 PaddlePaddle（CPU 版本）
pip install paddlepaddle

# 安装 PaddleOCR
pip install paddleocr

# 或者使用 GPU 版本（如果有 NVIDIA GPU）
# pip install paddlepaddle-gpu
# pip install paddleocr
```

### 2. 安装 Node.js 依赖

确保项目已安装必要的依赖：

```bash
npm install
```

### 3. 启动服务器

```bash
# 方式1: 使用 npm script
npm run ocr:server

# 方式2: 直接运行
node scripts/tools/paddleocr_server.js
```

服务器将在 `http://localhost:3001` 启动。

### 4. 使用前端页面

打开 `stock/report_analysis/table_image_extractor.html`，选择使用 PaddleOCR 模式。

## 📡 API 接口

### POST /api/ocr

上传图片进行 OCR 识别（支持多张图片）。

**请求：**

- Method: POST
- Content-Type: multipart/form-data
- Body:
  - `image`: 图片文件（支持 jpg, png, bmp 等格式，可上传多张）

**响应：**

```json
{
  "success": true,
  "data": {
    "text": "识别的完整文本\n按行分割",
    "words": [
      {
        "text": "文本内容",
        "bbox": {
          "x0": 100,
          "y0": 50,
          "x1": 200,
          "y1": 80
        },
        "confidence": 0.95
      }
    ],
    "lineCount": 10,
    "wordCount": 50
  }
}
```

### WebSocket 连接

服务器也支持 WebSocket 连接，用于实时接收识别进度和结果：

- 连接地址: `ws://localhost:3001`
- 消息类型:
  - `ocr_request`: 发送识别请求
  - `progress`: 识别进度更新
  - `image_result`: 单张图片识别完成
  - `all_complete`: 所有图片识别完成
  - `error`: 错误信息

### GET /api/health

健康检查接口。

**响应：**

```json
{
  "status": "ok",
  "service": "PaddleOCR Server"
}
```

## 🔧 配置说明

### 修改端口

编辑 `paddleocr_server.js`，修改 `PORT` 变量：

```javascript
const PORT = 3001; // 改为你想要的端口
```

### 修改上传限制

编辑 `paddleocr_server.js`，修改 multer 配置：

```javascript
limits: {
    fileSize: 10 * 1024 * 1024 // 10MB，可根据需要调整
}
```

### 如果使用非系统 Python

如果使用 Homebrew 或其他方式安装的 Python，需要更新服务器脚本中的 Python 路径。

编辑 `scripts/tools/paddleocr_server.js`，修改 Python 路径：

```javascript
// 如果使用 Homebrew 安装的 Python
const pythonProcess = spawn('/opt/homebrew/bin/python3', [scriptPath, imagePath]);

// 或者使用 which 查找
const pythonPath = require('child_process').execSync('which python3').toString().trim();
const pythonProcess = spawn(pythonPath, [scriptPath, imagePath]);
```

## ⚠️ 常见问题

### 1. pip: command not found 或 Xcode 相关错误

**问题说明：** 如果遇到 `pip: command not found` 或 Xcode 相关错误，说明系统 Python 环境有问题。

**解决方案：**

#### 修复 Xcode 问题

```bash
# 1. 重新安装 Xcode Command Line Tools
sudo xcode-select --reset
sudo xcode-select --install

# 2. 等待安装完成后，再尝试
pip3 install paddlepaddle paddleocr
```

#### 使用虚拟环境

如果遇到依赖冲突，建议使用虚拟环境：

```bash
# 创建虚拟环境
python3 -m venv paddleocr_env

# 激活虚拟环境
source paddleocr_env/bin/activate

# 安装 PaddleOCR
pip install paddlepaddle paddleocr
```

### 2. Python 未找到

**错误：** `未找到 python3`

**解决：**

- 确保已安装 Python 3.7+
- 如果使用 `python` 命令，修改 `paddleocr_server.js` 中的 `spawn('python3', ...)` 为 `spawn('python', ...)`

### 3. PaddleOCR 未安装

**错误：** `PaddleOCR 未安装`

**解决：**

```bash
pip install paddlepaddle paddleocr
```

### 4. 识别速度慢

**原因：** 首次运行需要下载模型文件（约 100MB+）

**解决：**

- 首次运行会下载模型，请耐心等待
- 模型下载后会缓存，后续运行会更快
- 如果网络较慢，可以手动下载模型
- 设置环境变量 `DISABLE_MODEL_SOURCE_CHECK=True` 可以跳过模型源检查

### 5. 内存占用高

**原因：** PaddleOCR 模型较大，会占用较多内存

**解决：**

- 使用 CPU 版本（默认）
- 如果内存不足，考虑使用更轻量的 OCR 方案

### 6. 安装速度慢

PaddleOCR 首次安装需要下载较大的模型文件，请耐心等待。

### 7. 验证安装

安装完成后，验证是否成功：

```bash
# 测试 Python
python3 --version

# 测试 PaddleOCR（在 Python 中）
python3 -c "from paddleocr import PaddleOCR; print('PaddleOCR 安装成功')"
```

## 📊 性能对比

| 特性 | Tesseract.js | PaddleOCR |
|------|-------------|-----------|
| 中文识别准确率 | 中等 | 高 |
| 英文识别准确率 | 高 | 高 |
| 表格识别 | 一般 | 较好 |
| 前端运行 | ✅ | ❌ |
| 需要后端 | ❌ | ✅ |
| 模型大小 | ~20MB | ~100MB+ |
| 识别速度 | 中等 | 较快 |

## 🔄 切换 OCR 引擎

前端页面支持切换 OCR 引擎：

1. **Tesseract.js（前端）**：无需后端，但识别准确率较低
2. **PaddleOCR（后端）**：需要启动服务器，但识别准确率高

在 HTML 页面中选择对应的模式即可。

## 📝 注意事项

1. **首次运行**：PaddleOCR 首次运行会下载模型文件，需要网络连接
2. **文件清理**：上传的临时文件会在识别后自动删除
3. **并发处理**：当前版本为单线程处理，如需并发请使用进程池
4. **错误处理**：如果识别失败，检查 Python 脚本输出和服务器日志
5. **环境变量**：运行服务器时设置 `DISABLE_MODEL_SOURCE_CHECK=True` 可以跳过模型源检查，加快启动速度

## 🛠️ 开发建议

如果需要修改 OCR 参数，编辑 `paddleocr_recognize.py`：

```python
# 修改语言模型
ocr = PaddleOCR(use_angle_cls=True, lang='ch')  # 中文
ocr = PaddleOCR(use_angle_cls=True, lang='en')  # 英文
ocr = PaddleOCR(use_angle_cls=True, lang='ch', use_gpu=True)  # 使用 GPU
```

## 📚 相关资源

- [PaddleOCR 官方文档](https://github.com/PaddlePaddle/PaddleOCR)
- [PaddleOCR 模型下载](https://github.com/PaddlePaddle/PaddleOCR/blob/release/2.6/doc/doc_ch/models_list.md)

## 推荐配置

对于 macOS 用户，推荐使用 **Homebrew + Python 3.9/3.10** 的组合：

```bash
# 安装
brew install python@3.10

# 使用
/opt/homebrew/bin/python3.10 -m pip install paddlepaddle paddleocr
```

## 下一步

安装完成后，启动服务器：

```bash
npm run ocr:server
```

然后在浏览器中打开 `stock/report_analysis/table_image_extractor.html` 使用。
