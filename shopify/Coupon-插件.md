# cool-coupon 扩展使用与生命周期说明

## 1. 目录结构与入口

- **src/index.jsx**：主入口文件，负责渲染整个优惠券组件。
- **src/components/CouponCard.jsx**：优惠券卡片组件，负责单张优惠券的展示与操作。
- **src/util/country.js**：店铺与图片等工具方法。

## 2. 运行环境与依赖

- 依赖于 [Shopify Checkout UI Extensions](https://shopify.dev/api/checkout-extensions/checkout)。
- 通过 `render('Checkout::Dynamic::Render', () => <App />)` 注册为 checkout 动态渲染扩展。
- 主要使用 React 及 Shopify 提供的 UI 组件和 Hooks。

## 3. 生命周期与主流程

### 3.1 渲染流程

1. **入口注册**  
   `render('Checkout::Dynamic::Render', () => <App />);`   废弃⚠️
   Use purchase.checkout.block.render instead.
   Shopify checkout 渲染到指定 extension point 时，调用 `App` 组件。

2. **初始化与数据获取**  
   - 组件挂载时（`useEffect`），会根据当前店铺和用户邮箱，向后端接口请求当前用户可用的优惠券列表。
   - 请求参数包括加密后的用户邮箱、shopCode、优惠券状态等。

3. **数据渲染**  
   - 若无可用优惠券，组件不渲染任何内容。
   - 若有优惠券，优先展示前两张，剩余通过“View all”弹窗展示全部。
   - 每张优惠券由 `CouponCard` 组件渲染，支持点击领取/移除。

4. **交互与状态**  
   - 若存在自动叠加的 BundleSaleDiscount 且未允许叠加，显示警告及允许切换。
   - 领取/移除优惠券时，调用 Shopify 的 `useApplyDiscountCodeChange`，并根据返回结果展示错误或成功状态。

### 3.2 主要 Hooks 与 API

- `useExtensionApi`：获取扩展上下文（如当前 shop 域名等）。
- `useSettings`：获取扩展配置（如文案、接口域名等）。
- `useEmail`：获取当前用户邮箱。
- `useDiscountAllocations`：获取当前已应用的折扣信息。
- `useDiscountCodes`：获取当前已应用的优惠码。
- `useApplyDiscountCodeChange`：应用/移除优惠码。

### 3.3 组件通信

- 父组件 `App` 负责数据拉取、全局状态与弹窗控制。
- 子组件 `CouponCard` 负责单张优惠券的展示与领取逻辑，通过 props 传递数据和回调。

## 4. 关键业务逻辑

- **优惠券图片**：通过 `getImageUrl` 根据店铺和 image 字段自动匹配图片。
- **店铺识别**：通过 `getShop` 根据 shopify 域名自动识别 shopCode。
- **优惠券领取/移除**：判断当前优惠券是否已领取，自动切换“添加”或“移除”操作。
- **BundleSaleDiscount 互斥提示**：如存在自动叠加折扣，需用户确认后才能使用其他优惠券。

## 8. CouponCard 组件逻辑详解

- **职责**：CouponCard 负责单张优惠券的展示和交互。
- **展示内容**：包括优惠券标题、描述、有效期、图片、优惠信息等。
- **领取/移除逻辑**：
  - 组件通过 `useDiscountCodes` 获取当前已领取的所有优惠券码。
  - 如果当前优惠券未被领取，点击右侧图标会调用 `useApplyDiscountCodeChange` 添加该优惠券。
  - 如果已领取，点击图标会移除该优惠券。
  - 操作后根据返回结果，显示错误信息或清除错误。
- **禁用状态**：如果父组件传入 `isDisabled` 为 true，则操作按钮不可用，图标变为禁用态。
- **图片处理**：通过 `getImageUrl` 方法，根据 `shopCode` 和 `imageUrl` 自动选择合适的优惠券图片。
- **数据与回调**：组件通过 props 接收优惠券数据、禁用状态、错误回调、shopCode 等。
- **主要用到的 Shopify Hooks**：
  - `useDiscountCodes`：获取当前所有已应用的优惠券码。
  - `useApplyDiscountCodeChange`：添加或移除优惠券码。
  - `useSettings`：获取多语言文案等配置。
- **组件结构**：
  - 左侧为优惠券图片和详细信息（标题、描述、有效期等）。
  - 右侧为操作按钮（图标），根据状态显示不同图标（未领取、已领取、禁用）。

**简要流程图：**

1. 渲染优惠券卡片，展示图片、标题、描述等。
2. 判断当前优惠券是否已领取，决定按钮图标和操作类型。
3. 用户点击按钮，执行添加或移除优惠券操作。
4. 根据操作结果，显示或清除错误信息。
5. 若父组件禁用，则按钮不可用。

## 5. 本地开发与运行

1. 进入项目根目录，安装依赖：

   ```bash
   yarn install
   ```

2. 启动本地开发环境（需已配置好 Shopify app 环境）：

   ```bash
   yarn dev
   ```

3. 通过 Shopify 后台将扩展安装到 checkout 页面，或使用官方提供的预览功能。

## 6. 配置与自定义

- 文案、接口域名、弹窗提示等均通过 `useSettings` 读取，可在 `shopify.ui.extension.toml` 或后台配置。
- 支持多语言，相关文案在 `locales/` 目录下。

## 7. 生命周期总结

- **初始化**：注册扩展点，挂载时拉取优惠券数据。
- **渲染**：根据数据动态渲染优惠券列表与弹窗。
- **交互**：用户点击领取/移除优惠券，实时与 Shopify checkout 状态同步。
- **卸载**：无特殊卸载逻辑，随 checkout 生命周期自动卸载。
