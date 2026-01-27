# FRONTEND-P2-001: 内联 AI（Cmd/Ctrl+K）+ 可控应用到文稿

Status: done (completed in Sprint 6)

## Goal

实现编辑器内联 AI 指令入口，减少“写字区 ↔ 聊天区”切换成本，并确保结果应用可控、可撤销、可版本化。

## Dependencies

- `FRONTEND-P1-003`（editorContext + 会话/请求基础能力）
- `openspec/specs/sprint-6-experience/spec.md`（如需与命令面板体系复用快捷键与命令注册）

## Expected File Changes

- Add: `src/components/Editor/InlineAICommand.tsx`
- Update: `src/components/Editor/index.tsx`（挂载与光标定位）
- Update: `src/stores/aiStore.ts`（inline 请求状态）
- Add: `tests/e2e/frontend-inline-ai.spec.ts`

## Acceptance Criteria

- [ ] `Cmd/Ctrl+K` 可在编辑器中唤起内联输入框，`Esc` 关闭且返回编辑
- [ ] 支持快捷操作（续写/润色/翻译/解释）并可提交自定义指令
- [ ] 生成结果必须可确认（插入/替换/取消）；应用后支持 undo 且写入版本历史

## Tests

- [ ] Playwright E2E：输入文本 → `Cmd/Ctrl+K` → 生成 → 点击“插入/替换” → 断言正文变化 → undo → 断言恢复
