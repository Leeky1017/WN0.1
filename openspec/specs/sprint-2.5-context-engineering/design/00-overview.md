# Design: Sprint 2.5 Context Engineering Overview

## Goals

- 把“上下文注入”从零散拼接升级为**可组合、可预算、可观测**的系统能力（ContextAssembler）。
- 用**稳定前缀 + append-only** 的 Prompt 结构提升 KV-Cache 命中，降低成本与尾延迟。
- 以 `.writenow/` 作为项目级长期记忆与设定结构的单一事实源（File System as Context）。
- 让用户与开发者能**看见**：这次 AI 调用到底发送了什么、每层用了多少 Token、哪里被裁剪了。

## Non-Goals

- 不在本 Sprint 实现完整 RAG（embedding/向量检索/rerank），只定义 Retrieved 层接口与扩展点。
- 不做“学习型上下文选择”与复杂 NER（仅 Phase 1：字符串匹配；Phase 2 作为扩展点）。
- 不绑定单一模型或单一 token 计数器实现：只定义可替换的 TokenEstimator 契约。

## Architecture Overview

### Modules

- **ContextAssembler**：唯一的上下文组装入口，负责按层收集 chunk、调用预算裁剪、产出 Prompt + 结构化分解。
- **TokenBudgetManager**：预算分配与执行器；输出裁剪证据（why/what saved）。
- **PromptTemplateSystem**：稳定前缀模板（系统角色/输出格式/skill 定义/规则），动态内容一律在后缀注入。
- **ProjectRulesLoader**：预加载 `.writenow/rules/*` 并缓存；变更时刷新并通知组装器。
- **SettingsLoader**：按需加载 `.writenow/characters/*`、`.writenow/settings/*`；支持实体触发预热。
- **ConversationHistoryManager**：对话落盘、索引、摘要与历史检索（尤其“像上次那样”）。
- **EditorContextSync**：把编辑器即时状态同步到 Store（选区/光标段落/前后文/检测实体）。
- **ContextViewer**：UI 侧展示 assembled prompt（分层 + token + 裁剪摘要 + 来源）。

### Data Flow (high level)

```
Editor (TipTap) ──sync──▶ EditorContextStore
                           │
User triggers SKILL ───────┼──────────────▶ ContextAssembler.forSkill(...)
                           │                   │
.writenow/rules  ──load──▶ RulesLoader         │
.writenow/settings/characters ─load/resolve──▶ SettingsLoader
Conversation index ─retrieve/summary──────────▶ ConversationHistoryManager
Sprint 3 RAG ──────────────(future)──────────▶ RetrievedProvider
                                               │
                                               ▼
                                     TokenBudgetManager.enforce(...)
                                               │
                                               ▼
                                      AssembledContext (prompt + chunks)
                                               │
                                               ▼
                                         ContextViewer (UI)
                                               │
                                               ▼
                                    Sprint 2 AI proxy sends to model
```

## Contracts (minimum)

- `ContextAssembler` 必须返回：
  - 可发送的 `systemPrompt` / `userContent`
  - 分层 `chunks[]`（每段有 source/token/priority）
  - `budgetUsage`（per-layer used/budget）与裁剪摘要（如发生）
- 任何“动态裁剪”都必须生成可展示的证据（用于 UI + 诊断），禁止 silent trimming。

