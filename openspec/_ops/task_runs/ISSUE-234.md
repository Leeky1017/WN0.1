# ISSUE-234
- Issue: #234
- Branch: task/234-sidebar-history
- PR: https://github.com/Leeky1017/WN0.1/pull/235

## Goal
将版本历史功能集成到侧边栏，与文件和编辑动作联动

## Plan
- 在 ActivityBar 添加版本历史图标
- 创建 HistoryView 组件
- 在 SidebarPanel 中添加 history 视图支持

## Runs
### 2026-01-26 15:58 实现
- Command: `vim writenow-frontend/src/components/layout/ActivityBar.tsx`
- 添加 History 图标和 'history' 视图类型
- Command: `vim writenow-frontend/src/features/sidebar/HistoryView.tsx`
- 创建版本历史组件，支持显示版本列表、时间、字数
- Command: `vim writenow-frontend/src/components/layout/SidebarPanel.tsx`
- 添加 history 视图渲染
- Command: `npm run build`
- Key output: `✓ built in 6.04s`
- Evidence: 浏览器截图显示版本历史图标和面板
