# Proposal: issue-159-knowledge-graph-widget

## Why
WriteNow 现有的知识图谱功能目前依赖旧 Electron 面板与 IPC。Theia 迁移后需要把“同等能力”以 Widget 形式接入新的壳体与数据层，否则项目管理/写作辅助能力会退化且后续无法演进（例如后续替换为 Graphology + Sigma.js）。

## What Changes
- Backend（Theia node）：新增 `KnowledgeGraphService`，基于现有 SQLite 表 `kg_entities` / `kg_relations` 提供实体/关系 CRUD（含列表、创建、更新、删除）以及图谱读取。
- Protocol：在 `writenow-protocol.ts` 增加 `KnowledgeGraphService` contract；补齐缺失的 relation update IPC contract（`kg:relation:update`）。
- Frontend（Theia browser）：新增 `KnowledgeGraphWidget`（ReactWidget）在 Theia 中以 tab 形式展示知识图谱，并复用既有 SVG 布局/交互逻辑实现可视化、拖拽、平移缩放、详情查看与 CRUD。
- Integration：提供命令面板入口以及编辑器 selection → 创建实体入口；将相关实体注入到 AI Panel 的上下文拼装（最小闭环）。

## Impact
- Affected specs:
  - `openspec/specs/sprint-theia-migration/task_cards/p3/014-knowledge-graph-widget.md`
  - `openspec/specs/writenow-spec/spec.md`
- Affected code:
  - `writenow-theia/writenow-core/src/node/services/knowledge-graph-service.ts` (new)
  - `writenow-theia/writenow-core/src/browser/knowledge-graph/*` (new)
  - `writenow-theia/writenow-core/src/common/writenow-protocol.ts` (add contract)
  - `electron/ipc/knowledgeGraph.cjs` + `electron/ipc/contract/ipc-contract.cjs` + generated IPC types (add `kg:relation:update`)
- Breaking change: NO (additive APIs / UI; existing channels remain valid)
- User benefit: Theia 版本恢复知识图谱可视化与编辑能力，支持写作过程中的实体/关系维护，并可被 AI 上下文引用。
