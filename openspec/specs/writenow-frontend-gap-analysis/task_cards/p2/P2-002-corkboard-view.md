# P2-002: Corkboard 索引卡视图（基于 Outline）

Status: pending

## Goal

交付 Scrivener 风格的 Corkboard（索引卡）视图，帮助用户用卡片组织章节/场景，并与 Outline 保持单一数据源（SSOT）：复用 `OutlineNode.title/summary/status`，通过 `outline:save` 持久化，避免双栈。

## Dependencies

- `openspec/specs/writenow-frontend-gap-analysis/spec.md`
- `openspec/specs/writenow-frontend-gap-analysis/design/05-p2-professional-writing-features.md`
- `openspec/specs/writenow-frontend-gap-analysis/task_cards/p0/P0-006-outline-save-and-dnd.md`（Outline 先可编辑/可保存）

## Expected File Changes

| 操作 | 文件路径 |
|------|---------|
| Add | `writenow-frontend/src/features/outline/CorkboardView.tsx`（或独立 feature） |
| Update | `writenow-frontend/src/features/outline/OutlinePanel.tsx`（增加视图切换：Outline ↔ Corkboard） |
| Update | `writenow-frontend/src/features/outline/useOutline.ts`（确保 summary/status 保存回写） |
| Add | `writenow-frontend/tests/e2e/write-mode/corkboard.spec.ts` |

## Acceptance Criteria

- [ ] Outline 面板提供 Corkboard 视图入口（按钮/切换器），且可通过键盘可达
- [ ] Corkboard 视图展示卡片网格：
  - [ ] 卡片内容至少包含：标题（title）+ 摘要（summary，可为空）+ 状态（status，可选）
- [ ] 拖拽重排：
  - [ ] 至少支持同层级卡片 reorder
  - [ ] 重排后通过 `outline:save` 持久化，并能回读一致结果
- [ ] 与正文联动（最小可用）：
  - [ ] 点击卡片可跳转到正文对应标题（复用现有跳转逻辑）

## Tests

- [ ] Playwright E2E：打开 Corkboard → 创建/编辑一张卡片摘要 → 保存 → 刷新后仍存在
- [ ] Playwright E2E：拖拽重排后保存 → 刷新后顺序保持

