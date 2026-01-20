# Proposal: issue-48-sprint-2-ai-a

## Why
Sprint 2 阶段 A 需要打通 WriteNow 的「AI 写作协作」最小闭环：云端模型调用必须经由 Electron 主进程代理（渲染进程不持有密钥），支持中转站与流式反馈；提供 3 个内置基础 SKILL；结果必须以 Diff 呈现并要求用户确认后才应用；每次 AI 接受修改必须自动形成版本快照并可回退。该闭环是后续自定义 SKILL、上下文工程与 Judge Layer 的前置依赖。

## What Changes
- Main process: implement Claude (Anthropic) streaming proxy via IPC (`ai:skill:run` / `ai:skill:cancel`) with baseUrl + cancellation.
- Skill system: define TS-side SKILL model, and ensure 3 builtin skills are idempotently written to `skills` table (`is_builtin=1`).
- Diff confirmation: render default Diff view (green insert / red delete) and only apply on user accept.
- Version history: create AI snapshots on accept (`article_snapshots.actor='ai'`), add history panel + rollback flow.
- E2E: add Playwright coverage for the main user path (streaming visible, cancel, confirm before apply, snapshot created).

## Impact
- Affected specs: `openspec/specs/sprint-2-ai/spec.md`, `openspec/specs/api-contract/spec.md`
- Affected code: `electron/`, `src/`, `tests/e2e/`
- Breaking change: NO (additive IPC + UI; existing editor/file flows remain)
- User benefit: AI 能力可用且可控（流式可见、可取消、Diff 确认、自动版本）。

