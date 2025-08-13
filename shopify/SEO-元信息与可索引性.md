## 概览

本指南聚焦两个目标：

- **Meta 策略（怎么展示与如何受控）**：系统配置 `title`、`meta description`、`robots`、`canonical`、OG/Twitter、`hreflang`、结构化数据，提升搜索展示与点击率。
- **可索引性（能否被抓取并收录）**：确保爬虫能抓到、能读懂、愿意收，避免重复与技术性拦截。

---

## 技术起源与演进

### Canonical 标签起源

**Canonical** 由 Google、Yahoo、Microsoft 三大搜索引擎在 2009 年联合提出，解决"重复内容"问题：

- **背景**：电商网站同一商品有多个 URL（如排序、筛选、分页参数），导致权重分散、爬虫浪费资源
- **标准**：RFC 6596 规范 `<link rel="canonical" href="...">`
- **作用**：告诉搜索引擎"这是权威版本"，其他相似页面权重归一到 canonical URL

**历史演进**：

- 2009 年：三大搜索引擎联合支持
- 2011 年：Google 开始大规模应用
- 2013 年：成为 SEO 标准实践
- 现在：几乎所有搜索引擎都支持

### Open Graph 起源

**Open Graph** 由 Facebook 在 2010 年提出，解决社交分享体验问题：

- **背景**：Facebook 用户分享链接时，只能显示默认标题和描述，无法预览内容
- **标准**：Facebook 开源协议，使用 `og:` 前缀的 meta 标签
- **作用**：让任何网页都能在 Facebook 上显示为"富媒体卡片"

**历史演进**：

- 2010 年：Facebook 发布 Open Graph 协议
- 2011 年：Twitter 推出 Twitter Cards（兼容 OG）
- 2012 年：LinkedIn、Google+ 等平台支持
- 2014 年：成为社交分享标准
- 现在：几乎所有社交平台都支持 OG 标签

### 两者关系与价值

- **Canonical**：搜索引擎优化，解决重复内容
- **Open Graph**：社交体验优化，解决分享展示
- **协同作用**：Canonical 告诉搜索引擎"权威版本"，OG 告诉社交平台"如何展示"

**实际应用价值**：

- **Canonical** 在电商中特别重要：商品列表页（排序、筛选、分页）、商品详情页（不同变体、参数），避免权重分散，提升主页面排名
- **Open Graph** 在营销中特别重要：社交分享时显示商品图片、价格、描述，提升点击率和转化率，品牌曝光和用户参与

这就是为什么现代电商网站必须同时配置这两个标签的原因。

---

## Meta 策略清单（可直接落地）

### Title 与 Description

- **唯一**、含核心关键词；Title 建议 55–60 字符，Description 建议 120–160 字符。
- 补充品牌词与分页信息，避免堆砌。

```liquid
<title>{{ page_title | escape }}{% if current_page and current_page > 1 %}（第{{ current_page }}页）{% endif %}｜{{ shop.name }}</title>
<meta name="description" content="{{ page_description | strip_html | truncate: 160 | escape }}">
```

### Robots（收录控制）

- 重要页：`index, follow`；低质／隐私／搜索结果页：`noindex`。

```liquid
{% if template.name == 'search' or template.name == 'cart' %}
  <meta name="robots" content="noindex, nofollow">
{% else %}
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
{% endif %}
```

### Canonical（规范 URL）

- 处理重复页与参数页，统一权重归一。

```liquid
<link rel="canonical" href="{{ canonical_url }}">
```

### Open Graph / Twitter（社交分享卡片）

```liquid
<meta property="og:title" content="{{ page_title | escape }}">
<meta property="og:description" content="{{ page_description | strip_html | truncate: 200 | escape }}">
<meta property="og:url" content="{{ canonical_url }}">
<meta property="og:site_name" content="{{ shop.name }}">
<meta property="og:type" content="{% if template.name contains 'product' %}product{% else %}website{% endif %}">
{% if template.name contains 'product' and product.featured_image %}
  <meta property="og:image" content="{{ product.featured_image | img_url: '1200x630' | prepend: 'https:' }}">
{% endif %}
<meta name="twitter:card" content="summary_large_image">
```

### Hreflang（多语言／多区域）

- 所有版本互相指向，补全 `x-default`，链接可达。

```liquid
{% for locale in shop.published_locales %}
  <link rel="alternate" hreflang="{{ locale.iso_code }}" href="{{ shop.url }}{{ locale.root_url }}{{ request.path }}{% if request.query_string != blank %}?{{ request.query_string }}{% endif %}">
{% endfor %}
<link rel="alternate" hreflang="x-default" href="{{ canonical_url }}">
```

