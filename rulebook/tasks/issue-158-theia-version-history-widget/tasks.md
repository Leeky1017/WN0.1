## 1. Implementation
- [ ] 1.1 Audit/complete Theia `VersionService` snapshot flows (`version:list/create/restore/diff`) and harden create when article row is missing.
- [ ] 1.2 Expose minimal TipTap editor APIs needed by version history (articleId + full markdown getter/setter).
- [ ] 1.3 Implement VersionHistoryWidget (list/detail/diff/rollback) + contribution + commands; mount in bottom panel.
- [ ] 1.4 Integrate AI Panel Apply flow to auto-create pre/post snapshots (actor=auto/ai).

## 2. Testing
- [ ] 2.1 Validate snapshot CRUD + diff + restore via real SQLite (no stubs) and record commands/output in RUN_LOG.
- [ ] 2.2 Validate rollback updates editor content + dirty semantics; validate AI apply creates snapshots (record evidence in RUN_LOG).

## 3. Documentation
- [ ] 3.1 Update task card: `openspec/specs/sprint-theia-migration/task_cards/p3/013-version-history-widget.md` (checklist + completion metadata).
- [ ] 3.2 Sync `openspec/specs/writenow-spec/spec.md` status/roadmap for Phase 3 Task 013.
