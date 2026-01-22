# Spec: issue-100-issue-89-closeout (roadmap + archive)

## Scope
- Source of truth: `openspec/_ops/task_runs/ISSUE-89.md` (implementation evidence)
- Source of truth: `openspec/_ops/task_runs/ISSUE-100.md` (closeout evidence)

This spec defines the delta requirements delivered by Issue #100 and must stay consistent with:
- `openspec/specs/writenow-spec/spec.md` (product/architecture authority)
- `AGENTS.md` (governance & delivery constraints)

## Requirement: Canonical roadmap reflects shipped editor UX milestones

#### Scenario: Mark merged P2 editor improvements as done
- **GIVEN** Issue #89 is merged to main
- **WHEN** updating the canonical roadmap
- **THEN** `openspec/specs/writenow-spec/spec.md` records editor multi-tabs + flow protection modes as completed roadmap items to prevent spec drift
