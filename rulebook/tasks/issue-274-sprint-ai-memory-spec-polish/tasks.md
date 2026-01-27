## 1. Implementation
- [ ] 1.1 Refine `openspec/specs/sprint-ai-memory/spec.md` (schema/units/mapping/validation signals)
- [ ] 1.2 Refine `openspec/specs/sprint-ai-memory/design/*.md` (layer mapping, refs, masking semantics)
- [ ] 1.3 Upgrade task cards with explicit observability signals + concrete E2E steps
- [ ] 1.4 Add run log `openspec/_ops/task_runs/ISSUE-274.md`

## 2. Validation
- [ ] 2.1 Run `npx -y @fission-ai/openspec@0.17.2 validate --specs --strict --no-interactive`
- [ ] 2.2 Run `rulebook task validate issue-274-sprint-ai-memory-spec-polish`

## 3. Delivery
- [ ] 3.1 Open PR with body containing `Closes #274`
- [ ] 3.2 Ensure required checks green + auto-merge enabled
