document.querySelectorAll('a[href*="grounding-api-redirect"]').forEach((el) => {
  // 匹配类似 [1] 的文本模式并清空
  // 这里的逻辑是查找父级，将包含该链接的 [数字] 文本替换掉
  const parent = el.parentElement
  if (parent) {
    parent.innerHTML = parent.innerHTML.replace(/\[<a[^>]*>\d+<\/a>\]/g, '')
  }
})

// 港股上市 https://www1.hkexnews.hk/app/appindex.html?lang=zh
Array.from(document.querySelectorAll('.applicant-name')).map((item) => item.innerText)
