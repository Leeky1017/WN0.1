# P1-002: 对话记录管理面板（Conversations）

Status: pending

## Goal

提供“对话记录”面板，暴露 `context:writenow:conversations:*` 能力，使用户可以查看/检索/打开历史对话，并为后续偏好学习与复用打基础。

## Dependencies

- `openspec/specs/writenow-frontend-gap-analysis/spec.md`
- `openspec/specs/writenow-frontend-gap-analysis/design/03-p1-custom-skill-conversations-memory-judge.md`
- `openspec/specs/api-contract/spec.md`

## Expected File Changes

| 操作 | 文件路径 |
|------|---------|
| Add | `writenow-frontend/src/features/conversations/ConversationsPanel.tsx` |
| Add | `writenow-frontend/src/features/conversations/useConversations.ts` |
| Add | `writenow-frontend/src/features/conversations/index.ts` |
| Update | `writenow-frontend/src/components/layout/activity-bar.tsx` |
| Update | `writenow-frontend/src/stores/layoutStore.ts` |
| Update | `writenow-frontend/src/components/layout/AppShell.tsx` |
| Update | `writenow-frontend/src/locales/zh-CN.json` |
| Update | `writenow-frontend/src/locales/en.json` |
| Add | `writenow-frontend/tests/e2e/write-mode/conversations-panel.spec.ts` |

## Acceptance Criteria

- [ ] ActivityBar 存在 “对话”入口并可打开面板（稳定选择器：`data-testid="activity-tab-conversations"` 或等价）
- [ ] 列表视图：
  - [ ] 调用 `context:writenow:conversations:list` 展示会话列表
  - [ ] 空态/错误态明确且可重试
- [ ] 详情视图：
  - [ ] 选择一条会话后调用 `context:writenow:conversations:read`
  - [ ] 展示 messages（role/content/time）与 analysis 摘要（summary/keyTopics/skillsUsed）
- [ ] 可恢复性：
  - [ ] 请求失败时展示可读错误（遵循 `api-contract`）并提供重试
  - [ ] 不泄露敏感信息（绝对路径/堆栈/隐私内容）

## Tests

- [ ] Playwright E2E：打开对话面板 → 展示空态或列表态（两者皆可接受，但必须稳定且不崩）
- [ ] Playwright E2E：若存在列表项，点击进入详情页（可用条件分支或准备最小数据方案，禁止 stub）

