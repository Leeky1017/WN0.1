# Proposal: issue-56-context-p0-core

## Why
Sprint 2.5 需要把 AI 上下文注入升级为“可组合、可预算、可观测”的系统能力（ContextAssembler + TokenBudgetManager + `.writenow/` 作为项目 SSOT），否则 Sprint 2/3 的 AI/RAG 将长期依赖零散拼接，难以控制 token、难以复现与调试。

## What Changes
- 新增上下文工程核心类型与契约：四层上下文、可追溯 chunk、预算统计与裁剪证据。
- 新增 `.writenow/` 项目目录识别与 Rules/Settings 加载器（Rules 预加载缓存、Settings 按需加载），并提供文件变更监听与事件。
- 新增 TokenBudgetManager：按 total + per-layer 预算裁剪，语义安全（按 chunk/段落边界），输出可展示的裁剪证据。
- 新增 ContextAssembler：按 Rules→Settings→Retrieved→Immediate 顺序组装，输出 KV-Cache 友好 Prompt（稳定前缀 + 动态后缀）与可视化/调试结构。

## Impact
- Affected specs: `openspec/specs/sprint-2.5-context-engineering/spec.md`
- Affected code: `src/types/context.ts`, `src/lib/context/**`, `electron/ipc/**`, `electron/preload.cjs`, `electron/main.cjs`
- Breaking change: NO (新增 IPC channel；既有 channel 不变)
- User benefit: 上下文注入可控、可解释、可复现；为后续 RAG/历史/可视化打好核心架构基础。
