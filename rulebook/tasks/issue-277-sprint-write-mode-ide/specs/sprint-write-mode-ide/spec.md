# Spec Delta: sprint-write-mode-ide (Issue #277)

## Purpose

本 Task 的规范增量用于把“IDE Write Mode（低成本·高质量·性能优先）”沉淀为可执行、可验收的 Sprint 级 SSOT。

SSOT references:
- `openspec/specs/sprint-write-mode-ide/spec.md`
- `openspec/specs/sprint-write-mode-ide/task_cards/*`

## Requirements

### Requirement: Sprint spec SSOT MUST exist and be validated

The system MUST provide a single, authoritative Sprint spec for IDE Write Mode at `openspec/specs/sprint-write-mode-ide/spec.md`, and it MUST pass OpenSpec strict validation to prevent drift.

#### Scenario: Spec is executable and referenceable
- **GIVEN** a developer is starting a Write Mode implementation task
- **WHEN** they need to confirm interaction semantics / budgets / quality gates / migration rules
- **THEN** they can reference `openspec/specs/sprint-write-mode-ide/spec.md`
- **AND** `openspec validate --specs --strict --no-interactive` passes

### Requirement: Phased task cards MUST exist for execution

The project MUST provide phased task cards under `openspec/specs/sprint-write-mode-ide/task_cards/` so execution can be tracked, split, and verified without scope drift.

#### Scenario: Each task card is actionable and verifiable
- **GIVEN** a team is ready to execute a phase (P0–P3)
- **WHEN** they open the corresponding task card
- **THEN** the card includes: meta table (ID/Phase/Priority/Status/Deps), prerequisites, goals, checklist, acceptance criteria, deliverables
