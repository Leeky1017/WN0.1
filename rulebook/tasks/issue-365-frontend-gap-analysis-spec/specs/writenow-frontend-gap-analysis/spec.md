# Spec Delta: writenow-frontend-gap-analysis (Issue #365)

## Purpose

本任务的规范增量用于把“WriteNow 前端差距分析（writenow-frontend）”固化为可执行、可验收的 OpenSpec（spec + design + task cards），作为后续实现的 SSOT。

SSOT references:

- `openspec/specs/writenow-frontend-gap-analysis/spec.md`
- `openspec/specs/writenow-frontend-gap-analysis/design/*`
- `openspec/specs/writenow-frontend-gap-analysis/task_cards/*`

## Requirements

### Requirement: Spec SSOT MUST exist and be validated

The project MUST provide an authoritative spec at `openspec/specs/writenow-frontend-gap-analysis/spec.md`, and it MUST pass OpenSpec strict validation to prevent drift.

#### Scenario: Spec is executable and referenceable

- **GIVEN** a developer is starting a `writenow-frontend` gap closure task
- **WHEN** they need to confirm scope/entrypoints/failure semantics/test obligations
- **THEN** they can reference `openspec/specs/writenow-frontend-gap-analysis/spec.md`
- **AND THEN** `npx -y @fission-ai/openspec@0.17.2 validate --specs --strict --no-interactive` MUST pass

### Requirement: Task cards MUST exist and be actionable

The project MUST provide phased task cards under `openspec/specs/writenow-frontend-gap-analysis/task_cards/` so execution can be tracked, split, and verified without scope drift.

#### Scenario: Each task card is verifiable

- **GIVEN** a team is ready to execute P0–P3
- **WHEN** they open a task card
- **THEN** the card MUST include: Goal, Dependencies, Expected File Changes, Acceptance Criteria, Tests (真实 E2E)

