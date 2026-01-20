# Proposal: issue-50-sprint-5-project-management

## Why
Deliver Sprint 5 "Project Management" foundation: projects as top-level workspace, persistent character cards, outline management, and a minimal knowledge graph data+UI loop.

## What Changes
- Add IPC + renderer store + UI for projects/characters/outline/knowledge graph.
- Ensure all project-level assets are isolated by `project_id`.
- Add database schema for outline and knowledge graph persistence.
- Add Playwright E2E coverage for Sprint 5 acceptance paths.

## Impact
- Affected specs: `openspec/specs/sprint-5-project/spec.md`, `openspec/specs/sprint-5-project/tasks/*`
- Affected code: `electron/ipc/*`, `electron/database/*`, `src/stores/*`, `src/components/*`, `tests/e2e/*`
- Breaking change: NO
- User benefit: Users can create/switch projects, maintain character cards, edit/browse outlines, and manage a basic knowledge graph with persistence.
