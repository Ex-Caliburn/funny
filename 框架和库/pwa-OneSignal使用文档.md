# OneSignal 使用文档

## 概述

OneSignal是一个强大的推送通知服务平台，支持Web、移动应用和电子邮件推送。在PWA项目中用于向用户发送推送通知，提升用户参与度和留存率。

## 项目集成

### 1. 当前项目实现

**文件位置：** `extensions/fe-pwa/blocks/section.liquid`

**集成代码：**
```html
<script src="https://cdn.onesignal.com/sdks/OneSignalSDK.js" defer></script>
<script>
  window.OneSignal = window.OneSignal || [];
  OneSignal.push(function() {
    if(!window.ENABLE_EC_PWA){
      return;
    }
    OneSignal.init({
      appId: "{{block.settings.appId}}",
      notifyButton: {
        enable: true
      }
    });
    var $customerEmail = document.querySelector(".customerEmail");
    if($customerEmail){
        var customerEmail = $customerEmail.value;
        window.OneSignal.setExternalUserId(customerEmail);
    }
    window.OneSignal.showNativePrompt();
  });
</script>
```

### 2. 配置参数

**主题设置参数：**
```json
{
  "type": "text",
  "id": "appId",
  "label": "oneSignal App Id",
  "default": "de3ad444-c439-41ac-a82b-86e99c789b7e"
}
```

## 核心功能

### 1. 初始化配置

**基本初始化：**
```javascript
OneSignal.init({
  appId: "your-app-id",
  notifyButton: {
    enable: true
  }
});
```

**高级配置选项：**
```javascript
OneSignal.init({
  appId: "your-app-id",
  notifyButton: {
    enable: true,
    showAfterSubscribed: false,
    displayPredicate: function() {
      return OneSignal.isPushNotificationsEnabled()
        .then(function(isEnabled) {
          return !isEnabled;
        });
    }
  },
  welcomeNotification: {
    title: "欢迎使用我们的PWA！",
    message: "点击这里了解更多功能"
  },
  autoRegister: true,
  autoResubscribe: true
});
```

### 2. 用户管理

**设置外部用户ID：**
```javascript
// 设置用户邮箱作为外部ID
OneSignal.setExternalUserId("user@example.com");

// 设置用户ID
OneSignal.setExternalUserId("12345");
```

**获取用户信息：**
```javascript
// 获取用户ID
OneSignal.getUserId().then(function(userId) {
  console.log("OneSignal User ID:", userId);
});

// 获取推送订阅状态
OneSignal.isPushNotificationsEnabled().then(function(isEnabled) {
  console.log("推送通知状态:", isEnabled);
});
```

### 3. 推送权限管理

**显示权限提示：**
```javascript
// 显示原生权限提示
OneSignal.showNativePrompt();

// 检查权限状态
OneSignal.getNotificationPermission().then(function(permission) {
  console.log("权限状态:", permission);
});
```

**权限状态值：**
- `"default"` - 用户未做出选择
- `"granted"` - 用户已授权
- `"denied" - 用户已拒绝

### 4. 标签和细分

**设置用户标签：**
```javascript
// 设置单个标签
OneSignal.sendTag("user_type", "premium");

