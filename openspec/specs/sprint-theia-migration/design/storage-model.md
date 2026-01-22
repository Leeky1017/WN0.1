# Storage Model: userData-first vs workspace-first

## Goals
- Keep WriteNow local-first while enabling Theia workspace portability.
- Make storage placement explicit by data category.
- Provide a clear recommendation framework for migration decisions.

## Data Taxonomy
- **User-scoped**: settings, identities, caches, AI models, global indexes.
- **Workspace-scoped**: documents, project metadata, per-workspace configs.
- **Derived**: search indexes, embeddings, previews (rebuildable).

## Option A: userData-first
All primary data lives under `userData/` with lightweight workspace references.

**Pros**
- Fast startup and indexing (single store).
- Stable across workspace path changes.
- Avoids bloating workspaces with caches and models.

**Cons**
- Portability is weaker (workspace alone is incomplete).
- Backup/export requires explicit tooling.
- Multi-user machine scenarios require careful isolation.

## Option B: workspace-first
Workspace contains the canonical project data under `.writenow/`.

**Pros**
- Portable and shareable (workspace is self-contained).
- Works well with versioned project assets.
- Easy to reason about per-project lifecycle.

**Cons**
- Large caches and models are awkward to store in workspaces.
- Performance risk on networked or huge workspaces.
- Duplicated data across workspaces increases disk usage.

## Comparison

| Dimension | userData-first | workspace-first |
| --- | --- | --- |
| Portability | Low without export tooling | High (workspace is complete) |
| Performance | Strong (local, centralized) | Depends on workspace location |
| Disk usage | Lower (shared caches/models) | Higher (per-workspace copies) |
| Multi-workspace | Easy central indexing | Requires merge/duplication strategy |
| Cloud sync | Centralized sync | Per-workspace sync |

## Recommendation Framework

### Default Policy (recommended)
- **userData-first** for heavy or shared assets:
  - SQLite database, indexes, embeddings, AI model cache, global settings.
- **workspace overlay** for portable assets:
  - documents, project metadata, workspace settings in `.writenow/`.

### Decision Rules
- If data is **large or rebuildable**, keep it in `userData/`.
- If data is **user-private and cross-project**, keep it in `userData/`.
- If data must travel with the workspace, store it in `.writenow/`.
- If data is **derived**, keep a pointer in workspace and rebuild from `userData/` when missing.

### Practical Split (initial)
- `userData/`:
  - SQLite + FTS5 + vec indexes
  - AI model cache and embedding artifacts
  - global skill packages and preferences
- `.writenow/`:
  - project metadata
  - documents and local attachments
  - workspace settings (view state, layout)

## Migration Notes
- Use stable project ids to map workspace data to userData records.
- Add a lightweight workspace manifest that points to its userData backing store.
- Provide a one-time migration path that copies documents into `.writenow/` when workspace-first is enabled.
