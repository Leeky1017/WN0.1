# FRONTEND-P2-002: TabBar + Toolbar 合并一行 + 真多标签

## Goal

合并 TabBar 与 Toolbar 到单行，减少垂直空间浪费，并实现真正多标签（打开/切换/关闭/排序/溢出处理），确保状态一致与可恢复。

## Dependencies

- `FRONTEND-P1-001`（布局稳定）

## Expected File Changes

- Update/Add: `src/components/Editor/TabToolbar.tsx`
- Update: `src/stores/editorStore.ts`（tab state：openTabs/activeTabId/dirtyMap/scrollMap）
- Update: `src/components/Editor/`（适配新顶部条）
- Add: `tests/e2e/frontend-editor-tabs.spec.ts`

## Acceptance Criteria

- [x] 多标签可用：打开多个文档后可切换与关闭；未保存内容不会被静默丢弃
- [x] TabBar 支持拖拽排序与溢出策略（可滚动/折叠菜单）
- [x] 右键菜单提供常用操作（关闭/关闭其他/关闭已保存）

## Tests

- [x] Playwright E2E：打开 A/B 文档 → 在 A 输入但不保存 → 切换到 B → 再切回 A → 内容仍在且 dirty 状态正确 → 关闭 A 时有明确提示策略
