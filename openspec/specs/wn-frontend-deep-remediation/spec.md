# WriteNow Theia 前端设计系统规范

Status: active (2026-01-24; Theia frontend design system)

> 本规范定义 WriteNow Theia 前端的设计系统基线：品牌视觉语言、Design Token 体系、主题系统与组件样式规范。目标是让产品具备 Cursor/Linear/Notion 级别的专业软件质感。

## Purpose

基于前端审计反馈，本规范定义 WriteNow Theia 前端的"审美拯救（Aesthetic Remediation）"目标：

1. **品牌辨识度**：建立 WriteNow 专属的视觉语言，区别于 Theia 默认 IDE 风格
2. **设计系统约束**：通过 Design Token 确保配色/间距/圆角/阴影的一致性
3. **组件风格统一**：AI Panel、Welcome、Editor 等自定义组件与 Theia 原生组件协调
4. **创作者沉浸感**：作为"创作者的 Cursor"，需要专业且沉浸的写作体验

设计灵感参考：
- **Cursor**: 深色主题的层次感与边界处理
- **Linear**: 克制的配色与图标语言
- **Notion**: 干净的留白与排版
- **iA Writer**: 创作者工具的沉浸感

## Requirements

### Requirement: WN-THEME-001 WriteNow 专属主题体系

WriteNow MUST 建立三套专属主题，覆盖不同使用场景与用户偏好：

1. **Midnight（深邃蓝黑）**：默认主题，专业深沉，适合长时间创作
2. **Warm Gray（暖灰）**：柔和温暖，减少视觉疲劳
3. **Parchment（羊皮纸）**：浅色主题，模拟纸质书写体验

#### Scenario: 主题切换即时生效

- **WHEN** 用户在设置中切换主题
- **THEN** 界面 MUST 即时切换到目标主题，无需重启
- **AND** 主题偏好 MUST 持久化到本地存储

#### Scenario: 主题一致性覆盖

- **WHEN** 任意主题激活时
- **THEN** 所有 UI 元素（Theia 原生 + WriteNow 自定义）MUST 使用统一的主题变量
- **AND** 不得出现"混搭"的颜色不一致

---

### Requirement: WN-DS-001 Design Token 作为样式 SSOT

WriteNow MUST 建立分层 Design Token 系统，并通过 CSS 变量（`--wn-*`）暴露：

1. **Primitive Tokens**：基础色板（gray-50 ~ gray-950, blue, green, red 等）
2. **Semantic Tokens**：语义化映射（bg-app, bg-sidebar, text-primary 等）
3. **Component Tokens**：组件专属（panel-radius, button-radius, transition-fast 等）

#### Scenario: Token 命名规范

- **WHEN** 新增或修改视觉参数
- **THEN** 变更 MUST 发生在 tokens SSOT（`writenow-core/src/browser/style/tokens.css`）
- **AND** 遵循分层命名规则：`--wn-{layer}-{category}-{variant}`

#### Scenario: 禁止硬编码颜色

- **WHEN** 代码中出现硬编码颜色值（hex/rgb/hsl）
- **THEN** SHOULD 使用 Token 替代，避免主题扩展时 UI 破裂

---

### Requirement: WN-LAYOUT-001 统一边距/圆角/阴影系统

WriteNow MUST 建立统一的布局参数系统：

1. **间距规模**：4px 基础单位，8/12/16/24/32/48 递增
2. **圆角规模**：4px（subtle）/ 6px（default）/ 8px（panel）/ 12px（card）/ 16px（modal）
3. **阴影层次**：subtle / elevated / floating 三级阴影

#### Scenario: 间距一致性

- **WHEN** 组件需要内/外边距
- **THEN** MUST 使用 Token 定义的间距值（`--wn-space-*`）

#### Scenario: 阴影层次分明

- **WHEN** 不同层级的 UI 元素需要视觉区分
- **THEN** MUST 使用对应层级的阴影 Token

---

### Requirement: WN-WIDGET-001 组件风格统一

