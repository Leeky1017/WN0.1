# CONTEXT-P0-003: TokenBudgetManager（预算分配 + 裁剪 + 证据）

## Goal

实现 TokenBudgetManager：按层预算分配与严格执行，保证任何请求不超出 token limit；裁剪必须语义安全且可解释（输出 removed/compressed 证据）。

## Dependencies

- `openspec/specs/sprint-2.5-context-engineering/spec.md`
- `openspec/specs/sprint-2.5-context-engineering/task_cards/p0/CONTEXT-P0-001-context-types-and-contracts.md`

## Expected File Changes

- Add: `src/lib/context/token-estimator.ts`（模型无关的 TokenEstimator 契约 + 默认实现）
- Add: `src/lib/context/budget.ts`（TokenBudgetManager）
- Add: `src/lib/context/budget.test.ts`（vitest：裁剪顺序/边界/确定性）
- Add: `tests/e2e/sprint-2.5-context-engineering-budget.spec.ts`

## Acceptance Criteria

- [ ] 预算超标率 0%：任何 assembled prompt 都不得超过 `totalLimit`
- [ ] 裁剪顺序符合 spec：优先删除 Retrieved → 压缩/精简 Settings → 缩小 Immediate；选区与用户指令不得被丢弃
- [ ] 禁止硬截断句子；裁剪按 chunk/段落边界进行
- [ ] 输出裁剪证据（删了哪些 chunk、原因、节省 token）并可被 UI 展示

## Tests

- [ ] Vitest：覆盖边界（空 chunks、单 chunk 超大、预算为 0、混合层级、多次运行结果一致）
- [ ] Playwright E2E：构造超长 Retrieved + Settings → 触发上下文预览 → 断言显示裁剪摘要与 per-layer used/budget

## Effort Estimate

- M（2 天）

