# ISSUE-227
- Issue: #227
- Branch: task/227-writenow-frontend-figma-style
- PR: https://github.com/Leeky1017/WN0.1/pull/228

## Goal
- 按 `figma参考/` 的设计参考改造 `writenow-frontend/` 样式；保留现有 RPC 连接与状态管理，仅调整样式与布局外观。

## Plan
- 对齐 tokens 与布局组件（MenuBar / StatsBar / ActivityBar / SidebarPanel）的视觉基线
- 按 Figma 参考改造 AI 面板与编辑器工具栏样式（不改交互逻辑）
- 跑 `npm run lint`（writenow-frontend）并修到全绿；提交 PR 并启用 auto-merge

## Runs
### 2026-01-26 11:57 Issue + worktree
- Command: `gh issue create -t "writenow-frontend: 按 Figma 参考改造整体样式" ...`
- Key output: `https://github.com/Leeky1017/WN0.1/issues/227`
- Command: `git worktree add -b task/227-writenow-frontend-figma-style .worktrees/issue-227-writenow-frontend-figma-style origin/main`
- Key output: `Preparing worktree (new branch 'task/227-writenow-frontend-figma-style')`
- Command: `rulebook task create issue-227-writenow-frontend-figma-style`
- Key output: `created successfully`

### 2026-01-26 12:03 Install (writenow-frontend)
- Command: `cd writenow-frontend && npm ci`
- Key output: `added 693 packages, and audited 694 packages in 11s`

### 2026-01-26 12:04 Lint (writenow-frontend)
- Command: `cd writenow-frontend && npm run lint`
- Key output: `exit 0`

### 2026-01-26 12:05 Build (writenow-frontend)
- Command: `cd writenow-frontend && npm run build`
- Key output: `✓ built in 3.52s`
- Evidence:
  - Fixed TS error: `FilesView.tsx(238,9) RefObject<HTMLDivElement | null> ...` → updated `useElementSize` return type

### 2026-01-26 12:07 PR
- Command: `git push -u origin HEAD`
- Key output: `new branch -> task/227-writenow-frontend-figma-style`
- Command: `gh pr create ...`
- Key output: `https://github.com/Leeky1017/WN0.1/pull/228`
