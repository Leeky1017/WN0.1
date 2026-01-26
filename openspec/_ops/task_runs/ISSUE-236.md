# ISSUE-236
- Issue: #236
- Branch: task/236-frontend-phase1-mock-elimination
- PR: <fill-after-created>

## Plan
- Task 1.1: StatsView 接入 stats:getToday/getRange API
- Task 1.2: HistoryView 接入 version:list API
- Task 1.3: OutlineView 增强（点击跳转）
- Task 1.4: ActivityBar 隐藏未实现功能

## Runs
### 2026-01-26 12:00 worktree-setup
- Command: `git worktree add -b "task/236-frontend-phase1-mock-elimination" ".worktrees/issue-236-frontend-phase1" origin/main`
- Key output: `HEAD is now at 21f24a6 feat: add version history to sidebar panel (#234) (#235)`
- Evidence: `.worktrees/issue-236-frontend-phase1/`

### 2026-01-26 12:15 task-1.1-statsview
- StatsView.tsx 接入 stats:getToday/getRange API
- 移除所有 Mock 数据，改用真实后端数据
- 添加 loading/error 状态处理
- 添加 data-testid 属性
- Evidence: `writenow-frontend/src/features/sidebar/StatsView.tsx`

### 2026-01-26 12:25 task-1.2-historyview
- HistoryView.tsx 接入 version:list API
- 移除 mockVersions，改用真实版本历史
- 添加预览/恢复功能
- 添加 data-testid 属性
- Evidence: `writenow-frontend/src/features/sidebar/HistoryView.tsx`

### 2026-01-26 12:30 task-1.3-outlineview
- OutlineView.tsx 增强：点击标题跳转到编辑器对应位置
- 使用 TipTap setTextSelection + scrollIntoView
- 添加 data-testid 属性
- Evidence: `writenow-frontend/src/features/sidebar/OutlineView.tsx`

### 2026-01-26 12:35 task-1.4-activitybar
- ActivityBar.tsx 隐藏未实现功能（workflow/materials/publish）
- SidebarPanel.tsx 同步移除对应视图
- SidebarView 类型精简为 5 个已实现视图
- 添加 data-testid 属性
- Evidence: `writenow-frontend/src/components/layout/ActivityBar.tsx`, `writenow-frontend/src/components/layout/SidebarPanel.tsx`

### 2026-01-26 12:40 validation
- Command: `npm run lint && npx tsc --noEmit && npm run build`
- Key output: `lint: no errors`, `tsc: no errors`, `vite build: ✓ built in 3.65s`
- Evidence: `dist/`
