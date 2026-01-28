# P1-001: `user_memory` 数据模型增强 + `migrateToV10` + IPC 契约同步

Status: done  
Issue: #346  
PR: https://github.com/Leeky1017/WN0.1/pull/347  
RUN_LOG: openspec/_ops/task_runs/ISSUE-346.md

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P1-001 |
| Phase | 1 - 数据模型增强 |
| 优先级 | P1 |
| 状态 | done |
| 依赖 | P0-001 |

## 必读前置（执行前必须阅读）

- [x] `openspec/specs/sprint-ai-memory-semantic-recall/spec.md`
- [x] `openspec/specs/sprint-ai-memory-semantic-recall/design/02-user-memory-data-model.md`
- [x] `openspec/specs/api-contract/spec.md`（错误码/Envelope）
- [x] `writenow-theia/writenow-core/src/node/database/schema.sql`
- [x] `writenow-theia/writenow-core/src/node/database/init.ts`（迁移版本：目标 `SCHEMA_VERSION=10`）
- [x] `writenow-theia/writenow-core/src/node/services/memory-service.ts`
- [x] `electron/ipc/contract/ipc-contract.cjs`（IPC contract SSOT）

## 目标

升级 `user_memory` 数据模型以增强可审计性与可恢复性，并以显式迁移（`migrateToV10`）确保存量用户数据安全升级；同时同步 IPC 契约（SSOT），为 UI/注入/调试提供结构化字段。

## 关键改动点

- `user_memory` 新增审计字段：
  - `confidence`
  - `evidence_json`
  - `metadata_json`
  - `revision`
  - `deleted_at`（软删除）
- **禁止新增 `origin` 列**：origin 仍通过 id 前缀推断（IPC 已有 `origin: UserMemoryOrigin`）。
- 迁移：
  - bump `SCHEMA_VERSION` 到 10
  - 新增 `migrateToV10(db)` 执行 `ALTER TABLE` + 新索引
- IPC 合约：
  - 从 `electron/ipc/contract/ipc-contract.cjs` 扩展 `UserMemory` 相关字段
  - 通过 contract pipeline 自动生成并校验（禁止手改生成文件）

## 任务清单

- [x] 更新 `schema.sql`：`user_memory` 的 `CREATE TABLE` 包含新增列与索引
- [x] 更新 `init.ts`：
  - [x] `SCHEMA_VERSION = 10`
  - [x] `migrateToV10(db)`：对存量 DB 逐列 `ALTER TABLE`，并创建索引
- [x] 更新 `MemoryService`：
  - [x] 默认过滤 `deleted_at IS NULL`
  - [x] `memory:delete` 改为软删除（设置 `deleted_at`，递增 `revision`）
  - [x] `mapMemoryRow()` / 请求校验按新字段扩展（JSON 字段稳定序列化/反序列化）
- [x] 更新 IPC contract（SSOT）：同步 `UserMemory` 字段与（如需要）delete 语义说明

## 验收标准

- [x] 存量 DB 从 v9 升级到 v10 后：
  - [x] `user_memory` 新列存在且有合理默认值
  - [x] 索引创建成功
  - [x] 旧数据不丢失
- [x] `memory:list` / `memory:injection:preview` 默认不返回已软删除条目（`deleted_at IS NULL`）
- [x] `memory:delete` 变为软删除语义（`deleted_at` 被设置；条目不再出现在默认查询/注入中）
- [x] IPC 契约从 SSOT 同步生成且 `npm run contract:check` 通过

## E2E 场景（建议步骤）

- [x] 创建一条 `user_memory`
- [x] 执行 `memory:delete`
- [x] 断言：`memory:list` / `memory:injection:preview` 不再返回该条目
- [x] 断言：DB 中该条目仍存在且 `deleted_at` 非空（可审计）

