# WriteNow Theia 前端设计系统规范 v2

Status: active (2026-01-24; Cursor/Linear 级别极简设计重构)

> 本规范定义 WriteNow Theia 前端的设计系统基线，目标是达到 Cursor/Linear/Notion 级别的专业软件质感。v2 版本针对 v1 的"AI 糖果味"问题进行彻底重构。

## Purpose

### v1 问题诊断

Issue #170 的设计重构未达预期，存在以下核心问题：

| 问题 | v1 状态 | Cursor/Linear 标准 |
|------|---------|-------------------|
| 紫色使用 | Logo 蓝紫渐变，AI accent 紫色 | 绝对禁用紫色 |
| 蓝色饱和度 | `#3b82f6` (100% 饱和) | `#4a90d9` (60% 饱和) |
| 圆角尺寸 | 12px/16px "软糖风格" | 4-6px 精致克制 |
| 边框设计 | 1px solid 明显边框 | 无边框，用背景色差 |
| 阴影权重 | 0.5 opacity 厚重 | 0.05-0.1 几乎无感 |
| Logo 设计 | 渐变方块 + 字母 | 纯文字或极简图形 |
| 功能卡片 | 有边框有背景 | 无边框，hover 微变 |

### 设计目标

1. **极简克制**：移除所有装饰性元素（渐变、阴影、粗边框）
2. **单色系**：只用灰色 + 极淡蓝色，完全禁用紫色
3. **专业工具感**：像 Cursor 一样，让用户感觉在用"专业软件"而非"消费级 App"
4. **沉浸写作**：减少视觉干扰，让内容成为唯一焦点

## Requirements

### Requirement: WN-DS-V2-001 完全禁用紫色

WriteNow 设计系统 MUST 完全移除紫色（Purple）色板及所有紫色使用场景。

#### Scenario: tokens.css 无紫色定义

- **WHEN** 审查 `tokens.css` 中的颜色定义
- **THEN** MUST 不存在任何 `--wn-purple-*` 变量定义
- **AND** 不得引入任何紫色相关的 hex/rgb 值

#### Scenario: 组件无紫色使用

- **WHEN** 审查任何组件样式或内联样式
- **THEN** MUST 不存在对紫色的引用
- **AND** AI Panel 的 accent 颜色 MUST 使用与主 accent 相同的蓝色

#### Implementation

```css
/* tokens.css - 移除以下所有定义 */
/* ❌ 删除
--wn-purple-50: #faf5ff;
--wn-purple-100: #f3e8ff;
--wn-purple-400: #c084fc;
--wn-purple-500: #a855f7;
--wn-purple-600: #9333ea;
*/

/* theme-midnight.css - 修改 AI accent */
--wn-ai-accent: var(--wn-accent-primary);  /* 从 purple-500 改为蓝色 */
--wn-ai-accent-hover: var(--wn-accent-primary-hover);
```

---

### Requirement: WN-DS-V2-002 低饱和度蓝色

WriteNow 的强调色 MUST 使用低饱和度蓝色，参考 Linear 的配色风格。

#### Scenario: 蓝色饱和度标准

- **WHEN** 定义 `--wn-blue-*` 色板
- **THEN** 主蓝色 `--wn-blue-500` 的 HSL 饱和度 SHOULD 在 50-65% 之间
- **AND** 视觉上应呈现"淡雅"而非"鲜艳"

#### Implementation

```css
/* tokens.css - 重新定义蓝色色板 */

/* 旧值（过于饱和）
--wn-blue-500: #3b82f6;  /* HSL: 217, 91%, 60% */
*/

/* 新值（Linear 风格淡蓝）*/
--wn-blue-50: #f0f5fc;
--wn-blue-100: #e1ebf9;
--wn-blue-200: #c3d7f3;
--wn-blue-300: #9bbce8;
--wn-blue-400: #6a9bdb;
--wn-blue-500: #4a7fc7;   /* HSL: 214, 55%, 54% - 降低饱和度 */
--wn-blue-600: #3a66a8;
--wn-blue-700: #315489;
--wn-blue-800: #2c4770;
--wn-blue-900: #283d5e;
```

---

