# P0-001: `user_memory_vec`（语义召回索引）+ preview `queryText` 接入

Status: Draft  
Issue: #344  
PR: <fill-after-created>  
RUN_LOG: openspec/_ops/task_runs/ISSUE-344.md

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P0-001 |
| Phase | 0 - user_memory_vec + preview queryText |
| 优先级 | P0 |
| 状态 | Draft |
| 依赖 | `openspec/specs/sprint-ai-memory/spec.md`（stablePrefixHash 基线） |

## 必读前置（执行前必须阅读）

- [ ] `openspec/specs/sprint-ai-memory-semantic-recall/spec.md`
- [ ] `openspec/specs/sprint-ai-memory-semantic-recall/design/01-user-memory-vec.md`
- [ ] `openspec/specs/sprint-ai-memory/spec.md`（stablePrefixHash / Append-only / 失败语义）
- [ ] `openspec/specs/api-contract/spec.md`（IPC Envelope + 错误码）
- [ ] `writenow-theia/writenow-core/src/node/rag/vector-store.ts`（sqlite-vec 现状）
- [ ] `writenow-theia/writenow-core/src/node/services/memory-service.ts`（memory 现状）
- [ ] `electron/ipc/contract/ipc-contract.cjs`（IPC contract SSOT）
- [ ] `writenow-frontend/src/lib/ai/context-assembler.ts`（stable systemPrompt vs userContent 分界）

## 目标

为 `user_memory` 提供语义召回能力，并让 `memory:injection:preview` 支持可选 `queryText`，用于“与当前请求语义相关”的记忆召回与注入补充；同时严格保护 `stablePrefixHash`（query-dependent 内容只能进入 `userContent`）。

## 关键改动点

- `VectorStore` 增加 `user_memory_vec`（sqlite-vec `vec0`）虚拟表与查询方法。
- `memory:injection:preview` 接入可选 `queryText?: string`：
  - `queryText` 为空/缺失 → 兼容旧行为（确定性排序）
  - `queryText` 非空 → 尝试语义召回（失败可降级，但不阻断 SKILL）
- **稳定前缀边界**：
  - query-dependent 的召回结果必须进入 `userContent`（动态层）
  - 不得进入稳定前缀（Layer 0–3）以保证 `stablePrefixHash` 不随 query 变化
- IPC 变更从 `electron/ipc/contract/ipc-contract.cjs` 入手；禁止直接修改生成文件。

## 任务清单

- [ ] `VectorStore`：新增 `ensureUserMemoryIndex()` + `querySimilarUserMemory()`（命名可按现有风格微调）
- [ ] `MemoryService.previewInjection()`：新增 `queryText` 处理分支（空值兼容；非空触发语义召回）
- [ ] IPC contract：为 `MemoryInjectionPreviewRequest` 增加 `queryText?: string`
- [ ] Frontend：确保语义召回结果不会进入稳定前缀（必要时将 query-dependent 注入追加到 `userContent`）

## 验收标准

- [ ] `user_memory_vec` 表按 `vec0` 成功创建，且 embedding 维度与 `settings.embedding.dimension` 一致（不一致交由降级处理）
- [ ] `memory:injection:preview` 支持 `queryText?: string`，并在 `queryText` 为空/缺失时与旧行为一致（确定性排序）
- [ ] query-dependent 的召回结果不会改变 `stablePrefixHash`（只影响 `userContent` 或等价动态层）
- [ ] 任何语义召回失败不会阻断 SKILL 执行（至少：preview 可返回 baseline 注入结果）

## E2E 场景（建议步骤）

- [ ] 准备：写入多条 `user_memory`（包含 global/project、manual/learned）
- [ ] 调用 `memory:injection:preview({ projectId, queryText: "" })`：
  - [ ] 断言：结果为确定性排序（与旧路径一致）
- [ ] 调用 `memory:injection:preview({ projectId, queryText: "<非空>" })`：
  - [ ] 断言：语义召回路径生效（在 sqlite-vec 可用时）
  - [ ] 断言：`stablePrefixHash` 不因 queryText 变化而变化

