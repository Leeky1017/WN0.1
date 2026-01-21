# Proposal: issue-60-p1b-conversation-memory

## Why
Sprint 2.5 的 Context Engineering 需要可持续的“对话历史记忆”能力：用户在多个会话与多天写作过程中会反复表达偏好（语气、体裁、结构、格式约束等），并通过“像上次那样”等指令要求复用。若不做持久化与可检索索引，体验会退化为一次性对话且 token 成本不可控。

## What Changes
- 在 `.writenow/conversations/` 引入冷热存储：对话正文按会话落盘（`<conversationId>.json`）；全局 `index.json` 维护可检索元数据（时间、摘要、偏好信号等）。
- 对话结束时异步触发 L2/小模型生成“对话摘要”，写回会话文件与索引，用于后续注入节省 token；AI 不可用时降级为启发式摘要并标注质量。
- 在渲染侧 ContextAssembler 中增加“引用回溯处理”：当用户输入包含“像上次那样”等回溯意图时，从历史索引提取偏好信号，注入 Retrieved 层。
- IPC 全链路使用 `IpcResponse<T>`，失败路径返回稳定错误码与可读信息（禁止 silent failure）。

## Impact
- Affected specs: `openspec/specs/writenow-spec/spec.md`, `openspec/specs/sprint-2.5-context-engineering/spec.md`, `openspec/specs/sprint-2.5-context-engineering/task_cards/p1/`
- Affected code: `electron/ipc/context.cjs`, `src/lib/context/*`, `src/stores/aiStore.ts`, E2E tests
- Breaking change: NO（新增能力；IPC 契约仍为 `IpcResponse<T>`）
- User benefit: 支持跨会话“像上次那样”的偏好复用；通过摘要降低注入 token；失败可观测且可重试