WriteNow 自定义组件（AI Panel / Welcome / Editor）MUST 与 Theia 原生组件风格统一：

1. **AI Panel**：对话气泡圆角、SKILL 按钮样式、输入框设计
2. **Welcome**：品牌 Logo、快捷入口卡片、功能亮点
3. **Editor**：行号融入背景、当前行高亮、选区颜色

#### Scenario: AI Panel 专业对话体验

- **WHEN** 用户与 AI 对话
- **THEN** 用户消息与 AI 回复 MUST 有清晰的视觉区分（对齐/背景/间距）
- **AND** 对话气泡 MUST 使用统一的圆角与阴影

#### Scenario: Welcome 页面品牌呈现

- **WHEN** 用户首次打开或新建窗口
- **THEN** Welcome 页面 MUST 展示 WriteNow 品牌标识
- **AND** 提供清晰的快捷入口（Open Folder / Open File / Settings）

#### Scenario: 编辑器沉浸体验

- **WHEN** 用户在编辑器中写作
- **THEN** 行号区域 MUST 与背景融为一体（不出现明显竖带）
- **AND** 当前行 MUST 有微妙高亮

---

### Requirement: WN-TYPEFACE-001 创作者友好字体栈

WriteNow MUST 提供创作者友好的字体配置：

1. **编辑器字体**：优先等宽字体，支持 Mono/Serif/Sans 切换
2. **UI 字体**：系统原生字体栈，确保跨平台一致性
3. **中英文混排**：中文使用思源黑体/苹方，英文使用 Inter/SF Pro

#### Scenario: 字体偏好可配置

- **WHEN** 用户在设置中选择字体模式
- **THEN** 编辑器字体 MUST 即时切换
- **AND** 偏好 MUST 持久化

---

### Requirement: WN-MOTION-001 微交互与过渡动效

WriteNow MUST 提供克制但精致的动效：

1. **过渡时长**：fast（150ms）/ normal（250ms）/ slow（350ms）
2. **缓动函数**：ease-out 为主，强调动作起点
3. **适用场景**：悬浮状态、面板展开/折叠、主题切换

#### Scenario: 悬浮反馈

- **WHEN** 用户悬浮在可交互元素上
- **THEN** 元素 MUST 在 150ms 内完成状态过渡

#### Scenario: 面板动效

- **WHEN** 侧边栏或面板展开/折叠
- **THEN** 动画 MUST 流畅且不干扰用户操作

---

## Implementation

### 文件结构

```
writenow-theia/writenow-core/src/browser/style/
├── tokens.css              # Design Token SSOT
├── theme-midnight.css      # 深邃蓝黑主题（默认）
├── theme-warm-gray.css     # 暖灰主题
├── theme-parchment.css     # 羊皮纸浅色主题
├── theia-overrides.css     # Theia 变量覆盖层
├── ai-panel.css            # AI Panel 专属样式
├── welcome.css             # Welcome 页面样式
└── editor.css              # 编辑器样式
```

### 集成方式

1. 在 `writenow-core-frontend-module.ts` 中导入所有样式文件
2. 使用 CSS 变量覆盖 Theia 默认值
3. 组件样式通过 className 引用，减少内联样式

### Theia 变量覆盖策略

```css
:root {
    /* 映射 WriteNow Token 到 Theia 变量 */
    --theia-layout-color0: var(--wn-bg-app);
    --theia-layout-color1: var(--wn-bg-sidebar);
    --theia-editor-background: var(--wn-bg-editor);
    --theia-sideBar-background: var(--wn-bg-sidebar);
    --theia-activityBar-background: var(--wn-bg-app);
    --theia-border-color: var(--wn-border-subtle);
    /* ... 更多映射 ... */
}
```

## References

- 产品上游规范：`openspec/specs/writenow-spec/spec.md`
- 相关 Sprint 规范：`openspec/specs/sprint-1-editor/spec.md`、`openspec/specs/sprint-2-ai/spec.md`
- 设计灵感：Cursor、Linear、Notion、iA Writer
