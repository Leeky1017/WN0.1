# Task Card: P0-002 消息气泡样式优化

Issue: #199

## Summary

优化消息气泡的视觉层次感，User 消息右对齐、AI 消息左对齐，添加 Hover 操作按钮。

## Acceptance Criteria

- [x] User 消息右对齐（align-self: flex-end）
- [x] AI 消息左对齐（align-self: flex-start）
- [x] AI 气泡背景略亮于面板背景（使用 --wn-bg-message-assistant）
- [x] User 气泡背景使用 --wn-bg-message-user
- [x] Hover 消息显示操作按钮
- [x] 复制按钮可复制消息内容到剪贴板
- [x] AI 消息额外显示"重新生成"按钮

## Completion

- PR: https://github.com/Leeky1017/WN0.1/pull/200
- 实现了 MessageBubble 组件，User/AI 消息分别对齐
- 添加了 Hover 操作按钮（复制、重新生成）
- RUN_LOG: openspec/_ops/task_runs/ISSUE-199.md

## Implementation Notes

1. 修改 `wn-ai-message` 类的布局
2. 添加 `MessageActions` 子组件
3. 使用 CSS `:hover` 控制按钮显示
4. 使用 `navigator.clipboard.writeText()` 实现复制
