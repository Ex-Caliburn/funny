# link

## 前言

Links to cross-origin destinations are unsafe

### rel属性

nofollow Indicates that the current document's original author or publisher does not endorse the referenced document. Not allowed Annotation Annotation
noopener Creates a top-level browsing context that is not an auxiliary browsing context if the hyperlink would create either of those to begin with (i.e., has an appropriate target attribute value). Not allowed Annotation Annotation
noreferrer No Referer header will be included. Additionally, has the same effect as noopener. Not allowed Annotation Annotation
opener Creates an auxiliary browsing context if the hyperlink would otherwise create a top-level browsing context that is not anauxiliary browsing context (i.e., has "_blank" as target attribute value). Not allowed Annotation Annotation

## 总结

When you link to a page on another site using the target="_blank" attribute, you can expose your site to performance and security issues:

The other page may run on the same process as your page. If the other page is running a lot of JavaScript, your page's performance may suffer.
The other page can access your window object with the window.opener property. This may allow the other page to redirect your page to a malicious URL.
Adding rel="noopener" or rel="noreferrer" to your target="_blank" links avoids these issues.

### 参考文献

1. <https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/rel>
2. <https://web.dev/external-anchors-use-rel-noopener/?utm_source=lighthouse&utm_medium=devtools>