// 设置多个标签
OneSignal.sendTags({
  "user_type": "premium",
  "subscription": "monthly",
  "last_purchase": "2024-01-15"
});
```

**获取标签：**
```javascript
OneSignal.getTags().then(function(tags) {
  console.log("用户标签:", tags);
});
```

## 使用场景

### 1. 营销推送

**促销活动通知：**
```javascript
// 发送促销推送
OneSignal.sendNotification({
  headings: { "en": "限时优惠！" },
  contents: { "en": "全场8折，仅限今天！" },
  url: "https://yoursite.com/sale"
});
```

**新品上架提醒：**
```javascript
OneSignal.sendNotification({
  headings: { "en": "新品上架" },
  contents: { "en": "您关注的产品已上架，立即查看！" },
  url: "https://yoursite.com/new-products"
});
```

### 2. 用户互动

**订单状态更新：**
```javascript
OneSignal.sendNotification({
  headings: { "en": "订单更新" },
  contents: { "en": "您的订单已发货，预计明天送达" },
  url: "https://yoursite.com/orders/12345"
});
```

**物流信息推送：**
```javascript
OneSignal.sendNotification({
  headings: { "en": "物流更新" },
  contents: { "en": "您的包裹正在派送中，请保持电话畅通" },
  url: "https://yoursite.com/tracking/12345"
});
```

### 3. 个性化推荐

**基于用户行为的推荐：**
```javascript
// 根据用户浏览历史发送推荐
OneSignal.sendNotification({
  headings: { "en": "为您推荐" },
  contents: { "en": "基于您的浏览历史，这些产品可能适合您" },
  url: "https://yoursite.com/recommendations",
  filters: [
    { "field": "tag", "key": "user_type", "relation": "=", "value": "premium" }
  ]
});
```

### 4. 留存提醒

**用户回访提醒：**
```javascript
OneSignal.sendNotification({
  headings: { "en": "想念您了！" },
  contents: { "en": "好久不见，来看看有什么新变化" },
  url: "https://yoursite.com"
});
```

**功能使用引导：**
```javascript
OneSignal.sendNotification({
  headings: { "en": "新功能上线" },
  contents: { "en": "我们新增了PWA功能，体验更流畅的购物体验" },
  url: "https://yoursite.com/pwa-features"
});
```

## 最佳实践

### 1. 权限请求时机

**推荐时机：**
- 用户完成关键操作后（如完成订单、注册成功）
- 用户表现出明显兴趣时（如多次访问、长时间停留）
- 在用户最活跃的时间段

**避免时机：**
- 页面刚加载时
- 用户首次访问时
- 在用户忙碌或分心时

### 2. 推送内容优化

**标题优化：**
- 简洁明了，不超过50个字符
- 包含关键信息或行动号召
- 避免过度营销化语言

**内容优化：**
- 清晰传达价值主张
- 包含具体的行动指引
- 个性化内容，提高相关性

### 3. 推送频率控制

**频率建议：**
- 新用户：每周1-2次
- 活跃用户：每周2-3次
- 高价值用户：根据用户偏好调整

**时间控制：**
- 避免深夜推送
- 考虑用户时区
- 在用户最活跃的时间段发送

### 4. 用户偏好管理

**提供选择：**
```javascript
// 让用户选择推送类型
OneSignal.sendNotification({
  headings: { "en": "推送偏好设置" },
  contents: { "en": "选择您希望接收的推送类型" },
  url: "https://yoursite.com/notification-preferences"
});
```

**尊重用户选择：**
- 提供退订选项
- 支持推送类型选择
- 记录用户偏好并遵守

## 错误处理

### 1. 常见错误

**权限被拒绝：**
```javascript
OneSignal.isPushNotificationsEnabled().then(function(isEnabled) {
  if (!isEnabled) {
    // 显示权限被拒绝的提示
    showPermissionDeniedMessage();
  }
});
```

**网络错误：**
```javascript
OneSignal.init({
  appId: "your-app-id",
  onSubscriptionChange: function(isSubscribed) {
    if (!isSubscribed) {
      console.log("推送订阅失败，可能是网络问题");
    }
  }
});
```

### 2. 降级方案

**推送不可用时的替代方案：**
```javascript
// 检查推送是否可用
function checkPushAvailability() {
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    // 推送可用，使用OneSignal
    initOneSignal();
  } else {
    // 推送不可用，使用其他通知方式
    useAlternativeNotification();
  }
}
```

## 测试和调试

### 1. 开发环境测试

**本地测试：**
```javascript
// 开发环境下的测试配置
if (process.env.NODE_ENV === 'development') {
  OneSignal.init({
    appId: "test-app-id",
    notifyButton: {
      enable: true
    },
    // 开发环境特殊配置
    allowLocalhostAsSecureOrigin: true
  });
}
```

**测试推送：**
```javascript
// 发送测试推送
OneSignal.sendNotification({
  headings: { "en": "测试推送" },
  contents: { "en": "这是一条测试推送消息" },
  url: "https://localhost:3000/test"
});
```

### 2. 调试工具

**浏览器开发者工具：**
- 检查Console中的OneSignal日志
- 查看Network标签中的API请求
- 使用Application标签检查Service Worker

**OneSignal Dashboard：**
- 查看推送发送状态
- 分析用户参与度数据
- 监控推送成功率

## 性能优化

### 1. 加载优化

**延迟加载：**
```javascript
// 延迟加载OneSignal，提高页面加载速度
window.addEventListener('load', function() {
  loadOneSignal();
});

function loadOneSignal() {
  const script = document.createElement('script');
  script.src = 'https://cdn.onesignal.com/sdks/OneSignalSDK.js';
  script.defer = true;
  document.head.appendChild(script);
}
```

**条件加载：**
```javascript
// 仅在需要时加载OneSignal
if (window.ENABLE_EC_PWA && !window.OneSignal) {
  loadOneSignal();
}
```

### 2. 资源优化

**CDN使用：** 使用OneSignal官方CDN，确保全球访问速度
**缓存策略：** 合理设置缓存头，减少重复请求
**压缩传输：** 启用gzip压缩，减少传输数据量

## 安全考虑

### 1. 数据保护

**用户隐私：**
- 只收集必要的用户信息
- 明确告知用户数据使用目的
- 提供数据删除选项

**推送内容安全：**
- 验证推送内容来源
- 避免发送敏感信息
- 实施内容审核机制

### 2. 权限管理

**最小权限原则：**
- 只请求必要的推送权限
- 提供细粒度的权限控制
- 支持用户随时撤销权限

## 总结

OneSignal为PWA项目提供了强大的推送通知功能，通过合理的配置和使用，可以显著提升用户参与度和留存率。关键是要在用户体验和推送效果之间找到平衡，遵循最佳实践，确保推送通知为用户带来价值而不是干扰。

## 相关链接

- [OneSignal官方文档](https://documentation.onesignal.com/)
- [OneSignal Web SDK](https://documentation.onesignal.com/docs/web-push-sdk)
- [推送通知最佳实践](https://developers.google.com/web/fundamentals/push-notifications)
- [PWA推送通知指南](https://web.dev/push-notifications/)