### Requirement: WN-DS-V2-003 小圆角系统

WriteNow MUST 使用小圆角，最大不超过 8px。

#### Scenario: 圆角尺寸标准

- **WHEN** 定义 `--wn-radius-*` tokens
- **THEN** 默认圆角 MUST 为 4px
- **AND** 最大圆角 MUST 不超过 8px（除 pill 形状外）

#### Implementation

```css
/* tokens.css - 重新定义圆角 */

/* 旧值（过大）
--wn-radius-sm: 4px;
--wn-radius-default: 6px;
--wn-radius-md: 8px;
--wn-radius-lg: 12px;
--wn-radius-xl: 16px;
*/

/* 新值（Cursor 风格小圆角）*/
--wn-radius-none: 0;
--wn-radius-sm: 2px;
--wn-radius-default: 4px;
--wn-radius-md: 5px;
--wn-radius-lg: 6px;
--wn-radius-xl: 8px;
--wn-radius-full: 9999px;  /* 仅用于 pill 形状 */

/* 组件级圆角 */
--wn-panel-radius: var(--wn-radius-md);   /* 5px */
--wn-card-radius: var(--wn-radius-lg);    /* 6px */
--wn-modal-radius: var(--wn-radius-xl);   /* 8px */
--wn-button-radius: var(--wn-radius-default); /* 4px */
--wn-input-radius: var(--wn-radius-default);  /* 4px */
```

---

### Requirement: WN-DS-V2-004 极轻阴影系统

WriteNow MUST 使用极轻阴影，opacity 不超过 0.12。

#### Scenario: 阴影权重标准

- **WHEN** 定义 `--wn-shadow-*` tokens
- **THEN** 所有阴影的 opacity MUST 不超过 0.12
- **AND** 默认场景 SHOULD 优先使用背景色差而非阴影

#### Implementation

```css
/* theme-midnight.css - 极轻阴影 */

/* 旧值（过重）
--wn-shadow-subtle: 0 1px 2px rgba(0, 0, 0, 0.3);
--wn-shadow-default: 0 2px 4px rgba(0, 0, 0, 0.4);
--wn-shadow-elevated: 0 4px 12px rgba(0, 0, 0, 0.5);
--wn-shadow-floating: 0 8px 24px rgba(0, 0, 0, 0.6);
*/

/* 新值（几乎无感）*/
--wn-shadow-subtle: 0 1px 2px rgba(0, 0, 0, 0.05);
--wn-shadow-default: 0 1px 3px rgba(0, 0, 0, 0.08);
--wn-shadow-elevated: 0 2px 6px rgba(0, 0, 0, 0.1);
--wn-shadow-floating: 0 4px 12px rgba(0, 0, 0, 0.12);
```

---

### Requirement: WN-DS-V2-005 无边框设计

WriteNow MUST 优先使用背景色差而非边框来区分区域。

#### Scenario: 边框使用限制

- **WHEN** 需要视觉分隔
- **THEN** SHOULD 优先使用 2-5% 亮度差的背景色
- **AND** 边框仅用于输入框 focus 状态等特定交互场景

#### Scenario: 边框颜色标准

- **WHEN** 必须使用边框时
- **THEN** 边框颜色 MUST 使用极淡的透明色 `rgba(255,255,255,0.06)`
- **AND** 边框宽度 MUST 为 1px

#### Implementation

```css
/* theme-midnight.css - 边框定义 */
--wn-border-subtle: rgba(255, 255, 255, 0.04);
--wn-border-default: rgba(255, 255, 255, 0.06);
--wn-border-strong: rgba(255, 255, 255, 0.1);
--wn-border-focus: var(--wn-blue-500);

/* 组件样式 - 用背景色差代替边框 */
.wn-welcome-features {
    background: transparent;  /* 无背景 */
    border: none;             /* 无边框 */
}

.wn-welcome-feature {
    background: transparent;
    border: none;
}

.wn-welcome-feature:hover {
    background: var(--wn-bg-hover);  /* hover 时显示 */
}
```

---

### Requirement: WN-DS-V2-006 纯文字 Logo

WriteNow Welcome 页面 MUST 使用纯文字标题，不使用图形 Logo。

