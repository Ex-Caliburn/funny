/**
 * PaddleOCR 表格识别服务器
 * 提供 HTTP API 接口，接收图片并返回 OCR 识别结果
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const PORT = 3001;

// 确保上传目录存在（在脚本同目录下）
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置 multer 用于文件上传
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    },
    fileFilter: (req, file, cb) => {
        console.log('   📋 Multer 文件过滤器:');
        console.log('      字段名:', file.fieldname);
        console.log('      原始文件名:', file.originalname);
        console.log('      MIME 类型:', file.mimetype);

        // 只接受图片文件
        if (file.mimetype.startsWith('image/')) {
            console.log('      ✅ 文件类型验证通过');
            cb(null, true);
        } else {
            console.error('      ❌ 文件类型验证失败:', file.mimetype);
            cb(new Error('只支持图片文件'));
        }
    }
});

// 允许跨域（支持所有来源）
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.header('Access-Control-Max-Age', '3600');

    // 处理预检请求
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }

    next();
});

// 请求日志中间件（简化版）
app.use((req, res, next) => {
    if (req.method === 'POST' && req.path === '/api/ocr') {
        console.log(`\n📨 收到 OCR 请求`);
    }
    next();
});

// 注意：对于 multipart/form-data 请求，不要使用 express.json()
// express.json() 会尝试解析请求体，导致 multipart 请求失败
// 只对非 multipart 请求使用 JSON 解析
app.use((req, res, next) => {
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
        express.json()(req, res, next);
    } else {
        next();
    }
});

/**
 * OCR 识别接口（支持多张图片）
 * POST /api/ocr
 */
app.post('/api/ocr', upload.array('image', 10), async (req, res) => {
    const startTime = Date.now();
    console.log('\n' + '='.repeat(60));
    console.log('📥 收到 OCR 请求');

    // 监控连接状态
    let connectionClosed = false;
    req.on('close', () => {
        if (!res.headersSent) {
            connectionClosed = true;
            console.error('   ⚠️  客户端连接已关闭（请求被取消）');
        }
    });

    req.on('aborted', () => {
        if (!res.headersSent) {
            connectionClosed = true;
            console.error('   ⚠️  客户端请求已中止');
        }
    });

    // 禁用自动超时（让请求可以长时间运行）
    // 设置为 0 表示禁用超时，允许长时间运行（PaddleOCR 可能需要较长时间）
    req.setTimeout(0);
    res.setTimeout(0);

    // 定期发送心跳，保持连接活跃（每30秒）
    const keepAliveInterval = setInterval(() => {
        if (!res.headersSent) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
            console.log(`   💓 连接保活 (已运行 ${elapsed} 秒)...`);
        } else {
            clearInterval(keepAliveInterval);
        }
    }, 30000); // 每30秒

    // 支持多张图片
    const files = req.files || [];
    if (!files || files.length === 0) {
        console.error('   ❌ 错误: 未收到文件');
        return res.status(400).json({ error: '请上传图片文件' });
    }

    console.log(`   ✅ 收到 ${files.length} 张图片:`);
    files.forEach((file, index) => {
        console.log(`      ${index + 1}. ${file.originalname} (${file.size} bytes)`);
    });

    const pythonScript = path.join(__dirname, 'paddleocr_recognize.py');

    try {
        // 处理所有图片，合并为一个结果
        const imagePaths = files.map(file => file.path);
        console.log(`   🐍 开始识别 ${files.length} 张图片...`);
        const result = await runPaddleOCR(pythonScript, imagePaths);

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`   ✅ OCR 识别成功 (耗时: ${elapsed}秒)`);
        console.log('      识别文本行数:', result.lineCount || 0);
        console.log('      识别单词数:', result.wordCount || 0);

        // 清理所有临时文件
        files.forEach(file => {
            try {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            } catch (e) {
                console.error(`   ⚠️  清理文件失败: ${file.path}`);
            }
        });
        console.log(`   🗑️  已清理 ${files.length} 个临时文件`);

        // 清理保活定时器
        clearInterval(keepAliveInterval);

        // 检查连接状态
        if (connectionClosed || res.headersSent) {
            return;
        }

        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json({
            success: true,
            data: result,
            imageCount: files.length
        });

        console.log('   📤 响应已发送');
        console.log('='.repeat(60) + '\n');
    } catch (error) {
        // 清理保活定时器
        clearInterval(keepAliveInterval);

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        console.error(`   ❌ OCR 识别失败 (耗时: ${elapsed}秒):`, error.message);

        // 清理所有临时文件
        if (files && files.length > 0) {
            files.forEach(file => {
                try {
                    if (fs.existsSync(file.path)) {
                        fs.unlinkSync(file.path);
                    }
                } catch (e) {
                    console.error(`   ⚠️  清理文件失败: ${file.path}`);
                }
            });
            console.log(`   🗑️  已清理 ${files.length} 个临时文件`);
        }

        console.error('   错误详情:', error);
        console.log('='.repeat(60) + '\n');

        // 确保响应头未发送
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: error.message || 'OCR 识别失败'
            });
        }
    }
});

