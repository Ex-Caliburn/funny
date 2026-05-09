const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

/**
 * 解析产能利用率数据
 * 数据格式：包含各行业的产能利用率（%）及同比变化（百分点）
 */
function parseCapacityUtilizationData() {
    const dataDir = path.join(__dirname, '../../stock/capacity_utilization');
    
    // 获取目录下所有 Excel 文件
    const files = fs.readdirSync(dataDir).filter(file => 
        file.toLowerCase().endsWith('.xls') || file.toLowerCase().endsWith('.xlsx')
    );
    
    console.log(`发现 ${files.length} 个Excel文件:`);
    files.forEach(file => console.log(`  - ${file}`));
    console.log('');
    
    const allData = [];
    const metrics = {};
    
    files.forEach(filename => {
        const filePath = path.join(dataDir, filename);
        if (fs.existsSync(filePath)) {
            console.log(`处理文件 ${filename}...`);
            
            try {
                const workbook = xlsx.readFile(filePath);
                
                // 获取第一个工作表
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
                
                // 从文件名提取日期
                const dateInfo = extractDateFromFilename(filename);
                
                // 解析数据
                parseSheetData(data, dateInfo, allData, metrics);
                
            } catch (error) {
                console.error(`处理文件失败 ${filename}:`, error.message);
            }
        }
    });
    
    // 计算环比数据
    calculateMoM(metrics);
    
    // 保存清洗后的数据
    const outputPath = path.join(__dirname, '../../stock/cleaned_data/capacity_utilization_cleaned.json');

    // 读取已有文件，仅在数据真正变化时才更新 lastUpdated
    let lastUpdated = new Date().toISOString();
    if (fs.existsSync(outputPath)) {
        try {
            const existing = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
            const newDataStr = JSON.stringify({ metrics, rawData: allData });
            const oldDataStr = JSON.stringify({ metrics: existing.metrics, rawData: existing.rawData });
            if (newDataStr === oldDataStr) {
                // 数据没有变化，保留原来的 lastUpdated
                lastUpdated = existing.lastUpdated;
            }
        } catch (e) {
            // 解析失败则视为数据已变化，使用当前时间
        }
    }

    const output = {
        lastUpdated,
        dataCount: allData.length,
        metrics: metrics,
        rawData: allData
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`\n数据已保存到: ${outputPath}`);
    console.log(`总记录数: ${allData.length}`);
    console.log(`指标数: ${Object.keys(metrics).length}`);
}

/**
 * 从文件名提取日期信息
 */
function extractDateFromFilename(filename) {
    // 尝试匹配 YYYY年X季度 格式
    const quarterMatch = filename.match(/(\d{4})年.*?([一二三四]季度)/);
    if (quarterMatch) {
        const year = quarterMatch[1];
        const quarter = quarterMatch[2];
        const quarterMap = { '一季度': 'Q1', '二季度': 'Q2', '三季度': 'Q3', '四季度': 'Q4' };
        return {
            year: parseInt(year),
            quarter: quarterMap[quarter],
            period: quarter
        };
    }
    
    // 尝试匹配 YYYY-MM 格式
    const monthMatch = filename.match(/(\d{4})[_-](\d{1,2})/);
    if (monthMatch) {
        const year = parseInt(monthMatch[1]);
        const month = parseInt(monthMatch[2]);
        return {
            year: year,
            month: month,
            period: `${month}月`
        };
    }
    
    // 默认使用当前年份的第一季度
    const currentYear = new Date().getFullYear();
    return {
        year: currentYear,
        quarter: 'Q1',
        period: '一季度'
    };
}

/**
 * 解析工作表数据
 */
