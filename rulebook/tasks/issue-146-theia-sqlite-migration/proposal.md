# Proposal: issue-146-theia-sqlite-migration

## Why
WriteNow Phase 2 的后续迁移（RAG/Embedding/版本历史/搜索/设置等）都以 SQLite 为持久化基石；在 Theia 迁移中必须把 DB 初始化、schema 管理与最小 CRUD 链路迁移到 Theia backend，才能保证数据落盘一致、失败可观测并支撑后续能力增量。

## What Changes
- 在 `writenow-theia/writenow-core` backend 引入可复用的 SQLite 初始化入口（schema + migrations + WAL/foreign_keys）。
- 将 Theia backend 侧的 projects/files/version 能力从临时文件/JSON stub 迁移为 DB-backed 实现，并通过 Theia RPC 暴露（保持 `IpcResponse` 失败语义、禁止 stack leak）。
- 增加可复现的验证脚本与 RUN_LOG 证据（DB init、CRUD、版本历史）。

## Impact
- Affected specs:
  - `openspec/specs/sprint-theia-migration/task_cards/p2/009-sqlite-migration.md`
  - `openspec/specs/writenow-spec/spec.md`
- Affected code:
  - `writenow-theia/writenow-core/src/node/**`
  - `writenow-theia/writenow-core/scripts/**`
- Breaking change: YES (Theia backend 侧持久化路径与数据形态从 stub → SQLite；仅影响 Theia 迁移线)
- User benefit:
  - Theia 形态下数据可稳定落盘、可恢复，为项目/文章/版本历史/搜索建立一致基线。
