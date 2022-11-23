/**
 * 过滤html中文本内容，但保留img标签
 * <p class="p1" style="background:#fff"><img src=""></p> => <img src="">
 * @param {*} html
 */
 export function getHtmlTextAndImg(html) {
    return html.replace(/<(?!img(\s)+)[^<>]+>/g, '')
  }
  
  // 去掉除了 image 以外的标签
  export function getPlainHtmlExcludeImg(html) {
    return html.replace(/<\/?(?!img)[a-z]+?[^>]*>/gi, '')
  }
  
  // 去掉除了 标签上的属性
  export function getPlainHtml(html) {
    return html.replace(
      /(class="[\s\S]*?")|(height="[\s\S]*?")|(width="[\s\S]*?")|(style="[\s\S]*?")/gi,
      ''
    )
  }