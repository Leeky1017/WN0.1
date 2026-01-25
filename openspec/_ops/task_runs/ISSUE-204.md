# ISSUE-204
- Issue: #204
- Branch: task/204-theia-frontend-complete
- PR: https://github.com/Leeky1017/WN0.1/pull/205

## Plan
- Phase 1: 布局调整（AI Panel 完整右侧、Outline 移至左侧 Activity Bar）
- Phase 2: 补齐后端服务（stats、snapshot、export）
- Phase 3: 补齐 UI 入口（编辑器工具栏、AI Panel 斜杠命令）

## Runs
### 2026-01-25 14:30 Worktree setup
- Command: `git worktree add -b "task/204-theia-frontend-complete" ".worktrees/issue-204-theia-frontend-complete" origin/main`
- Key output: `HEAD is now at d9c9522`
- Evidence: Worktree ready at `.worktrees/issue-204-theia-frontend-complete`

### 2026-01-25 14:45 Phase 1: Layout adjustments
- Changes:
  - `writenow-layout-contribution.ts`: Added toggle AI Panel command, Outline to left Activity Bar
  - `ai-panel-widget.tsx`: Added collapse button in header
  - `ai-panel.css`: Added collapse button styles
- Evidence: Layout now follows Cursor style (AI Panel full right, Outline in left sidebar)

### 2026-01-25 15:00 Phase 2: Backend services
- Created:
  - `stats-service.ts`: stats:getToday, stats:getRange, stats:increment
  - `snapshot-service.ts`: file:snapshot:latest, file:snapshot:write
  - `export-service.ts`: export:markdown, export:docx, export:pdf
- Updated:
  - `writenow-core-backend-module.ts`: Bound new services
  - `writenow-backend-service.ts`: Registered IPC handlers
- Evidence: All 8 IPC channels now available in Theia

### 2026-01-25 15:15 Phase 3: UI enhancements
- Updated `editor-toolbar.tsx`:
  - Added FormatModeToggle (MD/Word)
  - Added ViewModeToggle (Edit/Preview/Split)
  - Added WordCountDisplay (字数 + 阅读时长)
- Updated `editor.css`: New toggle and stats styles
- Evidence: Toolbar now matches Cursor-style feature set
