# 003-poc-storage-model

## Verdict
- Status: PASS (decision made)
- Date: 2026-01-22

## Context recap (current WriteNow)
WriteNow today is effectively **userData-first**:

- **Documents**: `userData/documents/` (synced into DB at startup). See: `electron/main.cjs` (`syncDocumentsToDatabase(..., <userData>/documents)`).
- **Projects metadata**: `userData/projects/<projectId>/.writenow/` (skills/packages + context roots). See: `electron/ipc/context.cjs`, `electron/services/skills/SkillIndexService.cjs`.
- **DB**: `userData/data/writenow.db` (global DB, tables filtered by `project_id`). See: `electron/database/init.cjs`.

This is the “root mismatch” called out in `CODEBASE_REUSABILITY_VIEWPOINT.md`: Theia is workspace-centric, while WriteNow is app-managed userData-centric.

## Theia workspace model (what we must map to)
- Theia’s **File Explorer** renders **workspace roots** (single-root or multi-root).
- Most file watching, navigation, and editor opening flows assume “workspace root is the project root”.
- Workspace switching is a first-class flow; multi-root workspaces increase complexity (we should avoid them during migration).

## Options
### Option A — userData-first (keep today’s physical layout)
**Definition**
- Keep documents under `userData/documents/`.
- Keep project metadata under `userData/projects/<projectId>/.writenow/`.
- Keep DB global under `userData/data/writenow.db` with `project_id` filtering.

**How it would work in Theia**
- We must decide what Theia workspace root is:
  - either point workspace to `userData/documents/` (but then “project” becomes a virtual concept), or
  - keep Theia File Explorer hidden/secondary and build a custom “WriteNow Project Explorer”.

**Pros**
- Minimal migration of persistence paths and DB semantics.
- Matches the “app manages projects” mental model.

**Cons / costs**
- High semantic tension with Theia: we either fight Theia’s default explorer/workspace assumptions or accept confusing UX (“workspace != project”).
- Higher long-term maintenance: many Theia features/extensions assume workspace-first.

### Option B — workspace-first (each WriteNow project is a real folder)
**Definition**
- Each project corresponds to a user-chosen folder (`workspaceRoot`).
- Documents live inside that folder.
- Project metadata lives in `<workspaceRoot>/.writenow/` (including DB or pointers).

**Pros**
- Maximum alignment with Theia (Explorer, watcher, editor openers, workspace switching).
- Project is self-contained → better portability/backup/version-control story.

**Cons / costs**
- Higher UX complexity for non-technical writers (“open folder/workspace” mental model).
- Potential performance risk if the folder is on network/cloud drives.
- Requires migration plan for existing `userData/documents/` projects.

### Option C — Hybrid (recommended): app-managed physical root, opened as workspace
**Definition**
- The app still **creates/owns** the project folder (so writers never need to “pick a folder”).
- Each project has a **real folder** on disk (under userData) that becomes the Theia workspace root:
  - `userData/projects/<projectId>/` becomes the workspace root shown in File Explorer
  - documents move into that root (e.g. `userData/projects/<projectId>/documents/**` or just store docs directly in root)
  - `.writenow/` stays within the same root (portable within the project folder)
- DB strategy (Phase 1 decision):
  - keep global DB filtered by `project_id` (lowest change), or
  - move to per-project DB under `.writenow/` (best portability).

**Pros**
- Writer UX remains “project-based” (the app manages the folder).
- Theia still sees a normal workspace folder → File Explorer, watchers, openers work naturally.
- Migration cost is bounded: we mainly relocate docs into per-project root and adjust DB lookup.

**Cons / costs**
- Still needs an export/import story (projects are under userData, not user-chosen).
- Requires one-time migration of existing `userData/documents/` into per-project roots (or a controlled cutover).

## Impact analysis
### User experience (project switching, file management)
- Option A: project switching is app-owned, but File Explorer story is awkward (either hidden or “not really project”).
- Option B: strong for power users; heavy mental model shift for writers.
- Option C: preserves writer mental model while allowing Theia’s explorer to be “real” (recommended).

### Existing E2E tests
- Option A: minimal path changes, but Theia UI tests may need custom explorer flows.
- Option B: tests must adapt to workspace folders and new migration state.
- Option C: tests can treat “project = workspace root” consistently, while still isolating userData via a test-specific base directory.

### Code migration workload
- Option A: lowest in the short term, highest long-term friction with Theia assumptions.
- Option B: highest initial migration, but clean architecture afterwards.
- Option C: moderate initial migration, with good long-term alignment (recommended).

### Compatibility with Theia File Explorer
- Option A: likely requires hiding/replacing default explorer for a coherent UX.
- Option B/C: can keep default explorer; register our `.md` TipTap opener and keep everything in the normal Theia flow.

## Recommendation
Choose **Option C (Hybrid)** as the migration baseline:

1) **Make “project root = workspace root” true** (for Theia + UX sanity).
2) Keep **app-managed project creation** so writers never deal with folder picking.
3) Keep `.writenow/` inside project root; decide DB-per-project vs global DB in Phase 1 based on portability needs.
4) **Avoid multi-root workspaces** during migration.
5) Forbid “double-read/double-write”: do one cutover migration and delete the old path (after backup/export).

## Suggested next step (Phase 1)
- Implement the minimal hybrid closed loop:
  - create/open projectId → resolve its on-disk root (under userData) → open as Theia workspace → `.md` edits saved via TipTap opener.
- Add a migration utility: `userData/documents/**` → per-project workspace roots (or an explicit export/import).
