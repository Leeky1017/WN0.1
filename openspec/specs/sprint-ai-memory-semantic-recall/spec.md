# Sprint：AI Memory Semantic Recall（用户记忆语义召回）

## 元信息

| 字段 | 值 |
|------|-----|
| 规范名称 | sprint-ai-memory-semantic-recall |
| 状态 | Draft |
| 创建时间 | 2026-01-28 |
| 上游依赖 | `openspec/specs/writenow-spec/spec.md`, `openspec/specs/sprint-ai-memory/spec.md`, `openspec/specs/api-contract/spec.md`, repo-root `AGENTS.md` |
| Purpose | 补齐 `user_memory` 语义召回能力（sqlite-vec），并增强数据模型可审计性（evidence/metadata/版本/软删除） |

---

## 技术栈锁定（必读 · 禁止替换）

> **警告**：以下技术/策略已锁定。执行本 Sprint 的实现任务时 **禁止替换为其他方案**；如需变更，必须先提交 RFC 并获得批准。

| 类别 | 锁定选型 | 禁止替换为 |
|------|----------|-----------|
| 本地存储 | SQLite（本地优先） | 外部数据库/云端记忆服务作为主路径 |
| 向量索引 | sqlite-vec（`vec0`） | 外部向量数据库（Qdrant/PGVector/Chroma/…）作为主路径 |
| IPC 合约 | `electron/ipc/contract/ipc-contract.cjs` 为 SSOT | 手改生成文件（如 `src/types/ipc-generated.ts`）或“随意返回结构/抛异常穿透” |

### 必读设计文档

| 文档 | 路径 | 说明 |
|------|------|------|
| AI Memory 基线 | `openspec/specs/sprint-ai-memory/spec.md` | 6 层记忆架构、stablePrefixHash 口径与交付约束 |
| UserMemoryVec | `design/01-user-memory-vec.md` | `user_memory_vec`（vec0）索引设计与召回链路 |
| UserMemory Data Model | `design/02-user-memory-data-model.md` | `user_memory` 模型增强、迁移与软删除语义 |

---

## Purpose

在 `sprint-ai-memory` 已完成“稳定前缀 + 自动偏好注入”基线后，仍存在两个关键缺口：

1. **缺少 user_memory 的语义召回索引**：当前注入选择主要依赖确定性排序（时间/type/scope/origin），无法做到“与当前选区/指令语义相关的偏好/记忆优先”。
2. **user_memory 数据模型不可审计**：缺少置信度、证据、元数据、版本与软删除，难以追溯“为什么注入了这条记忆/它从何而来/是否可信/如何回滚”。

本 Sprint 的目标是在不引入外部服务（Local-first）的前提下：

- 用 sqlite-vec（`vec0`）为 `user_memory` 提供语义召回能力；
- 升级数据模型以增强可审计性；
- 严格保护 `stablePrefixHash`：任何与 `queryText` 相关的召回内容必须进入 `userContent`，不得进入稳定前缀。

---

## Requirements

### Requirement: MUST 实现 `user_memory_vec` 语义召回索引（sqlite-vec vec0）

系统 MUST 为 `user_memory` 建立语义召回索引表 `user_memory_vec`（sqlite-vec `vec0`），并提供基于向量相似度的 TopK 检索能力（用于 memory 注入排序/补充）。

#### Scenario: 初始化向量索引（首次创建）
- **GIVEN** embedding 维度为 `D`
- **WHEN** 系统初始化/确保 `user_memory` 语义索引
- **THEN** 系统 MUST 创建 `user_memory_vec`（`vec0`）并绑定维度 `D`
- **AND THEN** 系统 MUST 将维度持久化并与后续调用一致（维度冲突见降级策略）

#### Scenario: 增量维护索引
- **GIVEN** `user_memory` 存在新增/更新/删除（软删除）条目
- **WHEN** 系统写入/更新该条目的 embedding
- **THEN** 系统 MUST 同步更新 `user_memory_vec`（upsert/删除向量行）
- **AND THEN** 任何索引维护失败 MUST 可观测，但不得阻断 SKILL 运行（见降级策略）

### Requirement: MUST 支持 `memory:injection:preview` 接入可选的 `queryText`

`memory:injection:preview` MUST 支持可选参数 `queryText?: string`，用于驱动“与当前请求语义相关”的记忆召回。

#### Scenario: `queryText` 为空/缺失时兼容旧行为
- **GIVEN** `memory:injection:preview` 未提供 `queryText` 或 `queryText` 为空字符串
- **WHEN** 服务执行注入预览
- **THEN** 服务 MUST 回退到确定性排序的选择逻辑（与历史行为一致）