#### Scenario: Logo 展示

- **WHEN** 用户打开 Welcome 页面
- **THEN** MUST 显示纯文字 "WriteNow" 标题
- **AND** 不得使用渐变、图形或装饰元素

#### Implementation

```tsx
/* writenow-welcome-widget.tsx */
<header className="wn-welcome-header">
    <h1 className="wn-welcome-title">WriteNow</h1>
    <p className="wn-welcome-tagline">Creator IDE</p>
</header>

/* 移除以下元素：
<div className="wn-welcome-logo">
    <span className="wn-welcome-logo-icon">W</span>
</div>
*/
```

```css
/* welcome.css */
.wn-welcome-header {
    padding: var(--wn-space-12) 0;
}

.wn-welcome-title {
    font-size: 32px;
    font-weight: 600;
    color: var(--wn-text-primary);
    margin: 0 0 var(--wn-space-2);
    letter-spacing: -0.5px;
}

.wn-welcome-tagline {
    font-size: 14px;
    color: var(--wn-text-tertiary);
    margin: 0;
}

/* 移除 .wn-welcome-logo 相关样式 */
```

---

### Requirement: WN-DS-V2-007 极简按钮设计

WriteNow 按钮 MUST 采用极简设计，无装饰。

#### Scenario: 主按钮样式

- **WHEN** 显示主要操作按钮
- **THEN** 背景色 MUST 使用低饱和度蓝色
- **AND** 无阴影、无渐变
- **AND** hover 时亮度增加 5-10%

#### Scenario: 次要按钮样式

- **WHEN** 显示次要操作按钮
- **THEN** 背景 MUST 为透明
- **AND** 使用极淡边框 `rgba(255,255,255,0.1)`
- **AND** hover 时背景变为 `rgba(255,255,255,0.05)`

#### Implementation

```css
/* welcome.css - 按钮样式 */
.wn-welcome-action {
    display: inline-flex;
    align-items: center;
    gap: var(--wn-space-2);
    padding: var(--wn-space-2) var(--wn-space-4);
    background: transparent;
    border: 1px solid var(--wn-border-default);
    border-radius: var(--wn-button-radius);
    color: var(--wn-text-primary);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 150ms ease;
}

.wn-welcome-action:hover {
    background: var(--wn-bg-hover);
    border-color: var(--wn-border-strong);
}

.wn-welcome-action--primary {
    background: var(--wn-accent-primary);
    border-color: transparent;
    color: white;
}

.wn-welcome-action--primary:hover {
    background: var(--wn-accent-primary-hover);
}
```

---

### Requirement: WN-DS-V2-008 功能列表极简化

Welcome 页面的功能展示 MUST 采用极简列表形式，无卡片边框。

#### Scenario: 功能项展示

- **WHEN** 显示功能列表
- **THEN** 每项 MUST 只有图标 + 文字，无背景无边框
- **AND** hover 时显示极淡背景色
- **AND** 图标使用与文字相同的颜色（单色）

#### Implementation

```css
/* welcome.css - 功能列表 */
.wn-welcome-features {
    margin-top: var(--wn-space-8);
}

.wn-welcome-features-title {
    font-size: 12px;
    font-weight: 500;
    color: var(--wn-text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin: 0 0 var(--wn-space-4);
}

.wn-welcome-features-list {
    list-style: none;
    padding: 0;
    margin: 0;
}

.wn-welcome-feature {
    display: flex;
    align-items: center;
    gap: var(--wn-space-3);
    padding: var(--wn-space-2) var(--wn-space-3);
    margin: 0 calc(-1 * var(--wn-space-3));
    border-radius: var(--wn-radius-default);
    color: var(--wn-text-secondary);
    font-size: 13px;
    transition: all 150ms ease;
}

.wn-welcome-feature:hover {
    background: var(--wn-bg-hover);
    color: var(--wn-text-primary);
}

.wn-welcome-feature-icon {
    width: 16px;
    height: 16px;
    opacity: 0.6;
}

.wn-welcome-feature:hover .wn-welcome-feature-icon {
    opacity: 1;
}
```

---

### Requirement: WN-DS-V2-009 文字透明度层次

