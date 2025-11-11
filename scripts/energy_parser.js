const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

// 解析能源数据
function parseEnergyData() {
    const dataDir = path.join(__dirname, '../stock/energy');
    
    // 自动获取目录下所有 .xls 文件
    const files = fs.readdirSync(dataDir).filter(file => 
        file.toLowerCase().endsWith('.xls') || file.toLowerCase().endsWith('.xlsx')
    );
    
    console.log(`Found ${files.length} Excel files in energy directory:`);
    files.forEach(file => console.log(`  - ${file}`));
    console.log('');
    
    const allData = [];
    const metrics = {};
    
    files.forEach(filename => {
        const filePath = path.join(dataDir, filename);
        if (fs.existsSync(filePath)) {
            console.log(`Processing ${filename}...`);
            
            try {
                const workbook = xlsx.readFile(filePath);
                
                // 处理主要产品工作表
                if (workbook.SheetNames.includes('主要产品')) {
                    const worksheet = workbook.Sheets['主要产品'];
                    const data = xlsx.utils.sheet_to_json(worksheet);
                    
                    data.forEach(row => {
                        if (row['日期'] && row['类目']) {
                            const date = row['日期'];
                            const category = row['类目'];
                            const value = row['产量'];
                            const dailyAvg = row['日均'];
                            const unit = row['单位'];
                            const growthRate = row['增速'] || null; // 增长率在增速列中
                            
                            // 格式化日期 - 支持多种格式
                            let yearMonth = '';
                            if (typeof date === 'string') {
                                // 处理 2025-1-2 格式（1-2月合并数据）
                                const monthRangeMatch = date.match(/(\d{4})-(\d{1,2})-(\d{1,2})$/);
                                if (monthRangeMatch) {
                                    const year = monthRangeMatch[1];
                                    const month1 = monthRangeMatch[2];
                                    const month2 = monthRangeMatch[3];
                                    if (month1 === '1' && month2 === '2') {
                                        yearMonth = `${year}-1-2`; // 1-2月合并数据保持原格式
                                    }
                                } else {
                                    // 处理标准格式：2025-8, 2024-11等
                                    const standardMatch = date.match(/(\d{4})-(\d{1,2})$/);
                                    if (standardMatch) {
                                        const year = standardMatch[1];
                                        const month = standardMatch[2].padStart(2, '0');
                                        yearMonth = `${year}-${month}`;
                                    } else {
                                        // 处理 2023-07-17 格式
                                        const dateMatch = date.match(/(\d{4})-(\d{2})-(\d{2})/);
                                        if (dateMatch) {
                                            yearMonth = `${dateMatch[1]}-${dateMatch[2]}`;
                                        }
                                    }
                                }
                            }
                            
                            if (yearMonth && category) {
                                // 修正单位
                                let correctedUnit = unit || '';
                                if (category.includes('发电量')) {
                                    correctedUnit = '亿千瓦时';
                                } else if (category.includes('原煤')) {
                                    correctedUnit = category.includes('进口') ? '万吨' : '亿吨';
                                } else if (category.includes('原油')) {
                                    correctedUnit = '万吨';
                                } else if (category.includes('天然气')) {
                                    correctedUnit = category.includes('进口') ? '万吨' : '亿立方米';
                                }
                                
                                // 过滤异常数据：2023年6月发电量数据异常大（累计数据）
                                if (category === '发电量' && yearMonth === '2023-06' && value && parseFloat(value) > 20000) {
                                    console.log(`过滤异常数据: ${yearMonth} ${category} ${value} (疑似累计数据)`);
                                    return; // 跳过这条记录
                                }
                                
                                const record = {
                                    yearMonth,
                                    category,
                                    value: value || null,
                                    dailyAvg: dailyAvg || null,
                                    unit: correctedUnit,
                                    growthRate: growthRate || null
                                };
                                
                                // 对于发电量子项目，增速数据直接作为同比增速
                                if (category.startsWith('发电量-') && growthRate != null && !isNaN(parseFloat(growthRate))) {
                                    record.yoy = parseFloat(growthRate);
                                }
                                
                                allData.push(record);
                                
                                // 按指标分类
                                if (!metrics[category]) {
                                    metrics[category] = [];
                                }
                                metrics[category].push(record);
                            }
                        }
                    });
                }
                
                // 处理所有工作表，寻找更多数据
                workbook.SheetNames.forEach(sheetName => {
                    if (sheetName === '主要产品') return; // 已经处理过了
                    
                    console.log(`Processing sheet: ${sheetName}`);
                    const worksheet = workbook.Sheets[sheetName];
                    const data = xlsx.utils.sheet_to_json(worksheet);
                    
                    data.forEach(row => {
                        // 处理各种可能的列名
                        const dateKeys = ['日期', 'Date', '时间'];
                        const categoryKeys = ['类目', '分品种', '指标', '项目', 'Category'];
                        const valueKeys = ['产量', '数值', '值', 'Value'];
                        const unitKeys = ['单位', 'Unit'];
                        const growthKeys = ['增速', '同比增速', '增长率', 'Growth'];
                        
                        let date = null, category = null, value = null, unit = null, growthRate = null;
                        
                        // 查找日期
                        dateKeys.forEach(key => {
                            if (row[key] && !date) date = row[key];
                        });
                        
                        // 查找类目
                        categoryKeys.forEach(key => {
                            if (row[key] && !category) category = row[key];
                        });
                        
                        // 查找数值
                        valueKeys.forEach(key => {
                            if (row[key] != null && !value) value = row[key];
                        });
                        
                        // 查找单位
                        unitKeys.forEach(key => {
                            if (row[key] && !unit) unit = row[key];
                        });
                        
                        // 查找增速
                        growthKeys.forEach(key => {
                            if (row[key] != null && growthRate === null) growthRate = row[key];
                        });
                        
                        if (date && category) {
                            // 格式化日期
                            let yearMonth = '';
                            if (typeof date === 'string') {
                                const monthRangeMatch = date.match(/(\d{4})-(\d{1,2})-(\d{1,2})$/);
                                if (monthRangeMatch) {
                                    const year = monthRangeMatch[1];
                                    const month1 = monthRangeMatch[2];
                                    const month2 = monthRangeMatch[3];
                                    if (month1 === '1' && month2 === '2') {
                                        yearMonth = `${year}-1-2`;
                                    }
                                } else {
                                    const standardMatch = date.match(/(\d{4})-(\d{1,2})$/);
                                    if (standardMatch) {
                                        const year = standardMatch[1];
                                        const month = standardMatch[2].padStart(2, '0');
                                        yearMonth = `${year}-${month}`;
                                    } else {
                                        const dateMatch = date.match(/(\d{4})-(\d{2})-(\d{2})/);
                                        if (dateMatch) {
                                            yearMonth = `${dateMatch[1]}-${dateMatch[2]}`;
                                        }
                                    }
                                }
                            }
                            
                            if (yearMonth && category) {
                                // 修正单位
                                let correctedUnit = unit || '';
                                if (category.includes('发电量')) {
                                    correctedUnit = '亿千瓦时';
                                } else if (category.includes('原煤')) {
                                    correctedUnit = category.includes('进口') ? '万吨' : '亿吨';
                                } else if (category.includes('原油')) {
                                    correctedUnit = '万吨';
                                } else if (category.includes('天然气')) {
                                    correctedUnit = category.includes('进口') ? '万吨' : '亿立方米';
                                }
                                
                                // 过滤异常数据：2023年6月发电量数据异常大（累计数据）
                                if (category === '发电量' && yearMonth === '2023-06' && value && parseFloat(value) > 20000) {
                                    console.log(`过滤异常数据: ${yearMonth} ${category} ${value} (疑似累计数据)`);
                                    return; // 跳过这条记录
                                }
                                
                                const record = {
                                    yearMonth,
                                    category,
                                    value: value || null,
                                    dailyAvg: null,
                                    unit: correctedUnit,
                                    growthRate: growthRate || null
                                };
                                
                                // 对于发电量子项目，增速数据直接作为同比增速
                                if (category.includes('发电') || category.includes('火电') || category.includes('水电') || 
                                    category.includes('核电') || category.includes('风电') || category.includes('太阳能')) {
                                    if (growthRate != null && !isNaN(parseFloat(growthRate))) {
                                        record.yoy = parseFloat(growthRate);
                                    }
                                    if (!category.startsWith('发电量-') && category !== '发电量') {
                                        category = `发电量-${category}`;
                                        record.category = category;
                                    }
                                }
                                
                                allData.push(record);
                                
                                // 按指标分类
                                if (!metrics[category]) {
                                    metrics[category] = [];
                                }
                                metrics[category].push(record);
                            }
                        }
                    });
                });
                
            } catch (error) {
                console.error(`Error processing ${filename}:`, error);
            }
        }
    });
    
    // 数据预处理和计算
    Object.keys(metrics).forEach(metricName => {
        console.log(`处理指标: ${metricName}`);
        const records = metrics[metricName];
        
        // 1. 按年月排序
        records.sort((a, b) => {
            // 自定义排序：同年1-2在最前，其余按月份3..12
            const ay = parseInt(a.yearMonth.split('-')[0]);
            const by = parseInt(b.yearMonth.split('-')[0]);
            if (ay !== by) return ay - by;
            if (a.yearMonth.endsWith('-1-2') && !b.yearMonth.endsWith('-1-2')) return -1;
            if (!a.yearMonth.endsWith('-1-2') && b.yearMonth.endsWith('-1-2')) return 1;
            const ap = a.yearMonth.split('-');
            const bp = b.yearMonth.split('-');
            if (ap.length === 2 && bp.length === 2) return parseInt(ap[1]) - parseInt(bp[1]);
            return a.yearMonth.localeCompare(b.yearMonth);
        });

        // 2. 按年份分组，用于计算同比
        const yearData = {};
        records.forEach(d => {
            const year = d.yearMonth.split('-')[0];
            if (!yearData[year]) yearData[year] = [];
            yearData[year].push(d);
        });

        // 3. 计算同比
        const years = Object.keys(yearData).sort();
        years.forEach(y => {
            const prevYear = String(parseInt(y) - 1);
            if (!yearData[prevYear]) return;

            yearData[y].forEach(d => {
                if (d.yoy === null || d.yoy === undefined) {
                    // 查找上年同期数据
                    const prevYearData = yearData[prevYear].find(pd => {
                        // 1-2月数据特殊处理
                        if (d.yearMonth.endsWith('-1-2')) {
                            return pd.yearMonth === prevYear + '-1-2';
                        }
                        
                        // 其他月份按月份匹配
                        const [, curMonth] = d.yearMonth.split('-');
                        const [, prevMonth] = pd.yearMonth.split('-');
                        return curMonth === prevMonth;
                    });

                    const cv = d.value !== null ? parseFloat(d.value) : null;
                    const pv = prevYearData && prevYearData.value !== null ? parseFloat(prevYearData.value) : null;
                    
                    if (cv !== null && pv !== null && pv !== 0) {
                        d.yoy = Number(((cv - pv) / pv * 100).toFixed(2));
                    }
                } else if (d.yoy != null) {
                    d.yoy = Number(parseFloat(d.yoy).toFixed(2));
                }
            });
        });

        // 4. 计算环比
        // 先收集1-2月数据作为基准
        const data12Map = {};
        records.forEach(d => {
            if (d.yearMonth.endsWith('-1-2') && d.value != null) {
                const year = d.yearMonth.split('-')[0];
                data12Map[year] = parseFloat(d.value);
            }
        });

        records.forEach((d, i) => {
            if (d.mom === null || d.mom === undefined) {
                const cv = d.value !== null ? parseFloat(d.value) : null;
                if (cv === null) return;

                let pv = null;
                const year = d.yearMonth.split('-')[0];

                if (d.yearMonth.endsWith('-1-2')) {
                    // 1-2月环比：与上年12月比
                    const prevYear = String(parseInt(year, 10) - 1);
                    const prevDec = records.find(r => r.yearMonth === prevYear + '-12' && r.value != null);
                    if (prevDec) {
                        pv = parseFloat(prevDec.value);
                    }
                } else if (d.yearMonth.endsWith('-03')) {
                    // 3月特殊处理：与1-2月比
                    pv = data12Map[year];
                } else if (!d.yearMonth.endsWith('-1-2')) {
                    // 其他月份：与上月比
                    const prevData = records[i - 1];
                    if (prevData && prevData.value !== null) {
                        pv = parseFloat(prevData.value);
                    }
                }

                if (pv !== null && pv !== 0) {
                    d.mom = Number(((cv - pv) / pv * 100).toFixed(2));
                }
            } else if (d.mom != null) {
                d.mom = Number(parseFloat(d.mom).toFixed(2));
            }
        });

        // 5. 填补缺失的月份数据
        const dates = records.map(r => r.yearMonth).sort();
        const startDate = dates[0];
        const endDate = dates[dates.length - 1];
        
        const startYear = parseInt(startDate.split('-')[0]);
        const startMonth = parseInt(startDate.split('-')[1]);
        const endYear = parseInt(endDate.split('-')[0]);
        const endMonth = parseInt(endDate.split('-')[1]);
        
        const completeMonths = [];
        for (let year = startYear; year <= endYear; year++) {
            // 添加1-2月合并数据
            completeMonths.push(`${year}-1-2`);
            // 添加3-12月数据
            for (let month = 3; month <= 12; month++) {
                completeMonths.push(`${year}-${month.toString().padStart(2, '0')}`);
            }
        }
        
        const existingDates = new Set(dates);
        const missingMonths = completeMonths.filter(month => !existingDates.has(month));
        
        missingMonths.forEach(month => {
            const emptyRecord = {
                yearMonth: month,
                category: metricName,
                value: null,
                dailyAvg: null,
                unit: records[0].unit || '',
                growthRate: null,
                yoy: null,
                mom: null
            };
            
            records.push(emptyRecord);
            allData.push(emptyRecord);
        });
        
        // 6. 最终排序
        metrics[metricName] = records.sort((a, b) => {
            const ay = parseInt(a.yearMonth.split('-')[0]);
            const by = parseInt(b.yearMonth.split('-')[0]);
            if (ay !== by) return ay - by;
            if (a.yearMonth.endsWith('-1-2') && !b.yearMonth.endsWith('-1-2')) return -1;
            if (!a.yearMonth.endsWith('-1-2') && b.yearMonth.endsWith('-1-2')) return 1;
            const ap = a.yearMonth.split('-');
            const bp = b.yearMonth.split('-');
            if (ap.length === 2 && bp.length === 2) return parseInt(ap[1]) - parseInt(bp[1]);
            return a.yearMonth.localeCompare(b.yearMonth);
        });
    });
    
    console.log(`Processed ${Object.keys(metrics).length} metrics`);
    console.log('Metrics:', Object.keys(metrics));
    
    return {
        data: allData,
        metrics: metrics
    };
}

// 运行解析
try {
    const result = parseEnergyData();
    
    // 保存为JSON文件
    const outputPath = path.join(__dirname, '../stock/cleaned_data/energy_cleaned.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    
    console.log(`Data saved to ${outputPath}`);
    console.log(`Total records: ${result.data.length}`);
    console.log(`Metrics count: ${Object.keys(result.metrics).length}`);
    
} catch (error) {
    console.error('Error:', error);
}