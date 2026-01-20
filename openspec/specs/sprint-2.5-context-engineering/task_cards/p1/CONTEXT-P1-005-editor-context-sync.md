# CONTEXT-P1-005: EditorContextSync（编辑器即时上下文同步）

## Goal

把编辑器的选区/光标/段落/前后文实时同步到 Store，形成 Immediate 层的唯一事实源，并提供 debounce 保障性能。

## Dependencies

- `openspec/specs/sprint-1-editor/spec.md`（编辑器能力基础）
- `openspec/specs/sprint-2.5-context-engineering/task_cards/p0/CONTEXT-P0-001-context-types-and-contracts.md`

## Expected File Changes

- Add: `src/stores/editorContextStore.ts`
- Update: `src/stores/editorStore.ts`（暴露必要的 selection/cursor 信息或桥接）
- Update: `src/components/Editor/`（TipTap 事件订阅：selectionUpdate/transaction 等）
- Add: `tests/e2e/sprint-2.5-context-engineering-editor-context.spec.ts`

## Acceptance Criteria

- [ ] 选区变化、光标移动、段落变更能够在 200ms（默认）内同步到 Store（可配置）
- [ ] 同步不会导致编辑器卡顿；高频光标移动不产生明显掉帧
- [ ] Immediate 层至少能提供：selectedText、currentParagraph、before/after N 段（N 可配置）

## Tests

- [ ] Playwright E2E：输入多段文本 → 选中/移动光标 → 触发上下文预览 → 断言 Immediate 内容与 UI 中所见一致

## Effort Estimate

- M（2 天）

