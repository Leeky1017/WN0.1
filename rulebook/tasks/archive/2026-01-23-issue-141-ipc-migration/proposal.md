# Proposal: issue-141-ipc-migration

## Why
WriteNow 的稳定性来自“契约化 IPC”（类型生成 + 漂移检测 + 统一错误边界）。Phase 2 开始迁移到 Theia 后，如果不先建立等价的 JSON-RPC 传输层与错误语义，将导致后续 SQLite/RAG/Embedding 迁移出现接口漂移与 silent failure。

## What Changes
- 在 `writenow-theia/writenow-core` 引入 Theia JSON-RPC 服务：frontend 通过 `invoke(channel, payload)` 调用 backend，并获得稳定的 `IpcResponse<T>`（ok/err 可判定，错误码稳定，禁止堆栈泄漏）。
- 引入 `handleInvoke(channel, handler)` 的 Theia 适配器，使后续迁移可以沿用现有 handler 注册模式。
- 为 Theia 侧提供可共享的 `ipc-generated.ts`（由现有 contract pipeline 自动生成/校验），避免前后端类型漂移。
- 迁移并验证 >=2 条真实能力链路（以 files/projects 为主），形成可复制模板。

## Impact
- Affected specs:
  - `openspec/specs/sprint-theia-migration/spec.md`
  - `openspec/specs/sprint-theia-migration/task_cards/p2/008-ipc-migration.md`
  - `openspec/specs/writenow-spec/spec.md`（状态同步）
- Affected code:
  - `writenow-theia/writenow-core/src/**`
  - `scripts/ipc-contract-sync.js`（生成/漂移检测扩展）
- Breaking change: NO（Theia 新增能力；现有 Electron IPC contract pipeline 语义保持不变）
- User benefit: Theia 端核心迁移具备可调用、可审计、可漂移检测的 RPC 基座，后续 SQLite/RAG/Embedding 迁移可在同一契约语义下推进。
