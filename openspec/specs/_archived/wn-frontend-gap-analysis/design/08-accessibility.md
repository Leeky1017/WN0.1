# Design: 可访问性缺口

## 现状分析

可访问性系统性缺失，多处 `outline: none` 无替代方案，几乎无 ARIA 标签。

### 缺失功能

| 功能 | 当前状态 | 优先级 |
|------|---------|-------|
| 键盘导航 | 部分可用 | P1 |
| Focus 指示器 | 缺失或被禁用 | P1 |
| ARIA 标签 | 几乎无 | P1 |
| 语义化 HTML | 不完整 | P1 |
| 屏幕阅读器支持 | 未测试 | P2 |
| 高对比度模式 | 无 | P2 |
| 减少动效模式 | 无 | P3 |

## 设计方案

### 1. 键盘导航

必须支持的操作：
- Tab 在可交互元素间移动
- Enter/Space 激活按钮
- Escape 关闭对话框/面板
- 方向键在列表中导航

### 2. Focus 指示器

- 移除所有 `outline: none` 或提供替代方案
- 使用 `--wn-focus-ring` token 统一样式
- Focus 指示器必须清晰可见

### 3. ARIA 标签

必须标注的元素：
- 所有按钮：`aria-label`
- 面板：`role="region"` + `aria-labelledby`
- 对话框：`role="dialog"` + `aria-modal`
- 状态信息：`aria-live`

### 4. 语义化 HTML

- 使用 `<button>` 而非 `<div>` 作为按钮
- 使用 `<nav>` 标识导航区域
- 使用 `<main>` 标识主内容区域
- 使用 `<aside>` 标识侧边栏

### 5. 高对比度模式

- 提供高对比度主题变体
- 检测系统高对比度设置
- 确保所有文本对比度符合 WCAG AA

## 文件变更预期

| 操作 | 文件路径 |
|------|---------|
| Update | `writenow-core/src/browser/style/*.css`（移除 outline: none） |
| Update | 所有 Widget 组件（添加 ARIA） |
| Add | `writenow-core/src/browser/style/theme-high-contrast.css` |
