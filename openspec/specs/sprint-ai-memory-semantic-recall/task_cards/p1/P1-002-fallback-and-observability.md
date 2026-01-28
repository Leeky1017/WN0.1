# P1-002: 降级策略 + 可观测日志 + E2E 覆盖（语义召回不阻断）

Status: done  
Issue: #346  
PR: https://github.com/Leeky1017/WN0.1/pull/347  
RUN_LOG: openspec/_ops/task_runs/ISSUE-346.md

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P1-002 |
| Phase | 1 - 降级与可观测 |
| 优先级 | P1 |
| 状态 | done |
| 依赖 | P0-001, P1-001 |

## 必读前置（执行前必须阅读）

- [x] `openspec/specs/sprint-ai-memory-semantic-recall/spec.md`（降级必须不阻断）
- [x] `openspec/specs/sprint-ai-memory/spec.md`（stablePrefixHash / Append-only / 失败语义）
- [x] `openspec/specs/api-contract/spec.md`（错误码/Envelope）
- [x] `writenow-theia/writenow-core/src/node/rag/vector-store.ts`（`DB_ERROR`/`CONFLICT` 语义）
- [x] `writenow-theia/writenow-core/src/node/services/memory-service.ts`
- [x] `writenow-frontend/src/lib/ai/context-assembler.ts`

## 目标

为 user_memory 语义召回链路补齐“坏了怎么办”的工程化兜底：任何语义召回失败都不能阻断 SKILL；同时必须留下可观测证据（日志/可复现 E2E），以便定位与回归。

## 关键改动点

- 降级条件覆盖：
  - sqlite-vec 扩展加载失败（`DB_ERROR`）
  - embedding 维度冲突（`CONFLICT`）
  - `queryText` 为空（禁用语义召回）
- 降级行为：
  - MUST 回退到确定性排序（baseline）
  - MUST 不阻断 SKILL（preview 与实际运行均可继续）
- 可观测性：
  - MUST 记录结构化日志（包含：mode=semantic|deterministic、reason、dimension、topK、projectId 是否存在等）
  - SHOULD 在 debug/诊断路径中可回显“本次使用了哪种召回模式”（若 IPC 不扩展，则至少日志可见）
- E2E：
  - 覆盖三条关键分支：空 query / sqlite-vec 不可用 / 维度冲突

## 任务清单

- [x] 在 memory 注入层实现统一的 recall 选择器：
  - [x] 语义召回成功：mode=semantic
  - [x] 任一失败/禁用：mode=deterministic（并记录 reason）
- [x] 增加可观测日志（logger.info/warn/error，格式稳定，便于检索）
- [x] 增加 E2E 覆盖（真实持久化 + 真实 UI 交互）：
  - [x] `queryText=""` → deterministic
  - [x] 模拟 sqlite-vec 不可用 → deterministic（SKILL 仍可运行）
  - [x] 模拟 embedding 维度冲突 → deterministic（SKILL 仍可运行）

## 验收标准

- [x] 三种降级条件均可稳定复现且不会阻断 SKILL（不出现 UI 卡死/loading 挂起）
- [x] 降级路径具备可观测证据（日志可定位到原因与模式）
- [x] `stablePrefixHash` 不受 query-dependent 内容影响（E2E 断言）
- [x] E2E 在 CI 中通过并写入 RUN_LOG 证据

## E2E 场景（建议步骤）

- [x] Case A：空 query
  - [x] 调用 `memory:injection:preview({ projectId, queryText: "" })`
  - [x] 断言：走 deterministic
- [x] Case B：sqlite-vec 不可用
  - [x] 以可控方式让 sqlite-vec 加载失败（例如测试环境禁用扩展/注入错误）
  - [x] 断言：走 deterministic，SKILL 仍可运行
- [x] Case C：维度冲突
  - [x] 预置 `settings.embedding.dimension` 与当前 embedding 输出维度不一致
  - [x] 断言：走 deterministic，SKILL 仍可运行，并输出可恢复指引（日志/诊断）