WriteNow MUST 使用透明度而非不同颜色来区分文字层次。

#### Scenario: 文字层次定义

- **WHEN** 定义文字颜色 tokens
- **THEN** MUST 使用 rgba 透明度：
  - Primary: `rgba(255, 255, 255, 1.0)`
  - Secondary: `rgba(255, 255, 255, 0.6)`
  - Tertiary: `rgba(255, 255, 255, 0.4)`
  - Muted: `rgba(255, 255, 255, 0.25)`

#### Implementation

```css
/* theme-midnight.css - 文字颜色 */
--wn-text-primary: rgba(255, 255, 255, 1.0);
--wn-text-secondary: rgba(255, 255, 255, 0.6);
--wn-text-tertiary: rgba(255, 255, 255, 0.4);
--wn-text-muted: rgba(255, 255, 255, 0.25);
```

---

### Requirement: WN-DS-V2-010 背景色层次系统

WriteNow MUST 使用 Cursor 风格的背景色层次。

#### Scenario: 背景色层次

- **WHEN** 定义背景色 tokens
- **THEN** MUST 参考 Cursor 的配色：
  - App 底层：`#1e1e1e`
  - Sidebar：`#252526`
  - Editor：`#1e1e1e`
  - Panel：`#252526`
  - Hover：`rgba(255, 255, 255, 0.05)`

#### Implementation

```css
/* tokens.css - Cursor 风格灰色 */
--wn-gray-950: #121212;
--wn-gray-900: #1a1a1a;
--wn-gray-850: #1e1e1e;  /* Cursor editor background */
--wn-gray-800: #252526;  /* Cursor sidebar */
--wn-gray-750: #2d2d2d;
--wn-gray-700: #333333;
--wn-gray-600: #404040;
--wn-gray-500: #5a5a5a;
--wn-gray-400: #808080;
--wn-gray-300: #a0a0a0;
--wn-gray-200: #c0c0c0;
--wn-gray-100: #e0e0e0;
--wn-gray-50: #f5f5f5;

/* theme-midnight.css - 背景层次 */
--wn-bg-app: var(--wn-gray-850);     /* #1e1e1e */
--wn-bg-sidebar: var(--wn-gray-800); /* #252526 */
--wn-bg-panel: var(--wn-gray-800);   /* #252526 */
--wn-bg-editor: var(--wn-gray-850);  /* #1e1e1e */
--wn-bg-card: var(--wn-gray-750);    /* #2d2d2d */
--wn-bg-input: var(--wn-gray-700);   /* #333333 */

--wn-bg-hover: rgba(255, 255, 255, 0.05);
--wn-bg-active: rgba(255, 255, 255, 0.08);
--wn-bg-selected: rgba(74, 127, 199, 0.15);  /* 使用新蓝色 */
```

---

## Implementation Checklist

### Phase 1: Token 重构

- [ ] 移除 `tokens.css` 中所有 `--wn-purple-*` 定义
- [ ] 重新定义 `--wn-blue-*` 为低饱和度版本
- [ ] 重新定义 `--wn-gray-*` 为 Cursor 风格
- [ ] 缩小 `--wn-radius-*` 尺寸

### Phase 2: Theme 重构

- [ ] 修改 `theme-midnight.css` 背景色为 Cursor 风格
- [ ] 修改文字颜色为 rgba 透明度形式
- [ ] 减轻阴影权重至 0.1 以下
- [ ] 修改边框为极淡透明色
- [ ] 将 AI accent 从紫色改为蓝色

### Phase 3: Welcome 页面重构

- [ ] 移除 Logo 渐变块，改为纯文字
- [ ] 修改按钮为极简风格
- [ ] 修改功能卡片为无边框列表
- [ ] 调整间距为更大的留白

### Phase 4: 验证

- [ ] TypeScript 编译通过
- [ ] Webpack 构建通过
- [ ] 视觉验证：无紫色、小圆角、淡蓝色、极简风格

## References

- 设计参考：Cursor IDE, Linear, Notion
- 上游规范：`openspec/specs/writenow-spec/spec.md`
- 问题诊断：Issue #170 反馈
