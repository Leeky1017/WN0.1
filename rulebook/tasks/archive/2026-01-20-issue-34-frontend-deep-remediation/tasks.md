# Tasks: issue-34-frontend-deep-remediation

## Checklist
- [ ] Add `openspec/_ops/task_runs/ISSUE-34.md`
- [ ] Draft `openspec/specs/wn-frontend-deep-remediation/spec.md`
- [ ] Add `openspec/specs/wn-frontend-deep-remediation/design/*`
- [ ] Add `openspec/specs/wn-frontend-deep-remediation/task_cards/**`
- [ ] Run `rulebook task validate issue-34-frontend-deep-remediation`
- [ ] Run `npx -y @fission-ai/openspec@0.17.2 validate --specs --strict --no-interactive`
- [ ] Create PR with `Closes #34` and enable auto-merge

## Acceptance
- OpenSpec validation is green and includes the new spec.
- Task cards are grouped by priority and each includes acceptance criteria, expected file changes, and dependencies.
