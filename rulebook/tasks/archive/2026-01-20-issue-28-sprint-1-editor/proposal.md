# Proposal: issue-28-sprint-1-editor

## Why
- Sprint 1 的编辑器当前仍是 textarea/contentEditable 占位实现，无法满足 TipTap 内核、双模式一致性、自动保存与崩溃恢复的 Sprint 1 规范要求。
- 需要把“本地可日常使用”的最小闭环打通：真实文件落盘、TipTap 编辑、Markdown/富文本切换不漂移、2 秒防抖自动保存、以及崩溃恢复。

## What Changes
- 用 TipTap（StarterKit + Markdown 扩展）替换占位编辑器，实现基础富文本能力与工具栏。
- 以 Zustand 作为单一事实来源（SSOT）统一管理：文件列表、当前文档内容（Markdown SSOT）、脏/保存状态、编辑模式（markdown/richtext）。
- 实现 2 秒防抖自动保存 + `Ctrl/Cmd+S` 立即保存；并引入 5 分钟快照与启动崩溃检测/恢复提示流程。
- 补齐/对齐 IPC 契约（含新增的快照/会话相关通道，如引入），并用 Playwright E2E 覆盖核心用户路径。

## Impact
- Affected specs: `openspec/specs/sprint-1-editor/spec.md`, `openspec/specs/api-contract/spec.md` (if新增 IPC)
- Affected code: `electron/main.cjs`, `electron/ipc/files.cjs`, `electron/preload.cjs`, `src/components/Editor*`, `src/stores/*`, `tests/e2e/*`
- Breaking change: NO (UI/IPC 增量；保留既有 `file:*` 通道行为)
- User benefit: 本地编辑可用且更可靠：富文本能力、模式切换稳定、自动保存与崩溃恢复降低内容丢失风险。
