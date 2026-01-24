# Spec Delta: Theia Knowledge Graph Widget (Issue #159)

## Purpose

在 Theia 迁移的 Phase 3 中，将 WriteNow 既有的知识图谱能力以 Theia Widget 形式接入新壳体与新数据层，保证：

- 知识图谱能力不因迁移丢失（可视化/浏览/编辑）。
- 数据通路迁移为 Theia RPC（复用现有 SQLite schema：`kg_entities`/`kg_relations`）。
- UI 复用既有 SVG 逻辑与交互（避免“第二套实现”），并为后续重写（Graphology + Sigma.js）保留演进空间。

SSOT references:

- `openspec/specs/sprint-theia-migration/task_cards/p3/014-knowledge-graph-widget.md`
- `openspec/specs/sprint-theia-migration/spec.md`

## Requirements

### Requirement: Knowledge Graph Widget MUST be openable in Theia and render graph data

The system MUST provide a Theia Widget that can be opened from command palette and renders the current project's entities and relations.

#### Scenario: Open knowledge graph widget
- **GIVEN** Theia app is running.
- **WHEN** user executes "WriteNow: Open Knowledge Graph".
- **THEN** the Knowledge Graph Widget is opened in the main area as a tab.
- **AND** the widget loads entities/relations via Theia RPC.

### Requirement: Graph interactions MUST support pan/zoom and node drag

The widget MUST support basic interactions required for exploring the graph.

#### Scenario: Explore the graph
- **GIVEN** the graph contains at least 2 entities.
- **WHEN** user pans and zooms the visualization.
- **THEN** the view transform updates without breaking node selection.
- **WHEN** user drags a node.
- **THEN** the node position updates and connected edges re-render accordingly.

### Requirement: CRUD for entities and relations MUST be supported

The system MUST support creating, editing, and deleting entities and relations.

#### Scenario: Create and edit entity
- **GIVEN** a valid project exists.
- **WHEN** user creates an entity (type/name/description).
- **THEN** the entity is persisted to SQLite and appears in the widget list/graph.
- **WHEN** user edits the entity (name/description/type).
- **THEN** the updated entity is persisted and re-rendered.

#### Scenario: Create and edit relation
- **GIVEN** at least 2 entities exist.
- **WHEN** user creates a relation (from/to/type).
- **THEN** the relation is persisted and visible as an edge in the graph.
- **WHEN** user edits the relation (type/from/to/metadata).
- **THEN** the updated relation is persisted and re-rendered.

### Requirement: Failures MUST be observable and recoverable

RPC failures MUST NOT be silent; the widget MUST show an actionable error (message + retry).

#### Scenario: RPC failure
- **GIVEN** a transient backend failure occurs.
- **WHEN** the widget attempts to load the graph.
- **THEN** the UI shows a readable error message.
- **AND** user can retry without restarting the app.

