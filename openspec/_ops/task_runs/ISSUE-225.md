# ISSUE-225

- Issue: #225
- Branch: task/225-figma-style
- PR: https://github.com/Leeky1017/WN0.1/pull/226

## Plan

- 更新 CSS 变量（tokens.css）添加 Figma 参考配色
- 创建新布局组件（MenuBar/StatsBar/ActivityBar/SidebarPanel）+ 7 个 sidebar-views
- 改造 App.tsx 布局结构 + FlexLayout 配置
- 改造 AIPanel 样式（SKILL 网格卡片 + 选择器）
- 添加编辑器工具栏（Markdown/Word + Edit/Preview/Split）
- 验证 npm run lint 通过

## Runs

### 2026-01-26 Phase 1-6 实现

- Command: `npm run lint`
- Key output: `Exit code: 0` (lint 通过)
- Evidence: 
  - `writenow-frontend/src/styles/tokens.css` - CSS 变量更新
  - `writenow-frontend/src/components/layout/MenuBar.tsx` - 顶部菜单栏
  - `writenow-frontend/src/components/layout/StatsBar.tsx` - 统计栏
  - `writenow-frontend/src/components/layout/ActivityBar.tsx` - 左侧图标导航
  - `writenow-frontend/src/components/layout/SidebarPanel.tsx` - 侧边栏容器
  - `writenow-frontend/src/features/sidebar/` - 7 个 sidebar-views
  - `writenow-frontend/src/App.tsx` - 布局重构
  - `writenow-frontend/src/components/layout/layout-config.ts` - FlexLayout 配置更新
  - `writenow-frontend/src/features/ai-panel/AIPanel.tsx` - AI 面板改造
  - `writenow-frontend/src/components/editor/EditorToolbar.tsx` - 编辑器工具栏
