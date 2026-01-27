## 1. Implementation
- [ ] 1.1 Add plan file `.cursor/plans/memos_设计借鉴方案_fed49a61.plan.md`
- [ ] 1.2 Ensure the plan states it supplements `openspec/specs/sprint-ai-memory/spec.md` (spec remains SSOT)
- [ ] 1.3 Add a non-normative reference note in `openspec/specs/sprint-ai-memory/spec.md`
- [ ] 1.4 Add RUN_LOG `openspec/_ops/task_runs/ISSUE-283.md`

## 2. Validation
- [ ] 2.1 Run `npx -y @fission-ai/openspec@0.17.2 validate --specs --strict --no-interactive`
- [ ] 2.2 Run `rulebook task validate issue-283-memos-plan`

## 3. Delivery
- [ ] 3.1 Open PR with body containing `Closes #283`
- [ ] 3.2 Ensure required checks green + auto-merge enabled
