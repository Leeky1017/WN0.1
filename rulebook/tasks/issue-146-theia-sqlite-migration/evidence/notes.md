# Notes: issue-146-theia-sqlite-migration

## Decisions

### DB path strategy (Theia)
- **Choice**: Option A — global DB under the Theia data dir: `<dataDir>/data/writenow.db` (projects are isolated by `project_id`).
- **Why**: Lowest migration surface vs per-project DB; aligns with the hybrid storage decision (userData-managed physical storage, workspace-like UX).
- **Follow-up**: Revisit Option B (per-project DB: `<projectRoot>/.writenow/writenow.db`) once workspace/project boundaries and export/backup workflows are finalized.

## Non-goals (for this issue)
- Wiring TipTap save events to DB indexing in real-time.
- Full RAG/embedding pipeline (handled in Task 010 / Task 011).

## Risks / open questions
- Theia browser vs electron targets require rebuilding native modules (`better-sqlite3`) for the active runtime ABI.
- Workspace semantics vs userData documents: current migration keeps DB global; document root wiring will be refined in subsequent tasks.