/**
 * 健康检查接口
 */
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'PaddleOCR Server' });
});

/**
 * 运行 PaddleOCR Python 脚本（支持多张图片）
 * @param {string} scriptPath - Python 脚本路径
 * @param {string|string[]} imagePaths - 图片路径（单张或多张）
 * @returns {Promise<Object>} OCR 识别结果
 */
function runPaddleOCR(scriptPath, imagePaths) {
    return new Promise((resolve, reject) => {
        // 检查 Python 脚本是否存在
        if (!fs.existsSync(scriptPath)) {
            reject(new Error('PaddleOCR Python 脚本不存在，请先创建 paddleocr_recognize.py'));
            return;
        }

        // 统一转换为数组
        const paths = Array.isArray(imagePaths) ? imagePaths : [imagePaths];

        console.log(`   🐍 启动 Python 进程处理 ${paths.length} 张图片...`);
        // 设置环境变量，禁用模型源检查警告
        const env = { ...process.env, DISABLE_MODEL_SOURCE_CHECK: 'True' };
        const pythonProcess = spawn('python3', [scriptPath, ...paths], { env });
        let stdout = '';
        let stderr = '';
        let lastOutputTime = Date.now();

        // 设置超时（600秒 = 10分钟，PaddleOCR 首次运行可能需要下载模型）
        const timeout = setTimeout(() => {
            if (!pythonProcess.killed) {
                console.error('   ⏱️  Python 脚本执行超时（600秒），正在终止...');
                pythonProcess.kill('SIGTERM');
                reject(new Error('Python 脚本执行超时（600秒）。PaddleOCR 首次运行可能需要下载模型，请稍候重试。'));
            }
        }, 600000); // 600秒超时（10分钟）

        pythonProcess.stdout.on('data', (data) => {
            const text = data.toString();
            stdout += text;
            lastOutputTime = Date.now();
            // 实时输出（过滤掉警告）
            if (!text.includes('Warning') && !text.includes('warn')) {
                console.log('   📝 Python 输出:', text.trim());
            }
        });

        pythonProcess.stderr.on('data', (data) => {
            const text = data.toString();
            stderr += text;
            lastOutputTime = Date.now();
            // 实时输出错误（过滤掉警告）
            if (!text.includes('Warning') && !text.includes('warn') && !text.includes('NotOpenSSLWarning')) {
                console.log('   ⚠️  Python 错误输出:', text.trim());
            }
        });

        pythonProcess.on('close', (code) => {
            clearTimeout(timeout);
            console.log(`   🐍 Python 进程已结束，退出码: ${code}`);
            console.log(`   📊 stdout 长度: ${stdout.length} 字符`);
            console.log(`   📊 stderr 长度: ${stderr.length} 字符`);
            // 检查 stderr 中是否有 JSON 格式的错误信息（从 Python 脚本输出的）
            let pythonError = null;
            try {
                // 尝试从 stderr 中提取 JSON 错误（可能有多行，需要找到完整的 JSON）
                const jsonMatch = stderr.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
                if (jsonMatch) {
                    pythonError = JSON.parse(jsonMatch[0]);
                }
            } catch (e) {
                // 如果不是 JSON，继续处理
            }

            // 如果 Python 脚本输出了 JSON 错误，优先使用它
            if (pythonError && pythonError.error) {
                // 提供更详细的错误信息
                let errorMsg = pythonError.error;
                if (pythonError.message) {
                    errorMsg += `: ${pythonError.message}`;
                }
                reject(new Error(errorMsg));
                return;
            }

            // 如果退出码不为 0，检查是否有实际错误
            if (code !== 0) {
                // 过滤掉常见的警告信息
                const warnings = [
                    'NotOpenSSLWarning',
                    'DeprecationWarning',
                    'DISABLE_MODEL_SOURCE_CHECK',
                    'Checking connectivity'
                ];

                const isOnlyWarnings = warnings.some(warning => stderr.includes(warning)) &&
                                      !stderr.includes('error') &&
                                      !stderr.includes('Error') &&
                                      !stderr.includes('Traceback');

                if (isOnlyWarnings && stdout.trim()) {
                    // 如果只是警告，但 stdout 有输出，尝试解析
                    try {
                        const result = JSON.parse(stdout);
                        resolve(result);
                        return;
                    } catch (e) {
                        // 如果解析失败，继续抛出错误
                    }
                }

                // 提取真正的错误信息（排除警告）
                const errorLines = stderr.split('\n').filter(line =>
                    line &&
                    !line.includes('Warning') &&
                    !line.includes('warnings.warn') &&
                    !line.includes('NotOpenSSLWarning') &&
                    !line.includes('DeprecationWarning') &&
                    !line.includes('DISABLE_MODEL_SOURCE_CHECK') &&
                    !line.includes('Checking connectivity') &&
                    !line.trim().startsWith('{') // 排除 JSON 输出
                );

                // 查找 Python 异常信息
                const tracebackMatch = stderr.match(/Traceback[\s\S]*?(?=\n\n|\n[A-Z]|$)/);
                const exceptionMatch = stderr.match(/(\w+Error|Exception):\s*(.+)/);

                let actualError = '未知错误';
                if (exceptionMatch) {
                    actualError = `${exceptionMatch[1]}: ${exceptionMatch[2]}`;
                    if (tracebackMatch) {
                        // 只显示最后几行 traceback
                        const tracebackLines = tracebackMatch[0].split('\n').slice(-3);
                        actualError += '\n' + tracebackLines.join('\n');
                    }
                } else if (errorLines.length > 0) {
                    actualError = errorLines.join('\n');
                } else if (stderr) {
                    actualError = stderr;
                }

                reject(new Error(`Python 脚本执行失败: ${actualError}`));
                return;
            }

            // 如果退出码为 0，尝试解析 stdout
            try {
                // 从 stdout 中提取 JSON（可能混有其他输出）
                const jsonMatch = stdout.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const result = JSON.parse(jsonMatch[0]);
                    resolve(result);
                } else {
                    throw new Error('未找到有效的 JSON 输出');
                }
            } catch (error) {
                reject(new Error(`解析结果失败: ${error.message}\n输出: ${stdout}\n错误: ${stderr}`));
            }
        });

        pythonProcess.on('error', (error) => {
            if (error.code === 'ENOENT') {
                reject(new Error('未找到 python3，请确保已安装 Python 3'));
            } else {
                reject(error);
            }
        });
    });
}

