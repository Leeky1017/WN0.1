# FRONTEND-P0-003: 建立 `src/components/wn/` 封装层（WnPanel/WnButton/WnInput/WnResizable…）

Status: done
Issue: #86
PR: <fill-after-created>
RUN_LOG: openspec/_ops/task_runs/ISSUE-86.md

## Goal

建立 WN 专属组件封装层，统一密度、圆角、阴影、交互与可访问性，替换现有“手搓 div + 硬编码样式”的碎片化实现。

## Dependencies

- `FRONTEND-P0-001`（token 体系）

## Expected File Changes

- Add: `src/components/wn/`（WN 组件目录）
- Add: `src/components/wn/WnPanel.tsx`
- Add: `src/components/wn/WnButton.tsx`
- Add: `src/components/wn/WnInput.tsx`
- Add: `src/components/wn/WnResizable.tsx`（封装 resizable-panels 或等价方案）
- Update: `src/components/Sidebar/Sidebar.tsx`（优先替换 Panel/Input/Button）
- Update: `src/components/AI/AIPanel.tsx`（优先替换 Panel/Input/Button）

## Acceptance Criteria

- [x] `Wn*` 组件 props 命名一致，且默认密度/圆角/阴影来自 tokens（禁止重复定义）
- [x] Sidebar/AIPanel 至少完成第一批迁移：移除显著的硬编码颜色与重复布局代码
- [x] 组件具备可访问性语义（role/label），便于 E2E 稳定定位

## Tests

- [x] 更新/新增 Playwright E2E，覆盖 Sidebar/AIPanel 在迁移后仍可完成核心交互（打开文档、发送消息等）
