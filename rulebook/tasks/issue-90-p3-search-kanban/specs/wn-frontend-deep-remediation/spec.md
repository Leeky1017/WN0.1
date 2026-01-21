# Spec: issue-90-p3-search-kanban (P3 Search + Card View)

## Scope
- Source of truth: `openspec/specs/wn-frontend-deep-remediation/task_cards/p3/FRONTEND-P3-001-search-fulltext-and-semantic.md`
- Source of truth: `openspec/specs/wn-frontend-deep-remediation/task_cards/p3/FRONTEND-P3-002-card-view-kanban.md`

This spec defines the delta requirements and user-visible behaviors delivered by Issue #90, and must stay consistent with:
- `openspec/specs/writenow-spec/spec.md` (product/architecture authority)
- `AGENTS.md` (governance & delivery constraints)

## Requirement: FRONTEND-P3-001 Sidebar Search (FTS + Semantic)

### Scenario: Unified entry, mode toggle, relevance ordering
- **WHEN** the user enters a query in Sidebar Search
- **THEN** the same input supports switching between `fulltext` (FTS5) and `semantic` (sqlite-vec) modes
- **AND THEN** results are ordered by relevance score and support pagination
- **AND THEN** repeated queries use an explicit cache to keep large-project latency acceptable

### Scenario: Highlight + match navigation
- **WHEN** the user selects a search hit
- **THEN** the editor opens the target document and highlights the matched text
- **AND THEN** the user can jump to the previous/next match without leaving the editor

## Requirement: FRONTEND-P3-002 Card View (Chapter cards)

### Scenario: Cards show title/summary/status and allow reorder
- **WHEN** the user opens Card View in Sidebar
- **THEN** the view shows a card per chapter/document (title/summary/status)
- **AND THEN** the user can drag to reorder cards
- **AND THEN** the order and status are persisted and restored after app restart

### Scenario: Navigation preserves context
- **WHEN** the user opens a chapter from Card View and later returns to Card View
- **THEN** the view keeps its local state (e.g. scroll/selection) and does not reset unexpectedly

