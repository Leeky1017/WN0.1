# CONTEXT-P2-012: KV-Cache 命中优化与性能指标

Status: done
Issue: #69
PR: https://github.com/Leeky1017/WN0.1/pull/72
RUN_LOG: openspec/_ops/task_runs/ISSUE-69.md

## Goal

通过可观测指标推动优化：稳定前缀 hash、组装耗时统计、Rules/Settings 缓存命中与裁剪率；确保组装延迟 < 50ms，并能量化 KV-Cache 友好性。

## Dependencies

- `openspec/specs/sprint-2.5-context-engineering/task_cards/p1/CONTEXT-P1-007-prompt-template-system.md`
- `openspec/specs/sprint-2.5-context-engineering/task_cards/p0/CONTEXT-P0-004-context-assembler.md`

## Expected File Changes

- Update: `src/types/context.ts`（AssembleResult 增加 metrics 字段）
- Update: `src/lib/context/assembler.ts`（计算 prefix hash / assemble latency / settings prefetch hit）
- Update: `src/components/AI/ContextDebugPanel.tsx`（展示 prefix hash 与耗时与 cache 命中）
- Add: `tests/e2e/sprint-2.5-context-engineering-metrics.spec.ts`

## Acceptance Criteria

- [x] ContextAssembler 返回 prefix hash（或等价证据）用于判断稳定前缀是否变化
- [x] 记录并展示组装耗时（不含模型推理），并在 E2E 中可被断言
- [x] 缓存命中/裁剪率有可读输出（用于持续优化）

## Tests

- [x] Playwright E2E：连续两次触发上下文预览 → 断言 prefix hash 在规则未变时保持一致；断言组装耗时被记录并显示

## Effort Estimate

- S-M（1–2 天）
