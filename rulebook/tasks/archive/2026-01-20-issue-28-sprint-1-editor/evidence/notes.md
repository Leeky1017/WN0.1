# Notes: issue-28-sprint-1-editor

## Decisions
- Dual mode strategy: Markdown SSOT; richtext derives via TipTap Markdown extension.

## Risks / watchouts
- TipTap Markdown conversion must not create update loops (programmatic setContent vs user edits).
- Crash recovery UX must be testable in Playwright (avoid native OS modal dialogs).

## Later (out of Sprint 1)
- Real Markdown preview rendering.
- Version history via DB `article_snapshots` (Sprint 2 spec).

