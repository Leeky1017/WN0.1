# Spec Delta: AI Memory Semantic Recall（ISSUE-346）

## SSOT

本任务的权威规范（SSOT）为：

- `openspec/specs/sprint-ai-memory-semantic-recall/spec.md`

本文件仅用于在 Rulebook task 中固化“本次实现要交付什么”，避免执行期漂移；如与 SSOT 冲突，以 SSOT 为准。

---

## Delta Requirements（实现摘要）

- MUST：建立 `user_memory_vec`（sqlite-vec `vec0`）语义召回索引，并提供 TopK 相似检索能力（可用于注入排序/补充）。
- MUST：`memory:injection:preview` 支持可选 `queryText?: string`：
  - `queryText` 为空/缺失：保持确定性排序，兼容旧行为。
  - `queryText` 非空：尝试语义召回；任一失败分支必须自动降级但不阻断 SKILL。
- MUST：保护 `stablePrefixHash`——任何 query-dependent 的召回结果只能进入 `userContent`（动态层），不得进入稳定前缀（Layer 0–3）。
- MUST：实现可观测降级策略（至少覆盖：sqlite-vec 不可用 / embedding 维度冲突 / 空 query），并输出稳定、可检索的日志证据。
- SHOULD：升级 `user_memory` 数据模型（confidence/evidence_json/metadata_json/revision/deleted_at）并以显式迁移升级存量数据库；`memory:delete` 改为软删除（tombstone）。

---

## Implementation Notes（约定/不变量）

- 约定：优先采用“响应扩展（stable vs semantic 分区）”的方式满足稳定前缀边界（Additive change，保持向后兼容）。
- 不变量：
  - queryText 变化不得改变稳定前缀字节序列与 `stablePrefixHash`。
  - IPC 边界必须返回 `IpcResponse<T>`，不得将异常/堆栈穿透到 renderer。
  - 禁止手改生成的 IPC 文件；契约变更从 `electron/ipc/contract/ipc-contract.cjs` 入手并通过 contract pipeline 同步。

---

## Scenarios（E2E 重点）

#### Scenario: 空 query 回退 deterministic
- GIVEN `queryText` 为空字符串或缺失
- WHEN `memory:injection:preview({ queryText: "" })`
- THEN 返回与旧行为一致的确定性排序结果

#### Scenario: sqlite-vec 不可用自动降级且不阻断
- GIVEN sqlite-vec 扩展加载失败
- WHEN 调用 `memory:injection:preview({ queryText })`
- THEN 自动降级 deterministic，SKILL 仍可运行，日志可定位降级原因

#### Scenario: embedding 维度冲突自动降级且不阻断
- GIVEN embedding 维度与已存维度不一致
- WHEN 调用 `memory:injection:preview({ queryText })`
- THEN 自动降级 deterministic，日志包含可恢复指引（例如重建索引）

#### Scenario: query 变化不影响 stablePrefixHash
- GIVEN Layer 0–3 不变
- WHEN 仅 `queryText` 改变
- THEN `stablePrefixHash` 保持一致

