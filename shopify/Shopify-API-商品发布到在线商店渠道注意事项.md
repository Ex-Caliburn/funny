# Shopify API 创建商品后无法出现在在线商店渠道的解决方案

## 问题描述

通过 Shopify GraphQL API（如 productCreate mutation）创建的商品，**默认不会自动添加到“在线商店”销售渠道（Online Store Channel）**。这导致商品在后台可以看到，但前台在线商店无法展示。

## 原因分析

- Shopify 后台手动创建商品时，会自动勾选“在线商店”渠道。
- 通过 API 创建商品时，**不会自动分配到任何销售渠道**，需要开发者手动发布到渠道。

## 解决办法

需要在创建商品后，**调用 publishablePublish mutation**，将商品发布到“在线商店”渠道。

---

## 操作步骤

### 1. 创建商品（productCreate mutation）

```graphql
mutation productCreate {
  productCreate(input: {
    title: "测试商品",
    bodyHtml: "<strong>描述</strong>",
    vendor: "测试品牌",
    productType: "测试类型"
  }) {
    product {
      id
      title
    }
    userErrors {
      field
      message
    }
  }
}
```

记录返回的 `product.id`。

---

### 2. 获取“在线商店”渠道的 ID

```graphql
{
  channels(first: 10) {
    edges {
      node {
        id
        name
      }
    }
  }
}
```

- 找到 name 为“Online Store”或“在线商店”的 channel，记下它的 id。

---

### 3. 发布商品到渠道（publishablePublish mutation）

```graphql
mutation publishablePublish {
  publishablePublish(
    id: "gid://shopify/Product/1234567890",  # 你的商品ID
    input: {
      channelId: "gid://shopify/Channel/1234567890"  # 你的渠道ID
    }
  ) {
    publishable {
      ... on Product {
        id
        title
        publishedOnCurrentPublication
      }
    }
    userErrors {
      field
      message
    }
  }
}
```

---

## 常见坑总结

- 通过 API 创建商品后，商品不会自动出现在“在线商店”
- 必须手动调用 publishablePublish mutation 发布到渠道
- 如果没有发布，商品只能在后台看到，前台无法展示
- 多渠道销售时，每个渠道都需要单独发布

---

## 参考文档

- [productCreate mutation](https://shopify.dev/docs/api/admin-graphql/latest/mutations/productCreate)
- [publishablePublish mutation](https://shopify.dev/docs/api/admin-graphql/latest/mutations/publishablePublish)
- [Shopify 多渠道发布官方说明](https://shopify.dev/docs/apps/channels/publish)

---

如需自动化脚本或有其他 API 问题，欢迎随时咨询！ 