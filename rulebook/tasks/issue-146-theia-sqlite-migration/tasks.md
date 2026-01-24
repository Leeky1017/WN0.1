## 1. Implementation
- [ ] 1.1 Port SQLite init + schema into Theia backend (`writenow-core/src/node/database/*`)
- [ ] 1.2 Implement schema version management (SCHEMA_VERSION=7) + migrations (WAL, foreign_keys, FTS triggers/rebuild)
- [ ] 1.3 Decide DB path strategy for Theia (global DB under data dir) and record in RUN_LOG/notes
- [ ] 1.4 Migrate projects/files/version handlers to DB-backed services and register via Theia RPC boundary
- [ ] 1.5 Ensure failures return stable `IpcResponse` errors (no throws across RPC, no stack leaks)

## 2. Testing
- [ ] 2.1 Add/update RPC smoke script to verify DB init + projects CRUD + version history diff via Theia RPC
- [ ] 2.2 Run repo CI gates locally (`openspec validate`, `npm run contract:check`, `npm run lint`, `npm run build`)
- [ ] 2.3 Run `writenow-theia/writenow-core` TypeScript build + RPC smoke locally (evidence in RUN_LOG)

## 3. Documentation
- [ ] 3.1 Update task card `009-sqlite-migration.md` acceptance checkboxes + completion metadata
- [ ] 3.2 Update `openspec/specs/writenow-spec/spec.md` status sync after merge
