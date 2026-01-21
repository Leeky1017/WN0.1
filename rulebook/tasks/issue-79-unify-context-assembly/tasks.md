## 1. Implementation
- [x] 1.1 Audit: locate legacy prompt assembly + current ContextAssembler pipeline
- [x] 1.2 Migrate `ai:skill:run` to use `ContextAssembler.assemble()` output (systemPrompt + userContent)
- [x] 1.3 Remove legacy prompt builders/helpers from `electron/ipc/ai.cjs`
- [x] 1.4 Ensure Context Viewer prompt equals actual model prompt (single assembled result SSOT)
- [x] 1.5 Sync IPC contract if needed; keep `contract:check` green

## 2. Testing
- [ ] 2.1 E2E: `tests/e2e/sprint-2-ai.spec.ts` passes
- [ ] 2.2 E2E: assert Context Viewer prompt == actual prompt sent to model (no stubs)
- [ ] 2.3 Edge: cancel/timeout paths clear pending state and remain observable
- Note: `tests/e2e/sprint-2-ai.spec.ts` is gated by `WN_E2E_AI_API_KEY`; in this run it was skipped (no key).

## 3. Documentation
- [x] 3.1 Update `openspec/_ops/task_runs/ISSUE-79.md` with commands + key outputs
- [ ] 3.2 (If present) update relevant OpenSpec task cards acceptance checklists
