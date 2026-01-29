# ISSUE-359

- Issue: #359
- Branch: task/359-ai-panel-cursor-ux
- PR: https://github.com/Leeky1017/WN0.1/pull/360

## Plan

- 重构 AI Panel 布局为 Cursor 风格（输入框+发送按钮在底部同一行）
- 简化 Header，添加底部工具栏（Mode/Model/Skill）
- 实现斜杠命令弹出菜单

## Runs

### 2026-01-29 15:45 实现 AI Panel Cursor-style 重构

- Command: `编辑 aiStore.ts、AIPanel.tsx、ContextPreview.tsx、SlashCommandMenu.tsx、index.ts、en.json、zh-CN.json`
- Key output: 完成 Cursor 风格布局重构，实现底部工具栏和斜杠命令
- Evidence: `writenow-frontend/src/features/ai-panel/` 目录下所有文件

### 2026-01-29 15:48 TypeScript + ESLint 检查

- Command: `npx tsc --noEmit && npx eslint src/features/ai-panel/ src/stores/aiStore.ts --max-warnings=0`
- Key output: Exit code 0，无错误
- Evidence: CI 检查通过

### 文件变更汇总

| 文件 | 状态 |
|------|------|
| `writenow-frontend/src/features/ai-panel/AIPanel.tsx` | 重构 |
| `writenow-frontend/src/features/ai-panel/SlashCommandMenu.tsx` | 新建 |
| `writenow-frontend/src/features/ai-panel/ContextPreview.tsx` | 修改 |
| `writenow-frontend/src/features/ai-panel/index.ts` | 更新导出 |
| `writenow-frontend/src/stores/aiStore.ts` | 添加 mode/model |
| `writenow-frontend/src/locales/en.json` | 添加 aiPanel i18n |
| `writenow-frontend/src/locales/zh-CN.json` | 添加 aiPanel i18n |
