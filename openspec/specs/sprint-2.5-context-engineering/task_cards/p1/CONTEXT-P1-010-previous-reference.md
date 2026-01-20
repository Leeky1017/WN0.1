# CONTEXT-P1-010: “像上次那样” 引用检索与注入

## Goal

在用户指令包含“像上次/之前那样”等引用时，检索相关历史对话摘要与偏好信号并注入 Retrieved 层，避免模型丢失用户偏好与历史策略。

## Dependencies

- `openspec/specs/sprint-2.5-context-engineering/task_cards/p1/CONTEXT-P1-009-conversation-summary.md`
- `openspec/specs/sprint-2.5-context-engineering/task_cards/p0/CONTEXT-P0-004-context-assembler.md`
- `openspec/specs/sprint-2.5-context-engineering/task_cards/p0/CONTEXT-P0-003-token-budget-manager.md`

## Expected File Changes

- Add: `src/lib/context/previous-reference.ts`
- Update: `src/lib/context/assembler.ts`（Retrieved 层注入历史引用 chunk）
- Add: `src/lib/context/previous-reference.test.ts`
- Add: `tests/e2e/sprint-2.5-context-engineering-previous-reference.spec.ts`

## Acceptance Criteria

- [ ] 检索优先按 `articleId` 与最近对话；若无历史则无副作用
- [ ] 注入内容必须可追溯（引用了哪个对话 id/摘要）并可在 ContextViewer 中展示
- [ ] 注入严格受 TokenBudgetManager 约束；超预算时按 Retrieved 优先级裁剪并给出证据

## Tests

- [ ] Playwright E2E：先完成一次对话并生成摘要 → 新请求输入“像上次那样” → 打开上下文预览 → 断言引用摘要 chunk 存在且来源正确

## Effort Estimate

- M（2 天）

