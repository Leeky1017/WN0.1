# Task Card: P0-003 Design Tokens 补全

Issue: #199

## Summary

确保 AI Panel 样式全部使用 --wn-* Design Tokens，禁止硬编码颜色。

## Acceptance Criteria

- [x] tokens.css 包含所有 AI Panel 所需的语义 token
- [x] ai-panel.css 无硬编码颜色值
- [x] 新增 token：--wn-bg-message-user, --wn-bg-message-assistant
- [x] 新增 token：--wn-bg-message-action, --wn-bg-message-action-hover
- [x] Dark 主题和 Light 主题样式一致

## Completion

- PR: https://github.com/Leeky1017/WN0.1/pull/200
- 在 tokens.css 添加了 40+ 语义 token
- 所有颜色使用 --wn-* 变量引用
- RUN_LOG: openspec/_ops/task_runs/ISSUE-199.md

## Implementation Notes

1. 审计现有 ai-panel.css
2. 在 tokens.css 添加缺失的语义 token
3. 确保所有颜色引用 --wn-* 变量
