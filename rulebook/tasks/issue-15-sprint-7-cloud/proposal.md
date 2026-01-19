# Proposal: issue-15-sprint-7-cloud

## Why
Sprint 7（云服务，3 周）进入规划阶段，需要将范围（Supabase Auth / Stripe Subscription / Cloud Sync / Pro Feature Gate）沉淀为可执行、可验收的规范与任务卡，作为后续实现与评审的单一事实来源（spec-first）。

## What Changes
- 新增 `openspec/specs/sprint-7-cloud/spec.md`：Sprint 7 的 Purpose/Requirements/Scenarios
- 新增 `openspec/specs/sprint-7-cloud/tasks/*.md`：5 张任务卡（认证/订阅/同步核心/冲突处理/权限控制）
- 新增 `openspec/_ops/task_runs/ISSUE-15.md`：本次交付 Run Log

## Impact
- Affected specs: `openspec/specs/sprint-7-cloud/spec.md`
- Affected code: None（docs-only）
- Breaking change: NO
- User benefit: 交付范围与验收口径清晰，降低实现阶段返工与范围漂移
