# Notes: issue-141-ipc-migration

## IPC mechanism (Electron) — key facts
- Contract SSOT lives in `electron/ipc/contract/ipc-contract.cjs`.
- Drift guard & generation live in `scripts/ipc-contract-sync.js`:
  - extracts `handleInvoke('channel', ...)` from `electron/ipc/*.cjs`
  - generates `src/types/ipc-generated.ts`
  - syncs invoke allowlist in `electron/preload.cjs`
- Error boundary lives in `electron/main.cjs:createInvokeHandler()`:
  - success: `{ ok: true, data }`
  - failure: `{ ok: false, error: { code, message, details? } }`
  - mapping via `toIpcError(error)`; NO stack is sent to renderer.

## Migration design (Theia)
- Transport: Theia JSON-RPC service exposed at a single endpoint with method `invoke(channel, payload)`.
- Registration: keep `handleInvoke(channel, handler)` pattern via an adapter (registry + dispatch).
- Error semantics: MUST return `IpcResponse<T>` (ok/err) and MUST NOT throw across the RPC boundary (avoid JSON-RPC stack leakage).
- Type sharing: extend the existing contract pipeline to also generate a Theia-side `ipc-generated.ts` inside `writenow-core/src/common/` so both frontend/backend can share the same channel union + payload/response maps.

## Open questions / later
- Precise data directory strategy for Theia (userData vs workspace-first) is governed by PoC 003 (Hybrid). This task focuses on RPC + minimal real flows; full storage semantics will be refined in Task 009+.
