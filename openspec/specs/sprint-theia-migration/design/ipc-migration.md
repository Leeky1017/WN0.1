# IPC → Theia RPC Migration Strategy

> Why: WriteNow 现有 IPC 已经具备“契约 SSOT + 注入式注册（handleInvoke）+ ok/err 边界（IpcResponse）”的工程化资产。迁移到 Theia 的关键是 **更换 transport**，而不是推翻契约与错误语义。

## Goals

- 将 Electron IPC（`ipcMain.handle` / preload allowlist / renderer invoke）迁移为 Theia JSON-RPC（frontend ↔ backend）。
- 迁移期最大化复用：保留 `handleInvoke(channel, handler)` 注册模式，确保 handler 平移是机械化的。
- 保留 `IpcResponse<T>` 语义：`ok: true|false` + 稳定错误码（含 `TIMEOUT` / `CANCELED`）+ 可读 message；禁止堆栈穿透。
- 迁移期避免双栈：禁止同时保留 Electron IPC 与 Theia RPC 两条业务调用路径。

## Current Assets (to reuse)

- `handleInvoke` 注入式注册模式：现有 handler 多数支持传入 `options.handleInvoke`（迁移成本显著下降）。
- IPC contract pipeline：`electron/ipc/*` → 生成 `src/types/ipc-generated.ts`（channel + payload/response map）并提供漂移检测（CI 门禁）。

## Target RPC Pattern

### Option A (recommended for migration): single generic invoke over RPC

在 Theia backend 暴露一个统一入口：

- `invoke(channel: IpcChannel, payload: unknown): Promise<IpcResponse<unknown>>`

并在 backend 内部维护 `channel -> handler` 的 map：

- `handleInvoke(channel, handler)`：仅做注册（保持 contract extractor 可识别）
- `invoke()`：统一错误边界包装（始终返回 `IpcResponse`，不 throw 过边界）

Why:
- 将迁移降维为 “transport 替换”，最大化复用现有 handler 与 contract pipeline；
- 不强迫在迁移初期把 channel 重构为多 service/method（避免双契约/双路径）。

### Option B (post-migration evolution): per-service / per-method typed RPC

将 channel 拆为多个服务接口（例如 `FileService.list/read/write`），更符合 Theia 的 DI/扩展习惯。

Trade-off:
- 迁移成本更高；容易在迁移期形成“双栈并存”；建议在迁移稳定后再评估。

## Mapping Rules (must)

1) **No throw across boundary**
   - backend 内部异常必须被捕获并转换为 `IpcResponse<{...}>` 的 `ok: false`。
2) **Stable error codes**
   - Timeout → `TIMEOUT`
   - Cancel → `CANCELED`
   - 其他业务错误码必须稳定且可判定（`NOT_FOUND` / `INVALID_ARGUMENT` / `UPSTREAM_ERROR` 等）
3) **Events / streams**
   - 现有 `ai:skill:stream` 等事件流应迁移为 JSON-RPC notifications（或 Theia 支持的事件接口）。
   - frontend 必须能区分取消/超时/失败，并保证 pending 状态清理。

## Example (informative)

| Existing Channel | Option A（invoke） | Option B（typed） |
| --- | --- | --- |
| `file:read` | `invoke('file:read', payload)` | `FileService.read(payload)` |
| `file:write` | `invoke('file:write', payload)` | `FileService.write(payload)` |
| `project:list` | `invoke('project:list', payload)` | `ProjectService.list(payload)` |
| `ai:skill:run` | `invoke('ai:skill:run', payload)` | `AiService.runSkill(payload)` |

## Migration Steps (high level)

1) 实现 Option A 的 `invoke(channel, payload)` 适配层（保证 handler 平移）。
2) 在 Theia frontend 提供类型化 wrapper（对齐 `src/types/ipc-generated.ts` 的 payload/response map）。
3) 迁移核心链路（files/projects/context/ai/rag）并复用 drift guard。
4) 迁移稳定后，再评估是否逐步演进到 Option B（如确有必要）。

