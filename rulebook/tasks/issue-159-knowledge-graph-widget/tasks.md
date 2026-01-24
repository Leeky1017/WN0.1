## 1. Implementation
- [ ] 1.1 Backend: implement KnowledgeGraphService (entity/relation CRUD + graph read) on Theia node side.
- [ ] 1.2 Protocol/contract: add KnowledgeGraphService contract + add `kg:relation:update` IPC contract + regenerate `ipc-generated.ts`.
- [ ] 1.3 Frontend: implement KnowledgeGraphWidget (ReactWidget) with SVG visualization + sidebar list + details panel.
- [ ] 1.4 Interactions: pan/zoom + node drag + node click details; entity/relation create/edit/delete.
- [ ] 1.5 Integration: editor selection → create entity command + context menu entry (where supported).
- [ ] 1.6 Integration: AI context injection includes matched KG entities/relations in prompt context (minimal closure).

## 2. Testing
- [ ] 2.1 Add backend RPC smoke coverage for KG CRUD (real SQLite) under `writenow-theia/writenow-core/scripts/rpc-smoke.cjs`.
- [ ] 2.2 Manual verification in Theia app: visualization, pan/zoom, node drag, CRUD, details view (record evidence in RUN_LOG).
- [ ] 2.3 Run repo gates: `npm run lint`, `npm test`, `npx -y @fission-ai/openspec validate --specs --strict --no-interactive`, and Theia build (`yarn -C writenow-theia/writenow-core build`).

## 3. Documentation
- [ ] 3.1 Update task card checkboxes + completion metadata: `openspec/specs/sprint-theia-migration/task_cards/p3/014-knowledge-graph-widget.md`.
- [ ] 3.2 Update `openspec/specs/writenow-spec/spec.md` status/roadmap sync.
- [ ] 3.3 Update `openspec/_ops/task_runs/ISSUE-159.md` with commands, key outputs, and verification evidence.
