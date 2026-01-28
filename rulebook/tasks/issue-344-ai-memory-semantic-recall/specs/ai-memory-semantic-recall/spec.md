# Spec Delta: AI Memory Semantic Recall（ISSUE-344）

## SSOT

本任务的权威规范（SSOT）为：

- `openspec/specs/sprint-ai-memory-semantic-recall/spec.md`

本文件仅用于在 Rulebook task 中固化“本次任务要交付什么”，避免执行期漂移；如与 SSOT 冲突，以 SSOT 为准。

---

## Delta Requirements（摘要）

- MUST：建立 `user_memory_vec`（sqlite-vec `vec0`）语义召回索引，并提供 TopK 相似检索能力。
- MUST：`memory:injection:preview` 支持可选 `queryText?: string`；`queryText` 为空/缺失时保持确定性排序兼容旧行为。
- MUST：保护 `stablePrefixHash`——任何 query-dependent 的召回结果只能进入 `userContent`，不得进入稳定前缀（Layer 0–3）。
- MUST：语义召回失败不阻断 SKILL（sqlite-vec 不可用 / 维度冲突 / 空 query 等分支必须降级到确定性排序）。
- SHOULD：升级 `user_memory` 数据模型（confidence/evidence_json/metadata_json/revision/deleted_at）。
- SHOULD：`memory:delete` 改为软删除语义（tombstone）。

---

## Scenarios（可验收）

#### Scenario: query 变化不影响 stablePrefixHash
- GIVEN Layer 0–3 不变
- WHEN 仅 `queryText` 改变
- THEN `stablePrefixHash` 保持一致

#### Scenario: 语义召回失败自动降级
- GIVEN sqlite-vec 不可用或 embedding 维度冲突
- WHEN 调用 `memory:injection:preview({ queryText })`
- THEN 自动降级为确定性排序且不阻断 SKILL

