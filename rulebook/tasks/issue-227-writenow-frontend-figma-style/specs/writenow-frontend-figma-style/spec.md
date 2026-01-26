# WriteNow Frontend — Figma style alignment (Issue #227)

## Purpose
为 `writenow-frontend/` 提供一套可验证的样式对齐要求，使其在不改变既有 RPC/状态管理/交互语义的前提下，与 `figma参考/` 的视觉基线一致。

## Requirements

### Requirement: Design tokens MUST match figma reference palette

`writenow-frontend/src/styles/tokens.css` 中与界面语义相关的变量（如 `--bg-primary`、`--border-default`、`--text-*`、`--accent-*`）MUST 与 `figma参考/src/styles/globals.css` 保持一致。

#### Scenario: App surfaces use figma palette
- **GIVEN** 应用使用默认主题与默认样式入口（包含 `tokens.css`）
- **WHEN** 应用在默认主题下渲染主界面（菜单栏/统计栏/ActivityBar/SidebarPanel/编辑器/AI 面板）
- **THEN** 主要背景、边框、文本与高亮颜色 MUST 与 `figma参考` 一致

### Requirement: Layout components MUST preserve behavior while matching figma visuals

`MenuBar`、`StatsBar`、`ActivityBar`、`SidebarPanel` 的布局与样式 MUST 对齐 `figma参考`，并且 MUST 保持既有 props/回调语义不变。

#### Scenario: Sidebar navigation remains functional
- **GIVEN** SidebarPanel 已渲染且具备可切换的视图内容
- **WHEN** 用户切换 ActivityBar 的视图入口
- **THEN** SidebarPanel 内容 MUST 正确切换，且不引入新的状态管理路径

### Requirement: AI panel MUST keep existing logic and present skill selection as cards

AI 面板 MUST 保留既有消息发送、取消、diff 预览与应用等逻辑，仅调整 SKILL/agent/model 控件与布局外观，使其符合 Figma 风格（网格卡片 SKILL + 选择器）。

#### Scenario: Skill selection stays functional
- **GIVEN** AI 面板已加载，且存在可选 SKILL
- **WHEN** 用户选择任一 SKILL
- **THEN** 输入框 MUST 被正确预填充，且原有发送/取消/diff 行为不变

### Requirement: Editor toolbar MUST expose mode + view toggles with figma styling

编辑器工具栏 MUST 提供 Markdown/Word 模式切换与 Edit/Preview/Split 视图切换，并在不影响 TipTap 编辑体验的前提下对齐 `figma参考/src/components/Editor.tsx` 的外观。

#### Scenario: Lint remains green
- **GIVEN** 依赖已安装
- **WHEN** 运行 `cd writenow-frontend && npm run lint`
- **THEN** 结果 MUST 通过（exit code 0）
