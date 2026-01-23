# Spec Delta: rulebook-task-archive (Issue #139)

## Purpose

After a task is delivered and merged, its Rulebook folder should be archived so `rulebook/tasks/` stays focused
on active work and the completed evidence remains discoverable by date.

## Requirements

### Requirement: MUST archive completed task folders

The repository MUST archive completed Rulebook task folders under `rulebook/tasks/archive/` once delivery is merged.

#### Scenario: Issue #137 task folder is archived
- **GIVEN** Issue #137 is merged (PR #138).
- **WHEN** this closeout task runs.
- **THEN** `rulebook/tasks/issue-137-p1-basic-layout/` MUST be moved to
  `rulebook/tasks/archive/2026-01-23-issue-137-p1-basic-layout/`.
- **AND** the repository MUST not contain any `rulebook/tasks/issue-137-*` entries afterwards.
