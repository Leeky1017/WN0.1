# IPC Migration: handleInvoke to Theia RPC

## Goals
- Replace Electron `ipcMain.handle` usage with Theia RPC while preserving existing contracts.
- Keep `IpcResponse<T>` semantics and stable error codes (including TIMEOUT and CANCELED).
- Make migration mechanical: every `handleInvoke("channel", ...)` maps to a typed RPC method.

## Target RPC Pattern

### Frontend
- Use Theia JSON-RPC proxy factories to obtain typed service proxies.
- All calls return `Promise<IpcResponse<T>>` and never throw across the boundary.

### Backend
- Implement RPC services that mirror existing IPC handlers.
- Register services via `RpcConnectionHandler` with stable service paths.
- Wrap failures into `IpcResponse` with `error.code` and `error.message`.

## Mapping Rules

1. **Channel -> Service + Method**
   - `domain:action` becomes `DomainService.action`.
   - Maintain the existing payload schema from `src/types/ipc-generated.ts`.

2. **Response**
   - Do not throw across the boundary; always return `IpcResponse<T>`.
   - Convert internal exceptions to `IpcResponse` with stable error codes.

3. **Timeout / Cancel**
   - Use Theia cancellation tokens or explicit timeout wrappers.
   - Map cancellations to `CANCELED`, timeouts to `TIMEOUT`.

4. **Events / Watchers**
   - Use Theia RPC event interfaces for watch streams.
   - `start` returns a watch id; updates are emitted via `onDidChange` style events.

## Example Mapping Table

| Existing Channel | RPC Service | Method | Notes |
| --- | --- | --- | --- |
| `file:list` | `FileService` | `list` | list documents under userData/workspace |
| `file:read` | `FileService` | `read` | preserve payload contract |
| `file:write` | `FileService` | `write` | returns `IpcResponse<void>` |
| `project:list` | `ProjectService` | `list` | workspace aware |
| `project:setCurrent` | `ProjectService` | `setCurrent` | updates active project |
| `ai:skill:run` | `AiService` | `runSkill` | returns run id + status |
| `ai:skill:cancel` | `AiService` | `cancelSkill` | maps to CANCELED |
| `search:fulltext` | `SearchService` | `fulltext` | SQLite FTS5 |
| `search:semantic` | `SearchService` | `semantic` | sqlite-vec |
| `update:check` | `UpdateService` | `check` | keep state machine |

## Migration Checklist
- Create shared RPC interface definitions (mirror `ipc-generated.ts`).
- Implement backend services and register them under stable paths.
- Replace renderer `ipcRenderer.invoke` calls with RPC proxy calls.
- Add contract validation to ensure method names match existing IPC channels.
- Update E2E tests to exercise RPC paths through Theia.

## Notes
- The IPC contract remains the source of truth; changes must update `src/types/ipc-generated.ts` first.
- Avoid hidden globals: inject RPC proxies and service dependencies explicitly.
