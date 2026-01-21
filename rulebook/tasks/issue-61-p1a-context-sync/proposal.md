# Proposal: issue-61-p1a-context-sync

## Why
Sprint 2.5 Context Engineering P1-A 需要把编辑器（TipTap）的选区/光标/段落与滑动窗口上下文实时同步到 Immediate 层的 SSOT，并在选区命中人物/地点等实体时触发 Settings 预加载；同时升级 PromptTemplateSystem 为“稳定前缀 + 动态后缀”的可版本化模板，确保 KV-Cache 友好与可观测。

## What Changes
- Add: `src/stores/editorContextStore.ts`（Immediate SSOT：editor context + detectedEntities + debounce 配置）
- Update: `src/components/Editor/`（TipTap selectionUpdate/transaction 订阅并同步到 store）
- Add: `src/lib/context/entity-detect.ts` + tests（Phase 1：正则/字符串匹配 + explainable hits）
- Update: `src/lib/context/loaders/settings-loader.ts`（支持 `prefetchByEntities`，提升上下文组装命中率与速度）
- Update: `src/lib/context/prompt-template.ts` + `src/lib/context/assembler.ts`（模板版本化、稳定前缀结构化注入、skill 差异化模板）
- Add: `tests/e2e/`（editor context sync / entity inject / prefix stability）
- Add: `openspec/_ops/task_runs/ISSUE-61.md`

## Impact
- Affected specs:
  - `openspec/specs/sprint-2.5-context-engineering/task_cards/p1/CONTEXT-P1-005-editor-context-sync.md`
  - `openspec/specs/sprint-2.5-context-engineering/task_cards/p1/CONTEXT-P1-006-entity-detection.md`
  - `openspec/specs/sprint-2.5-context-engineering/task_cards/p1/CONTEXT-P1-007-prompt-template-system.md`
- Affected code: `src/components/Editor/**`, `src/stores/**`, `src/lib/context/**`, `tests/e2e/**`
- Breaking change: NO（内部链路重构；对外 API/IPC contract 不新增双栈）
- User benefit: 更快、更稳定、更可解释的上下文注入，为后续 RAG/记忆/可视化调试打基础