// WebSocket 连接处理
wss.on('connection', (ws, req) => {
    console.log(`\n🔌 WebSocket 客户端已连接: ${req.socket.remoteAddress}`);

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);

            if (data.type === 'ocr_request') {
                const { imagePaths, imageNames, imageIndices } = data;
                console.log(`📨 收到 WebSocket OCR 请求: ${imagePaths.length} 张图片`);

                // 发送进度更新
                ws.send(JSON.stringify({
                    type: 'progress',
                    message: '开始识别...',
                    progress: 10
                }));

                const pythonScript = path.join(__dirname, 'paddleocr_recognize.py');
                const createdTempFiles = []; // 记录创建的临时文件

                try {
                    // 处理所有图片，每识别完一张就立即返回结果
                    for (let i = 0; i < imagePaths.length; i++) {
                        const imageData = imagePaths[i];
                        const imageName = imageNames[i] || `图片 ${i + 1}`;
                        const originalIndex = imageIndices && imageIndices[i] !== undefined ? imageIndices[i] : i;

                        ws.send(JSON.stringify({
                            type: 'progress',
                            message: `正在识别 ${imageName} (${i + 1}/${imagePaths.length})...`,
                            progress: 20 + (i / imagePaths.length) * 60
                        }));

                        // 判断是 base64 还是文件路径
                        // base64 特征：长度较长，只包含 base64 字符（A-Za-z0-9+/=），不包含文件扩展名
                        // 文件路径特征：包含文件扩展名（.png, .jpg 等）或绝对路径特征
                        let imagePath;
                        const isBase64 = !imageData.includes('.png') &&
                                        !imageData.includes('.jpg') &&
                                        !imageData.includes('.jpeg') &&
                                        !imageData.includes('.gif') &&
                                        !imageData.includes('.bmp') &&
                                        (imageData.length > 100 || /^[A-Za-z0-9+/=]+$/.test(imageData));

                        if (isBase64) {
                            // base64 数据，需要先保存为临时文件
                            try {
                                const buffer = Buffer.from(imageData, 'base64');
                                const tempFileName = `temp_${Date.now()}_${i}.png`;
                                imagePath = path.join(uploadDir, tempFileName);
                                fs.writeFileSync(imagePath, buffer);
                                createdTempFiles.push(imagePath); // 记录临时文件
                                console.log(`   💾 已保存临时文件: ${tempFileName} (${buffer.length} bytes)`);
                            } catch (e) {
                                throw new Error(`Base64 解码失败: ${e.message}`);
                            }
                        } else {
                            // 文件路径
                            imagePath = imageData;
                            if (!fs.existsSync(imagePath)) {
                                throw new Error(`图片文件不存在: ${imagePath}`);
                            }
                        }

                        try {
                            // 识别单张图片
                            const result = await runPaddleOCR(pythonScript, [imagePath]);

                            // 立即发送单张图片的识别结果（使用原始索引）
                            ws.send(JSON.stringify({
                                type: 'image_result',
                                imageName: imageName,
                                imageIndex: originalIndex, // 使用原始索引，保持与前端一致
                                data: result,
                                progress: 20 + ((i + 1) / imagePaths.length) * 60
                            }));

                            ws.send(JSON.stringify({
                                type: 'progress',
                                message: `${imageName} 识别完成`,
                                progress: 20 + ((i + 1) / imagePaths.length) * 60
                            }));
                        } finally {
                            // 无论成功还是失败，都清理临时文件
                            if (imagePath.startsWith(uploadDir) && imagePath.includes('temp_')) {
                                try {
                                    if (fs.existsSync(imagePath)) {
                                        fs.unlinkSync(imagePath);
                                        const index = createdTempFiles.indexOf(imagePath);
                                        if (index > -1) {
                                            createdTempFiles.splice(index, 1);
                                        }
                                    }
                                } catch (e) {
                                    console.error(`清理临时文件失败: ${imagePath}`, e.message);
                                }
                            }
                        }
                    }

                    // 发送完成信号
                    ws.send(JSON.stringify({
                        type: 'all_complete',
                        message: '所有图片识别完成',
                        progress: 100
                    }));

                } catch (error) {
                    console.error('WebSocket OCR 处理错误:', error);

                    // 清理所有创建的临时文件
                    createdTempFiles.forEach(tempFilePath => {
                        try {
                            if (fs.existsSync(tempFilePath)) {
                                fs.unlinkSync(tempFilePath);
                                console.log(`   🗑️  已清理临时文件: ${path.basename(tempFilePath)}`);
                            }
                        } catch (e) {
                            console.error(`清理临时文件失败: ${tempFilePath}`, e.message);
                        }
                    });

                    ws.send(JSON.stringify({
                        type: 'error',
                        error: error.message
                    }));
                }
            }
        } catch (error) {
            console.error('WebSocket 消息处理错误:', error);
            ws.send(JSON.stringify({
                type: 'error',
                error: error.message
            }));
        }
    });

    ws.on('close', () => {
        console.log('🔌 WebSocket 客户端已断开连接');
    });

    ws.on('error', (error) => {
        console.error('WebSocket 错误:', error);
    });
});

