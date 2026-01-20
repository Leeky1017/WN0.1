# Proposal: issue-34-frontend-deep-remediation

## Why
基于 `CODEX_TASK前端探讨.md` 与 `docs/WN前端探讨.md` 的审计反馈，当前 WriteNow 前端存在“设计系统缺失 + 布局割裂 + 交互层级不清晰 + 技术债务与质量门禁不足”等问题，导致整体观感偏“原型/糖果味”，难以支撑专业创作者长时间沉浸写作。本变更以 spec-first 的方式建立可验证的前端深度修复规范与任务卡片，作为后续实现与验收的统一基线。

## What Changes
- Add OpenSpec: `openspec/specs/wn-frontend-deep-remediation/spec.md`
- Add module design docs: `openspec/specs/wn-frontend-deep-remediation/design/*`
- Add executable task cards: `openspec/specs/wn-frontend-deep-remediation/task_cards/**`
- Add task run log: `openspec/_ops/task_runs/ISSUE-34.md`

## Impact
- Affected specs: `openspec/specs/wn-frontend-deep-remediation/spec.md` (new)
- Affected code: None (spec-only)
- Breaking change: NO
- User benefit: 明确前端修复目标与验收标准，降低实现漂移与回归风险，为后续 UI/UX/DX 迭代提供可执行路线图与质量门禁。
