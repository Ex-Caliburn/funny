// Background Service Worker for HK Reports Extension

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'download') {
    const { url, filename, stockCode } = request;

    // 构建下载路径：downloads/股票代码/文件名
    // 注意：Chrome下载API中，filename可以包含路径分隔符
    const downloadFilename = `${stockCode}/${filename}`;

    chrome.downloads.download({
      url: url,
      filename: downloadFilename,
      saveAs: false
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        sendResponse({
          success: false,
          error: chrome.runtime.lastError.message
        });
      } else {
        sendResponse({
          success: true,
          downloadId: downloadId
        });
      }
    });

    // 返回true表示异步响应
    return true;
  }
});
