# Proposal: issue-70-s6-stats-pomodoro

## Why
Sprint 6「体验增强」要求 WriteNow 提供可观测的创作统计与低打扰的专注辅助（番茄钟），并确保数据可落盘、可恢复、离线可用。当前应用缺少从“写作事件/专注完成”到“统计面板展示”的端到端闭环，用户无法量化写作进度，也无法在中断/重启后恢复专注状态。

## What Changes
- 主进程：实现 `writing_stats` 表的初始化与读写（按日 upsert / range 聚合 / 增量入账），通过 IPC 暴露稳定 API。
- 渲染进程：接入统计 store + UI（今天/本周/本月 + 趋势），替换现有占位数据。
- 番茄钟：实现稳定状态机（focus/break；start/pause/resume/stop），支持持久化与重启恢复，并在完成专注阶段时将分钟入账到 `writing_stats.writing_minutes`。
- E2E：覆盖真实 UI + 真实持久化的用户路径（创建/保存→统计入账；番茄钟完成→分钟入账；重启→状态恢复）。

## Impact
- Affected specs: `openspec/specs/sprint-6-experience/spec.md`, `openspec/specs/sprint-6-experience/tasks/001-writing-stats.md`, `openspec/specs/sprint-6-experience/tasks/002-pomodoro-timer.md`
- Affected code: `electron/ipc/**`, `electron/lib/**`, `electron/preload.cjs`, `src/stores/**`, `src/components/StatsBar.tsx`, `src/components/sidebar-views/StatsView.tsx`, `tests/**`
- Breaking change: NO
- User benefit: 可直观看到写作趋势与目标进度；专注计时稳定可恢复；统计与专注形成闭环，增强持续写作体验。
