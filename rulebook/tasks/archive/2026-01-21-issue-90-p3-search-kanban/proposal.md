# Proposal: issue-90-p3-search-kanban

## Why
当前 Sidebar 搜索仅有输入框占位，没有全文/语义检索、结果高亮与命中导航；同时缺少“章节/场景”层面的可视化管理视图（卡片/看板），导致项目规模增长后内容发现与结构管理效率显著下降。

## What Changes
- Sidebar Search：接入 `search:fulltext`（FTS5）与 `search:semantic`（sqlite-vec），统一入口（同一输入框 + 模式切换），结果高亮、相关性排序与命中导航（上/下一处）。
- Card View：新增 `WnCard` 与 `WnCardView`，以卡片形式展示章节列表，支持拖拽排序、状态标记并持久化；从卡片进入编辑器定位正确章节且返回时视图状态不丢失。
- Tests：新增 Playwright E2E 覆盖搜索命中与导航、卡片拖拽排序与重启持久化。

## Impact
- Affected specs: `openspec/specs/wn-frontend-deep-remediation/task_cards/p3/FRONTEND-P3-001-search-fulltext-and-semantic.md`, `openspec/specs/wn-frontend-deep-remediation/task_cards/p3/FRONTEND-P3-002-card-view-kanban.md`
- Affected code: `electron/ipc/search.cjs`, `src/components/sidebar-views/*`, `src/components/wn/*`, `src/stores/*`, `tests/e2e/*`
- Breaking change: NO（新增视图与能力；search IPC 增强按 project 过滤与高亮片段输出）
- User benefit: 更快定位内容（全文+语义），并用卡片视图管理章节结构与进度，提升长文写作可控性与心流。
