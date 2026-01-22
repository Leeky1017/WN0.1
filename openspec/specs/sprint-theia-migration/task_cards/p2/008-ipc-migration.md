# 008: IPC Migration（Electron IPC → Theia RPC）

## Context

WriteNow 的“正确性与可维护性”很大程度来自 IPC 的契约化（类型生成 + 漂移检测 + allowlist）。迁移到 Theia 后必须把这套资产迁移到 JSON-RPC，避免出现接口漂移与 silent failure。

## Requirements

- 在 Theia backend 实现 `handleInvoke(channel, handler)` 的等价注册机制，并暴露 RPC 调用入口（建议：单 `invoke(channel, payload)`）。
- 在 Theia frontend 实现类型化调用 wrapper（对齐现有 `ipc-generated.ts`/`IpcResponse` 语义）。
- 将至少 1–2 条核心链路迁移并跑通（建议 files/projects），作为后续迁移模板。
- 明确并实现错误语义：`ok: false` + `error.code` + `error.message`（含 `TIMEOUT`/`CANCELED`）。

## Acceptance Criteria

- [ ] frontend 可通过 RPC 调用 backend handler，并获得稳定的 `IpcResponse<T>` 结果（ok/err 可判定）。
- [ ] 合约漂移可被检测（本地/CI）：channel 集合与类型不一致会失败。
- [ ] 至少两条真实能力链路在 Theia 上可用（例如：创建项目/读写文件），并有可复现的验证步骤。

## Dependencies

- `004`
- `003`（存储语义会影响 files/projects 的路径与行为）

## Estimated Effort

- L（3–5 天）

