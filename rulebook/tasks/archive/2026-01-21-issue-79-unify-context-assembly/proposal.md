# Proposal: issue-79-unify-context-assembly

## Why
当前存在两套上下文组装链路：

- 渲染进程（新）：`src/lib/context/ContextAssembler.ts`（分层/预算/证据/可视化）
- 主进程（旧）：`electron/ipc/ai.cjs` 的 `buildPrompt()`（简单模板替换）

Context Viewer 展示的是新引擎结果，但实际模型调用走旧引擎，导致“可视化调试信息 ≠ 实际行为”，违反仓库硬约束「一条链路一套实现」，也与 Sprint 2.5 Context Engineering “ContextAssembler 是唯一组装入口”的规范意图不一致。

## What Changes
- 将 `ai:skill:run` IPC handler 迁移为使用 `ContextAssembler.assemble()` 产出的 `systemPrompt` + `userContent` 作为唯一请求内容来源
- 确保 Context Viewer 展示的 prompt 与实际发送给模型的 prompt 100% 一致（同一组装结果 SSOT）
- 删除 `electron/ipc/ai.cjs` 内 legacy prompt 组装函数（`buildPrompt()` / `formatContextBlock()` / `formatInjectedMemoryBlock()` 等）与不再使用的模板渲染工具
- 必要时同步 IPC contract（`contract:generate` / `contract:check`）并保持现有 E2E 通过

## Impact
- Affected specs: `openspec/specs/sprint-2.5-context-engineering/spec.md`, `openspec/specs/sprint-2-ai/spec.md`
- Affected code: `electron/ipc/ai.cjs`, `src/lib/context/*`, `src/types/ipc-generated.ts`, `tests/e2e/*`
- Breaking change: NO（目标：不新增 channel、不改变现有 request/response 形态；如不可避免，将同步 contract 与调用方并在 tasks 中显式标注）
- User benefit: 调试结果可信；上下文注入链路统一可观测；减少技术债与行为漂移风险
