# ISSUE-199

- Issue: #199
- Branch: task/199-theia-ai-panel-ux
- PR: https://github.com/Leeky1017/WN0.1/pull/200

## Plan

1. 实现斜杠命令系统（SlashCommandMenu 组件）
2. 优化消息气泡样式（右对齐 User、左对齐 AI、Hover 操作按钮）
3. 补全 Design Tokens（消除硬编码）

## Runs

### 2026-01-25 创建任务结构

- Command: `mkdir -p rulebook/tasks/issue-199-theia-ai-panel-ux/...`
- Key output: 创建 proposal.md, tasks.md, spec.md, task_cards
- Evidence: 
  - rulebook/tasks/issue-199-theia-ai-panel-ux/
  - openspec/specs/wn-theia-ui-remediation/

### 2026-01-25 实现 P0 功能

- Command: 编辑 tokens.css, ai-panel.css, ai-panel-widget.tsx
- Key output:
  - 添加语义 token（--wn-bg-message-user, --wn-bg-message-assistant 等）
  - 添加斜杠命令菜单样式（.wn-ai-slash-menu-*）
  - 添加消息 hover 操作按钮样式
  - 实现 SlashCommandMenu 组件（支持键盘导航）
  - 实现 MessageBubble 组件（带复制/重新生成按钮）
  - 添加快捷按钮条（/ 命令触发器、模型选择 placeholder）
- Evidence:
  - writenow-theia/writenow-core/src/browser/style/tokens.css
  - writenow-theia/writenow-core/src/browser/style/ai-panel.css
  - writenow-theia/writenow-core/src/browser/ai-panel/ai-panel-widget.tsx
