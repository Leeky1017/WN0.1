# Tasks: ISSUE-271 — Sprint Open Source Optimization (spec conversion)

> Scope source of truth:
> - `.cursor/plans/wn_open_source_optimization_c81686d6.plan.md`
> - `openspec/specs/sprint-open-source-opt/spec.md`

## 1. Implementation
- [ ] 1.1 生成 `openspec/specs/sprint-open-source-opt/spec.md`（MUST/SHOULD + Scenarios；章节三仅引用 `sprint-ai-memory`）
- [ ] 1.2 生成 `openspec/specs/sprint-open-source-opt/design/00–05`（架构图/选型/代码示例）
- [ ] 1.3 生成 `openspec/specs/sprint-open-source-opt/task_cards/index.md` + P0–P3 任务卡（元信息/前置/清单/验收/产出）

## 2. Testing (must run; no fake)
- [ ] 2.1 `openspec validate --specs --strict --no-interactive`
- [ ] 2.2 `rulebook task validate issue-271-sprint-open-source-opt`

## 3. Documentation / Governance
- [ ] 3.1 RUN_LOG：`openspec/_ops/task_runs/ISSUE-271.md`（记录关键命令、关键输出与证据路径）
- [ ] 3.2 PR body 包含 `Closes #271`；开启 auto-merge 并确认 required checks 全绿
