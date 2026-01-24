# ISSUE-176

- Issue: #176
- Branch: task/176-frontend-gap-structure

## Plan

- 创建 design/ 目录，拆分设计文档
- 创建 task_cards/ 目录，按 P0-P3 分组任务卡片
- 更新 spec.md 引用子文档

## Runs

### 2026-01-24 创建规范结构

- Command: `mkdir -p openspec/specs/wn-frontend-gap-analysis/{design,task_cards/p0,task_cards/p1,task_cards/p2,task_cards/p3}`
- Key output: 目录结构创建成功
- Evidence: 9 个设计文档 + 30 张任务卡片

### 创建设计文档

- Command: `Write design/00-overview.md`
- Key output: 总览设计文档

- Command: `Write design/01-editor-features.md`
- Key output: 编辑器功能设计文档

- Command: `Write design/02-settings-preferences.md`
- Key output: 设置与偏好设计文档

- Command: `Write design/03-file-management.md`
- Key output: 文件管理设计文档

- Command: `Write design/04-status-bar-notifications.md`
- Key output: 状态栏与通知设计文档

- Command: `Write design/05-context-menus.md`
- Key output: 右键菜单设计文档

- Command: `Write design/06-help-documentation.md`
- Key output: 帮助与文档设计文档

- Command: `Write design/07-error-handling.md`
- Key output: 错误处理设计文档

- Command: `Write design/08-accessibility.md`
- Key output: 可访问性设计文档

- Command: `Write design/09-backend-exposure.md`
- Key output: 后端能力暴露设计文档

### 创建任务卡片

- Command: `Write task_cards/index.md`
- Key output: 任务卡片索引（30 张任务卡）

- Command: `Write task_cards/p0/*.md`
- Key output: P0 任务卡片 8 张

- Command: `Write task_cards/p1/*.md`
- Key output: P1 任务卡片 10 张

- Command: `Write task_cards/p2/*.md`
- Key output: P2 任务卡片 8 张

- Command: `Write task_cards/p3/*.md`
- Key output: P3 任务卡片 4 张
