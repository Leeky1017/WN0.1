# CONTEXT-P2-012: KV-Cache 命中优化与性能指标

## Goal

通过可观测指标推动优化：稳定前缀 hash、组装耗时统计、Rules/Settings 缓存命中与裁剪率；确保组装延迟 < 50ms，并能量化 KV-Cache 友好性。

## Dependencies

- `openspec/specs/sprint-2.5-context-engineering/task_cards/p1/CONTEXT-P1-007-prompt-template-system.md`
- `openspec/specs/sprint-2.5-context-engineering/task_cards/p0/CONTEXT-P0-004-context-assembler.md`

## Expected File Changes

- Add: `src/lib/context/metrics.ts`（prefix hash / latency / cache stats）
- Update: `src/lib/context/assembler.ts`（埋点与返回可视化字段）
- Update: `src/components/AI/ContextViewer.tsx`（展示 prefix hash 与耗时）
- Add: `src/lib/context/metrics.test.ts`
- Add: `tests/e2e/sprint-2.5-context-engineering-metrics.spec.ts`

## Acceptance Criteria

- [ ] ContextAssembler 返回 prefix hash（或等价证据）用于判断稳定前缀是否变化
- [ ] 记录并展示组装耗时（不含模型推理），并在 E2E 中可被断言
- [ ] 缓存命中/裁剪率有可读输出（用于持续优化）

## Tests

- [ ] Playwright E2E：连续两次触发上下文预览 → 断言 prefix hash 在规则未变时保持一致；断言组装耗时被记录并显示

## Effort Estimate

- S-M（1–2 天）

