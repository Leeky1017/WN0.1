# Proposal: issue-57-governance-agents-workflow-spec

## Why
WriteNow 当前治理规范存在三个直接风险：
1) 约束不够硬：agent 可能不记录 run log / 不标记任务卡，导致交付不可追溯、不可复现；
2) 核心规范漂移：`openspec/specs/writenow-spec/spec.md` 与实际实现进度脱节，路线图失去基线价值；
3) 防御性编程约束不清：IPC 边界若允许 silent failure/无错误码，会在渲染层形成难排障的“黑洞”。

## What Changes
- 升级 `AGENTS.md`：新增/强化代码原则、异常与防御性编程、工作留痕流程、禁止事项（全部 MUST）。
- 更新 `openspec/specs/writenow-spec/spec.md`：同步路线图与当前进度，补齐 Sprint 2A/2B/2.5 与 IPC 契约自动化状态，并加入对 `AGENTS.md` 的引用。
- 加固 CI 守卫：增强 `openspec-log-guard` 对 run log 的格式与 PR 链接完整性校验，提升治理约束力。

## Impact
- Affected docs: `AGENTS.md`, `openspec/specs/writenow-spec/spec.md`
- Affected workflow: `.github/workflows/openspec-log-guard.yml`
- Breaking change: NO（治理门禁更严格，但不改变运行时代码行为）
- User benefit: 交付可追溯、规范不漂移、失败语义清晰、审计成本降低
