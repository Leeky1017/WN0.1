# ISSUE-230
- Issue: #230
- Branch: task/230-ui-rendering-fix
- PR: https://github.com/Leeky1017/WN0.1/pull/231

## Goal
- 修复 UI 渲染问题：FlexLayout 定位错误导致覆盖 MenuBar/StatsBar/ActivityBar/SidebarPanel
- 修复 FilesView 运行时错误：在 LayoutApiProvider 外部调用 useLayoutApi()

## Plan
- 添加 `relative` 到 FlexLayout 父容器修复绝对定位问题
- 移除 FilesView 中的 useLayoutApi() 调用，改用 props 传递的回调

## Runs
### 2026-01-26 15:20 问题诊断
- 发现 FlexLayout 的 `.flexlayout__layout` 类使用 `position: absolute` + `inset: 0`
- 父容器没有 `position: relative`，导致 FlexLayout 相对于 viewport 定位覆盖整个页面
- FilesView 在 SidebarPanel 中渲染，但 SidebarPanel 在 LayoutApiProvider 外部

### 2026-01-26 15:25 修复
- Command: `vim writenow-frontend/src/App.tsx` 添加 `relative` 到 FlexLayout 父容器
- Command: `vim writenow-frontend/src/features/sidebar/FilesView.tsx` 移除 `useLayoutApi()` 调用
- Command: `npm run build`
- Key output: `✓ built in 4.71s`
- Evidence: 浏览器截图显示完整 UI（MenuBar/StatsBar/ActivityBar/SidebarPanel 均可见）
