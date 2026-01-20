# CONTEXT-P2-011: ContextViewer UI（上下文可视化调试）

## Goal

实现 ContextViewer：在 AI 面板中展示 assembled prompt（systemPrompt/userContent）与分层 chunks，并提供 per-layer token 统计与裁剪证据，让用户可理解“发送了什么/为什么变了”。

## Dependencies

- `openspec/specs/sprint-2.5-context-engineering/task_cards/p0/CONTEXT-P0-004-context-assembler.md`
- `openspec/specs/sprint-2.5-context-engineering/task_cards/p0/CONTEXT-P0-003-token-budget-manager.md`

## Expected File Changes

- Add: `src/components/AI/ContextViewer.tsx`
- Update: `src/components/AI/`（在 AI 面板中接入 viewer 入口）
- Add: `tests/e2e/sprint-2.5-context-engineering-context-viewer.spec.ts`

## Acceptance Criteria

- [ ] ContextViewer 支持按层级分区展示（Rules/Settings/Retrieved/Immediate）
- [ ] 展示 per-layer used/budget + total used/limit，并能显示裁剪摘要（removed/compressed）
- [ ] 每个 chunk 展示来源（source）与 tokenCount；支持复制完整 prompt
- [ ] 对敏感信息（API key 等）必须脱敏显示

## Tests

- [ ] Playwright E2E：触发上下文预览 → 展开 viewer → 断言分层、token 统计、来源可见；验证脱敏规则生效

## Effort Estimate

- M（2 天）