/**
 * 清理 uploads 目录中的旧文件
 * 删除超过 1 小时的临时文件
 */
function cleanupOldFiles() {
    try {
        const files = fs.readdirSync(uploadDir);
        const now = Date.now();
        const maxAge = 60 * 60 * 1000; // 1 小时
        let deletedCount = 0;

        files.forEach(file => {
            const filePath = path.join(uploadDir, file);
            try {
                const stats = fs.statSync(filePath);
                const age = now - stats.mtimeMs;

                // 删除超过 1 小时的文件
                if (age > maxAge) {
                    fs.unlinkSync(filePath);
                    deletedCount++;
                    console.log(`   🗑️  已清理旧文件: ${file} (${Math.round(age / 1000 / 60)} 分钟前)`);
                }
            } catch (e) {
                // 忽略无法访问的文件
                console.error(`   ⚠️  无法访问文件: ${file}`, e.message);
            }
        });

        if (deletedCount > 0) {
            console.log(`   ✅ 清理完成，共删除 ${deletedCount} 个旧文件`);
        }
    } catch (e) {
        console.error('   ❌ 清理旧文件失败:', e.message);
    }
}

// 启动时清理一次
cleanupOldFiles();

// 每 30 分钟自动清理一次
const cleanupInterval = setInterval(() => {
    console.log('\n🧹 开始定期清理 uploads 目录...');
    cleanupOldFiles();
}, 30 * 60 * 1000); // 30 分钟

// 优雅关闭时清理定时器
process.on('SIGINT', () => {
    console.log('\n🛑 正在关闭服务器...');
    clearInterval(cleanupInterval);
    cleanupOldFiles(); // 关闭前最后清理一次
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 正在关闭服务器...');
    clearInterval(cleanupInterval);
    cleanupOldFiles(); // 关闭前最后清理一次
    process.exit(0);
});

// 启动服务器（监听所有网络接口）
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 PaddleOCR 服务器已启动`);
    console.log(`📡 HTTP 服务地址: http://localhost:${PORT} 或 http://127.0.0.1:${PORT}`);
    console.log(`🔌 WebSocket 服务地址: ws://localhost:${PORT} 或 ws://127.0.0.1:${PORT}`);
    console.log(`📋 API 接口: http://localhost:${PORT}/api/ocr`);
    console.log(`💚 健康检查: http://localhost:${PORT}/api/health`);
    console.log(`\n⚠️  请确保已安装 Python 3 和 PaddleOCR`);
    console.log(`📝 使用说明: 查看 PADDLEOCR_README.md`);
    console.log(`🧹 自动清理: uploads 目录中的文件将在 1 小时后自动清理`);
});

