# FRONTEND-P1-001: 布局重构（消除“三明治陷阱” + 可拖拽面板）

Status: done
Issue: #86
PR: <fill-after-created>
RUN_LOG: openspec/_ops/task_runs/ISSUE-86.md

## Goal

重构主界面布局为四栏贯穿结构，并提供可拖拽调整 Sidebar/AIPanel 宽度与折叠状态持久化，最大化编辑区垂直空间。

## Dependencies

- `FRONTEND-P0-003`（WnResizable/WnPanel 等封装可复用）

## Expected File Changes

- Update: `src/App.tsx`（布局树重构）
- Update/Add: `src/stores/layoutStore.ts`（面板宽度/折叠状态持久化）
- Update: `src/components/Sidebar/`、`src/components/AI/`（适配新布局容器）
- Add: `tests/e2e/frontend-layout-panels.spec.ts`

## Acceptance Criteria

- [x] Sidebar 与 AIPanel 从顶部贯穿到底部（不再被顶部横条切断）
- [x] 用户可拖拽调整 Sidebar/AIPanel 宽度（min/max 生效）并在重启后恢复
- [x] 小屏幕下有明确降级策略（自动折叠/隐藏，并可一键恢复）

## Tests

- [x] Playwright E2E：拖拽调整面板宽度 → 重启应用 → 宽度恢复
