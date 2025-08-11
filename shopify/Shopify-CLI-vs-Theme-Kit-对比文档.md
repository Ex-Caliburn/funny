# Shopify CLI vs Theme Kit 对比文档

## 概述

本文档详细对比了 Shopify 主题开发中的两个主要工具：**Shopify CLI** 和 **Theme Kit**，帮助开发者选择合适的工具。

## 工具对比

### Shopify CLI

#### 特点

- **官方工具**：Shopify 官方推荐的现代化开发工具
- **功能全面**：支持主题开发、应用开发、商店管理等多种功能
- **本地预览**：提供本地开发服务器，实时预览主题
- **临时开发模板**：生成临时开发模板，在 Shopify 后台不可见
- **现代化**：基于 Node.js，支持现代开发工作流

#### 主要命令

```bash
# 登录商店
shopify login --store your-store.myshopify.com

# 启动本地开发服务器
shopify theme serve

# 推送到开发环境
shopify theme push --development

# 打开主题预览
shopify theme open

# 自定义端口
shopify theme serve --port=8080
```

#### 优势

- ✅ 官方支持和维护
- ✅ 本地实时预览
- ✅ 功能更全面
- ✅ 更好的开发体验
- ✅ 支持多种开发场景

#### 劣势

- ❌ 无法预览 checkout 页面（修改端口后）
- ❌ 临时模板存在时间有限

### Theme Kit

#### 特点

- **第三方工具**：由 Shopify 社区开发
- **专注主题**：主要专注于主题文件的同步和部署
- **无本地预览**：无法在本地预览主题
- **批量操作**：支持批量部署到多个环境
- **成熟稳定**：经过长期使用验证

#### 主要命令

```bash
# 监听文件变化并同步
theme watch --dir=dist

# 部署到指定环境
theme deploy --dir=dist -e=dev

# 批量部署到多个环境
theme deploy --dir=dist -e=dev -e=qa -e=production

# 下载文件
theme download config locales --live -e=dev

# 查看主题列表
theme get --list -e=dev
```

#### 优势

- ✅ 批量部署能力强
- ✅ 多环境管理
- ✅ 操作简单直接
- ✅ 社区支持良好

#### 劣势

- ❌ 无本地预览功能
- ❌ 非官方工具
- ❌ 功能相对单一

## 使用场景对比

### 开发阶段

| 场景 | Shopify CLI | Theme Kit |
|------|-------------|-----------|
| 本地开发 | ✅ 支持本地预览 | ❌ 需要推送到测试环境 |
| 实时调试 | ✅ 热重载 | ❌ 需要手动同步 |
| 快速迭代 | ✅ 快速反馈 | ❌ 反馈较慢 |

### 部署阶段

| 场景 | Shopify CLI | Theme Kit |
|------|-------------|-----------|
| 单环境部署 | ✅ 简单直接 | ✅ 简单直接 |
| 多环境部署 | ❌ 需要多次操作 | ✅ 批量部署 |
| 文件级部署 | ✅ 支持 | ✅ 支持 |

## 最佳实践建议

### 新项目推荐

- **使用 Shopify CLI**：享受现代化的开发体验和官方支持

### 现有项目

- **继续使用 Theme Kit**：避免不必要的迁移成本
- **逐步迁移**：在合适时机逐步迁移到 Shopify CLI

### 混合使用策略

- **开发阶段**：使用 Shopify CLI 进行本地开发和预览
- **部署阶段**：使用 Theme Kit 进行批量部署到多环境

## 注意事项

### 危险操作提醒

⚠️ **重要警告**：以下操作需要特别谨慎

1. **Theme Kit** 轻易不要使用 `--allow-live`
2. **Shopify CLI** 轻易不要使用 `--allow-live`、`--live`、`--publish`
3. 直接推送 `locales` 和 `config/settings_data.json` 到线上

### 安全建议

- 操作前仔细确认，因为都是覆盖操作
- 保留多个主题版本，便于快速回滚
- 大版本改动不直接推送线上分支
- 随时保留两个主要线上主题，交替发版

## 环境配置

### Shopify CLI 配置

```yaml
# .shopify.theme.toml
name = "your-theme-name"
source = "src"
```

### Theme Kit 配置

```yaml
# config.yml
development:
  password: [your-password]
  theme_id: [your-theme-id]
  store: [your-store.myshopify.com]
  directory: dist
```

## 迁移指南

### 从 Theme Kit 迁移到 Shopify CLI

1. **安装 Shopify CLI**

   ```bash
   npm install -g @shopify/cli @shopify/theme
   ```

2. **初始化项目**

   ```bash
   shopify theme init
   ```

3. **配置环境**

   ```bash
   shopify login --store your-store.myshopify.com
   ```

4. **迁移配置文件**
   - 将 `config.yml` 中的配置迁移到 `.shopify.theme.toml`
   - 更新构建脚本

## 总结

| 方面 | Shopify CLI | Theme Kit |
|------|-------------|-----------|
| **推荐程度** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **官方支持** | ✅ 是 | ❌ 否 |
| **本地预览** | ✅ 支持 | ❌ 不支持 |
| **批量部署** | ❌ 有限 | ✅ 强大 |
| **学习成本** | 中等 | 低 |
| **未来性** | 更好 | 一般 |

**最终建议**：

- 新项目：选择 Shopify CLI
- 现有项目：可以继续使用 Theme Kit，或逐步迁移
- 复杂项目：考虑混合使用两种工具

## 参考资源

- [Shopify CLI 官方文档](https://shopify.dev/themes/tools/cli/core-commands)
- [Theme Kit 命令参考](https://shopify.dev/themes/tools/theme-kit/command-reference)
- [Shopify 主题开发最佳实践](https://shopify.dev/themes/best-practices)
