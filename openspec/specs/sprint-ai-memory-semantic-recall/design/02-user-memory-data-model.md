# 02. `user_memory` 数据模型增强设计（可审计 + 软删除）

## 背景与问题

当前实现（见 `writenow-theia/writenow-core/src/node/database/schema.sql`）：

```sql
CREATE TABLE IF NOT EXISTS user_memory (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,                -- 'preference' | 'feedback' | 'style'
  content TEXT NOT NULL,
  project_id TEXT,                   -- NULL = 全局
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

缺口：

- **不可审计**：无法表达“可信度/证据/来源上下文/提取方式/为何被注入”。
- **不可恢复**：删除是硬删除（`DELETE`），无法追溯或回滚，且不利于后续质量评估。
- **缺少版本语义**：更新冲突/回滚缺少稳定锚点。

> 约束：**不新增 `origin` 列到 DB**。当前 `origin` 已通过 id 前缀推断（例如 `learned:`），IPC 类型也已有 `origin: UserMemoryOrigin`。

---

## 目标

- 为 `user_memory` 增加最小但足够的审计字段：confidence、evidence、metadata、revision、deleted_at。
- 将 `memory:delete` 语义升级为软删除（tombstone），默认查询/注入过滤删除项。
- 保持 IPC 契约 SSOT：所有类型变更从 `electron/ipc/contract/ipc-contract.cjs` 入手，禁止直接修改生成文件。

---

## 表结构升级（提议）

### 新增字段

```sql
ALTER TABLE user_memory ADD COLUMN confidence REAL NOT NULL DEFAULT 1.0;
ALTER TABLE user_memory ADD COLUMN evidence_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE user_memory ADD COLUMN metadata_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE user_memory ADD COLUMN revision INTEGER NOT NULL DEFAULT 1;
ALTER TABLE user_memory ADD COLUMN deleted_at TEXT; -- NULL=active, ISO timestamp=tombstone

CREATE INDEX IF NOT EXISTS idx_user_memory_scope_active_updated
  ON user_memory(project_id, deleted_at, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_memory_type_active_updated
  ON user_memory(type, deleted_at, updated_at DESC);
```

字段语义：

- `confidence`: 0..1，表示该记忆条目的可信度/确定性（学习产物可较低；用户显式偏好可较高）。
- `evidence_json`: JSON array（稳定 JSON string），记录证据引用（例如 `runId`、段落引用、文件引用、feedbackId）。
- `metadata_json`: JSON object（稳定 JSON string），扩展字段（例如 tags、embeddingModel、learnedFrom 等）。
- `revision`: 版本号；每次 update（或 soft delete）递增，用于并发控制与回滚语义。
- `deleted_at`: 软删除 tombstone（ISO string）；默认 list/preview/注入必须过滤 `deleted_at IS NULL`。

稳定 JSON 约束（MUST）：

- 写入 `evidence_json` / `metadata_json` 时必须使用 **确定性序列化**（key 排序固定、数组顺序稳定、空白字符固定），以保证审计与 hash 口径稳定。

---

## 迁移方案（Theia backend）

当前 `writenow-theia/writenow-core/src/node/database/init.ts` 的 `SCHEMA_VERSION = 9`。

本变更需要对既有表做 `ALTER TABLE`，因此必须新增真实迁移：

- 将 `SCHEMA_VERSION` bump 到 10
- 新增 `migrateToV10(db)`：
  - 逐列检查（`hasColumn`）后 `ALTER TABLE user_memory ADD COLUMN ...`
  - 创建必要索引（`CREATE INDEX IF NOT EXISTS ...`）
  - 不做 destructive 操作（不删除旧数据）

并同步更新 `schema.sql` 的 `CREATE TABLE user_memory` 以包含新字段（确保新建库直接具备完整结构）。

---

## 软删除语义（IPC + 服务）

### 行为变更

将 `memory:delete` 从硬删除改为软删除：

- 旧：`DELETE FROM user_memory WHERE id = ?`
- 新：`UPDATE user_memory SET deleted_at = <now>, updated_at = <now>, revision = revision + 1 WHERE id = ? AND deleted_at IS NULL`

并调整以下读路径：

- `memory:list` 默认只返回 `deleted_at IS NULL`
- `memory:injection:preview` 默认只注入 `deleted_at IS NULL`
- 未来如需“查看已删除/恢复”，再新增显式参数或通道（本 Sprint 不强制）

### 与语义召回索引的协作

当条目被软删除时：

- SHOULD 从 `user_memory_vec` 删除对应向量行，避免召回到 tombstone
- 即使未删除向量行，也 MUST 在召回后过滤掉 `deleted_at IS NOT NULL`

---

## IPC 契约同步（SSOT）

所有契约变更必须从 `electron/ipc/contract/ipc-contract.cjs` 入手：

- `UserMemory` 类型增加（或等价表达）：
  - `confidence`
  - `evidence`（结构化类型；DB 中落 `evidence_json`）
  - `metadata`（结构化类型；DB 中落 `metadata_json`）
  - `revision`
  - `deletedAt`
- `MemoryDeleteResponse` 的语义可保持 `{ deleted: true }`，但实现语义变为软删除

禁止事项：

- 不得直接修改 `src/types/ipc-generated.ts` / `writenow-theia/writenow-core/src/common/ipc-generated.ts` 等生成文件。

---

## 关联文件（落点）

- DB：
  - `writenow-theia/writenow-core/src/node/database/schema.sql`
  - `writenow-theia/writenow-core/src/node/database/init.ts`（`migrateToV10` + `SCHEMA_VERSION=10`）
- Memory service：
  - `writenow-theia/writenow-core/src/node/services/memory-service.ts`（默认过滤 deleted、软删除实现、mapMemoryRow 扩展）
- IPC contract：
  - `electron/ipc/contract/ipc-contract.cjs`（类型与 request/response shape 变更）
  - contract pipeline：`npm run contract:generate` / `npm run contract:check`（以仓库脚本为准）
