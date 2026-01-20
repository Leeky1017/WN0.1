# Design: IPC Contract Automation (Electron ⇄ Renderer)

## Goals

- 让 **Electron 主进程** 的 IPC 契约成为类型 SSOT，渲染进程不再手工维护 IPC 类型。
- 自动生成 `src/types/ipc-generated.ts`，并提供可重复（deterministic）的输出。
- CI 检测契约漂移并阻断（`npm run contract:check`）。
- （可选但推荐）同时约束 `electron/preload.cjs` 的 allowlist 与契约一致，避免运行时“通道存在但被阻止”。

## Non-Goals

- 不在本阶段强制对每个 IPC payload/response 做运行时 schema 校验（后续可扩展）。
- 不把整份 `openspec/specs/api-contract/spec.md` 变更为自动生成文档（保持人类可读为主）。

## Architecture

### Source of Truth

- **Channels（通道集合）**：从 `electron/ipc/*.cjs` 中静态提取 `handleInvoke('<channel>', ...)` 的字符串字面量。
- **Types（请求/响应类型）**：由主进程侧的契约声明提供，并通过脚本生成到渲染进程。

> 说明：通道集合从 handler 源码提取，用于避免“契约声明漏写/多写通道”；类型由主进程契约声明提供，用于生成渲染进程类型文件。

### Generator

- Script：`scripts/ipc-contract-sync.js`
  - `generate`：生成 `src/types/ipc-generated.ts`（可选：同步更新 `electron/preload.cjs` allowlist）
  - `check`：重新生成到内存并与仓库内文件对比；有 diff 则退出码非 0

### Drift Guard

- `contract:check` MUST：
  - 校验：`electron/ipc/*.cjs` 中的 invoke 通道集合与契约声明完全一致
  - 校验：生成的 `src/types/ipc-generated.ts` 与仓库内一致（文本完全相同）

### Outputs

- `src/types/ipc-generated.ts`
  - `IpcChannel` union
  - 每个通道的 `*Request/*Response` 类型 + 必要的 supporting types
  - `IpcInvokePayloadMap` / `IpcInvokeDataMap` / `IpcInvokeResponseMap`
  - Envelope / ErrorCodes / Pagination 等基础类型

## Determinism Rules

- 通道名按字典序排序输出。
- 所有生成文件使用 LF 与固定 header。
- 生成器对输入的 contract fragments 做稳定排序与去重。

## Extensibility

- 后续可扩展：在主进程契约声明中追加（可选）runtime validators，并让 handler 在进入业务逻辑前进行 payload 校验，从而把“类型”与“运行时行为”绑定起来。