function parseSheetData(data, dateInfo, allData, metrics) {
    if (!data || data.length < 3) {
        console.log('数据为空或格式不正确');
        return;
    }
    
    // 产能利用率表格通常是两行表头的合并结构
    // 行1: ["行业", "三季度", null, "前三季度"]
    // 行2: [null, "产能利用率", "比上年同期增减", "产能利用率", "比上年同期增减"]
    
    // 查找第一行表头（通常在第1或第2行）
    let headerRow1Index = -1;
    for (let i = 0; i < Math.min(5, data.length); i++) {
        const row = data[i];
        if (!row) continue;
        
        const rowText = row.join('').toLowerCase();
        if (rowText.includes('行业') && (rowText.includes('季度') || rowText.includes('产能'))) {
            headerRow1Index = i;
            break;
        }
    }
    
    if (headerRow1Index === -1) {
        console.log('未找到表头行');
        return;
    }
    
    const headerRow1 = data[headerRow1Index];
    const headerRow2 = data[headerRow1Index + 1] || [];
    
    console.log('表头行1:', headerRow1);
    console.log('表头行2:', headerRow2);
    
    // 识别列索引 - 根据实际表格结构
    // 列0: 行业
    // 列1: 当季产能利用率
    // 列2: 当季比上年同期增减
    // 列3: 累计产能利用率
    // 列4: 累计比上年同期增减
    
    const colIndices = {
        industry: 0,  // 行业固定在第0列
        currentQuarter: 1,  // 当季数据在第1列
        currentQuarterYoY: 2,  // 当季同比在第2列
        ytd: 3,  // 累计数据在第3列
        ytdYoY: 4  // 累计同比在第4列
    };
    
    console.log('列索引:', colIndices);
    
    // 解析数据行（从表头后第二行开始，跳过第二行表头）
    const dataStartRow = headerRow1Index + 2;
    
    for (let i = dataStartRow; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;
        
        const industryName = String(row[colIndices.industry] || '').trim();
        if (!industryName || industryName === '') continue;
        
        // 跳过空行或无效行
        if (industryName.length < 2 || /^[\d\.\s]+$/.test(industryName)) continue;
        
        // 当季数据
        if (colIndices.currentQuarter >= 0) {
            const value = parseFloat(row[colIndices.currentQuarter]);
            const yoy = colIndices.currentQuarterYoY >= 0 ? parseFloat(row[colIndices.currentQuarterYoY]) : null;
            
            if (!isNaN(value)) {
                const yearMonth = `${dateInfo.year}-${dateInfo.quarter}`;
                const record = {
                    yearMonth: yearMonth,
                    industry: industryName,
                    period: 'quarter',
                    periodName: dateInfo.period,
                    value: value,
                    yoy: yoy,
                    unit: '%'
                };
                
                allData.push(record);
                
                // 添加到metrics
                const metricKey = industryName;
                if (!metrics[metricKey]) {
                    metrics[metricKey] = [];
                }
                metrics[metricKey].push({
                    yearMonth: yearMonth,
                    value: value,
                    yoy: yoy,
                    mom: null // 环比稍后计算
                });
            }
        }
        
        // 累计数据（前三季度）
        if (colIndices.ytd >= 0) {
            const value = parseFloat(row[colIndices.ytd]);
            const yoy = colIndices.ytdYoY >= 0 ? parseFloat(row[colIndices.ytdYoY]) : null;
            
            if (!isNaN(value)) {
                const yearMonth = `${dateInfo.year}-YTD-${dateInfo.quarter}`;
                const record = {
                    yearMonth: yearMonth,
                    industry: industryName,
                    period: 'ytd',
                    periodName: `前${dateInfo.period}`,
                    value: value,
                    yoy: yoy,
                    unit: '%'
                };
                
                allData.push(record);
                
                // 添加到metrics（使用不同的key区分累计数据）
                const metricKey = `${industryName}-累计`;
                if (!metrics[metricKey]) {
                    metrics[metricKey] = [];
                }
                metrics[metricKey].push({
                    yearMonth: yearMonth,
                    value: value,
                    yoy: yoy,
                    mom: null
                });
            }
        }
    }
}

/**
 * 计算环比数据
 */
function calculateMoM(metrics) {
    Object.keys(metrics).forEach(metricKey => {
        const data = metrics[metricKey];
        if (!data || data.length < 2) return;
        
        // 按时间排序
        data.sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
        
        // 计算环比
        for (let i = 1; i < data.length; i++) {
            const current = data[i];
            const previous = data[i - 1];
            
            if (current.value != null && previous.value != null && previous.value !== 0) {
                // 产能利用率是百分比，环比计算为百分点差异
                current.mom = parseFloat((current.value - previous.value).toFixed(2));
            }
        }
    });
}

// 执行解析
try {
    parseCapacityUtilizationData();
    console.log('\n产能利用率数据解析完成！');
} catch (error) {
    console.error('解析失败:', error);
    process.exit(1);
}

module.exports = { parseCapacityUtilizationData };

