# Proposal: issue-346-ai-memory-semantic-recall

## Why
`sprint-ai-memory` 已完成 stablePrefixHash + 自动偏好注入基线，但 `user_memory` 仍缺少语义召回能力，导致“与当前选区/指令语义相关”的记忆无法被优先注入；同时现有数据模型不可审计（缺少置信度/证据/元数据/版本/软删除），难以解释“为什么注入了这条记忆、它从何而来、是否可信、如何回滚”。本任务将 `sprint-ai-memory-semantic-recall` 的规范落地为可运行、可回归的实现与 E2E。

## What Changes
- Backend（Theia）：
  - 为 `user_memory` 增加 sqlite-vec `vec0` 索引 `user_memory_vec`，并提供 TopK 语义召回查询与索引维护（upsert/delete）。
  - `memory:injection:preview` 接入可选 `queryText?: string`：空值保持确定性排序；非空尝试语义召回并与 baseline 合并；任何失败自动降级但不阻断 SKILL。
  - 升级 `user_memory` 表至 v10（confidence/evidence_json/metadata_json/revision/deleted_at + 索引），并将 `memory:delete` 改为软删除。
- IPC contract（SSOT）：
  - 从 `electron/ipc/contract/ipc-contract.cjs` 变更请求/响应类型并通过 contract pipeline 生成/校验（禁止手改生成文件）。
- Frontend：
  - 严格保护 `stablePrefixHash`：query-dependent 的召回结果只进入 `userContent`（动态层），不得进入稳定前缀（Layer 0–3）。
- Tests：
  - 增加真实 E2E 覆盖：空 query / sqlite-vec 不可用 / 维度冲突降级、`stablePrefixHash` 不变、软删除默认不可见但可审计。

## Impact
- Affected specs:
  - `openspec/specs/sprint-ai-memory-semantic-recall/spec.md`
  - `openspec/specs/sprint-ai-memory-semantic-recall/task_cards/**`（完成后回填 Issue/PR/RUN_LOG 与验收勾选）
- Affected code:
  - `electron/ipc/contract/ipc-contract.cjs`
  - `writenow-theia/writenow-core/src/node/rag/vector-store.ts`
  - `writenow-theia/writenow-core/src/node/services/memory-service.ts`
  - `writenow-theia/writenow-core/src/node/database/schema.sql`
  - `writenow-theia/writenow-core/src/node/database/init.ts`
  - `writenow-frontend/src/lib/ai/context-assembler.ts`
  - `tests/e2e/**`
- Breaking change: NO（新增字段与响应扩展均保持向后兼容；`queryText` 为可选参数）
- User benefit: 记忆注入与当前请求更相关、更可解释；任何语义召回故障都可自动降级且可观测，避免卡死/不可恢复。
