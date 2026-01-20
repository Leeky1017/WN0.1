## 1. Implementation
- [ ] 1.1 Implement `ai:skill:run/cancel` main-process proxy (streaming, baseUrl, cancel, errors)
- [ ] 1.2 Ensure 3 builtin skills are upserted into `skills` table (idempotent, `is_builtin=1`)
- [ ] 1.3 Implement version IPC (`version:list/create/restore/diff`) backed by `article_snapshots`
- [ ] 1.4 Implement Diff view + confirm-only apply flow (no auto replace)
- [ ] 1.5 Implement version history panel + rollback UX

## 2. Testing
- [ ] 2.1 Add Playwright E2E for streaming + accept → apply + AI snapshot
- [ ] 2.2 Add Playwright E2E for cancel → no modify
- [ ] 2.3 Run `npm test` and `npm run test:e2e`

## 3. Documentation
- [ ] 3.1 Update `openspec/_ops/task_runs/ISSUE-48.md` with commands + key outputs
- [ ] 3.2 Create PR with `Closes #48` and enable auto-merge

