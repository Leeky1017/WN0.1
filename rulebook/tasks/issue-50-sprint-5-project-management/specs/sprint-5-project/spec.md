# Sprint 5: Project Management (Issue #50)

## Purpose

Implement the Sprint 5 project management scope described in `openspec/specs/sprint-5-project/spec.md`, focusing on end-to-end correctness (IPC+DB+UI) and project isolation.

## Requirements

### Requirement: Projects are top-level workspace units

#### Scenario: Create and switch project
- **WHEN** the user creates a project with name (optional description/style guide)
- **THEN** the project is persisted in `projects` and can be re-opened after restart
- **WHEN** the user selects a project
- **THEN** the app switches the current context and subsequent assets are scoped to that project

### Requirement: Character cards are persisted per project

#### Scenario: Create, edit, and persist character cards
- **WHEN** the user creates/edits a character (including `traits`/`relationships` JSON fields)
- **THEN** changes are persisted in `characters` with the current `project_id` and survive restart

### Requirement: Outline is browsable, editable, and persistent

#### Scenario: Browse and edit outline
- **WHEN** the user opens the outline view for the current article
- **THEN** the outline is shown with hierarchy
- **WHEN** the user adds/renames/reorders outline nodes
- **THEN** the outline is persisted and restored after restart
- **WHEN** the user clicks an outline node
- **THEN** the editor navigates to the nearest matching heading (minimum viable mapping)

### Requirement: Knowledge graph supports entities + relations and basic visualization

#### Scenario: Nodes and edges CRUD
- **WHEN** the user creates entities and relations in the current project
- **THEN** they are persisted, reloadable, and rendered in the graph view
- **WHEN** the user selects a node/edge
- **THEN** the UI shows summary details and provides edit/delete entry points

