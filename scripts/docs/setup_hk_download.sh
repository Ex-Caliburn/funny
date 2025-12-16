#!/bin/bash
# 港股下载工具 - 快速安装脚本

echo "============================================================"
echo "📥 港股业绩报下载工具 - 环境配置"
echo "============================================================"
echo ""

# 检查Python
echo "1️⃣ 检查Python环境..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
    echo "   ✅ Python版本: $PYTHON_VERSION"
else
    echo "   ❌ 未找到Python3，请先安装Python3"
    exit 1
fi

# 检查pip
echo ""
echo "2️⃣ 检查pip..."
if command -v pip3 &> /dev/null; then
    echo "   ✅ pip3已安装"
else
    echo "   ❌ 未找到pip3，请先安装pip"
    exit 1
fi

# 安装依赖
echo ""
echo "3️⃣ 安装Python依赖..."
pip3 install playwright aiohttp aiofiles 2>&1 | grep -E "(Successfully|Requirement|ERROR)" || true

# 安装浏览器
echo ""
echo "4️⃣ 安装Chromium浏览器（这可能需要几分钟，约170MB）..."
playwright install chromium

echo ""
echo "============================================================"
echo "✅ 安装完成！"
echo "============================================================"
echo ""
echo "现在可以测试脚本："
echo ""
echo "  python3 scripts/download_hk_reports_playwright.py \\"
echo "    --code 00700 \\"
echo "    --name 腾讯控股 \\"
echo "    --years 2023 \\"
echo "    --type annual"
echo ""

