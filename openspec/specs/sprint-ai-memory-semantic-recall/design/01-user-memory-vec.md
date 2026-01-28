# 01. `user_memory_vec`：用户记忆语义召回索引设计（sqlite-vec vec0）

## 背景与目标

现状：

- `writenow-theia/writenow-core/src/node/rag/vector-store.ts` 已引入 sqlite-vec，并维护 `articles_vec` / `article_chunks_vec` / `entity_vec`。
- `writenow-theia/writenow-core/src/node/services/memory-service.ts` 的注入选择逻辑当前为 **确定性排序**（type/scope/origin/time/id），尚无语义召回能力。

目标：

- 在不引入外部向量数据库的前提下，为 `user_memory` 增加 `vec0` 语义索引 `user_memory_vec`。
- 让 `memory:injection:preview` 支持可选 `queryText`，可用语义相似度召回“与当前请求相关”的记忆条目。
- **稳定前缀边界**：任何 query-dependent 的召回结果必须进入 `userContent`，不得进入 `systemPrompt` 的稳定前缀（Layer 0–3），以保护 `stablePrefixHash`。

---

## 设计总览

### 数据流（语义召回）

1. Renderer 侧发起 `memory:injection:preview({ projectId?, queryText? })`
2. Backend：
   - 若 `queryText` 为空：走确定性排序（baseline）
   - 若 `queryText` 非空：尝试
     - embedding.encode(queryText) → 得到 `dimension + vector`
     - `VectorStore.ensureUserMemoryIndex(dimension)`（内部确保 sqlite-vec 已加载且维度一致）
     - `VectorStore.querySimilarUserMemory(vector, ...)` → TopK memoryIds
     - 根据 scope/privacy/delete 过滤 + 与 baseline 合并/裁剪
3. 返回注入结果（包含 deterministic + semantic 结果的分区信息或可判定模式）
4. Renderer 将 query-dependent 的部分追加到 `userContent`（动态层）；稳定部分仍按既有规则进入稳定模板（Layer 2）。

> 注：第 4 步的“分区”能力决定是否需要扩展 IPC 响应结构；若暂不扩展响应，可通过 **两次调用** 或 **约定 queryText 只影响 userContent 注入** 实现（见“稳定前缀边界”）。

---

## 表设计：`user_memory_vec`

### 建表（vec0）

建议使用 vec0 虚拟表（与现有 `articles_vec` 等一致）：

```sql
CREATE VIRTUAL TABLE IF NOT EXISTS user_memory_vec USING vec0(
  memory_id TEXT PRIMARY KEY,
  embedding FLOAT[${dimension}]
);
```

说明：

- `user_memory` 是 SSOT；`user_memory_vec` 是可重建的派生索引。
- 维度 `dimension` 必须与全局 `settings.embedding.dimension` 一致；不一致按 `CONFLICT` 处理并触发降级。

### 索引维护策略

- **新增/更新**：对 `user_memory` 写入/更新 embedding 后，upsert 到 `user_memory_vec`。
- **软删除**：当 `user_memory.deleted_at` 被设置时，推荐同步从 `user_memory_vec` 删除该行（避免召回到 tombstone）。
- **重建**：当维度发生变化或索引损坏时，删除 vec 表并重新对全量 `user_memory` 建索引。

---

## `VectorStore` 扩展（建议接口）

在 `writenow-theia/writenow-core/src/node/rag/vector-store.ts` 增加与既有模式一致的方法：

- `ensureUserMemoryIndex(dimension: number): void`
  - Why: 以统一路径加载 sqlite-vec、校验维度并创建 `user_memory_vec`。
- `upsertUserMemoryEmbeddings(items: Array<{ memoryId: string; embedding: number[] }>): void`
- `deleteUserMemoryEmbeddings(memoryIds: string[]): void`
- `querySimilarUserMemory(queryEmbedding: number[], options?: { topK?: number; offset?: number; maxDistance?: number | null }): Array<{ memoryId: string; distance: number }>`

约束：

- 错误语义必须与现有 `VectorStore` 一致（`INVALID_ARGUMENT | DB_ERROR | CONFLICT`）。
- 这些错误 **不能** 直接阻断 SKILL（应在 memory 注入层捕获并降级为确定性排序）。

---

## `memory:injection:preview` 的 `queryText` 语义

### 输入约束

- `queryText` 允许省略或为空字符串。
- 非空 `queryText` SHOULD 在服务端做长度上限裁剪（例如 2k–4k 字符），以避免不必要的 embedding 成本与不稳定行为。

### 召回与裁剪（建议）

- 语义召回 TopK（例如 20）→ 过滤（scope/privacy/deleted）→ 与 baseline 合并去重 → 按固定预算裁剪（maxItems/maxChars）。
- 排序必须可解释且尽量确定性：
  - 先按 semantic distance（或 score）排序
  - 再按 baseline 的确定性规则做 tie-break（type/scope/origin/updatedAt/id）

---

## 稳定前缀边界（Stable Prefix Boundary）

约束回顾：`stablePrefixHash` 只应覆盖 Layer 0–3 的稳定前缀。

语义召回是 query-dependent 的，因此：

- **MUST**：语义召回结果只能进入 `userContent`（动态层），不得进入稳定前缀。
- **MAY**：baseline 的确定性注入（与 query 无关）仍可进入稳定前缀（Layer 2）。

建议实现方式（两种二选一）：

### 方案 A（推荐）：扩展 preview 响应以区分 stable vs semantic

将 preview 结果拆成：

- `injected.memory`：baseline（确定性、稳定）— 进入 `systemPrompt` 的“用户偏好”章节
- `injected.semanticMemory`（或 `injected.recalled`）：语义召回结果 — 进入 `userContent`

优点：单次调用即可同时满足“稳定前缀 + 语义召回”。

### 方案 B（兜底）：两次调用

- 第一次：`memory:injection:preview({ projectId })` 获取 baseline（稳定）
- 第二次：`memory:injection:preview({ projectId, queryText })` 获取 semantic（动态）

优点：不必调整响应结构；缺点：多一次 IPC 与 embedding 开销。

无论采用哪种方案：

- query-dependent 的内容必须在 prompt 结构上体现为 **追加到末尾**（Append-only），避免破坏 KV-cache。

---

## 降级策略（必须不阻断）

当任一条件触发时，必须降级到 baseline：

- sqlite-vec 加载失败（`DB_ERROR`）
- embedding 维度冲突（`CONFLICT`）
- `queryText` 为空（禁用语义召回）

降级要求：

- 仍返回可用的注入结果（baseline）
- 输出可观测日志（包含降级原因与路径）
- 不得把异常堆栈穿透到 renderer（遵循 `api-contract`）

---

## 关联文件（落点）

- `writenow-theia/writenow-core/src/node/rag/vector-store.ts`：新增 `user_memory_vec` 支持
- `writenow-theia/writenow-core/src/node/services/memory-service.ts`：`previewInjection` 接入 `queryText` 与语义召回 + 降级
- `electron/ipc/contract/ipc-contract.cjs`：为 `MemoryInjectionPreviewRequest` 增加 `queryText?: string`（以及必要的响应扩展，如采用方案 A）
- `writenow-frontend/src/lib/ai/context-assembler.ts`：保证 query-dependent 召回只进入 `userContent`，不影响稳定前缀
