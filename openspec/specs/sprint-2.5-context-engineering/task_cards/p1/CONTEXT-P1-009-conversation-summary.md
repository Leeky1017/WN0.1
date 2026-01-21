# CONTEXT-P1-009: 对话摘要生成（可恢复压缩）

Status: done
Issue: #60
PR: https://github.com/Leeky1017/WN0.1/pull/62
RUN_LOG: openspec/_ops/task_runs/ISSUE-60.md

## Goal

为每次对话生成可注入的摘要，并写回 `.writenow/conversations/index.json`：上下文注入默认只用摘要，不用全量对话；同时保留 fullPath 以便恢复与审计。

## Dependencies

- `openspec/specs/sprint-2.5-context-engineering/task_cards/p1/CONTEXT-P1-008-conversation-history-persistence.md`
- `openspec/specs/sprint-2-ai/spec.md`（AI 调用通道，可复用生成摘要）

## Expected File Changes

- Update: `src/lib/context/conversation.ts`（summary pipeline + schema）
- Add: `src/lib/context/conversation-summary.ts`
- Add: `src/lib/context/conversation-summary.test.ts`
- Add: `tests/e2e/sprint-2.5-context-engineering-conversation-summary.spec.ts`

## Acceptance Criteria

- [x] 对话结束后生成结构化摘要并写回索引（不得阻塞主写作流，可后台执行）
- [x] AI 不可用时必须降级为启发式摘要，并在索引中标注质量等级
- [x] 摘要注入必须在 TokenBudgetManager 的 Retrieved 预算内可控

## Tests

- [x] Playwright E2E：触发对话并结束 → 等待索引更新 → 断言 summary 非空且包含对话关键信息；模拟 AI 不可用时仍生成 fallback 摘要并标记 quality

## Effort Estimate

- M（2 天）
