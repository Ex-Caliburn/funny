# discount-goal 插件

## 流程说明 & 生命周期文档

## 一、插件流程说明

### 1. 配置与创建

- 商家在 Shopify 后台通过 `/app/goals-bar/:functionId/new` 页面创建折扣目标，配置参数（如目标商品、门槛类型、折扣类型等）。
- 配置内容以 metafield 形式存储，命名空间为 `$app:discount-goal`，key 为 `function-configuration`。

### 2. 折扣计算主流程

- **入口文件**：`src/index.js`
- **执行时机**：每次结算（checkout）时，Shopify 会调用该插件，传入当前购物车数据和配置。
- **主要步骤**：
  1. **解析配置**  
     从 discountNode 的 metafield 读取目标商品、门槛类型（金额/数量）、折扣类型等参数。
  2. **遍历购物车**  
     根据配置筛选商品，统计目标商品的金额或数量，排除不参与的商品（如赠品）。
  3. **判断门槛**  
     调用 `discountHandler` 判断当前是否满足配置的门槛，返回折扣值和类型。
  4. **生成折扣**  
     构造折扣对象，支持固定金额（fixedAmount）或百分比（percentage）两种类型。
  5. **返回结果**  
     返回 discounts 和 discountApplicationStrategy，Shopify 平台据此应用折扣。

- **支持的目标范围**：
  - 全部商品
  - 指定集合
  - 指定商品
  - 指定变体

- **支持的门槛类型**：
  - 金额
  - 数量

- **支持的折扣类型**：
  - 固定金额
  - 百分比

### 3. 典型伪代码流程

```js
export default (input) => {
  // 1. 解析配置
  const { list, targetIds, product_type, amount_or_quantity } = JSON.parse(input.discountNode.metafield.value);

  // 2. 统计目标商品金额或数量
  const total_number = input.cart.lines.reduce((cur, next) => { ... }, 0);

  // 3. 判断门槛
  let discounts = discountHandler(list, total_number);

  // 4. 生成折扣对象
  return {
    discounts: [ ... ],
    discountApplicationStrategy: DiscountApplicationStrategy.First
  };
}
```

---

## 二、插件生命周期

1. **创建/配置阶段**
   - 商家通过 UI 配置折扣目标，参数写入 metafield。
2. **运行阶段**
   - 每次结算时，Shopify 调用插件，实时计算并返回折扣。
3. **变更阶段**
   - 商家可随时调整配置，影响后续折扣计算。
4. **下线/卸载阶段**
   - 删除插件或相关配置后，Shopify 不再调用该函数。

---

## 三、相关文件与配置

- **shopify.extension.toml**

  ```toml
  name = "discount-goal"
  type = "order_discounts"
  api_version = "2024-07"
  [ui.paths]
  create = "/app/goals-bar/:functionId/new"
  details = "/app/additional"
  [input.variables]
  namespace = "$app:discount-goal"
  key = "function-configuration"
  ```

- **package.json**
  - 构建命令：`npm run build`
  - 依赖：`@shopify/shopify_function`
  - 测试：`vitest`

- **schema.graphql**
  - 定义了购物车、商品、折扣等 GraphQL 类型，插件通过这些类型与 Shopify 平台交互。

---

## 四、注意事项

- 配置变更后需重新发布插件以生效。
- 赠品需在商品类型中排除，避免重复计算。
- 折扣门槛和类型需与前端 UI 配置保持一致。

---

如需更详细的字段说明或代码注释，可查阅 `src/index.js` 及 `schema.graphql` 文件。
