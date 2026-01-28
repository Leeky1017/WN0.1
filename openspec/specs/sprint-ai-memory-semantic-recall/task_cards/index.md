# Sprint AI Memory Semantic Recall 任务卡片索引

## 概览

| Phase | 主题 | 任务数 | 状态 |
|-------|------|--------|------|
| P0 | user_memory_vec + preview queryText 接入 | 1 | Draft |
| P1 | 数据模型增强 + 降级与可观测 | 2 | Draft |

**总计：3 个任务**

---

## Phase 0：user_memory_vec + preview queryText（P0）

| ID | 任务 | 优先级 | 状态 |
|----|------|--------|------|
| [P0-001](p0/P0-001-user-memory-vec.md) | `user_memory_vec` 建表 + VectorStore 方法 + `memory:injection:preview` 接入 `queryText` | P0 | Draft |

**验收标准（Phase）**：在 sqlite-vec 可用时，`memory:injection:preview(queryText=...)` 可以触发语义召回；在 `queryText` 为空时保持确定性排序且兼容旧行为；query-dependent 内容不进入稳定前缀。

---

## Phase 1：数据模型增强 + 降级与可观测（P1）

| ID | 任务 | 优先级 | 状态 |
|----|------|--------|------|
| [P1-001](p1/P1-001-data-model-migration.md) | `user_memory` 表增强 + `migrateToV10` + IPC 契约同步 | P1 | Draft |
| [P1-002](p1/P1-002-fallback-and-observability.md) | 降级策略 + 可观测日志 + E2E 覆盖 | P1 | Draft |

**验收标准（Phase）**：任何语义召回失败都不会阻断 SKILL；降级路径可观测、可复现；E2E 覆盖空 query / sqlite-vec 不可用 / 维度冲突分支。

---

## 依赖关系图

```
P0-001 ──┬──> P1-001
         └──> P1-002
P1-001 ──> P1-002
```

