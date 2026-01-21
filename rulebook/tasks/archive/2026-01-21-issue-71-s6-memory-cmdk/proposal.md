# Proposal: issue-71-s6-memory-cmdk

## Why
Sprint 6 需要交付「外挂记忆 + 用户偏好学习 + Cmd/Ctrl+K 命令面板」的体验闭环；目前缺少 `user_memory` 的 CRUD/UI、偏好信号到记忆的落盘合并、以及统一入口的命令面板，导致 AI 调用缺乏稳定风格对齐与可审计入口。

## What Changes
- 新增 `memory:*` IPC：`user_memory` CRUD + 记忆注入/偏好学习/隐私模式设置 + 偏好信号 ingest/clear
- AI 调用在请求构建阶段按策略注入记忆，并返回“本次注入了哪些记忆”用于 UI 透明展示
- 新增「记忆」侧边栏视图：管理记忆项 + 偏好学习开关/撤销/清空
- 新增 Cmd/Ctrl+K 命令面板：模糊搜索、键盘导航、可扩展 registry、SKILL 快速调用与核心命令
- 补齐 Sprint 6（memory + preference learning + command palette）E2E 用户路径测试

## Impact
- Affected specs: `openspec/specs/sprint-6-experience/spec.md`, `openspec/specs/sprint-6-experience/tasks/003-user-memory-system.md`, `openspec/specs/sprint-6-experience/tasks/004-preference-learning.md`, `openspec/specs/sprint-6-experience/tasks/005-command-palette.md`
- Affected code: `electron/ipc/*`, `src/lib/ipc.ts`, `src/stores/*`, `src/components/*`, `tests/e2e/*`
- Breaking change: YES（更新 IPC contract / `ai:skill:run` response shape；同步更新调用方）
- User benefit: 可控的记忆注入与偏好学习闭环（可审计/可撤销/可禁用），以及统一入口的命令面板提升效率
