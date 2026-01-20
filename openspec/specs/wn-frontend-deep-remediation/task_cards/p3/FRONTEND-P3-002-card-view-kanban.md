# FRONTEND-P3-002: 卡片/看板视图（Scrivener 风格，未来方向）

## Goal

为创作者提供“构思逻辑”管理视图：卡片模式排列章节/场景，支持拖拽排序、状态标记与概要展示，作为未来长篇创作引擎的入口之一。

## Dependencies

- `FRONTEND-P1-001`（布局体系）
- `FRONTEND-P0-003`（WN 组件层：Card/DragDrop/Panel）

## Expected File Changes

- Add: `src/components/wn/WnCard.tsx`
- Add: `src/components/Sidebar/WnCardView.tsx`
- Update: `src/stores/projectStore.ts`（章节/卡片元数据）
- Add: `tests/e2e/frontend-card-view.spec.ts`

## Acceptance Criteria

- [ ] 卡片视图可展示章节列表（标题/概要/状态），支持拖拽排序并持久化
- [ ] 从卡片进入编辑器时定位正确章节，返回视图状态不丢失

## Tests

- [ ] Playwright E2E：进入卡片视图 → 拖拽排序 → 重启 → 顺序保持

