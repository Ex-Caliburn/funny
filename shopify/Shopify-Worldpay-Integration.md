# Shopify 接入 Worldpay（Markdown 版）

## 概览

- **接入方式**：在 Shopify 后台启用第三方支付服务提供商（Worldpay），采用托管收银台重定向，无需自建收银页。
- **前置条件**：商店所在国家/地区需支持 Worldpay；使用第三方网关时，Shopify 会收取额外交易费。

---

## 前置准备

- Worldpay 商户账户（测试与生产）
- 开启 3D Secure（满足 PSD2 等强合规要求）
- 确认合同开通币种与地区范围
- 拿到必要凭据：
  - Merchant Code（商户代码）
  - XML Password（API/XML 密码）
  - Installation ID（部分账户需要）
  - 退款/风控权限已开通

---

## 在 Shopify 后台配置

1. 登录 Shopify 后台 → 设置 → 付款
2. 若已启用 Shopify Payments：点击「管理」→ 选择「切换至第三方提供商」
3. 在「支付服务提供商」中选择 Worldpay
4. 填写 Worldpay 凭据（Merchant Code、XML Password、Installation ID 如需）
5. 设置「授权与捕获」策略（建议与 Worldpay 后台一致，例如自动捕获）
6. 保存并激活

提示：部分 Worldpay 模式会在配置页提示回调/返回 URL，按页面指引填写，无需自定义。

---

## 在 Worldpay 后台配置

- 确认以下开启并匹配 Shopify：
  - 3D Secure（强烈建议开启）
  - 授权/清算策略（自动/手动捕获）
  - 退款权限
  - 币种与结算账户
- 如要求填写返回 URL，使用 Shopify 配置页显示的地址

---

## 测试流程（沙盒）

- 在 Worldpay 后台切换测试模式，使用官方测试卡进行：
  - 下单 → 重定向至 Worldpay → 3DS 验证 → 授权/清算
  - 失败路径（风控/3DS 失败）验证
  - 退款/部分退款验证（从 Shopify 后台发起）
- 常见验证点：
  - 订单金额包含税费与运费
  - 多币种与国家地址
  - 交易在 Worldpay 报表可对账

---

## 上线步骤

1. 将 Shopify 中的 Worldpay 凭据切换为生产
2. Worldpay 也切到生产密钥/账户
3. 做一笔小额真实交易自测，包括退款
4. 观察 24–48 小时对账与失败率，确认稳定

---

## 常见问题与排查

- 无法显示 Worldpay：
  - 当前国家/地区不支持第三方网关，或 Worldpay 未在列表
- 授权成功但未清算：
  - Shopify 的捕获策略与 Worldpay 后台不一致
- 欧洲拒付率高：
  - 未启用 3D Secure 或 3DS 流程异常
- 退款失败：
  - Worldpay 侧权限未开通，或交易未清算
- 回调问题：
  - 使用 Shopify 配置页提示的返回 URL；避免自定义

---

## 合规与费用

- 使用第三方网关时，除 Worldpay 费率外，Shopify 还会收取额外交易费
- 欧盟地区需符合 PSD2，务必启用 3DS

---

## 最佳实践清单

- [ ] Worldpay 测试与生产账户均可用
- [ ] 3D Secure 已开启并通过测试
- [ ] Shopify 与 Worldpay 捕获策略一致
- [ ] 回调/返回 URL 按 Shopify 指引配置
- [ ] 退款在 Shopify 发起并可成功同步到 Worldpay
- [ ] 多币种与目标国家测试通过
- [ ] 监控拒付率与失败率并优化风控

---

## 参考

- Shopify 官方文档（第三方支付服务提供商配置）：[help.shopify.com → Payments](https://help.shopify.com/zh-CN/manual/payments/third-party-providers/configuring-providers)
- Worldpay 商户后台与集成指南：登录商户中心查看相应产品文档与测试卡信息

---

> 如提供你的店铺国家/地区与币种需求，可补充精确字段与开关清单