### Requirement: MUST 保持语义召回结果不破坏 `stablePrefixHash`

任何由 `queryText` 驱动的语义召回结果 MUST 进入 `userContent`（动态内容），不得进入 `systemPrompt` 的稳定前缀部分（Layer 0–3），以保证 `stablePrefixHash` 在 query 变化时保持稳定。

#### Scenario: query 变化不影响稳定前缀
- **GIVEN** 同一 SKILL、同一项目、Layer 0–3 内容不变
- **WHEN** 用户仅改变选区/补充指令导致 `queryText` 改变
- **THEN** 本次 run 的 `stablePrefixHash` MUST 保持一致
- **AND THEN** 语义召回相关内容 MUST 仅影响 `userContent`（或等价的动态层），不得影响稳定前缀字节序列

### Requirement: MUST 实现降级策略（不阻断 SKILL 运行）

语义召回链路 MUST 具备明确且可观测的降级策略；任一降级分支都 MUST 允许 SKILL 继续执行。

必须覆盖以下降级条件：

- sqlite-vec 不可用（扩展加载失败）
- embedding 维度冲突（与已存 `embedding.dimension` 不一致）
- `queryText` 为空（禁用语义召回）

#### Scenario: sqlite-vec 不可用时降级
- **GIVEN** sqlite-vec 扩展加载失败
- **WHEN** 触发 `memory:injection:preview(queryText=...)`
- **THEN** 系统 MUST 回退到确定性排序
- **AND THEN** 系统 MUST 记录可观测日志（包含失败原因与降级路径）

#### Scenario: embedding 维度冲突时降级
- **GIVEN** 当前 embedding 维度与已存维度不一致
- **WHEN** 触发语义召回
- **THEN** 系统 MUST 回退到确定性排序
- **AND THEN** 系统 SHOULD 输出可恢复指引（例如“重建向量索引”），但不得阻断 SKILL

### Requirement: SHOULD 升级 `user_memory` 数据模型（可审计）

系统 SHOULD 为 `user_memory` 增加以下字段以增强可审计性与可恢复性，并且迁移实现 MUST 不丢失旧数据且新增字段 MUST 具备稳定默认值（可用于审计与回归测试）：

- `confidence`（0..1）
- `evidence_json`（稳定 JSON string，证据引用数组）
- `metadata_json`（稳定 JSON string，扩展元数据对象）
- `revision`（整数版本号，用于并发/回滚语义）
- `deleted_at`（软删除 tombstone；NULL=有效）

> 约束：**不需要新增 `origin` 字段**；当前已通过 `id` 前缀推断（IPC 类型已存在 `origin: UserMemoryOrigin`）。

#### Scenario: 存量数据迁移后可审计
- **GIVEN** 存量数据库中存在 `user_memory` 旧记录（不含新增列）
- **WHEN** 系统执行 schema 迁移到包含新增列的版本
- **THEN** 旧记录 MUST 保留且可被读取
- **AND THEN** 新增列 MUST 具备稳定默认值（例如 `confidence=1.0`、`evidence_json="[]"`、`metadata_json="{}"`、`revision=1`、`deleted_at=NULL`）

### Requirement: SHOULD 将 `memory:delete` 改为软删除语义

系统 SHOULD 将 `memory:delete` 的语义改为软删除（设置 `deleted_at`），并保证默认 list/preview/注入不会返回已删除条目；同时保留审计与未来“恢复/回滚”的演进空间。默认行为 MUST 过滤 `deleted_at IS NOT NULL` 的条目，且不得因软删除引入 silent failure。

#### Scenario: 软删除后默认不可见但可审计
- **GIVEN** 某条 `user_memory` 已通过 `memory:delete` 被软删除（`deleted_at` 非空）
- **WHEN** 调用 `memory:list` 或 `memory:injection:preview`
- **THEN** 响应 MUST 不包含该条目
- **AND THEN** 该条目 MUST 仍存在于 DB 中以便审计（未来可恢复/回滚）

---

## Out of Scope（非目标）

- 本 Sprint 不要求引入任何云端记忆服务或外部向量数据库。
- 本 Sprint 不要求新增 `origin` 字段到 DB（保持现有“由 id 前缀推断”）。

---

## References

- 上游产品规范：`openspec/specs/writenow-spec/spec.md`
- 上游 AI Memory Sprint：`openspec/specs/sprint-ai-memory/spec.md`
- IPC 契约规范：`openspec/specs/api-contract/spec.md`
- 仓库治理与交付：repo-root `AGENTS.md`
