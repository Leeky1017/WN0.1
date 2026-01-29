# P0-006: 大纲编辑（保存 + 拖拽重排）

Status: pending

## Goal

把当前只读的 Outline 面板升级为可编辑：支持新增/编辑/删除节点、拖拽重排，并通过 `outline:save` 持久化（`outline:get` 可回读一致结果）。

## Dependencies

- `openspec/specs/writenow-frontend-gap-analysis/spec.md`
- `openspec/specs/writenow-frontend-gap-analysis/design/02-p0-feature-entrypoints.md`
- `openspec/specs/api-contract/spec.md`

## Expected File Changes

| 操作 | 文件路径 |
|------|---------|
| Update | `writenow-frontend/src/features/outline/OutlinePanel.tsx` |
| Update | `writenow-frontend/src/features/outline/useOutline.ts` |
| Add | `writenow-frontend/src/features/outline/outlineDnd.ts`（或等价实现） |
| Add | `writenow-frontend/tests/e2e/write-mode/outline-edit-save.spec.ts` |

## Acceptance Criteria

- [ ] Outline 面板支持进入“编辑模式”（显式按钮或切换）
- [ ] 支持节点编辑：
  - [ ] 新增节点（同级/子级最小可用）
  - [ ] 重命名节点
  - [ ] 删除节点（含二次确认或撤销机制其一）
- [ ] 支持拖拽重排：
  - [ ] 至少支持同一层级内 reorder
  - [ ] 拖拽后树结构仍合法（不产生环/非法层级）
- [ ] 保存：
  - [ ] 调用 `outline:save` 并展示保存成功/失败状态
  - [ ] 刷新或重启后，`outline:get` 返回与保存一致的结构
- [ ] 与编辑器跳转兼容：
  - [ ] 点击节点仍能跳转到对应标题（现有行为不回退）

## Tests

- [ ] Playwright E2E：打开文档 → 打开 Outline → 新增节点 → 保存 → 重新加载 Outline → 节点仍存在
- [ ] Playwright E2E：拖拽重排后保存 → 重新加载 → 顺序保持

