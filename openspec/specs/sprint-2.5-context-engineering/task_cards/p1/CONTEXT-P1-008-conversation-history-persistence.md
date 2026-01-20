# CONTEXT-P1-008: ConversationHistoryManager（持久化 + 索引）

## Goal

实现对话历史落盘与索引：把完整对话保存到 `.writenow/conversations/*.json`，并维护 `index.json` 供检索；记录用户接受/拒绝偏好信号，为后续“像上次那样”与偏好学习提供证据。

## Dependencies

- `openspec/specs/sprint-2.5-context-engineering/task_cards/p0/CONTEXT-P0-002-writenow-project-directory-and-loaders.md`
- `openspec/specs/sprint-2-ai/spec.md`（AI 面板与接受/拒绝行为）

## Expected File Changes

- Add: `src/lib/context/conversation.ts`
- Add/Update: `electron/ipc/`（conversations: save/load/list/index）
- Update: `src/stores/`（AI 会话状态记录 accept/reject/cancel/error）
- Add: `src/lib/context/conversation.test.ts`
- Add: `tests/e2e/sprint-2.5-context-engineering-conversation-persist.spec.ts`

## Acceptance Criteria

- [ ] 每次对话结束后完整对话落盘且索引更新（包含 summary 字段占位、topics、skillsUsed、偏好信号）
- [ ] 应用重启后会话索引可恢复（不得静默丢失）
- [ ] 文件写入失败时必须提示可理解错误并保留诊断证据（禁止 silent failure）

## Tests

- [ ] Playwright E2E：触发 AI 对话 → 接受/拒绝一次 → 断言 `.writenow/conversations/index.json` 与对话文件存在；重启后索引仍可读取

## Effort Estimate

- L（3 天）

