# P1-003: 记忆增强（偏好学习入口 + 注入预览闭环）

Status: pending

## Goal

补齐 Memory 的“增长与可控”闭环：

- 用户可手动触发从对话学习偏好（`memory:preferences:ingest`）
- 用户能清楚看到下一次 AI 运行会注入哪些记忆（`memory:injection:preview`，入口可发现）

## Dependencies

- `openspec/specs/writenow-frontend-gap-analysis/spec.md`
- `openspec/specs/writenow-frontend-gap-analysis/design/03-p1-custom-skill-conversations-memory-judge.md`
- `openspec/specs/sprint-ai-memory/spec.md`
- `openspec/specs/api-contract/spec.md`

## Expected File Changes

| 操作 | 文件路径 |
|------|---------|
| Update | `writenow-frontend/src/features/memory/MemoryPanel.tsx` |
| Update | `writenow-frontend/src/features/memory/useMemory.ts` |
| Update | `writenow-frontend/src/features/ai-panel/ContextPreview.tsx`（确保入口可发现/可刷新/错误不 silent） |
| Update | `writenow-frontend/src/locales/zh-CN.json` |
| Update | `writenow-frontend/src/locales/en.json` |
| Add | `writenow-frontend/tests/e2e/write-mode/memory-preference-ingest.spec.ts` |

## Acceptance Criteria

- [ ] Memory 面板新增“从对话学习偏好”入口：
  - [ ] 点击后调用 `memory:preferences:ingest`
  - [ ] 成功后刷新列表（learned 记忆可见）
  - [ ] 失败时显示可读错误并允许重试
- [ ] 注入预览入口可发现：
  - [ ] 用户能在 AI Panel 或 Memory/Context 面板看到“上下文/注入预览”
  - [ ] 可手动刷新预览（`memory:injection:preview`）
- [ ] 失败语义明确：区分 `TIMEOUT` / `CANCELED`，并清理 pending 状态
- [ ] 禁止 silent failure：不得只 `console.error` 而 UI 无反馈

## Tests

- [ ] Playwright E2E：打开 Memory 面板 → 触发一次 ingest（允许在无数据时返回“无可学习内容”的明确提示，但必须不崩并可重复触发）
- [ ] Playwright E2E：打开 AI Panel 的注入预览 → 刷新 → 至少展示空态/列表态之一

