# FRONTEND-P1-003: AI 上下文绑定 + 会话持久化（按文档）

Status: done (completed in Sprint 2.5 P1-B)

## Goal

让 AI 感知编辑上下文（选区/光标/段落/必要前后文），并把会话历史持久化到本地数据库，支持重启恢复与按文档关联。

## Dependencies

- `openspec/specs/sprint-2-ai/spec.md`（AI 调用/流式/Diff 基础能力）
- `openspec/specs/sprint-3-rag/spec.md`（如涉及向量检索/跨文档引用）

## Expected File Changes

- Update/Add: `src/stores/aiStore.ts`（conversation + editorContext）
- Update: `src/stores/editorStore.ts`（暴露选区/光标/段落上下文）
- Update: `electron/ipc/`（新增会话持久化 IPC：save/load）
- Update: `src/components/AI/AIPanel.tsx`（UI：查看发送上下文、继续/新会话）
- Add: `tests/e2e/frontend-ai-context.spec.ts`

## Acceptance Criteria

- [ ] 触发 SKILL 时自动注入选区/段落上下文，并提供“发送的上下文”可查看入口
- [ ] 会话历史在应用重启后恢复（按文档关联），不得静默丢失
- [ ] 取消/失败不改变正文，且错误可理解并可重试

## Tests

- [ ] Playwright E2E：选中文本 → 触发 AI → 断言请求包含上下文（通过 UI 可见证据）→ 重启 → 会话仍存在