### 结构化数据（JSON‑LD）

- Product、Breadcrumb、Article 等。示例：商品页。

```liquid
{% if template.name contains 'product' %}
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": {{ product.title | json }},
  "image": [{% for image in product.images %}{{ image | img_url: '1024x1024' | prepend: 'https:' | json }}{% unless forloop.last %},{% endunless %}{% endfor %}],
  "description": {{ product.description | strip_html | truncate: 500 | json }},
  "sku": {{ product.selected_or_first_available_variant.sku | json }},
  "brand": { "@type": "Brand", "name": {{ shop.name | json }} },
  "offers": {
    "@type": "Offer",
    "url": {{ canonical_url | json }},
    "price": {{ product.selected_or_first_available_variant.price | divided_by: 100.0 | json }},
    "priceCurrency": {{ shop.currency | json }},
    "availability": "{% if product.selected_or_first_available_variant.available %}https://schema.org/InStock{% else %}https://schema.org/OutOfStock{% endif %}"
  }
}
</script>
{% endif %}
```

---

## 可索引性清单（抓得到、读得懂、愿意收）

### 可抓取

- `robots.txt` 不误拦核心路径（Shopify 默认合理，若自定义需谨慎）。
- 重要页 HTTP 200；迁移用 301；避免 4xx／5xx；防止循环跳转。
- 提供并维护 `sitemap.xml`（Shopify 自动生成，确保页面可达且状态正常）。

### 可解析

- 核心正文可在首屏无 JS 时也可见（Liquid SSR 输出关键内容）。
- 图片与懒加载：提供固定尺寸与占位，避免累计布局偏移（CLS）。
- 关键资源避免阻塞：拆分与压缩，延迟非关键脚本。

### 可收录与规范化

- 无误用 `noindex`；重要页有稳定内部链接入口，避免孤岛页。
- 参数去重与 URL 统一（协议、域名、大小写、尾斜杠）；重复页用 `canonical`。
- 多语言使用 `hreflang` 成对闭环并可达。

### 移动优先与性能

- Google 以移动端为主索引，优先保证移动端体验与速度。
- 关注核心指标：LCP、CLS、INP；建立性能预算与监控。

---

## Shopify 落地位置建议

- 在主题 `layout/theme.liquid` 的 `<head>` 中输出：Title、Description、Robots、Canonical、OG/Twitter、Hreflang、JSON‑LD（按模板条件判断）。
- 列表页／集合页避免索引排序／筛选参数页：统一 `canonical` 指向主 URL。
- 单品页输出 Product JSON‑LD；面包屑可在 `snippets/breadcrumb.liquid` 增加 Breadcrumb JSON‑LD。

---

## 性能与可索引性的协同

- 预连接与预加载：

```liquid
<link rel="preconnect" href="https://cdn.shopify.com" crossorigin>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```

- 关键 CSS 内联（Critical CSS），非关键 CSS 延迟；非必须脚本 `defer`／`async`；追踪脚本延后。
- 图片使用合适尺寸与现代格式（WebP/AVIF），首屏大图可设置 `fetchpriority="high"`。

---

## 常见误区

- 只做 Meta，不检查抓取与状态码，导致“看起来很好但不被收录”。
- `canonical` 指向错误（跨站、跳转页、参数页），稀释权重。
- `hreflang` 缺失互指或链接不可达，反而引发混乱。
- 核心内容依赖 JS 注入且无降级，爬虫读取为空白。

---

## 验收清单（上线前快速自检）

- Title/Description 唯一、长度合理，含核心关键词与品牌词。
- 重要页为 `index, follow`，低质页 `noindex`；`canonical` 指向规范 URL。
- OG/Twitter 卡片完整；多语言页 `hreflang` 成对闭环并可达，含 `x-default`。
- 商品页 Product JSON‑LD 输出正确（名称、价格、库存、货币）。
- `sitemap.xml` 可访问且 URL 状态正常；无 4xx／5xx；迁移使用 301。
- 移动端体验良好；LCP/CLS/INP 达标；无重大阻塞资源。

---

## 工具建议

- 抓取与索引：Google Search Console、URL 检查、Screaming Frog。
- 结构化数据：Rich Results Test。
- 性能：PageSpeed Insights、Lighthouse、WebPageTest、Chrome Profiler。
