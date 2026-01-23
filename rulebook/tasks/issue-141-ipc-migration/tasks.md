## 1. Implementation
- [ ] 1.1 Read/confirm IPC contract pipeline + error boundary (Electron main `createInvokeHandler` / `toIpcError`).
- [ ] 1.2 Add Theia RPC protocol in `writenow-core/src/common/` (service path + interface).
- [ ] 1.3 Implement backend service:
  - in-memory registry for `handleInvoke(channel, handler)`
  - `invoke(channel, payload)` dispatch + `IpcResponse` error boundary (no stack leak)
- [ ] 1.4 Implement frontend typed wrapper service + DI bindings (frontend module).
- [ ] 1.5 Implement >=2 real channels end-to-end (files/projects), with explicit error mapping + edge-case validation.
- [ ] 1.6 Extend contract pipeline to also generate/check Theia-side `ipc-generated.ts` (shared types) and fail on drift.

## 2. Verification
- [ ] 2.1 `npm run contract:check` (drift guard)
- [ ] 2.2 `npm run lint` + `npm run build`
- [ ] 2.3 `yarn install` + build/start for `writenow-theia` targets; verify frontend -> RPC -> backend calls succeed for the migrated channels.
- [ ] 2.4 Record all commands + key outputs in `openspec/_ops/task_runs/ISSUE-141.md`.

## 3. Documentation
- [ ] 3.1 Update task card: `openspec/specs/sprint-theia-migration/task_cards/p2/008-ipc-migration.md` (Status/Issue/PR/RUN_LOG + acceptance checkboxes).
- [ ] 3.2 Update `openspec/specs/writenow-spec/spec.md` to sync roadmap/status after merge.
