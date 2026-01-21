# GOV: Closeout Issue #70 (Issue #74)

## Purpose

Close out the delivery of Sprint 6 task package A by synchronizing task card acceptance status, the canonical roadmap checklist, and archiving the execution task artifacts for long-term traceability.

## Requirements

### Requirement: Sprint 6 task cards reflect delivery state

#### Scenario: Task docs 001/002 are marked done
- **WHEN** PR #73 is merged
- **THEN** `openspec/specs/sprint-6-experience/tasks/001-writing-stats.md` and `openspec/specs/sprint-6-experience/tasks/002-pomodoro-timer.md` MUST include completion metadata and have all acceptance checkboxes marked `[x]`

### Requirement: Canonical roadmap does not drift

#### Scenario: Roadmap checklist is synced
- **WHEN** Sprint 6 A is shipped
- **THEN** `openspec/specs/writenow-spec/spec.md` MUST mark Sprint 6 items “创作统计 / 番茄钟” as completed

### Requirement: Rulebook tasks are archived after merge

#### Scenario: Execution artifacts are archived
- **WHEN** PR #73 is merged
- **THEN** `rulebook/tasks/issue-70-s6-stats-pomodoro` MUST be moved under `rulebook/tasks/archive/` preserving its contents
